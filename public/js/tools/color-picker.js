import Tool from "./tool";
import Color from "../models/color";
import ToolType from "../models/tool-type";

class ColorPicker extends Tool
{
	constructor(size, color)
	{
		super(ToolType.COLOR_PICKER, "round", size, color);
	}

	getPixelColor(ctx, bgCtx, posX, posY)
	{
		let imageData = ctx.getImageData(posX, posY, 1, 1);

		if (imageData.data[3] != 0)
		{
			return new Color(imageData.data[0], imageData.data[1], imageData.data[2]).toHex();
		} else // if pixel is transparent return background color
		{
			imageData = bgCtx.getImageData(posX, posY, 1, 1)
			return new Color(imageData.data[0], imageData.data[1], imageData.data[2]).toHex();
		}
	}
}

export default ColorPicker;