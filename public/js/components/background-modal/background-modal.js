import {Modal} from "../modal/modal";

export class BackgroundModal extends Modal
{
	constructor(id)
	{
		super(id);

		this.dropArea = this.element.querySelector(".drop-area");
		this.dropArea.addEventListener("dragover", (e) => this.imageDraggedOver(e));
		this.dropArea.addEventListener("drop", (e) => this.imageDropped(e));

		this.imagePreview = this.element.querySelector("#bg-image-preview");

		const imageFileInput = this.element.querySelector("#image-file-input");
		imageFileInput.addEventListener("change", (e) => this.imageFileInputChanged(e));
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
	}

	imageFileInputChanged(e)
	{
		this.element.querySelectorAll(".hide-on-image-input").forEach(item =>
		{
			item.style.display = "none";
		});

		this.loadBackgroundImage(e.currentTarget.files[0]);
	}

	// load image from provided file and display in preview area
	loadBackgroundImage(file)
	{
		if (file.type.match(/image*/))
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
}