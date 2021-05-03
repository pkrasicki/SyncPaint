import Tool from "./tool";
import ToolType from "../models/tool-type";

class Ellipse extends Tool
{
	constructor(size, color, circle=false)
	{
		super(ToolType.ELLIPSE, "butt", size, color, 0);
		this.circle = circle;
	}

	draw(ctx, posX, posY, endPosX, endPosY)
	{
		ctx.beginPath();

		if (this.circle)
		{
			let radius = Math.max(Math.abs(endPosX - posX), Math.abs(endPosY - posY)) / 2;
			let offsetDirectionX = Math.sign(endPosX - posX);
			let offsetDirectionY = Math.sign(endPosY - posY);
			let centerX = posX + radius * offsetDirectionX;
			let centerY = posY + radius * offsetDirectionY;

			ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
		} else
		{
			let centerX = (posX + endPosX) / 2;
			let centerY = (posY + endPosY) / 2;
			let radiusX = Math.abs(centerX - posX);
			let radiusY = Math.abs(centerY - posY);

			ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
		}

		ctx.stroke();
	}
}

export default Ellipse;