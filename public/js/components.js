import Slider from "./components/slider/slider";
import Toolbar from "./components/toolbar/toolbar";

const components = [
	{selector: "ui-slider", component: Slider},
	{selector: "ui-toolbar", component: Toolbar}
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