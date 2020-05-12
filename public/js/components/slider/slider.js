export class Slider
{
	static init(slider)
	{
		var name = slider.dataset.name;
		var value = slider.dataset.value;
		var sliderFg = slider.querySelector(".slider-fg");
		sliderFg.querySelector("span:nth-child(1)").innerHTML = name;
		this.updatePosition(sliderFg, value);
	}

	// calculates and updates slider's value based on user's mouse position
	// returns new value
	static update(slider, mousePosX)
	{
		var sliderFg = slider.querySelector(".slider-fg");
		var minValue = slider.dataset.min;
		var maxValue = slider.dataset.max;

		var rect = sliderFg.getBoundingClientRect();
		var relativeMousePos = mousePosX - rect.left;
		var sliderPos = relativeMousePos / rect.width;
		var value = Math.min(Math.max(minValue, Math.round(sliderPos * maxValue / rect.width * rect.width)), maxValue);

		slider.dataset.value = value;
		this.updatePosition(sliderFg, value, sliderPos, rect);

		return value;
	}

	// updates slider's visuals: displayed value and background position
	static updatePosition(sliderFg, value, sliderPos=null, rect=null)
	{
		var sliderRoot = sliderFg.parentElement;
		var unit = sliderRoot.dataset.unit;
		var minValue = sliderRoot.dataset.min;
		var maxValue = sliderRoot.dataset.max;

		if (sliderPos == null || rect == null)
		{
			rect = sliderFg.getBoundingClientRect();
			sliderPos = value / maxValue;
		}

		var newBgWidth = Math.min(Math.max(minValue, Math.round(sliderPos * rect.width)), rect.width);

		sliderFg.querySelector("span:nth-child(2)").innerHTML = value + unit;
		sliderFg.querySelector(".slider-bg").style.width = newBgWidth + "px";
	}
}