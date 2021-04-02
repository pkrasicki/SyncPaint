import Tool from "./tool";
import ToolType from "../models/tool-type";

class Rect extends Tool
{
	constructor(size, color)
	{
		super(ToolType.RECT, "round", size, color, 0);
	}

	draw(ctx, posX, posY, endPosX, endPosY)
	{
		let startPosX = posX;
		let startPosY = posY;
		let width = Math.abs(endPosX - posX);
		let height = Math.abs(endPosY - posY);

		if (endPosX < posX)
			startPosX = endPosX;

		if (endPosY < posY)
			startPosY = endPosY;

		ctx.beginPath();
		ctx.rect(startPosX, startPosY, width, height);
		ctx.stroke();
	}
}

export default Rect;