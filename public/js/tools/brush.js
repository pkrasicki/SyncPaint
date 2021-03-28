import Tool from "./tool";

class Brush extends Tool
{
	constructor(size, color)
	{
		super("round", size, color);
	}
}

export default Brush;