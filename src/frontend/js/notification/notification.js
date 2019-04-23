export {Notification};

class Notification
{
	constructor(text)
	{
		this.text = text;
		this.lifeTimeMs = 5000;
		this.element = document.createElement("div");
		this.element.classList.add("notification");
		this.element.innerHTML = text;
		setTimeout(() =>
		{
			this.destroy(this.element);
		}, this.lifeTimeMs);

		this.create();
	}

	create()
	{
		document.body.appendChild(this.element);
	}

	destroy(elem)
	{
		document.body.removeChild(elem);
	}
}