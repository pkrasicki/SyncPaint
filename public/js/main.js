import "../scss/main.scss";
import "../scss/draw.scss";
import "lato-font";
import "../../node_modules/@fortawesome/fontawesome-free/css/all.css";
import "../favicon.ico";
import {Brush} from "./tools/brush";
import {Pencil} from "./tools/pencil";
import {PaintRoller} from "./tools/paint-roller";
import {Eraser} from "./tools/eraser";
import {Text} from "./tools/text";
import {Fill} from "./tools/fill";
import {Notification} from "./notification/notification";
import {NotificationSystem} from "./notification/notification-system";
import {DrawingData} from "./models/drawing-data";
import {Slider} from "./components/slider/slider";
import {BackgroundModal} from "./components/background-modal/background-modal";

const CANVAS_SIZE = 0.9;
const CANVAS_SIZE_MEDIUM = 0.85;
const CANVAS_SIZE_SMALL = 0.8;
const MEDIUM_SIZE_PX = 550;
const SMALL_SIZE_PX = 420;
const DEFAULT_BRUSH_SIZE = 20;
const DEFAULT_PAINT_COLOR = "#000000";
const DEFAULT_PAINT_TOOL = "Brush";
const notificationSystem = new NotificationSystem();
let canvas, socket, ctx, bgCtx, colorPicker, backgroundSelectionModal, sizeValueSpan,
	brushSizeMenu, roomUrlLink;
let isDrawing = false;
let paintTool = getTool(DEFAULT_PAINT_TOOL, DEFAULT_BRUSH_SIZE, DEFAULT_PAINT_COLOR);
let drawingStartPos = {x: 0, y: 0};
let drawingEndPos = {x: 0, y: 0};
let isSavingCanvas = false;
let sliderMousePressed = false;
let lastSelectedSlider;
let touchJustEnded = false;
let isFirstJoin = true;

// calculate canvas size based on window dimensions
function defaultCanvasSize()
{
	let newWidth = window.innerWidth * CANVAS_SIZE;
	let newHeight = window.innerHeight * CANVAS_SIZE;

	if (window.innerWidth < SMALL_SIZE_PX)
		newWidth = window.innerWidth * CANVAS_SIZE_SMALL;
	else if (window.innerWidth < MEDIUM_SIZE_PX)
		newWidth = window.innerWidth * CANVAS_SIZE_MEDIUM;

	if (window.innerHeight < SMALL_SIZE_PX)
		newHeight = window.innerHeight * CANVAS_SIZE_SMALL;
	else if (window.innerHeight < MEDIUM_SIZE_PX)
		newHeight = window.innerHeight * CANVAS_SIZE_MEDIUM;

	newWidth = Math.round(newWidth);
	newHeight = Math.round(newHeight);

	return {width: newWidth, height: newHeight};
}

// makes sure canvas is never obscured by toolbar and navbar
function repositionCanvas()
{
	const canvasLayersRect = document.querySelector(".canvas-layers").getBoundingClientRect();

	if (canvas.width > canvasLayersRect.width)
	{
		canvas.style.left = "0px";
		bgCanvas.style.left = "0px";

	} else
	{
		canvas.style.left = "initial";
		bgCanvas.style.left = "initial";
	}

	if (canvas.height > canvasLayersRect.height)
	{
		canvas.style.top = "0px";
		bgCanvas.style.top = "0px";

	} else
	{
		canvas.style.top = "initial";
		bgCanvas.style.top = "initial";
	}
}

function setCanvasSize(size)
{
	const canvasData = canvas.toDataURL("image/png");
	const bgData = bgCanvas.toDataURL("image/png");
	canvas.height = size.height;
	canvas.width = size.width;
	bgCanvas.height = size.height;
	bgCanvas.width = size.width;
	repositionCanvas();
	loadCanvasData(ctx, canvasData);
	loadCanvasData(bgCtx, bgData);

	document.querySelector("#canvas-width").value = size.width;
	document.querySelector("#canvas-height").value = size.height;
}

