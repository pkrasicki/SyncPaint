import "../scss/main.scss";
import "../scss/draw.scss";
import "lato-font";
import "../../../node_modules/@fortawesome/fontawesome-free/css/all.css";
import {Brush} from "./tools/brush";
import {Pencil} from "./tools/pencil";
import {PaintRoller} from "./tools/paint-roller";
import {Toolbar} from "./toolbar/toolbar";
import {Notification} from "./notification/notification";
import {NetDrawData} from "./net-draw-data/net-draw-data";

window.addEventListener("load", () =>
{
	const canvas = document.querySelector("#drawArea");
	if (!canvas)
		return;

	const ctx = canvas.getContext("2d");
	const toolbarElement = document.querySelector(".toolbar");
	const drawingUrl = document.querySelector("#drawing-url");
	const saveBtn = document.querySelector("#save");
	const colorPicker = document.querySelector("#color-picker");
	const brushSizeBtn = document.querySelector(".brush-size");
	const brushSizeMenu = document.querySelector(".brush-size-menu");
	const sizeSlider = document.querySelector(".size-slider");
	const sizeValueSpan = document.querySelector(".size-value");

	const canvasWidth = 0.9;
	const canvasHeight = 0.9;
	const defaultBrushSize = 20;
	const defaultPaintColor = "#000000";
	const defaultPaintTool = "Brush";
	var isDrawing = false;
	var paintTool = getTool(defaultPaintTool, defaultBrushSize, defaultPaintColor);
	var canvasScale = {x: 1, y: 1};
	var socket;
	var brushBoundsPreview;

	// set canvas size based on window dimensions
	function setCanvasSize()
	{
		const canvasData = canvas.toDataURL("image/png");
		canvas.height = window.innerHeight * canvasHeight;
		canvas.width = window.innerWidth * canvasWidth;
		loadCanvasData(canvasData);
	}

	// load image from canvasURL
	function loadCanvasData(canvasData)
	{
		var canvasImage = new Image();
		canvasImage.onload = e =>
		{
			ctx.drawImage(canvasImage, 0, 0);
		};

		canvasImage.src = canvasData;
	}

	// toolbar tool icon clicked
	function paintToolSwitch(e)
	{
		const type = e.target.dataset.tooltype;
		var previouslySelected = document.querySelector(".selected");

		if (previouslySelected)
			previouslySelected.classList.remove("selected");

		e.target.classList.add("selected");

		const size = paintTool.size;
		const color = paintTool.color;
		paintTool = getTool(type, size, color);
		updateBrushPreview();
	}

	// color change by clicking a toolbar icon or editing color input
	function paintColorSwitch(e)
	{
		var previouslySelected = document.querySelector(".selected-color");
		
		if (previouslySelected)
			previouslySelected.classList.remove("selected-color");

		e.target.classList.add("selected-color");

		var color;
		if (e.target == colorPicker)
		{
			color = e.target.value;
		} else
		{
			color = e.target.style.backgroundColor;
			colorPicker.parentElement.style.backgroundColor = color;
		}

		paintTool.setColor(color);
		updateBrushPreview();
	}

	function addToolbarIcons()
	{
		var ul = document.createElement("ul");
		toolbarElement.appendChild(ul);

		var isDefaultToolFound = false;
		var isDefaultColorFound = false;
		var toolbar = new Toolbar();

		toolbar.getToolIcons(paintToolSwitch).forEach(icon =>
		{
			if (!isDefaultToolFound && icon.dataset.tooltype == defaultPaintTool)
			{
				icon.classList.add("selected")
				isDefaultToolFound = true;
			}

			ul.appendChild(icon);
		});

		toolbar.getColorIcons(paintColorSwitch).forEach(icon =>
		{
			if (!isDefaultColorFound && icon.dataset.color == defaultPaintColor)
			{
				icon.classList.add("selected-color");
				isDefaultColorFound = true;
			}

			ul.appendChild(icon);
		});
	}

	// get tool object by name
	function getTool(toolName, size, color)
	{
		if (toolName == "Brush")
			return new Brush(size, color);
		else if (toolName == "PaintRoller")
			return new PaintRoller(size, color);
		else if (toolName == "Pencil")
			return new Pencil(size, color);
		else
			return null;
	}

	function onDrawingUrlClicked(e)
	{
		e.preventDefault();

		var textArea = document.createElement("TEXTAREA");
		textArea.value = e.target.dataset.clipboard;
		textArea.classList.add("clipboard");
		e.target.appendChild(textArea);
		textArea.focus();
		textArea.select();

		try
		{
			document.execCommand("copy");
		} catch (err)
		{
			console.error("ERROR: can't copy URL to clipboard");
		}

		e.target.removeChild(textArea);
	}

	function onCanvasMouseMove(e)
	{
		brushBoundsPreview.style.left = (e.clientX - brushBoundsPreview.offsetWidth / 2) + "px";
		brushBoundsPreview.style.top = (e.clientY - brushBoundsPreview.offsetHeight / 2) + "px";

		if (isDrawing)
			paint(getCanvasLocalPos(e));
	}

	// calculate coordinates inside of the canvas
	function getCanvasLocalPos(e)
	{
		var canvasRect = canvas.getBoundingClientRect();
		const correctionOffset = -1; // where is this offset coming from?

		return {
			x: ((e.clientX + correctionOffset) - canvasRect.x) / canvasScale.x,
			y: ((e.clientY + correctionOffset) - canvasRect.y) / canvasScale.y
		};
	}

	// start drawing path
	// isLocal - if the action is done by the local user
	// netDrawData - draw data of another user received over the network
	function startPosition(e, isLocal=true, netDrawData=null)
	{
		var pos;
		if (isLocal)
		{
			pos = getCanvasLocalPos(e);
			socket.emit("drawStart", new NetDrawData(pos.x, pos.y, paintTool));
		} else
		{
			pos = {x: netDrawData.x, y: netDrawData.y};
		}

		if (isLocal)
			isDrawing = true;

		ctx.beginPath();
		ctx.moveTo(pos.x, pos.y);

		if (isLocal)
			paint(pos, isLocal);
		else
			paint(pos, isLocal, netDrawData.tool);
	}

	function endPosition()
	{
		isDrawing = false;
	}

	// isLocal - if the action is done by the local user
	// _tool - tool info of another user received over the network
	function paint(pos, isLocal=true, _tool=paintTool)
	{
		if (!isDrawing && isLocal)
			return;

		ctx.lineWidth = _tool.size;
		ctx.lineCap = _tool.style;
		ctx.strokeStyle = _tool.color;
		ctx.shadowBlur = _tool.blur;
		ctx.shadowColor = _tool.color;
		ctx.lineTo(pos.x, pos.y);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(pos.x, pos.y);

		if (isLocal)
			socket.emit("draw", new NetDrawData(pos.x, pos.y, paintTool));
	}

	// a small element that follows mouse cursor. It visualizes the brush size and shape
	function createBrushPreview()
	{
		brushBoundsPreview = document.createElement("div");
		brushBoundsPreview.classList.add("brush-preview");
		brushBoundsPreview.style.position = "absolute";
		brushBoundsPreview.style.cursor = "crosshair";
		brushBoundsPreview.style.pointerEvents = "none";
		brushBoundsPreview.style.visibility = "hidden";
		brushBoundsPreview.style.borderStyle = "dotted";
		brushBoundsPreview.style.borderWidth = "2px";
		brushBoundsPreview.dataset.brushBoundsPreview = true;

		document.body.appendChild(brushBoundsPreview);

		updateBrushPreview();
	}
	
	function updateBrushPreview()
	{
		document.querySelectorAll(".brush-preview").forEach(item =>
		{
			if(item.dataset.brushBoundsPreview)
			{
				item.style.width = (paintTool.size + paintTool.blur / 2) + "px";
				item.style.height = (paintTool.size + paintTool.blur / 2) + "px";
			} else
			{
				item.style.background = paintTool.color;
				item.style.boxShadow = `0 0 ${paintTool.blur}px ${paintTool.color}`;
			}
	
			if (paintTool.style == "round")
				item.style.borderRadius = "50%";
			else
				item.style.borderRadius = "0";
		});
	}

	// download canvas image
	function onSaveBtnClicked(e)
	{
		e.target.href = canvas.toDataURL("image/png");
	}

	function initializeSocket()
	{
		try
		{
			socket = io();
	
			socket.on("receiveRoomURL", roomUrl =>
			{
				drawingUrl.innerHTML = `${roomUrl} <i class="fas fa-copy url-icon"></i>`;
				drawingUrl.href = roomUrl;
				drawingUrl.dataset.clipboard = roomUrl;
			});
	
			socket.on("userJoin", userName =>
			{
				new Notification(`User ${userName} has joined`);
			});
			
			socket.on("userLeave", userName =>
			{
				new Notification(`User ${userName} has left`);
			});
	
			socket.on("drawStart", netDrawData =>
			{
				startPosition(null, false, netDrawData);
			});
			
			socket.on("draw", netDrawData =>
			{
				paint({x: netDrawData.x, y: netDrawData.y}, false, netDrawData.tool);
			});

			socket.on("canvasRequest", () =>
			{
				socket.emit("receiveCanvas", canvas.toDataURL("image/png"));
			});
			
			socket.on("receiveCanvas", canvasData =>
			{
				loadCanvasData(canvasData);
			});

		} catch (error)
		{
			console.error("ERROR: can't connect to server");
		}
	}

	function brushSizeBtnClicked(e)
	{
		e.preventDefault();

		if (brushSizeMenu.style.visibility == "visible")
		{
			brushSizeMenu.style.visibility = "hidden";
		} else
		{
			brushSizeMenu.style.visibility = "visible";
			var rect = e.target.getBoundingClientRect();
			brushSizeMenu.style.left = (rect.x - brushSizeMenu.offsetWidth / 2) + "px";
		}
	}

	function brushSizeChange(e)
	{
		sizeValueSpan.innerHTML = e.target.value + "px";
		paintTool.setSize(Number(e.target.value));
		updateBrushPreview();
	}

	// window.addEventListener("resize", setCanvasSize);
	canvas.addEventListener("mousemove", onCanvasMouseMove);
	canvas.addEventListener("mouseover", (e) =>
	{
		brushBoundsPreview.style.visibility = "visible";
		brushBoundsPreview.style.left = (e.clientX - brushBoundsPreview.offsetWidth / 2) + "px"
		brushBoundsPreview.style.top = (e.clientY - brushBoundsPreview.offsetHeight / 2) + "px"
	});

	canvas.addEventListener("mouseout", (e) =>
	{
		brushBoundsPreview.style.visibility = "hidden";
	});

	canvas.addEventListener("mousedown", startPosition);
	canvas.addEventListener("mouseup", endPosition);

	window.addEventListener("mouseup", e =>
	{
		isDrawing = false;
	});
	drawingUrl.addEventListener("click", onDrawingUrlClicked);
	saveBtn.addEventListener("click", onSaveBtnClicked);
	colorPicker.addEventListener("change", paintColorSwitch);
	brushSizeBtn.addEventListener("click", brushSizeBtnClicked);
	sizeSlider.addEventListener("input", brushSizeChange);

	initializeSocket();
	setCanvasSize();
	addToolbarIcons();
	createBrushPreview();

	sizeSlider.value = defaultBrushSize;
});