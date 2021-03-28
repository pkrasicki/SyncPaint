import Component from "../component/component";
import htmlTemplate from "html-loader!./slider.html";
import stylesheet from "./slider.scss";

class Slider extends Component
{
	constructor()
	{
		super(htmlTemplate, stylesheet);

		// default values for slider properties
		const defaultValue = 0;
		const defaultMinValue = 0;
		const defaultMaxValue = 10;
		const defaultText = "";
		const defaultUnit = "";

		if (!this.hasAttribute("data-value"))
			this.setValue(defaultValue);

		if (!this.hasAttribute("data-min-value"))
			this.setAttribute("data-min-value", defaultMinValue);

		if (!this.hasAttribute("data-max-value"))
			this.setAttribute("data-max-value", defaultMaxValue);

		if (!this.hasAttribute("data-text"))
			this.setAttribute("data-text", defaultText);

		if (!this.hasAttribute("data-unit"))
			this.setAttribute("data-unit", defaultUnit);

		const sliderFg = this.shadowRoot.querySelector(".slider-fg");
		sliderFg.querySelector("span.text").innerHTML = this.getAttribute("data-text");

		this.update(); // draw slider based on initial values

		this.addEventListener("click", this.update);
		this.addEventListener("touchmove", this.update);
	}

	sliderPosFromValue(value)
	{
		const maxValue = Number(this.getAttribute("data-max"));
		if (value > 0)
			return value / maxValue;
		else
			return 0;
	}

	// calculates and updates slider's value and position
	update(e=null, value=null)
	{
		const minValue = Number(this.getAttribute("data-min"));
		const maxValue = Number(this.getAttribute("data-max"));
		const unit = this.getAttribute("data-unit");
		const sliderFg = this.shadowRoot.querySelector(".slider-fg");
		const rect = sliderFg.getBoundingClientRect();
		let newSliderPos;

		if (rect.width == 0) // this can happen when element is invisible
			return;

		if (e != null) // update slider based on user input
		{
			let mousePosX;

			if (e.type == "touchmove")
				mousePosX = e.touches[0].clientX;
			else
				mousePosX = e.clientX;

			const relativeMousePos = mousePosX - rect.left;
			newSliderPos = relativeMousePos / rect.width;

		} else if (value != null) // update with specified value
		{
			newSliderPos = this.sliderPosFromValue(value);

		} else // update slider using current value from data-value attribute
		{
			let val = Number(this.getAttribute("data-value"));
			newSliderPos = this.sliderPosFromValue(val);
		}

		const newValue = Math.min(Math.max(minValue, Math.round(newSliderPos * maxValue / rect.width * rect.width)), maxValue);
		this.setValue(newValue);

		const newBgWidth = Math.min(Math.max(minValue, Math.round(newSliderPos * rect.width)), rect.width);
		sliderFg.querySelector("span.value-text").innerHTML = newValue + unit;
		sliderFg.querySelector(".slider-bg").style.width = newBgWidth + "px";

		this.dispatchEvent(new Event("change"));
	}

	getValue()
	{
		return this.getAttribute("data-value");
	}

	setValue(value)
	{
		this.setAttribute("data-value", value);
	}
}

export default Slider;