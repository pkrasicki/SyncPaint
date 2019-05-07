import {Tool} from "./tool";
export {Pencil};

class Pencil extends Tool
{
	constructor(size, color)
	{
		super("round", size, color, 0);
	}
}