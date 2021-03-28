import Tool from "./tool";

class Eraser extends Tool
{
	constructor(size, color)
	{
		super("round", size, color, 0, "destination-out");
	}
}

export default Eraser;