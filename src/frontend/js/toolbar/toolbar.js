export {Toolbar};

class Toolbar
{
	constructor()
	{
		this.icons =
		{
			tools:
			[
				{
					type: "separator",
					tooltip: "tools",
					icon: "fa-toolbox"
				},
				{
					type: "Brush",
					tooltip: "brush",
					icon: "fa-brush"
				},
				{
					type: "PaintRoller",
					tooltip: "paint roller",
					icon: "fa-paint-roller"
				},
				{
					type: "Pencil",
					tooltip: "pencil",
					icon: "fa-pencil-alt"
				},
				{
					type: "Eraser",
					tooltip: "eraser",
					icon: "fa-eraser",
					disabled: true
				},
				{
					type: "Move",
					tooltip: "move",
					icon: "fa-mouse-pointer",
					disabled: true
				},
				{
					type: "Text",
					tooltip: "add text",
					icon: "fa-font",
					disabled: true
				},
				{
					type: "BackgroundImage",
					tooltip: "add background image",
					icon: "fa-image",
					disabled: true
				},
				{
					type: "separator",
					tooltip: "colors",
					icon: "fa-palette"
				}
			],
			colors:
			[
				{
					tooltip: "white",
					icon: "btn-color",
					color: "#ffffff"
				},
				{
					tooltip: "red",
					icon: "btn-color",
					color: "#df3939"
				},
				{
					tooltip: "green",
					icon: "btn-color",
					color: "#3fe23f"
				},
				{
					tooltip: "blue",
					icon: "btn-color",
					color: "#0000ff"
				},
				{
					tooltip: "black",
					icon: "btn-color",
					color: "#000000"
				}
			]
		};
	}

	getToolIcons(clickCallback)
	{
		var icons = [];
		this.icons.tools.forEach(item =>
		{
			var icon = document.createElement("span");
			if (item.icon.startsWith("fa"))
				icon.classList.add("fas");

			icon.classList.add(item.icon);
			icon.title = item.tooltip;
			icon.dataset.tooltype = item.type;

			if (item.type == "separator")
				icon.classList.add("separator");
			else
				icon.classList.add("btn");

			if (item.disabled)
			{
				icon.classList.add("disabled");
				icon.title = "coming soon";
			}

			if (!item.disabled)
				icon.addEventListener("click", clickCallback);

			icons.push(icon);
		});

		return icons;
	}

	getColorIcons(clickCallback, colorPickerChangeCallback)
	{
		var icons = [];

		var colorPicker = document.createElement("li");
		var input = document.createElement("input");
		input.type = "color";
		input.title = "color picker";
		input.classList.add("color-picker");
		input.addEventListener("change", colorPickerChangeCallback);
		colorPicker.appendChild(input);
		icons.push(colorPicker);

		this.icons.colors.forEach(item =>
		{
			var icon = document.createElement("li");
			icon.classList.add(item.icon);
			icon.title = item.tooltip;
			icon.dataset.color = item.color;
			icon.classList.add("btn");
			icon.style.backgroundColor = item.color;
			icon.addEventListener("click", clickCallback);
			
			icons.push(icon);
		});
		
		return icons;
	}
}