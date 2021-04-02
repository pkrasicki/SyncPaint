import Tool from "./tool";
import ToolType from "../models/tool-type";

class Text extends Tool
{
	constructor(size, color)
	{
		super(ToolType.TEXT, "round", size, color, 0);
	}
}

export default Text;