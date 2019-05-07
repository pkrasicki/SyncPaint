import {Tool} from "./tool";
export {Eraser};

class Eraser extends Tool
{
	constructor(size, color)
	{
		super("round", size, color, 0, "destination-out");
	}
}