import Tool from "./tool";
import ToolType from "../models/tool-type";

class Rect extends Tool
{
	constructor(size, color, square=false)
	{
		super(ToolType.RECT, "butt", size, color, 0);
		this.square = square;
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

		// TODO: make this work - it's buggy
		// if (this.square)
		// {
		// 	let size = width;
		// 	if (height > width)
		// 		size = height;

		// 	ctx.rect(startPosX, startPosY, size, size);
		// } else
		// {
			// ctx.rect(startPosX, startPosY, width, height);
		// }

		ctx.rect(startPosX, startPosY, width, height);
		ctx.stroke();
	}
}

export default Rect;