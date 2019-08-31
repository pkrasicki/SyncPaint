export {DrawingData};

// drawing data sent through the websocket
class DrawingData
{
	constructor(startPos, endPos, tool)
	{
		this.startPos = startPos;
		this.endPos = endPos;
		this.tool = tool;
	}
}