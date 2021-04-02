import Tool from "./tool";
import ToolType from "../models/tool-type";

class Pencil extends Tool
{
	constructor(size, color)
	{
		super(ToolType.PENCIL, "round", size, color, 0);
	}
}

export default Pencil;