import Tool from "./tool";
import ToolType from "../models/tool-type";

class Brush extends Tool
{
	constructor(size, color)
	{
		super(ToolType.BRUSH, "round", size, color);
	}
}

export default Brush;