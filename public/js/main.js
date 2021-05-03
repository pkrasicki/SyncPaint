import "../scss/main.scss";
import "../scss/draw.scss";
import "lato-font";
import "../favicon.ico";
import ToolType from "./models/tool-type";
import toolFromType from "./tools/tool-from-type";
import Text from "./tools/text";
import Fill from "./tools/fill";
import ColorPicker from "./tools/color-picker";
import Rect from "./tools/rect";
import Line from "./tools/line";
import Ellipse from "./tools/ellipse";
import Notification from "./notification/notification";
import NotificationSystem from "./notification/notification-system";
import DrawingData from "./models/drawing-data";
import BackgroundModal from "./components/background-modal/background-modal";
import Vector from "./models/vector";
import FillWorker from "./fill.worker.js";
import initComponents from "./components";

const CANVAS_SIZE = 0.9;
const CANVAS_SIZE_MEDIUM = 0.85;
const CANVAS_SIZE_SMALL = 0.8;
const MEDIUM_SIZE_PX = 550;
const SMALL_SIZE_PX = 420;
const DEFAULT_BRUSH_SIZE = 20;
const DEFAULT_PAINT_COLOR = "#000000";
const DEFAULT_PAINT_TOOL = ToolType.BRUSH;
const NET_CURSOR_UPDATE_INTERVAL_MS = 50;
const notificationSystem = new NotificationSystem();
let canvas, socket, ctx, bgCanvas, bgCtx, colorSelector, backgroundSelectionModal, sizeValueSpan,
	brushSizeMenu, roomUrlLink, toolbar, shapePreviewCanvas, shapePreviewCtx;
let isDrawing = false;
let paintTool = toolFromType(DEFAULT_PAINT_TOOL, DEFAULT_BRUSH_SIZE, DEFAULT_PAINT_COLOR);
let drawingStartPos = new Vector();
let drawingEndPos = new Vector();
let isSavingCanvas = false;
let lastSelectedSlider = null;
let touchJustEnded = false;
let isFirstJoin = true;
let cursorMoved = false;
let cursorPosition = new Vector();
let users = [];
let showRemoteCursors = true;

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
		shapePreviewCanvas.style.left = "0px";

	} else
	{
		canvas.style.left = "initial";
		bgCanvas.style.left = "initial";
		shapePreviewCanvas.style.left = "initial";
	}

	if (canvas.height > canvasLayersRect.height)
	{
		canvas.style.top = "0px";
		bgCanvas.style.top = "0px";
		shapePreviewCanvas.style.top = "0px";

	} else
	{
		canvas.style.top = "initial";
		bgCanvas.style.top = "initial";
		shapePreviewCanvas.style.top = "initial";
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
	shapePreviewCanvas.height = size.height;
	shapePreviewCanvas.width = size.width;
	repositionCanvas();
	loadCanvasData(ctx, canvasData);
	loadCanvasData(bgCtx, bgData);

	document.querySelector("#canvas-width").value = size.width;
	document.querySelector("#canvas-height").value = size.height;
	updateTextCursorPos();
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

function paintToolSwitched(e)
{
	paintTool = toolFromType(e.detail, paintTool.size, paintTool.color);
	updateBrushPreview();
}

// color change by clicking a toolbar icon or editing color input
function paintColorChanged(e, color=null)
{

	if (e != null && e.target == colorSelector)
	{
		color = e.target.value;
		toolbar.clearSelectedColor();

	} else
	{
		if (e != null) // changed by toolbar
			color = e.detail;
		else // changed by color picker
			toolbar.clearSelectedColor();

		colorSelector.parentElement.style.backgroundColor = color;
	}

	paintTool.setColor(color);
	updateBrushPreview();
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
	const brushPreview = document.querySelector("#local-brush-preview");
	const leftPos = e.clientX - brushPreview.offsetWidth / 2;
	const topPos = e.clientY - brushPreview.offsetHeight / 2;
	const canvasRect = canvas.getBoundingClientRect();
	brushPreview.style.left = `${leftPos}px`;
	brushPreview.style.top = `${topPos}px`;
	cursorPosition = new Vector(leftPos - canvasRect.x, topPos - canvasRect.y);
	cursorMoved = true;

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

			updateDrawingPos(null, new Vector(posX, posY));

			// not a shape tool
			if (paintTool instanceof Rect == false && paintTool instanceof Line == false &&
				paintTool instanceof Ellipse == false)
			{
				const drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool);
				draw(drawingData);
				socket.emit("draw", drawingData);

				updateDrawingPos(new Vector(posX, posY), null);
			}
		}

		// shape tools
		if (paintTool instanceof Rect)
		{
			setContextProperties(shapePreviewCtx, paintTool);
			shapePreviewCtx.clearRect(0, 0, shapePreviewCtx.canvas.width, shapePreviewCtx.canvas.height);

			let isSquare = e.shiftKey;
			paintTool.square = isSquare;

			let rect = new Rect(paintTool.size, paintTool.color, isSquare);
			let posX = e.offsetX;
			let posY = e.offsetY;
			rect.draw(shapePreviewCtx, drawingStartPos.x, drawingStartPos.y, posX, posY);

		} else if (paintTool instanceof Line)
		{
			setContextProperties(shapePreviewCtx, paintTool);
			shapePreviewCtx.clearRect(0, 0, shapePreviewCtx.canvas.width, shapePreviewCtx.canvas.height);

			let line = new Line(paintTool.size, paintTool.color);
			let posX = e.offsetX;
			let posY = e.offsetY;
			line.draw(shapePreviewCtx, drawingStartPos.x, drawingStartPos.y, posX, posY);

		} else if (paintTool instanceof Ellipse)
		{
			let isCircle = e.shiftKey;
			paintTool.circle = isCircle;

			setContextProperties(shapePreviewCtx, paintTool);
			shapePreviewCtx.clearRect(0, 0, shapePreviewCtx.canvas.width, shapePreviewCtx.canvas.height);

			let ellipse = new Ellipse(paintTool.size, paintTool.color, isCircle);
			let posX = e.offsetX;
			let posY = e.offsetY;
			ellipse.draw(shapePreviewCtx, drawingStartPos.x, drawingStartPos.y, posX, posY);
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
function windowMouseUp(e)
{
	if (e.type == "mouseup" && touchJustEnded)
	{
		touchJustEnded = false;
		return;
	}

	if (isDrawing && (paintTool instanceof Rect || paintTool instanceof Line ||
		paintTool instanceof Ellipse))
	{
		// clear preview
		shapePreviewCtx.clearRect(0, 0, shapePreviewCtx.canvas.width, shapePreviewCtx.canvas.height);

		let posX = e.offsetX;
		let posY = e.offsetY;

		if (e.target.tagName == "CANVAS")
		{
			updateDrawingPos(null, new Vector(posX, posY));
		}

		const drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool);
		// TODO: check if this is needed
		if (paintTool instanceof Rect)
			drawingData.square = paintTool.square;

		draw(drawingData);
		socket.emit("draw", drawingData);
	}

	isDrawing = false;
	lastSelectedSlider = null;
}

