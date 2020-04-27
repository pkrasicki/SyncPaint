import {Tool} from "./tool";
import {Color} from "../models/color";

export class Fill extends Tool
{
	constructor(size, color)
	{
		super("round", size, color);
	}

	getImageDataOffset(posX, posY, imageData)
	{
		return (posY * imageData.width + posX) * 4;
	}

	getPixelColor(posX, posY, imageData)
	{
		const offset = this.getImageDataOffset(posX, posY, imageData);
		const arr = imageData.data.slice(offset, offset + 4);
		return [arr[0], arr[1], arr[2], arr[3]];
	}

	setPixelColor(posX, posY, imageData, color)
	{
		const offset = this.getImageDataOffset(posX, posY, imageData);
		imageData.data[offset] = color[0];
		imageData.data[offset + 1] = color[1];
		imageData.data[offset + 2] = color[2];
		imageData.data[offset + 3] = 255;
	}

	areColorsEqual(color1, color2)
	{
		return color1[0] == color2[0] && color1[1] == color2[1] &&
			color1[2] == color2[2] && color1[3] == color2[3];
	}

	setPixels(width, height, posX, posY, imageData, curColor, colorToReplace)
	{
		let pixels = [posX, posY]
		for (let i = 0; i < pixels.length - 1; i+=2)
		{
			if (this.needsReplace(pixels[i], pixels[i+1], width, height, imageData, curColor, colorToReplace))
			{
				this.setPixelColor(pixels[i], pixels[i+1], imageData, curColor);

				pixels.push(pixels[i] - 1);
				pixels.push(pixels[i+1]);

				pixels.push(pixels[i]);
				pixels.push(pixels[i+1] - 1);

				pixels.push(pixels[i] + 1);
				pixels.push(pixels[i+1]);

				pixels.push(pixels[i]);
				pixels.push(pixels[i+1] + 1);
			}
		}
	}

	needsReplace(x, y, width, height, imageData, curColor, colorToReplace)
	{
		if (x < 0 || y < 0 || x > width || y > height)
			return false;

		let pixelColor = this.getPixelColor(x, y, imageData);

		if (this.areColorsEqual(pixelColor, curColor) || !this.areColorsEqual(pixelColor, colorToReplace))
			return false;
		else
			return true;
	}

	fill(ctx, posX, posY)
	{
		let width = ctx.canvas.clientWidth;
		let height = ctx.canvas.clientHeight;

		if (posX < 0 || posX > width)
			return;

		if (posY < 0 || posY > height)
			return;

		let imageData = ctx.getImageData(0, 0, width, height);
		let curColor = Color.fromHex(this.color).toArray();
		let colorToReplace = this.getPixelColor(posX, posY, imageData);

		if (this.areColorsEqual(curColor, colorToReplace))
			return;

		this.setPixels(width, height, posX, posY, imageData, curColor, colorToReplace);
		ctx.putImageData(imageData, 0, 0);
	}
}