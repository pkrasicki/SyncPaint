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
		let centerX = (posX + endPosX) / 2;
		let centerY = (posY + endPosY) / 2;
		let radiusX = Math.abs(centerX - posX);

		if (this.circle)
		{
			ctx.arc(posX, posY, radiusX, 0, 2 * Math.PI);
		} else
		{
			let radiusY = Math.abs(centerY - posY);
			ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
		}

		ctx.stroke();
	}
}

export default Ellipse;