function canvasTouchEnded(e)
{
	windowMouseUp(e);
	touchJustEnded = true;
}

function canvasMouseOver(e)
{
	const brushPreview = document.querySelector("#local-brush-preview");
	brushPreview.style.visibility = "visible";
	brushPreview.style.left = (e.clientX - brushPreview.offsetWidth / 2) + "px";
	brushPreview.style.top = (e.clientY - brushPreview.offsetHeight / 2) + "px";
}

function canvasMouseOut()
{
	document.querySelector("#local-brush-preview").style.visibility = "hidden";
}

function setContextProperties(context, tool)
{
	context.globalCompositeOperation = tool.operation;
	context.lineWidth = tool.size;
	context.lineCap = tool.style;
	context.strokeStyle = tool.color;
	context.shadowBlur = tool.blur;
	context.shadowColor = tool.color;
}

function draw(drawingData)
{
	setContextProperties(ctx, drawingData.tool);

	const posX = drawingData.startPos.x;
	const posY = drawingData.startPos.y;

	if (drawingData.tool.type == ToolType.TEXT && drawingData.text != null && drawingData.text != "")
	{
		ctx.font = `${drawingData.tool.size}px Lato`;
		ctx.fillStyle = drawingData.tool.color;
		ctx.fillText(drawingData.text, posX, posY);

	} else if (drawingData.tool.type == ToolType.FILL)
	{
		const width = ctx.canvas.clientWidth;
		const height = ctx.canvas.clientHeight;
		let imageData = ctx.getImageData(0, 0, width, height);
		let fillTool = new Fill(drawingData.tool.size, drawingData.tool.color);
		let fillData = fillTool.getFillData(posX, posY, width, height, imageData);

		if (fillData == null)
			return;

		if (window.Worker)
		{
			if (!canvas.classList.contains("progress"))
				canvas.classList.add("progress");

			let worker = new FillWorker();
			worker.postMessage([width, height, posX, posY, imageData, fillData[0], fillData[1]]);
			worker.onmessage = (e) =>
			{
				ctx.putImageData(e.data, 0, 0); // update canvas
				canvas.classList.remove("progress");
			};

		} else
		{
			Fill.fillPixels([width, height, posX, posY, imageData, fillData[0], fillData[1]]);
			ctx.putImageData(imageData, 0, 0); // update canvas
		}

	} else if (drawingData.tool.type == ToolType.RECT)
	{
		let rect = new Rect(drawingData.tool.size, drawingData.tool.color, drawingData.tool.square);
		rect.draw(ctx, posX, posY, drawingData.endPos.x, drawingData.endPos.y);

	} else if (drawingData.tool.type == ToolType.LINE)
	{
		let line = new Line(drawingData.tool.size, drawingData.tool.color);
		line.draw(ctx, posX, posY, drawingData.endPos.x, drawingData.endPos.y);

	} else if (drawingData.tool.type == ToolType.ELLIPSE)
	{
		let ellipse = new Ellipse(drawingData.tool.size, drawingData.tool.color, drawingData.tool.circle);
		ellipse.draw(ctx, posX, posY, drawingData.endPos.x, drawingData.endPos.y);

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
	let newPos = new Vector(posX, posY);
	updateDrawingPos(newPos, newPos);

	if (paintTool instanceof Fill)
	{
		let drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool);
		draw(drawingData);
		socket.emit("draw", drawingData);

	} else if (paintTool instanceof ColorPicker)
	{
		let color = paintTool.getPixelColor(ctx, bgCtx, posX, posY);
		paintColorChanged(null, color);

	} else if (paintTool instanceof Rect || paintTool instanceof Line ||
		paintTool instanceof Ellipse) // shape tools
	{
		isDrawing = true;

	} else if (paintTool instanceof Text == false) // other drawing tools
	{
		isDrawing = true;
		let drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool);
		draw(drawingData);
		socket.emit("draw", drawingData);
	}
}

