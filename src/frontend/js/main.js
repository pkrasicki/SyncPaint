import "../scss/main.scss";
import "../scss/draw.scss";
import "lato-font";
import "../../../node_modules/@fortawesome/fontawesome-free/css/all.css";
import "../favicon.ico";
import {Brush} from "./tools/brush";
import {Pencil} from "./tools/pencil";
import {PaintRoller} from "./tools/paint-roller";
import {Eraser} from "./tools/eraser";
import {Notification} from "./notification/notification";
import {NotificationSystem} from "./notification/notification-system";
import {DrawingData} from "./drawing-data/drawing-data";

const CANVAS_SIZE = 0.9;
const CANVAS_SIZE_MEDIUM = 0.85;
const CANVAS_SIZE_SMALL = 0.8;
const MEDIUM_SIZE_PX = 550;
const SMALL_SIZE_PX = 420;
const DEFAULT_BRUSH_SIZE = 20;
const DEFAULT_PAINT_COLOR = "#000000";
const DEFAULT_PAINT_TOOL = "Brush";
const notificationSystem = new NotificationSystem();
var canvas, socket, ctx, brushBoundsPreview, bgCtx, colorPicker, backgroundSelectionModal,
	sizeValueSpan, brushSizeMenu, backgroundDropArea, roomUrlLink;
var isDrawing = false;
var paintTool = getTool(DEFAULT_PAINT_TOOL, DEFAULT_BRUSH_SIZE, DEFAULT_PAINT_COLOR);
var drawingStartPos = {x: 0, y: 0};
var drawingEndPos = {x: 0, y: 0};
var isSavingCanvas = false;

// set canvas size based on window dimensions
function setCanvasSize()
{
	const canvasData = canvas.toDataURL("image/png");
	const bgData = bgCanvas.toDataURL("image/png");
	var newHeight = window.innerHeight * CANVAS_SIZE;
	var newWidth = window.innerWidth * CANVAS_SIZE;

	if (window.innerWidth < SMALL_SIZE_PX)
		newWidth = window.innerWidth * CANVAS_SIZE_SMALL;
	else if (window.innerWidth < MEDIUM_SIZE_PX)
		newWidth = window.innerWidth * CANVAS_SIZE_MEDIUM;

	if (window.innerHeight < SMALL_SIZE_PX)
		newHeight = window.innerHeight * CANVAS_SIZE_SMALL;
	else if (window.innerHeight < MEDIUM_SIZE_PX)
		newHeight = window.innerHeight * CANVAS_SIZE_MEDIUM;

	canvas.height = newHeight;
	canvas.width = newWidth;
	bgCanvas.height = newHeight;
	bgCanvas.width = newWidth;
	loadCanvasData(ctx, canvasData);
	loadCanvasData(bgCtx, bgData);
}

// load image from canvasURL
function loadCanvasData(ctx, canvasData)
{
	var canvasImage = new Image();
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

	var previouslySelected = document.querySelector(".selected");

	if (previouslySelected)
		previouslySelected.classList.remove("selected");

	e.target.classList.add("selected");

	paintTool = getTool(type, paintTool.size, paintTool.color);
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

function createToolbar(toolbar)
{
	fetch("toolbar.html")
	.then(res => res.text())
	.then(html =>
	{
		toolbar.insertAdjacentHTML("beforeend", html);
		addToolbarIcons(toolbar);
	})
	.catch(err =>
	{
		console.error("ERROR: can't load toolbar: ", err);
	});
}

function addToolbarIcons(toolbar)
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
			listItem.addEventListener("click", showBackgroundSelectionModal);

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
		item.addEventListener("click", paintColorSwitch);
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

function canvasMouseMoved(e)
{
	brushBoundsPreview.style.left = (e.clientX - brushBoundsPreview.offsetWidth / 2) + "px";
	brushBoundsPreview.style.top = (e.clientY - brushBoundsPreview.offsetHeight / 2) + "px";

	if (isDrawing)
	{
		drawingEndPos.x = e.offsetX;
		drawingEndPos.y = e.offsetY;

		var drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool);
		draw(drawingData);
		socket.emit("draw", drawingData);

		drawingStartPos.x = e.offsetX;
		drawingStartPos.y = e.offsetY;
	}
}

function canvasMouseDown(e)
{
	isDrawing = true;
	var posX = e.offsetX;
	var posY = e.offsetY;
	drawingStartPos.x = posX;
	drawingStartPos.y = posY;
	drawingEndPos.x = posX;
	drawingEndPos.y = posY;

	var drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool);
	draw(drawingData);
	socket.emit("draw", drawingData);
}

