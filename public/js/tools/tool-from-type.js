import ToolType from "../models/tool-type";
import Brush from "./brush";
import PaintRoller from "./paint-roller";
import Pencil from "./pencil";
import Eraser from "./eraser";
import Text from "./text";
import Fill from "./fill";
import ColorPicker from "./color-picker";
import Rect from "./rect";
import Line from "./line";
import Ellipse from "./ellipse";

const toolFromType = (toolType, size, color) =>
{
	switch (toolType)
	{
		case ToolType.BRUSH:
			return new Brush(size, color);
		case ToolType.PAINT_ROLLER:
			return new PaintRoller(size, color);
		case ToolType.PENCIL:
			return new Pencil(size, color);
		case ToolType.ERASER:
			return new Eraser(size, color);
		case ToolType.TEXT:
			return new Text(size, color);
		case ToolType.FILL:
			return new Fill(size, color);
		case ToolType.COLOR_PICKER:
			return new ColorPicker(size, color);
		case ToolType.RECT:
			return new Rect(size, color);
		case ToolType.LINE:
			return new Line(size, color);
		case ToolType.ELLIPSE:
			return new Ellipse(size, color);
		default:
			console.error("wrong tool type:", toolType);
			return null;
	}
};

export default toolFromType;