// an element that follows mouse cursor. It visualizes the brush size and shape
function createLocalBrushPreview()
{
	const brushPreview = document.createElement("div");
	brushPreview.classList.add("brush-preview");
	brushPreview.id = "local-brush-preview";
	document.body.appendChild(brushPreview);
	updateBrushPreview();
}

function createRemoteBrushPreview(userName, userId)
{
	const brushPreview = document.createElement("div");
	brushPreview.classList.add("brush-preview-remote");
	brushPreview.id = `brush-preview-${userId}`;
	brushPreview.style.width = `${DEFAULT_BRUSH_SIZE}px`;
	brushPreview.style.height = `${DEFAULT_BRUSH_SIZE}px`;

	const nameTag = document.createElement("span");
	nameTag.classList.add("name-tag");
	nameTag.textContent = userName;
	nameTag.style.top = `${DEFAULT_BRUSH_SIZE}px`;
	brushPreview.append(nameTag);

	document.body.appendChild(brushPreview);
}

function deleteRemoteBrushPreview(userId)
{
	const brushPreview = document.getElementById(`brush-preview-${userId}`);
	document.body.removeChild(brushPreview);
}

function updateBrushPreview()
{
	const size = paintTool.size;
	const blur = paintTool.blur;
	const color = paintTool.color;
	const style = paintTool.style;

	const colorPreview = document.querySelector(".color-preview");
	colorPreview.style.background = color;

	const brushPreview = document.querySelector("#local-brush-preview");
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
		document.querySelector(".text-cursor").classList.remove("hidden");
		document.querySelector(".text-cursor").style.backgroundColor = color;
		document.querySelector(".text-cursor").style.height = `${size}px`;
		updateTextCursorPos();

	} else if (paintTool instanceof Fill || paintTool instanceof ColorPicker ||
		paintTool instanceof Rect || paintTool instanceof Line || paintTool instanceof Ellipse)
	{
		brushPreview.style.display = "none";
		canvas.style.cursor = "crosshair";
		document.querySelector(".text-cursor").classList.add("hidden");

	} else
	{
		brushPreview.style.display = "initial";
		canvas.style.cursor = "default";
		document.querySelector(".text-cursor").classList.add("hidden");
	}
}

