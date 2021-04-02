class Tool
{
	constructor(type, style, size, color, blur=3, operation="source-over")
	{
		this.type = type;
		this.style = style;
		this.size = size;
		this.color = color;
		this.blur = blur;
		this.operation = operation;
	}

	getSize()
	{
		return this.size;
	}

	setSize(size)
	{
		this.size = size;
	}

	getColor()
	{
		return this.color;
	}

	setColor(color)
	{
		this.color = color;
	}
}

export default Tool;