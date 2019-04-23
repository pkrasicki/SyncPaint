export {Tool};

class Tool
{
	constructor(style, size, color, blur=3)
	{
		this.style = style;
		this.size = size;
		this.color = color;
		this.blur = blur;
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