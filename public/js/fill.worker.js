import Fill from "./tools/fill";

onmessage = (e) =>
{
	Fill.fillPixels(e.data[0], e.data[1], e.data[2], e.data[3], e.data[4], e.data[5], e.data[6]);
	postMessage(e.data[4]); // send back imageData
};