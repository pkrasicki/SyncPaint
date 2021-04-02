// drawing data sent through the websocket
class DrawingData
{
	constructor(startPos, endPos, tool, text="")
	{
		this.startPos = startPos;
		this.endPos = endPos;
		this.tool = tool;
		this.text = text;
	}
}

export default DrawingData;