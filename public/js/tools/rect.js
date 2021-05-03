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
		ctx.beginPath();

		if (this.square)
		{
			const size = Math.max(Math.abs(endPosX - posX), Math.abs(endPosY - posY));
			const offsetDirectionX = Math.sign(endPosX - posX);
			const offsetDirectionY = Math.sign(endPosY - posY);
			const width = size * offsetDirectionX;
			const height = size * offsetDirectionY;

			ctx.rect(posX, posY, width, height);

		} else
		{
			const startPosX = Math.min(posX, endPosX);
			const startPosY = Math.min(posY, endPosY);
			const width = Math.abs(endPosX - posX);
			const height = Math.abs(endPosY - posY);

			ctx.rect(startPosX, startPosY, width, height);
		}

		ctx.stroke();
	}
}

export default Rect;