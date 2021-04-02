import Tool from "./tool";
import ToolType from "../models/tool-type";

class Eraser extends Tool
{
	constructor(size, color)
	{
		super(ToolType.ERASER, "round", size, color, 0, "destination-out");
	}
}

export default Eraser;