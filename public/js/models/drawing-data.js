export {DrawingData};

// drawing data sent through the websocket
class DrawingData
{
	constructor(startPos, endPos, tool, text="", fill=false)
	{
		this.startPos = startPos;
		this.endPos = endPos;
		this.tool = tool;
		this.text = text;
		this.fill = fill;
	}
}