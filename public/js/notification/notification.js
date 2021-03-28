class Notification
{
	constructor(text, lifeTimeMs=5000)
	{
		this.text = text;
		this.dateCreated = Date.now();
		this.element = document.createElement("div");
		this.element.classList.add("notification");
		this.element.style.animation = `notif ${lifeTimeMs}ms`;

		const textNode = document.createTextNode(text); // this will escape HTML so it's safe to use with user names
		this.element.appendChild(textNode);
		document.body.appendChild(this.element);
	}

	getElement()
	{
		return this.element;
	}
}

export default Notification;