function canvasMouseUp()
{
	isDrawing = false;
}

function canvasMouseOver(e)
{
	brushBoundsPreview.style.visibility = "visible";
	brushBoundsPreview.style.left = (e.clientX - brushBoundsPreview.offsetWidth / 2) + "px";
	brushBoundsPreview.style.top = (e.clientY - brushBoundsPreview.offsetHeight / 2) + "px";
}

function canvasMouseOut()
{
	brushBoundsPreview.style.visibility = "hidden";
}

function draw(drawingData)
{
	ctx.globalCompositeOperation = drawingData.tool.operation;
	ctx.lineWidth = drawingData.tool.size;
	ctx.lineCap = drawingData.tool.style;
	ctx.strokeStyle = drawingData.tool.color;
	ctx.shadowBlur = drawingData.tool.blur;
	ctx.shadowColor = drawingData.tool.color;
	ctx.beginPath();
	ctx.moveTo(drawingData.startPos.x, drawingData.startPos.y);
	ctx.lineTo(drawingData.endPos.x, drawingData.endPos.y);
	ctx.stroke();
}

// a small element that follows mouse cursor. It visualizes the brush size and shape
function createBrushPreview()
{
	brushBoundsPreview = document.createElement("div");
	brushBoundsPreview.classList.add("brush-preview");
	brushBoundsPreview.classList.add("brush-preview-follower");
	brushBoundsPreview.dataset.brushBoundsPreview = true;

	document.body.appendChild(brushBoundsPreview);

	updateBrushPreview();
}

