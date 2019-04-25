export {DrawingData};

// drawing data sent over the network
class DrawingData
{
	constructor(startPos, endPos, tool)
	{
		this.startPos = startPos;
		this.endPos = endPos;
		this.tool = tool;
	}
}