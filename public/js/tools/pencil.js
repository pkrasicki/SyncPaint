import Tool from "./tool";

class Pencil extends Tool
{
	constructor(size, color)
	{
		super("round", size, color, 0);
	}
}

export default Pencil;