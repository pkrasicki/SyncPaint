import "../scss/main.scss";
import "../scss/draw.scss";
import "lato-font";
import "../../../node_modules/@fortawesome/fontawesome-free/css/all.css";
import "../favicon.ico";
import {Brush} from "./tools/brush";
import {Pencil} from "./tools/pencil";
import {PaintRoller} from "./tools/paint-roller";
import {Eraser} from "./tools/eraser";
import {Toolbar} from "./toolbar/toolbar";
import {Notification} from "./notification/notification";
import {DrawingData} from "./drawing-data/drawing-data";

window.addEventListener("load", () =>
{
	const canvas = document.querySelector("#drawArea");
	const bgCanvas = document.querySelector("#bgCanvas");
	if (!canvas)
		return;

	const ctx = canvas.getContext("2d");
	const bgCtx = bgCanvas.getContext("2d");
	const toolbarElement = document.querySelector(".toolbar");
	const roomUrl = document.querySelector("#room-url");
	const saveBtn = document.querySelector("#save");
	const colorPicker = document.querySelector("#color-picker");
	const brushSizeBtn = document.querySelector(".brush-size");
	const brushSizeMenu = document.querySelector(".brush-size-menu");
	const sizeSlider = document.querySelector(".size-slider");
	const sizeValueSpan = document.querySelector(".size-value");
	const backgroundSelectionModal = document.querySelector(".background-modal");
	const backgroundDropArea = document.querySelector(".drop-area");

	const canvasWidth = 0.9;
	const canvasHeight = 0.9;
	const defaultBrushSize = 20;
	const defaultPaintColor = "#000000";
	const defaultPaintTool = "Brush";
	var isDrawing = false;
	var paintTool = getTool(defaultPaintTool, defaultBrushSize, defaultPaintColor);
	var socket;
	var brushBoundsPreview;
	var drawingStartPos = {x: 0, y: 0};
	var drawingEndPos = {x: 0, y: 0};
	var isSavingCanvas = false;

	// set canvas size based on window dimensions
	function setCanvasSize()
	{
		const canvasData = canvas.toDataURL("image/png");
		const bgData = bgCanvas.toDataURL("image/png");
		canvas.height = window.innerHeight * canvasHeight;
		canvas.width = window.innerWidth * canvasWidth;

		bgCanvas.height = window.innerHeight * canvasHeight;
		bgCanvas.width = window.innerWidth * canvasWidth;
		loadCanvasData(ctx, canvasData);
		loadCanvasData(bgCtx, bgData);
	}

	// load image from canvasURL
	function loadCanvasData(ctx, canvasData)
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

			if (icon.dataset.tooltype == "BackgroundImage")
			{
				icon.addEventListener("click", showBackgroundSelectionModal);
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
		else if (toolName == "Eraser")
			return new Eraser(size, color);
		else
			return null;
	}

	function roomUrlClicked(e)
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

	function canvasMouseUp(e)
	{
		isDrawing = false;
	}

	function canvasMouseOver(e)
	{
		brushBoundsPreview.style.visibility = "visible";
		brushBoundsPreview.style.left = (e.clientX - brushBoundsPreview.offsetWidth / 2) + "px";
		brushBoundsPreview.style.top = (e.clientY - brushBoundsPreview.offsetHeight / 2) + "px";
	}

	function canvasMouseOut(e)
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

			e.target.href = tempCanvas.toDataURL("image/png");
			isSavingCanvas = true;
			e.target.click();
		};

		backgroundImage.src = bgCanvas.toDataURL("image/png");
	}

	function initializeSocket()
	{
		try
		{
			socket = io();
	
			socket.on("receiveRoomURL", roomUrlString =>
			{
				roomUrl.innerHTML = `${roomUrlString} <i class="fas fa-copy url-icon"></i>`;
				roomUrl.href = roomUrlString;
				roomUrl.dataset.clipboard = roomUrlString;
			});
	
			socket.on("userJoin", userName =>
			{
				new Notification(`User ${userName} has joined`);
			});
			
			socket.on("userLeave", userName =>
			{
				new Notification(`User ${userName} has left`);
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

	function showBackgroundSelectionModal(e)
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

	window.addEventListener("resize", setCanvasSize);
	canvas.addEventListener("mousemove", canvasMouseMoved);
	canvas.addEventListener("mouseover", canvasMouseOver);
	canvas.addEventListener("mouseout", canvasMouseOut);
	canvas.addEventListener("mousedown", canvasMouseDown);
	canvas.addEventListener("mouseup", canvasMouseUp);
	window.addEventListener("mouseup", canvasMouseUp);
	roomUrl.addEventListener("click", roomUrlClicked);
	saveBtn.addEventListener("click", saveBtnClicked);
	colorPicker.addEventListener("change", paintColorSwitch);
	brushSizeBtn.addEventListener("click", brushSizeBtnClicked);
	sizeSlider.addEventListener("input", brushSizeChange);
	document.getElementById("hide-background-modal").addEventListener("click", hideBackgroundSelectionModal);
	document.getElementById("add-image").addEventListener("click", addCanvasBackgroundImage);
	backgroundDropArea.addEventListener("dragover", imageDraggedOver);
	backgroundDropArea.addEventListener("drop", imageDropped);

	initializeSocket();
	setCanvasSize();
	addToolbarIcons();
	createBrushPreview();

	sizeSlider.value = defaultBrushSize;
});