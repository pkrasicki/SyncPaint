import Tool from "./tool";
import Color from "../models/color";
import ToolType from "../models/tool-type";

class Fill extends Tool
{
	constructor(size, color)
	{
		super(ToolType.FILL, "round", size, color);
	}

	static getImageDataOffset(posX, posY, imageData)
	{
		return (posY * imageData.width + posX) * 4;
	}

	static getPixelColor(posX, posY, imageData)
	{
		const offset = Fill.getImageDataOffset(posX, posY, imageData);
		const arr = imageData.data.slice(offset, offset + 4);
		return [arr[0], arr[1], arr[2], arr[3]];
	}

	static setPixelColor(posX, posY, imageData, color)
	{
		const offset = Fill.getImageDataOffset(posX, posY, imageData);
		imageData.data[offset] = color[0];
		imageData.data[offset + 1] = color[1];
		imageData.data[offset + 2] = color[2];
		imageData.data[offset + 3] = 255;
	}

	static areColorsEqual(color1, color2)
	{
		return color1[0] == color2[0]
			&& color1[1] == color2[1]
			&& color1[2] == color2[2]
			&& color1[3] == color2[3];
	}

	// tolerance is needed to fill pencil drawn shapes because of canvas bug in browsers:
	// https://bugzilla.mozilla.org/show_bug.cgi?id=1666100
	// it still doesn't fill brush drawn shapes because of its shadow
	static areColorsSimilar(color1, color2)
	{
		const tolerance = 6;
		const difference = Math.abs(color1[0] - color2[0]) + Math.abs(color1[1] - color2[1])
						+ Math.abs(color1[2] - color2[2]) + Math.abs(color1[3] - color2[3]);

		return difference <= tolerance;
	}

	static pixelNeedsUpdate(x, y, width, height, imageData, curColor, colorToReplace)
	{
		if (x < 0 || y < 0 || x >= width || y >= height)
			return false;

		let pixelColor = this.getPixelColor(x, y, imageData);
		if (this.areColorsSimilar(pixelColor, curColor) || !this.areColorsSimilar(pixelColor, colorToReplace))
			return false;

		return true;
	}

	static fillPixels(width, height, posX, posY, imageData, curColor, colorToReplace)
	{
		let pixels = new Uint32Array(width*height*8);
		pixels[0] = posX;
		pixels[1] = posY;
		let queueLength = 2;

		for (let i = 0; i < pixels.length - 1; i+=2)
		{
			if (i > queueLength)
				break;

			if (this.pixelNeedsUpdate(pixels[i], pixels[i+1], width, height, imageData, curColor, colorToReplace))
			{
				this.setPixelColor(pixels[i], pixels[i+1], imageData, curColor);

				pixels[queueLength] = pixels[i] - 1; // go left
				pixels[queueLength+1] = pixels[i+1];
				queueLength += 2;

				pixels[queueLength] = pixels[i];
				pixels[queueLength+1] = pixels[i+1] - 1; // go up
				queueLength += 2;

				pixels[queueLength] = pixels[i] + 1; // go right
				pixels[queueLength+1] = pixels[i+1];
				queueLength += 2;

				pixels[queueLength] = pixels[i];
				pixels[queueLength+1] = pixels[i+1] + 1; // go down
				queueLength += 2;
			}
		}
	}

	getFillData(posX, posY, canvasWidth, canvasHeight, imageData)
	{
		if (posX < 0 || posX > canvasWidth)
			return null;

		if (posY < 0 || posY > canvasHeight)
			return null;

		let curColor = Color.fromHex(this.color).toArray();
		let colorToReplace = Fill.getPixelColor(posX, posY, imageData);

		if (Fill.areColorsEqual(curColor, colorToReplace))
			return null;

		return [
			curColor,
			colorToReplace
		];
	}
}

export default Fill;