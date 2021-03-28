class NotificationSystem
{
	constructor()
	{
		this.notifications = [];
		this.notificationVerticalSpace = 80;
		this.notificationBottomMargin = 10;
	}

	add(notification)
	{
		this.notifications.forEach(n =>
		{
			const offsetTop = n.getElement().offsetTop;
			const newBottomOffset = (window.innerHeight - offsetTop) + this.notificationBottomMargin;
			n.getElement().style.bottom = newBottomOffset + "px";

			const maxNotifications = Math.floor((window.innerHeight - document.body.offsetHeight) / this.notificationVerticalSpace);
			const numNotifications = this.notifications.length + 1; // existing notifications + the new one we create

			if (numNotifications > maxNotifications)
				this.removeOldest();
		});

		// remove after fade animation is finished
		notification.getElement().addEventListener("animationend", () =>
		{
			this.remove(notification);
		});

		this.notifications.push(notification);
	}

	remove(notification)
	{
		let element = notification.getElement();
		if (element && document.body.contains(element))
			document.body.removeChild(element);

		this.notifications = this.notifications.filter(item => item != notification);
	}

	removeOldest()
	{
		let oldestNotification = this.notifications.reduce((prev, cur) =>
			prev.dateCreated < cur.dateCreated ? prev : cur);
		this.remove(oldestNotification);
	}
}

export default NotificationSystem;