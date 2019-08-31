export {Notification};

class Notification
{
	constructor(text, lifeTimeMs=5000)
	{
		this.text = text;
		this.timestamp = Date.now();
		this.element = document.createElement("div");
		this.element.classList.add("notification");
		this.element.innerHTML = text;
		this.element.style.animation = `notif ${lifeTimeMs}ms`;
		document.body.appendChild(this.element);
	}

	getElement()
	{
		return this.element;
	}
}