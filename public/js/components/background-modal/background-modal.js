import Modal from "../modal/modal";

class BackgroundModal extends Modal
{
	constructor(id)
	{
		super(id);

		this.bgColor = "#ffffff";

		this.dropArea = this.element.querySelector(".drop-area");
		this.dropArea.addEventListener("dragover", (e) => this.imageDraggedOver(e));
		this.dropArea.addEventListener("drop", (e) => this.imageDropped(e));

		this.imagePreview = this.element.querySelector("#bg-image-preview");

		const imageFileInput = this.element.querySelector("#image-file-input");
		imageFileInput.addEventListener("change", (e) => this.imageFileInputChanged(e));

		this.element.querySelector("#tab-image").addEventListener("click", (e) => this.tabClicked(e));
		this.element.querySelector("#tab-color").addEventListener("click", (e) => this.tabClicked(e));

		this.element.querySelector("#bg-color").value = this.bgColor;
		this.element.querySelector("#bg-color").addEventListener("change", (e) => this.bgColorChanged(e));
	}

	show()
	{
		super.show();
		this.element.querySelectorAll(".hide-on-drop").forEach(item =>
		{
			item.style.display = "initial";
		});

		this.dropArea.style.borderWidth = "1px";
		this.element.querySelector(".drop-area p").style.display = "block";

		this.imagePreview.src = "";
		if (!this.imagePreview.classList.contains("hidden"))
			this.imagePreview.classList.add("hidden");

		this.element.querySelector("#add-image").disabled = true;
	}

	hide()
	{
		super.hide();
		this.element.querySelector("#image-file-input").value = "";
	}

	imageDraggedOver(e)
	{
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
	}

	imageDropped(e)
	{
		e.preventDefault();
		this.loadBackgroundImage(e.dataTransfer.files[0]);

		this.element.querySelectorAll(".hide-on-drop").forEach(item =>
		{
			item.style.display = "none";
		});

		this.element.querySelector("#add-image").disabled = false;
	}

	imageFileInputChanged(e)
	{
		this.element.querySelectorAll(".hide-on-image-input").forEach(item =>
		{
			item.style.display = "none";
		});

		this.loadBackgroundImage(e.currentTarget.files[0]);
		this.element.querySelector("#add-image").disabled = false;
	}

	// load image from provided file and display in preview area
	loadBackgroundImage(file)
	{
		if (file != null && file.type.match(/image*/))
		{
			let reader = new FileReader();
			reader.onload = (readerEv) =>
			{
				this.imagePreview.src = readerEv.target.result;
				if (this.imagePreview.classList.contains("hidden"))
					this.imagePreview.classList.remove("hidden");

				this.dropArea.style.borderWidth = "0px";
			};

			reader.readAsDataURL(file);
		}
	}

	tabClicked(e)
	{
		if (e.target.classList.contains("active"))
			return;

		const colorTabContent = this.element.querySelector("#tab-content-color");

		if (e.target.id == "tab-image")
		{
			this.dropArea.classList.remove("hidden");
			this.element.querySelector("#add-image").classList.remove("hidden");
			this.element.querySelector("#image-file-input").classList.remove("hidden");

			colorTabContent.classList.add("hidden");

			this.element.querySelector("#tab-image").classList.add("active");
			this.element.querySelector("#tab-color").classList.remove("active");

		} else if (e.target.id == "tab-color")
		{
			colorTabContent.classList.remove("hidden");

			this.dropArea.classList.add("hidden");
			this.element.querySelector("#add-image").classList.add("hidden");
			this.element.querySelector("#image-file-input").classList.add("hidden");

			this.element.querySelector("#tab-image").classList.remove("active");
			this.element.querySelector("#tab-color").classList.add("active");
		}
	}

	bgColorChanged(e)
	{
		this.bgColor = e.target.value;
	}

	onAddImageBtnClick(callback)
	{
		this.element.querySelector("#add-image").addEventListener("click", callback);
	}

	onFillBtnClick(callback)
	{
		this.element.querySelector("#bg-fill").addEventListener("click", callback);
	}

	onClearBtnClick(callback)
	{
		this.element.querySelector("#bg-clear").addEventListener("click", callback);
	}
}

export default BackgroundModal;