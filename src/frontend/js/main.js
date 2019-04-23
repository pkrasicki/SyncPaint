import "../scss/main.scss";
import "../scss/draw.scss";
import "lato-font";
import "../../../node_modules/@fortawesome/fontawesome-free/css/all.css";
import {Brush} from "./tools/brush";
import {Pencil} from "./tools/pencil";
import {PaintRoller} from "./tools/paint-roller";
import {Toolbar} from "./toolbar/toolbar";
import {Notification} from "./notification/notification";

window.addEventListener("load", () =>
{
	const canvas = document.querySelector("#drawArea");
	if (!canvas)
		return;

	const ctx = canvas.getContext("2d");
	const cursor = document.querySelector("#cursor");
	const toolbarElement = document.querySelector(".toolbar");
	const drawingUrl = document.querySelector("#drawing-url");
	const saveBtn = document.querySelector("#save");

	const canvasWidth = 0.85;
	const canvasHeight = 0.85;
	const defaultBrushSize = 10;
	const defaultPaintColor = "#000000";
	const defaultPaintTool = "Brush";
	var isDrawing = false;
	var paintTool = getTool(defaultPaintTool, defaultBrushSize, defaultPaintColor);
	var canvasScale = {x: 1, y: 1};
	var socket;

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
		updateCursorShape();
	}

	// toolbar color icon clicked
	function paintColorSwitch(e)
	{
		var previouslySelected = document.querySelector(".selected-color");
		
		if (previouslySelected)
			previouslySelected.classList.remove("selected-color");

		e.target.classList.add("selected-color");

		paintTool.setColor(e.target.style.backgroundColor);
		updateCursorColor();
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

		toolbar.getColorIcons(paintColorSwitch, colorPickerChange).forEach(icon =>
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
		cursor.style.left = (e.clientX - cursor.offsetWidth / 2) + "px";
		cursor.style.top = (e.clientY - cursor.offsetHeight / 2) + "px";

		if (isDrawing)
			paint(getCanvasLocalPos(e));
	}

	// calculate coordinates inside of the canvas
	function getCanvasLocalPos(e)
	{
		var canvasRect = canvas.getBoundingClientRect();
		return {
			x: (e.clientX - canvasRect.x) / canvasScale.x,
			y: (e.clientY - canvasRect.y) / canvasScale.y
		};
	}

	// start drawing path
	// isLocal - if the action is done by the local user
	// _pos - drawing coordinates of another user received over the network
	function startPosition(e, isLocal=true, _pos=null)
	{
		var pos;
		if (isLocal)
		{
			pos = getCanvasLocalPos(e);
			socket.emit("drawStart", {x: pos.x, y: pos.y});
		} else
		{
			pos = _pos;
		}

		isDrawing = true;
		ctx.beginPath();
		ctx.moveTo(pos.x, pos.y);
		paint(pos, isLocal);
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

		ctx.lineTo(pos.x, pos.y);
		ctx.lineWidth = _tool.size;
		ctx.lineCap = _tool.style;
		ctx.strokeStyle = _tool.color;
		ctx.shadowBlur = _tool.blur;
		ctx.shadowColor = _tool.color;
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(pos.x, pos.y);

		if (isLocal)
			socket.emit("draw", {x: pos.x, y: pos.y, tool: _tool});
	}

	// cursor is a small element that follows mouse cursor. It's a preview of currently selected brush
	function createCursor()
	{
		cursor.style.position = "absolute";
		cursor.style.cursor = "crosshair";
		cursor.style.pointerEvents = "none";
		cursor.style.visibility = "hidden";
		cursor.style.top = (window.height / 2) + "px";
		cursor.style.left = (window.width / 2) + "px";

		updateCursorColor();
		updateCursorShape();
	}

	function updateCursorColor()
	{
		cursor.style.background = paintTool.color;
	}

	function updateCursorShape()
	{
		cursor.style.width = paintTool.size + "px";
		cursor.style.height = paintTool.size + "px";
		cursor.style.boxShadow = `0 0 ${paintTool.blur}px ${paintTool.color}`;

		if (paintTool.style == "round")
			cursor.style.borderRadius = "50px";
		else
			cursor.style.borderRadius = "0";
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
	
			socket.on("drawStart", data =>
			{
				startPosition(null, false, data);
			});
			
			socket.on("draw", data =>
			{
				paint({x: data.x, y: data.y}, false, data.tool);
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

	function colorPickerChange(e)
	{
		var prevSelected = document.querySelectorAll(".selected-color");
		prevSelected.forEach(item =>
		{
			item.classList.remove("selected-color");
		});
		e.target.classList.add("selected-color");
		paintTool.setColor(e.target.value);
		updateCursorColor();
	}

	canvas.addEventListener("mousemove", onCanvasMouseMove);
	canvas.addEventListener("mouseover", (e) =>
	{
		cursor.style.visibility = "visible";
	});

	canvas.addEventListener("mouseout", (e) =>
	{
		cursor.style.visibility = "hidden";
	});

	// window.addEventListener("resize", setCanvasSize);
	window.addEventListener("mouseup", e =>
	{
		isDrawing = false;
	});
	canvas.addEventListener("mousedown", startPosition);
	canvas.addEventListener("mouseup", endPosition);
	drawingUrl.addEventListener("click", onDrawingUrlClicked);
	saveBtn.addEventListener("click", onSaveBtnClicked);

	initializeSocket();
	setCanvasSize();
	addToolbarIcons();
	createCursor();
});