import Component from "../component/component";
import htmlTemplate from "html-loader!./toolbar.html";
import stylesheet from "./toolbar.scss";

class Toolbar extends Component
{
	constructor()
	{
		super(htmlTemplate, stylesheet);
		this.element = this.shadowRoot.querySelector(".toolbar");
	}

	// make icons clickable
	initButtons(defaultTool, defaultColor)
	{
		let isDefaultToolFound = false;
		const toolIcons = this.element.querySelectorAll("ul > li i.btn-tool");
		toolIcons.forEach(icon =>
		{
			const listItem = icon.parentElement;
			if (!isDefaultToolFound && listItem.dataset.tooltype == defaultTool)
			{
				this.setSelectedTool(icon);
				isDefaultToolFound = true;
			}

			if (listItem.dataset.tooltype == "BackgroundImage")
				listItem.addEventListener("click", (e) => this.bgSelectionClicked(e));
			else if (!icon.classList.contains("disabled"))
				listItem.addEventListener("click", (e) => this.toolSwitched(e));
		});

		let isDefaultColorFound = false;
		const toolbarColors = this.element.querySelectorAll(".btn-color");
		toolbarColors.forEach(item =>
		{
			if (!isDefaultColorFound && item.dataset.color == defaultColor)
			{
				this.setSelectedColor(item);
				isDefaultColorFound = true;
			}

			item.style.backgroundColor = item.dataset.color;
			item.addEventListener("click", (e) => this.colorSwitched(e));
		});
	}

	setSelectedTool(element)
	{
		const selectedClass = "selected";
		let prevSelected = this.element.querySelector(`.${selectedClass}`);

		if (prevSelected)
			prevSelected.classList.remove(selectedClass);

		if (!element.classList.contains(selectedClass))
			element.classList.add(selectedClass);
	}

	setSelectedColor(element)
	{
		const selectedClass = "selected-color";

		this.clearSelectedColor();
		if (!element.classList.contains(selectedClass))
			element.classList.add(selectedClass);
	}

	clearSelectedColor()
	{
		const selectedClass = "selected-color";
		let prevSelected = this.element.querySelector(`.${selectedClass}`);

		if (prevSelected)
			prevSelected.classList.remove(selectedClass);
	}

	// tool icon clicked
	toolSwitched(e)
	{
		const type = e.currentTarget.dataset.tooltype;
		this.setSelectedTool(e.target);
		this.dispatchEvent(new CustomEvent("toolSwitch", {detail: type}));
	}

	// color button clicked
	colorSwitched(e)
	{
		const color = e.target.dataset.color;
		this.setSelectedColor(e.target);
		this.dispatchEvent(new CustomEvent("colorSwitch", {detail: color}));
	}

	bgSelectionClicked(e)
	{
		this.dispatchEvent(new CustomEvent("bgSettingsOpen"));
	}
}

export default Toolbar;