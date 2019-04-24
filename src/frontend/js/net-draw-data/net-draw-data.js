export {NetDrawData};

// draw data sent over the network
class NetDrawData
{
	constructor(x, y, tool)
	{
		this.x = x;
		this.y = y;
		this.tool = tool;
	}
}