function updateRemoteBrushPreview(userId, pos, size, color)
{
	const brushPreview = document.getElementById(`brush-preview-${userId}`);
	const canvasRect = canvas.getBoundingClientRect();
	const globalPos = new Vector(canvasRect.x + pos.x, canvasRect.y + pos.y);

	brushPreview.style.visibility = "visible";
	brushPreview.style.width = `${size}px`;
	brushPreview.style.height = `${size}px`;
	brushPreview.style.left = `${globalPos.x}px`;
	brushPreview.style.top = `${globalPos.y}px`;
	brushPreview.querySelector(".name-tag").style.top = `${size}px`;
	brushPreview.querySelector(".name-tag").style.color = color;
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

		socket.on("receiveRoomData", (fullRoomUrl, roomName, userName, roomUsers) =>
		{
			updateDisplayedRoomUrl(fullRoomUrl, roomName);
			roomUrlLink.href = fullRoomUrl;
			roomUrlLink.dataset.clipboard = fullRoomUrl;
			document.title = `SyncPaint - ${roomName}`;
			document.querySelector(".options-panel input").value = userName;
			users = roomUsers;

			// if it's the first user in a room set their background to white instead of default transparent
			if (users.length == 0 && isFirstJoin)
				fillBackground();

			isFirstJoin = false;
			users.forEach(user => createRemoteBrushPreview(user.name, user.id));
		});

		socket.on("userJoin", (userName, userId) =>
		{
			notificationSystem.add(new Notification(`User ${userName} has joined`));
			users.push({id: userId, name: userName});
			createRemoteBrushPreview(userName, userId);
		});

		socket.on("userLeave", (userName, userId) =>
		{
			notificationSystem.add(new Notification(`User ${userName} has left`));
			users.splice(users.findIndex(user => user.id == userId), 1);
			deleteRemoteBrushPreview(userId);
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

		socket.on("backgroundClear", () =>
		{
			bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
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

		socket.on("cursorPosition", (userId, pos, size, color) =>
		{
			if (!showRemoteCursors)
				return;

			updateRemoteBrushPreview(userId, pos, size, color);
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

	// there are two size sliders but only one is displayed at a time
	// which slider is displayed depends on window size
	// we don't know if any of them just became visible/invisible so update both with every window resize
	document.querySelectorAll(".size-slider").forEach((slider) =>
	{
		slider.update(null, paintTool.size);
	});

	repositionCanvas();
	updateTextCursorPos();
}

function windowMouseMoved(e)
{
	if (lastSelectedSlider)
		lastSelectedSlider.update(e);
}

function keyPressed(e)
{
	if (paintTool instanceof Text)
	{
		if (e.key == "Enter")
		{
			let newPos = new Vector(drawingEndPos.x, drawingStartPos.y + paintTool.size);
			updateDrawingPos(newPos, null);
		} else
		{
			const drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool, e.key);
			draw(drawingData);
			socket.emit("draw", drawingData);
			let newPos = new Vector(drawingStartPos.x + ctx.measureText(e.key).width, drawingStartPos.y);
			updateDrawingPos(newPos, null);
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

function sendCursorPosition()
{
	if (cursorMoved)
	{
		let size = paintTool.size;
		if (paintTool instanceof Fill)
			size = 1;

		socket.emit("cursorPosition", cursorPosition, size, paintTool.color);
		cursorMoved = false;
	}
}

function textPasted(e)
{
	if (paintTool instanceof Text)
	{
		let clipboardData = e.clipboardData || window.clipboardData;
		let pastedData = clipboardData.getData("Text");

		if (pastedData.length <= 0)
			return;

		let rows = pastedData.split(/\n/g);
		rows.forEach((row, index) =>
		{
			if (row.length > 0)
			{
				const drawingData = new DrawingData(drawingStartPos, drawingEndPos, paintTool, row);
				draw(drawingData);
				socket.emit("draw", drawingData);
				let newPos = new Vector(drawingStartPos.x + ctx.measureText(row).width, drawingStartPos.y);
				updateDrawingPos(newPos, null);

				if (index != rows.length - 1)
				{
					newPos = new Vector(drawingEndPos.x, drawingStartPos.y + paintTool.size);
					updateDrawingPos(newPos, null);
				}
			}
		});
	}
}

function updateDrawingPos(startPos, endPos)
{
	if (startPos != null)
	{
		if (startPos.x > canvas.width)
			startPos.x = canvas.width;

		if (startPos.y > canvas.height)
			startPos.y = canvas.height;

		drawingStartPos = startPos;
	}

	if (endPos != null)
	{
		if (endPos.x > canvas.width)
			endPos.x = canvas.width;

		if (endPos.y > canvas.height)
			endPos.y = canvas.height;

		drawingEndPos = endPos;
	}

	updateTextCursorPos();
}

function updateTextCursorPos()
{
	const textCursor = document.querySelector(".text-cursor");
	const textCursorRect = textCursor.getBoundingClientRect();
	textCursor.style.left = `${drawingStartPos.x + canvas.offsetLeft}px`;
	textCursor.style.top = `${(drawingStartPos.y + canvas.offsetTop) - textCursorRect.height}px`;
}

function clearBackground()
{
	backgroundSelectionModal.hide();
	bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
	socket.emit("backgroundClearAll");
}

function fillBackground()
{
	backgroundSelectionModal.hide();
	bgCtx.fillStyle = backgroundSelectionModal.bgColor;
	bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
	socket.emit("receiveBackgroundCanvasAll", bgCanvas.toDataURL("image/png"));
}

function initSizeSliders()
{
	document.querySelectorAll(".size-slider").forEach((slider) =>
	{
		slider.update(null, DEFAULT_BRUSH_SIZE);
		slider.addEventListener("change", (e) =>
		{
			let size = Number(e.target.getValue());
			sizeValueSpan.innerHTML = size + "px";
			paintTool.setSize(size);
			updateBrushPreview();
		});
	});
}

window.addEventListener("load", () =>
{
	canvas = document.querySelector("#drawArea");
	if (!canvas)
		return;

	ctx = canvas.getContext("2d");
	bgCanvas = document.querySelector("#bgCanvas");
	bgCtx = bgCanvas.getContext("2d");
	shapePreviewCanvas = document.querySelector("#shapePreview");
	shapePreviewCtx = shapePreviewCanvas.getContext("2d");

	roomUrlLink = document.querySelector("#room-url");
	const saveBtn = document.querySelector("#save");
	colorSelector = document.querySelector("#color-selector");
	const brushSizeBtn = document.querySelector(".brush-size");
	brushSizeMenu = document.querySelector(".brush-size-menu");
	sizeValueSpan = document.querySelector(".size-value");
	backgroundSelectionModal = new BackgroundModal("background-modal");
	const settingsBtn = document.querySelector("#settings");
	const nameInput = document.querySelector(".options-panel input");

	window.addEventListener("resize", windowResized);
	window.addEventListener("mouseup", windowMouseUp);
	window.addEventListener("touchend", windowMouseUp);
	window.addEventListener("mousemove", windowMouseMoved);
	window.addEventListener("keypress", keyPressed);
	window.addEventListener("beforeunload", beforeWindowUnloaded);
	window.addEventListener("paste", textPasted);
	canvas.addEventListener("mousemove", canvasMouseMoved);
	canvas.addEventListener("touchmove", canvasMouseMoved);
	canvas.addEventListener("mouseover", canvasMouseOver);
	canvas.addEventListener("mouseout", canvasMouseOut);
	canvas.addEventListener("mousedown", canvasMouseDown);
	canvas.addEventListener("touchstart", canvasTouchStart);
	canvas.addEventListener("touchend", canvasTouchEnded);
	roomUrlLink.addEventListener("click", roomUrlClicked);
	saveBtn.addEventListener("click", saveBtnClicked);
	colorSelector.addEventListener("change", paintColorChanged);
	brushSizeBtn.addEventListener("click", brushSizeBtnClicked);
	settingsBtn.addEventListener("click", settingsBtnClicked);
	nameInput.addEventListener("change", userNameChanged);
	document.querySelector("#canvas-width").addEventListener("input", canvasSizeSettingChanged);
	document.querySelector("#canvas-height").addEventListener("input", canvasSizeSettingChanged);
	document.querySelector("#canvas-size-apply").addEventListener("click", applyCanvasSize);

	setInterval(sendCursorPosition, NET_CURSOR_UPDATE_INTERVAL_MS);

	backgroundSelectionModal.onAddImageBtnClick(addCanvasBackgroundImage);
	backgroundSelectionModal.onClearBtnClick(clearBackground);
	backgroundSelectionModal.onFillBtnClick(fillBackground);

	initializeSocket();
	setCanvasSize(defaultCanvasSize());
	createLocalBrushPreview();

	initComponents();

	toolbar = document.querySelector("#toolbar");
	toolbar.initButtons(DEFAULT_PAINT_TOOL, DEFAULT_PAINT_COLOR);
	toolbar.addEventListener("toolSwitch", paintToolSwitched);
	toolbar.addEventListener("colorSwitch", paintColorChanged);
	toolbar.addEventListener("bgSettingsOpen", () => backgroundSelectionModal.toggle());
	toolbar.addEventListener("paste", textPasted);

	initSizeSliders();
	document.querySelectorAll("ui-slider").forEach((slider) =>
	{
		const sliderUsed = () =>
		{
			lastSelectedSlider = slider
		};

		slider.addEventListener("mousedown", sliderUsed);
		slider.addEventListener("touchstart", sliderUsed);
	});
});