// load image from canvasURL
function loadCanvasData(ctx, canvasData)
{
	let canvasImage = new Image();
	canvasImage.onload = () =>
	{
		ctx.drawImage(canvasImage, 0, 0);
	};

	canvasImage.src = canvasData;
}

// toolbar tool icon clicked
function paintToolSwitch(e)
{
	const type = e.currentTarget.dataset.tooltype;

	// background image is not a tool
	if (type == "BackgroundImage")
		return;

	let previouslySelected = document.querySelector(".selected");

	if (previouslySelected)
		previouslySelected.classList.remove("selected");

	e.target.classList.add("selected");

	paintTool = getTool(type, paintTool.size, paintTool.color);
	updateBrushPreview();
}

// color change by clicking a toolbar icon or editing color input
function paintColorChanged(e)
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
		color = e.target.dataset.color;
		colorPicker.parentElement.style.backgroundColor = color;
	}

	paintTool.setColor(color);
	updateBrushPreview();
}

// makes toolbar icons clickable
function initToolbarIcons(toolbar)
{
	var isDefaultToolFound = false;
	const toolIcons = toolbar.querySelectorAll("ul > li i.btn-tool");
	toolIcons.forEach(icon =>
	{
		const listItem = icon.parentElement;
		if (!isDefaultToolFound && listItem.dataset.tooltype == DEFAULT_PAINT_TOOL)
		{
			icon.classList.add("selected");
			isDefaultToolFound = true;
		}

		if (listItem.dataset.tooltype == "BackgroundImage")
			listItem.addEventListener("click", () => backgroundSelectionModal.toggle());

		if (!icon.classList.contains("disabled"))
			listItem.addEventListener("click", paintToolSwitch);
	});

	var isDefaultColorFound = false;
	const toolbarColors = toolbar.querySelectorAll(".btn-color");
	toolbarColors.forEach(item =>
	{
		if (!isDefaultColorFound && item.dataset.color == DEFAULT_PAINT_COLOR)
		{
			item.classList.add("selected-color");
			isDefaultColorFound = true;
		}

		item.style.backgroundColor = item.dataset.color;
		item.addEventListener("click", paintColorChanged);
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
	else if (toolName == "Eraser")
		return new Eraser(size, color);
	else if (toolName == "Text")
		return new Text(size, color);
	else if (toolName == "Fill")
		return new Fill(size, color);
	else
	{
		console.error("wrong tool name:", toolName);
		return null;
	}
}

function roomUrlClicked(e)
{
	e.preventDefault();

	var textArea = document.createElement("TEXTAREA");
	textArea.value = e.currentTarget.dataset.clipboard;
	textArea.classList.add("clipboard");
	e.currentTarget.appendChild(textArea);
	textArea.focus();
	textArea.select();

	try
	{
		document.execCommand("copy");
	} catch (err)
	{
		console.error("ERROR: can't copy URL to clipboard");
	}

	e.currentTarget.removeChild(textArea);
}

// handles mouse move and touch move
function canvasMouseMoved(e)
{
	const brushPreview = document.querySelector(".brush-preview");
	brushPreview.style.left = (e.clientX - brushPreview.offsetWidth / 2) + "px";
	brushPreview.style.top = (e.clientY - brushPreview.offsetHeight / 2) + "px";

	if (isDrawing)
	{
		let posX, posY;
		let numTouches;
		let rect;

		if (e.type == "touchmove")
		{
			numTouches = e.touches.length;
			rect = e.target.getBoundingClientRect();
		} else
		{
			posX = e.offsetX;
			posY = e.offsetY;
			numTouches = 1;
		}

		for (let i = 0; i < numTouches; i++)
		{
			if (e.type == "touchmove")
			{
				posX = e.touches[i].pageX - rect.left;
				posY = e.touches[i].pageY - rect.top;
			}

			drawingEndPos.x = posX;
			drawingEndPos.y = posY;

			var drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool);
			draw(drawingData);
			socket.emit("draw", drawingData);

			drawingStartPos.x = posX;
			drawingStartPos.y = posY;
		}
	}
}

function canvasMouseDown(e)
{
	// return if this was triggered by automatic mousedown event after touch start
	if (touchJustEnded)
		return;

	let posX = e.offsetX;
	let posY = e.offsetY;

	if (e.type == "touchstart")
	{
		posX = e.touches[i].pageX - rect.left;
		posY = e.touches[i].pageY - rect.top;
	}

	drawSinglePoint(posX, posY);
}

function canvasTouchStart(e)
{
	let posX, posY;
	let numTouches = e.touches.length;
	let rect = e.target.getBoundingClientRect();

	for (let i = 0; i < numTouches; i++)
	{
		if (e.type == "touchstart")
		{
			posX = e.touches[i].pageX - rect.left;
			posY = e.touches[i].pageY - rect.top;
		}

		drawSinglePoint(posX, posY);
	}
}

// handles mouse up and touch end
function canvasMouseUp(e)
{
	if (e.type == "mouseup" && touchJustEnded)
	{
		touchJustEnded = false;
		return;
	}

	isDrawing = false;
	sliderMousePressed = false;
}

function canvasTouchEnded(e)
{
	canvasMouseUp(e);
	touchJustEnded = true;
}

function canvasMouseOver(e)
{
	const brushPreview = document.querySelector(".brush-preview");
	brushPreview.style.visibility = "visible";
	brushPreview.style.left = (e.clientX - brushPreview.offsetWidth / 2) + "px";
	brushPreview.style.top = (e.clientY - brushPreview.offsetHeight / 2) + "px";
}

function canvasMouseOut()
{
	document.querySelector(".brush-preview").style.visibility = "hidden";
}

function draw(drawingData)
{
	ctx.globalCompositeOperation = drawingData.tool.operation;
	ctx.lineWidth = drawingData.tool.size;
	ctx.lineCap = drawingData.tool.style;
	ctx.strokeStyle = drawingData.tool.color;
	ctx.shadowBlur = drawingData.tool.blur;
	ctx.shadowColor = drawingData.tool.color;

	if (drawingData.text != null && drawingData.text != "")
	{
		ctx.font = `${drawingData.tool.size}px sans-serif`;
		ctx.fillStyle = drawingData.tool.color;
		ctx.fillText(drawingData.text, drawingData.startPos.x, drawingData.startPos.y);
	} else if (drawingData.fill)
	{
		let fillTool = new Fill(drawingData.tool.size, drawingData.tool.color);
		fillTool.fill(ctx, drawingData.startPos.x, drawingData.startPos.y);
	} else
	{
		ctx.beginPath();
		ctx.moveTo(drawingData.startPos.x, drawingData.startPos.y);
		ctx.lineTo(drawingData.endPos.x, drawingData.endPos.y);
		ctx.stroke();
	}
}

function drawSinglePoint(posX, posY)
{
	drawingStartPos.x = posX;
	drawingStartPos.y = posY;
	drawingEndPos.x = posX;
	drawingEndPos.y = posY;

	if (paintTool instanceof Text == false && paintTool instanceof Fill == false) // regular brush tools
	{
		isDrawing = true;
		let drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool);
		draw(drawingData);
		socket.emit("draw", drawingData);

	} else if (paintTool instanceof Fill) // fill tool
	{
		let drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool, null, true);
		draw(drawingData);
		socket.emit("draw", drawingData);
	}
}

