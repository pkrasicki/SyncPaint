import {Tool} from "./tool";
export {PaintRoller};

class PaintRoller extends Tool
{
	constructor(size, color)
	{
		super("butt", size, color, 1);
	}
}
