class Modal
{
	constructor(id)
	{
		this.id = id;
		this.element = document.getElementById(id);
		this.isVisible = false;

		this.element.querySelector("#close-modal").addEventListener("click", () => this.hide());
		window.addEventListener("keydown", (e) =>
		{
			if (e.key == "Escape" && this.isVisible)
				this.hide();
		});

		this.element.addEventListener("click", (e) =>
		{
			// close modal when user clicks outside modal area
			if (e.target == this.element && this.isVisible)
				this.hide();
		});
	}

	show()
	{
		if (this.element.classList.contains("hidden"))
			this.element.classList.remove("hidden");

		this.isVisible = true;
	}

	hide()
	{
		if (!this.element.classList.contains("hidden"))
			this.element.classList.add("hidden");

		this.isVisible = false;
	}

	toggle()
	{
		if (this.isVisible)
			this.hide();
		else
			this.show();
	}
}

export default Modal;