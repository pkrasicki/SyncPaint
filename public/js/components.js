import Slider from "./components/slider/slider";

const components = [
	{selector: "ui-slider", component: Slider}
];

// create custom components
const initComponents = () =>
{
	components.forEach(component =>
	{
		customElements.define(component.selector, component.component);
	});
}

export default initComponents;