// an element that follows mouse cursor. It visualizes the brush size and shape
function createBrushPreview()
{
	const brushPreview = document.createElement("div");
	brushPreview.classList.add("brush-preview");
	document.body.appendChild(brushPreview);
	updateBrushPreview();
}

function updateBrushPreview()
{
	const size = paintTool.size;
	const blur = paintTool.blur;
	const color = paintTool.color;
	const style = paintTool.style;

	const colorPreview = document.querySelector(".color-preview");
	colorPreview.style.background = color;

	const brushPreview = document.querySelector(".brush-preview");
	brushPreview.style.width = (size + blur / 2) + "px";
	brushPreview.style.height = (size + blur / 2) + "px";

	if (style == "round")
		brushPreview.style.borderRadius = "50%";
	else
		brushPreview.style.borderRadius = "0";

	if (paintTool instanceof Text)
	{
		brushPreview.style.display = "none";
		canvas.style.cursor = "text";
	} else if (paintTool instanceof Fill)
	{
		brushPreview.style.display = "none";
		canvas.style.cursor = "crosshair";
	} else
	{
		brushPreview.style.display = "initial";
		canvas.style.cursor = "default";
	}
}

// download canvas image
function saveBtnClicked(e)
{
	if (isSavingCanvas)
	{
		isSavingCanvas = false;
		return;
	}

	e.preventDefault();

	let backgroundImage = new Image();
	let image = new Image();
	let currentTarget = e.currentTarget;

	backgroundImage.onload = () =>
	{
		image.src = canvas.toDataURL("image/png");
	};

	image.onload = () =>
	{
		let tempCanvas = document.createElement("canvas");
		let tempCtx = tempCanvas.getContext("2d");
		tempCanvas.width = canvas.width;
		tempCanvas.height = canvas.height;
		tempCtx.drawImage(backgroundImage, 0, 0);
		tempCtx.drawImage(image, 0, 0);

		currentTarget.href = tempCanvas.toDataURL("image/png");
		isSavingCanvas = true;
		currentTarget.click();
	};

	backgroundImage.src = bgCanvas.toDataURL("image/png");
}

