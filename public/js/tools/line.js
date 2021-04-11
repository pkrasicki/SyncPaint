import Tool from "./tool";
import ToolType from "../models/tool-type";

class Line extends Tool
{
	constructor(size, color)
	{
		super(ToolType.LINE, "square", size, color, 0);
	}

	draw(ctx, posX, posY, endPosX, endPosY)
	{
		let startPosX = posX;
		let startPosY = posY;

		if (endPosX < posX)
			startPosX = endPosX;

		if (endPosY < posY)
			startPosY = endPosY;

		ctx.beginPath();
		ctx.moveTo(posX, posY);
		ctx.lineTo(endPosX, endPosY);
		ctx.stroke();
	}
}

export default Line;