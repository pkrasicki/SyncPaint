import {Tool} from "./tool";
export {Text};

class Text extends Tool
{
	constructor(size, color)
	{
		super("round", size, color, 0);
	}
}