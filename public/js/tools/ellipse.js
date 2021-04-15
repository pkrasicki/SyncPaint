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
			ctx.arc(posX, posY, Math.abs(endPosX - posX), 0, 2 * Math.PI);
		else
			ctx.ellipse(posX, posY, Math.abs(endPosX - posX), Math.abs(endPosY - posY), 0, 0, 2 * Math.PI);

		ctx.stroke();
	}
}

export default Ellipse;