function updateDisplayedRoomUrl(fullRoomUrl, roomName)
{
	let regex = /^https?:\/\/(www\.)?/;
	let domainName = fullRoomUrl.replace(regex, "");
	domainName = domainName.replace(/\/.*$/, "");
	let displayName = `${domainName}/${roomName}`;

	if (window.innerWidth < MEDIUM_SIZE_PX)
		displayName = `${roomName}`;

	roomUrlLink.querySelector(".url-container span").innerHTML = displayName;
}

// connect to websocket
function initializeSocket()
{
	try
	{
		socket = io();

		socket.on("receiveRoomURL", (fullRoomUrl, roomName, userName, numUsers) =>
		{
			updateDisplayedRoomUrl(fullRoomUrl, roomName);
			roomUrlLink.href = fullRoomUrl;
			roomUrlLink.dataset.clipboard = fullRoomUrl;
			document.title = `SyncPaint - ${roomName}`;
			document.querySelector(".options-panel input").value = userName;

			// if it's the first user in a room set their foreground to white instead of default transparent
			if (numUsers <= 1 && isFirstJoin)
				setLocalForegroundColor("white");

			isFirstJoin = false;
		});

		socket.on("userJoin", userName =>
		{
			notificationSystem.add(new Notification(`User ${userName} has joined`));
		});

		socket.on("userLeave", userName =>
		{
			notificationSystem.add(new Notification(`User ${userName} has left`));
		});

		socket.on("draw", drawingData =>
		{
			draw(drawingData);
		});

		socket.on("canvasRequest", () =>
		{
			socket.emit("receiveCanvas", canvas.toDataURL("image/png"), canvas.width, canvas.height);
		});

		socket.on("backgroundCanvasRequest", () =>
		{
			socket.emit("receiveBackgroundCanvas", bgCanvas.toDataURL("image/png"));
		});

		socket.on("receiveCanvas", (canvasData, width, height) =>
		{
			setCanvasSize({width: width, height: height});
			loadCanvasData(ctx, canvasData);
		});

		socket.on("receiveCanvasSize", (width, height) =>
		{
			setCanvasSize({width: width, height: height});
		});

		socket.on("receiveBackgroundCanvas", bgCanvasData =>
		{
			loadCanvasData(bgCtx, bgCanvasData);
		});

		socket.on("setAdmin", isAdmin =>
		{
			const adminSettings = document.querySelector("#admin-settings");
			if (isAdmin == true)
			{
				if (adminSettings.classList.contains("hidden"))
					adminSettings.classList.remove("hidden");
			} else
			{
				if (!adminSettings.classList.contains("hidden"))
					adminSettings.classList.add("hidden");
			}
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

		var rect = brushSizeMenu.getBoundingClientRect();
		var parentRect = brushSizeMenu.parentElement.getBoundingClientRect();
		var posX = parentRect.left + (parentRect.width / 2) - (rect.width / 2);

		if (posX < 0)
			posX = 0;

		brushSizeMenu.style.left = posX + "px";
	}
}

function addCanvasBackgroundImage()
{
	backgroundSelectionModal.hide();

	const imagePreview = document.querySelector("#bg-image-preview");
	loadCanvasData(bgCtx, imagePreview.src);
	socket.emit("receiveBackgroundCanvasAll", imagePreview.src);
}

function setLocalForegroundColor(color)
{
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function settingsBtnClicked(e)
{
	e.preventDefault();

	const panel = document.querySelector(".options-panel");
	if (panel.style.visibility == "visible")
	{
		panel.style.visibility = "hidden";
	} else
	{
		panel.style.visibility = "visible";

		const rect = panel.getBoundingClientRect();
		const parentRect = panel.parentElement.getBoundingClientRect();
		let posX = parentRect.left + (parentRect.width / 2) - (rect.width / 2);

		if (posX + rect.width > window.innerWidth)
			posX = window.innerWidth - rect.width;

		panel.style.left = `${posX}px`;
	}
}

// name changed by user
function userNameChanged(e)
{
	socket.emit("userNameChange", e.target.value);
	const cookieMaxAge = 60*60*24*30;
	document.cookie = `userName=${e.target.value}; max-age=${cookieMaxAge}`;
}

function windowResized()
{
	document.querySelector(".options-panel").style.visibility = "hidden";
	brushSizeMenu.style.visibility = "hidden";

	// there are two size sliders but only one is displayed at the time
	// which slider is displayed depends on window size
	// we don't know if any of them just became visible/invisible so update both with every window resize
	document.querySelectorAll(".size-slider").forEach((slider) =>
	{
		Slider.updatePosition(slider.querySelector(".slider-fg"), paintTool.size);
	});

	repositionCanvas();
}

// slider value changed by user
function sizeSliderChanged(e)
{
	let posX;

	if (e.type == "touchmove")
	{
		posX = e.touches[0].clientX;
	} else
	{
		posX = e.clientX;
	}
	
	let size = Slider.update(lastSelectedSlider, posX);
	sizeValueSpan.innerHTML = size + "px";
	paintTool.setSize(size);
	updateBrushPreview();
}

// make sliders usable
function initSliders()
{
	document.querySelectorAll(".size-slider").forEach((slider) =>
	{
		slider.dataset.value = DEFAULT_BRUSH_SIZE;
		slider.addEventListener("click", sizeSliderChanged);
	});

	document.querySelectorAll(".slider").forEach((slider) =>
	{
		Slider.init(slider);
		slider.addEventListener("mousedown", (e) =>
		{
			lastSelectedSlider = e.currentTarget;
			sliderMousePressed = true;
		});

		slider.addEventListener("touchstart", (e) =>
		{
			lastSelectedSlider = e.currentTarget;
			sliderMousePressed = true;
		});

		slider.addEventListener("touchmove", (e) =>
		{
			if (sliderMousePressed)
				sizeSliderChanged(e);
		});
	});
}

function windowMouseMoved(e)
{
	if (sliderMousePressed)
		sizeSliderChanged(e);
}

function keyPressed(e)
{
	if (paintTool instanceof Text)
	{
		if (e.key == "Enter")
		{
			drawingStartPos.x = drawingEndPos.x;
			drawingStartPos.y += paintTool.size;
		} else
		{
			const drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool, e.key);
			draw(drawingData);
			socket.emit("draw", drawingData);
			drawingStartPos.x += ctx.measureText(e.key).width;
		}
	}
}

// ask user for confirmation when they try to leave the page
function beforeWindowUnloaded(e)
{
	e.preventDefault();
	e.returnValue = "";
}

// user edited canvas size input
function canvasSizeSettingChanged(e)
{
	const applyBtn = document.querySelector("#canvas-size-apply");
	if (applyBtn.classList.contains("disabled"))
		applyBtn.classList.remove("disabled");

	applyBtn.disabled = false;
}

function applyCanvasSize(e)
{
	const applyBtn = document.querySelector("#canvas-size-apply");
	if (!applyBtn.classList.contains("disabled"))
		applyBtn.classList.add("disabled");

	applyBtn.disabled = true;
	let width = Math.round(document.querySelector("#canvas-width").value);
	let height = Math.round(document.querySelector("#canvas-height").value);
	setCanvasSize({width: width, height: height});
	socket.emit("setCanvasSize", width, height);
}

window.addEventListener("load", () =>
{
	canvas = document.querySelector("#drawArea");
	const bgCanvas = document.querySelector("#bgCanvas");
	if (!canvas)
		return;

	ctx = canvas.getContext("2d");
	bgCtx = bgCanvas.getContext("2d");
	const toolbar = document.querySelector(".toolbar");
	roomUrlLink = document.querySelector("#room-url");
	const saveBtn = document.querySelector("#save");
	colorPicker = document.querySelector("#color-picker");
	const brushSizeBtn = document.querySelector(".brush-size");
	brushSizeMenu = document.querySelector(".brush-size-menu");
	sizeValueSpan = document.querySelector(".size-value");
	backgroundSelectionModal = new BackgroundModal("background-modal");
	const settingsBtn = document.querySelector("#settings");
	const nameInput = document.querySelector(".options-panel input");

	window.addEventListener("resize", windowResized);
	window.addEventListener("mouseup", canvasMouseUp);
	window.addEventListener("touchend", canvasMouseUp);
	window.addEventListener("mousemove", windowMouseMoved);
	window.addEventListener("keypress", keyPressed);
	window.addEventListener("beforeunload", beforeWindowUnloaded);
	canvas.addEventListener("mousemove", canvasMouseMoved);
	canvas.addEventListener("touchmove", canvasMouseMoved);
	canvas.addEventListener("mouseover", canvasMouseOver);
	canvas.addEventListener("mouseout", canvasMouseOut);
	canvas.addEventListener("mousedown", canvasMouseDown);
	canvas.addEventListener("touchstart", canvasTouchStart);
	canvas.addEventListener("mouseup", canvasMouseUp);
	canvas.addEventListener("touchend", canvasTouchEnded);
	roomUrlLink.addEventListener("click", roomUrlClicked);
	saveBtn.addEventListener("click", saveBtnClicked);
	colorPicker.addEventListener("change", paintColorChanged);
	brushSizeBtn.addEventListener("click", brushSizeBtnClicked);
	document.getElementById("add-image").addEventListener("click", addCanvasBackgroundImage);
	settingsBtn.addEventListener("click", settingsBtnClicked);
	nameInput.addEventListener("change", userNameChanged);
	document.querySelector("#canvas-width").addEventListener("input", canvasSizeSettingChanged);
	document.querySelector("#canvas-height").addEventListener("input", canvasSizeSettingChanged);
	document.querySelector("#canvas-size-apply").addEventListener("click", applyCanvasSize);

	initializeSocket();
	setCanvasSize(defaultCanvasSize());
	initToolbarIcons(toolbar);
	createBrushPreview();
	initSliders();
});