function updateBrushPreview()
{
	const size = paintTool.size;
	const blur = paintTool.blur;
	const color = paintTool.color;
	const style = paintTool.style;

	document.querySelectorAll(".brush-preview").forEach(item =>
	{
		if(item.dataset.brushBoundsPreview)
		{
			item.style.width = (size + blur / 2) + "px";
			item.style.height = (size + blur / 2) + "px";
		} else
		{
			item.style.background = color;
			item.style.boxShadow = `0 0 ${blur}px ${color}`;
		}

		if (style == "round")
			item.style.borderRadius = "50%";
		else
			item.style.borderRadius = "0";
	});
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

	var backgroundImage = new Image();
	var image = new Image();
	var currentTarget = e.currentTarget;

	backgroundImage.onload = () =>
	{
		image.src = canvas.toDataURL("image/png");
	};

	image.onload = () =>
	{
		var tempCanvas = document.createElement("canvas");
		var tempCtx = tempCanvas.getContext("2d");
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
	var regex = /^https?:\/\/(www\.)?/;
	var domainName = fullRoomUrl.replace(regex, "");
	domainName = domainName.replace(/\/.*$/, "");
	var displayName = `${domainName}/${roomName}`;

	if (window.innerWidth < 500)
		displayName = `.../${roomName}`;

	roomUrlLink.querySelector(".url-container span").innerHTML = displayName;
}

// connect to websocket
function initializeSocket()
{
	try
	{
		socket = io();

		socket.on("receiveRoomURL", (fullRoomUrl, roomName, userName) =>
		{
			updateDisplayedRoomUrl(fullRoomUrl, roomName);
			roomUrlLink.href = fullRoomUrl;
			roomUrlLink.dataset.clipboard = fullRoomUrl;
			document.querySelector(".options-panel input").value = userName;
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
			socket.emit("receiveCanvas", canvas.toDataURL("image/png"));
		});

		socket.on("backgroundCanvasRequest", () =>
		{
			socket.emit("receiveBackgroundCanvas", bgCanvas.toDataURL("image/png"));
		});

		socket.on("receiveCanvas", canvasData =>
		{
			loadCanvasData(ctx, canvasData);
		});

		socket.on("receiveBackgroundCanvas", bgCanvasData =>
		{
			loadCanvasData(bgCtx, bgCanvasData);
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

		var offset = 90;
		if (window.innerWidth < 500)
			offset = 85;
		if (window.innerWidth < 400)
			offset = 65;
		if (window.innerWidth < 300)
			offset = 45;

		brushSizeMenu.style.left = (e.currentTarget.offsetLeft - offset) + "px";
	}
}

function brushSizeChange(e)
{
	sizeValueSpan.innerHTML = e.target.value + "px";
	paintTool.setSize(Number(e.target.value));
	updateBrushPreview();
}

function showBackgroundSelectionModal()
{
	backgroundSelectionModal.style.left = (window.innerWidth / 4) + "px";
	backgroundSelectionModal.style.top = (window.innerHeight / 4) + "px";
	backgroundSelectionModal.style.display = "block";

	document.querySelectorAll(".hide-on-drop").forEach(item =>
	{
		item.style.display = "initial";
	});
	backgroundDropArea.style.borderWidth = "1px";
	document.querySelector(".drop-area p").style.display = "block";

	var imagePreview = document.querySelector("#bg-image-preview");
	if (imagePreview)
		backgroundDropArea.removeChild(imagePreview);
}

function hideBackgroundSelectionModal()
{
	backgroundSelectionModal.style.display = "none";
}

function addCanvasBackgroundImage()
{
	hideBackgroundSelectionModal();

	var imagePreview = document.querySelector("#bg-image-preview");
	if (!imagePreview)
		return;

	loadCanvasData(bgCtx, imagePreview.src);
	socket.emit("receiveBackgroundCanvasAll", imagePreview.src);
}

function imageDraggedOver(e)
{
	e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
}

// image dropped into add image modal
function imageDropped(e)
{
	e.preventDefault();
	var files = e.dataTransfer.files;
	for (var i = 0; i < files.length; i++)
	{
		var file = files[i];
		if (file.type.match(/image*/))
		{
			var reader = new FileReader();
			reader.onload = (readerEv) =>
			{
				var imagePreview = document.querySelector("#bg-image-preview");
				if (!imagePreview)
				{
					imagePreview = document.createElement("img");
					imagePreview.id = "bg-image-preview";
					imagePreview.style.width = "100%";
				}

				imagePreview.src = readerEv.target.result;
				backgroundDropArea.style.borderWidth = "0px";
				backgroundDropArea.appendChild(imagePreview);
				document.querySelectorAll(".hide-on-drop").forEach(item =>
				{
					item.style.display = "none";
				});
			};

			reader.readAsDataURL(file);
		}
	}
}

function setLocalBackgroundColor(color)
{
	bgCtx.fillStyle = color;
	bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
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
		var parent = panel.parentElement;
		var left = window.innerWidth - panel.clientWidth;
		left -= parent.clientWidth / 4;
		panel.style.left = left + "px";
	}
}

function disableOptionsPanel()
{
	const panel = document.querySelector(".options-panel");
	panel.style.visibility = "hidden";
}

function nameInputChange(e)
{
	socket.emit("userNameChange", e.target.value);
	const cookieMaxAge = 60*60*24*30;
	document.cookie = `userName=${e.target.value}; max-age=${cookieMaxAge}`;
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
	const sizeSlider = document.querySelector(".size-slider");
	sizeValueSpan = document.querySelector(".size-value");
	backgroundSelectionModal = document.querySelector(".background-modal");
	backgroundDropArea = document.querySelector(".drop-area");
	const settingsBtn = document.querySelector("#settings");
	const nameInput = document.querySelector(".options-panel input");

	window.addEventListener("resize", setCanvasSize);
	window.addEventListener("resize", disableOptionsPanel);
	canvas.addEventListener("mousemove", canvasMouseMoved);
	canvas.addEventListener("mouseover", canvasMouseOver);
	canvas.addEventListener("mouseout", canvasMouseOut);
	canvas.addEventListener("mousedown", canvasMouseDown);
	canvas.addEventListener("mouseup", canvasMouseUp);
	window.addEventListener("mouseup", canvasMouseUp);
	roomUrlLink.addEventListener("click", roomUrlClicked);
	saveBtn.addEventListener("click", saveBtnClicked);
	colorPicker.addEventListener("change", paintColorSwitch);
	brushSizeBtn.addEventListener("click", brushSizeBtnClicked);
	sizeSlider.addEventListener("input", brushSizeChange);
	document.getElementById("hide-background-modal").addEventListener("click", hideBackgroundSelectionModal);
	document.getElementById("add-image").addEventListener("click", addCanvasBackgroundImage);
	backgroundDropArea.addEventListener("dragover", imageDraggedOver);
	backgroundDropArea.addEventListener("drop", imageDropped);
	settingsBtn.addEventListener("click", settingsBtnClicked);
	nameInput.addEventListener("change", nameInputChange);

	initializeSocket();
	setCanvasSize();
	createToolbar(toolbar);
	createBrushPreview();
	setLocalBackgroundColor("white"); // make background white by default

	sizeSlider.value = DEFAULT_BRUSH_SIZE;
});