import {Tool} from "./tool";
export {Brush};

class Brush extends Tool
{
	constructor(size, color)
	{
		super("round", size, color);
	}
}
