import Tool from "./tool";

class PaintRoller extends Tool
{
	constructor(size, color)
	{
		super("butt", size, color, 1);
	}
}

export default PaintRoller;