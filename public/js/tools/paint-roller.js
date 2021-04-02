import Tool from "./tool";
import ToolType from "../models/tool-type";

class PaintRoller extends Tool
{
	constructor(size, color)
	{
		super(ToolType.PAINT_ROLLER, "butt", size, color, 1);
	}
}

export default PaintRoller;