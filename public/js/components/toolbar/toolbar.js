import Component from "../component/component";
import htmlTemplate from "html-loader!./toolbar.html";
import stylesheet from "./toolbar.scss";
import ToolType from "../../models/tool-type";

class Toolbar extends Component
{
	constructor()
	{
		super(htmlTemplate, stylesheet);
		this.element = this.shadowRoot.querySelector(".toolbar");

		// workaround for paste being broken after clicking on toolbar
		this.element.addEventListener("paste", (e) =>
		{
			const format = "Text";
			let newClipboardData = new DataTransfer();
			newClipboardData.setData(format, e.clipboardData.getData(format));
			let event = new Event("paste");
			event.clipboardData = newClipboardData;
			this.dispatchEvent(event);
		});
	}

	// make icons clickable
	initButtons(defaultTool, defaultColor)
	{
		let isDefaultToolFound = false;
		const toolIcons = this.element.querySelectorAll("ul > li .btn-tool");
		toolIcons.forEach(icon =>
		{
			const listItem = icon.parentElement;
			const toolType = ToolType[listItem.dataset.toolname];
			if (!isDefaultToolFound && toolType == defaultTool)
			{
				this.setSelectedTool(icon);
				isDefaultToolFound = true;
			}

			if (listItem.dataset.toolname == "BACKGROUND_IMAGE")
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
		const toolName = e.currentTarget.dataset.toolname;
		const toolType = ToolType[toolName];
		this.setSelectedTool(e.target);
		this.dispatchEvent(new CustomEvent("toolSwitch", {detail: toolType}));
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