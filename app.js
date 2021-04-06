const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");

const PORT = process.env.PORT || 3000;
const MAX_USER_NAME_LENGTH = 32;
const MAX_CANVAS_SIZE = 10000;

app.disable("x-powered-by");
app.use(express.static("./dist"));

function randomString(length, chars, prefix="")
{
	let str = "";

	for (var i = 0; i < length; i++)
	{
		const charIndex = Math.floor(Math.random() * (chars.length - 1));
		str += chars.charAt(charIndex);
	}

	return prefix + str;
}

// default room name
function randomRoomName()
{
	const nameLength = 6;
	const chars = "abcdefghijklmnopqrstuvwxyz1234567890";
	return randomString(nameLength, chars);
}

// default user name
function randomUserName()
{
	const nameLength = 4;
	const chars = "1234567890";
	return randomString(nameLength, chars, "user");
}

function getRoomNameFromUrl(url)
{
	if (url == null) // it is somehow possible to receive no url
		return "unnamed";

	const splitArray = url.split("/");
	return splitArray[splitArray.length - 1];
}

function getUserNameFromCookie(cookie)
{
	if (cookie)
	{
		const splitArray = cookie.split(/;/);
		for (let i = 0; i < splitArray.length; i++)
		{
			const value = splitArray[i].replace(/^[^=]*=/, "");
			const key = splitArray[i].replace(/=.*$/, "").trim();

			if (key == "userName")
				return validUserName(value);
		}
	}

	return "";
}

function isAdmin(roomName, socketId)
{
	return io.sockets.adapter.rooms[roomName].adminId &&
		io.sockets.adapter.rooms[roomName].adminId == socketId;
}

function makeAdmin(roomName, socketId)
{
	io.sockets.adapter.rooms[roomName].adminId = socketId;
	io.to(socketId).emit("setAdmin", true);
}

// makes sure user name is valid
function validUserName(userName)
{
	let newName = `${userName}`;
	newName = newName.trim();

	if (newName.length == 0)
		newName = "unnamed user";
	else if (newName.length > MAX_USER_NAME_LENGTH)
		newName = newName.substring(0, MAX_USER_NAME_LENGTH);

	return newName;
}

function userIdToUserObject(id)
{
	return {
		id: id,
		name: io.of("/").sockets[id].userName
	};
}

app.get("/d", (req, res) =>
{
	res.redirect("/" + randomRoomName());
});

app.get("/draw.html", (req, res) =>
{
	res.redirect("/" + randomRoomName());
});

app.get("/:id", (req, res) =>
{
	res.sendFile(path.join(__dirname, "./dist/", "draw.html"));
});

io.on("connection", socket =>
{
	const url = socket.handshake.headers.referer;
	const roomName = getRoomNameFromUrl(url);
	let userName = getUserNameFromCookie(socket.handshake.headers.cookie);

	if (userName == "") // cookie wasn't set
		userName = randomUserName();

	socket.userName = userName;
	socket.join(roomName);

	let userIds = Object.keys(io.sockets.adapter.rooms[roomName].sockets);
	userIds = userIds.filter(id => id != socket.id);
	const roomUsers = userIds.map(userIdToUserObject);
	socket.emit("receiveRoomData", url, roomName, userName, roomUsers);
	socket.broadcast.to(roomName).emit("userJoin", userName, socket.id);

	if (roomUsers.length <= 0) // this is the first user in this room
	{
		makeAdmin(roomName, socket.id);
	} else
	{
		// ask for current canvas
		if (!io.sockets.adapter.rooms[roomName].requesterIds)
			io.sockets.adapter.rooms[roomName].requesterIds = [];

		if (!io.sockets.adapter.rooms[roomName].bgRequesterIds)
			io.sockets.adapter.rooms[roomName].bgRequesterIds = [];

		io.sockets.adapter.rooms[roomName].requesterIds.push(socket.id);
		io.to(io.sockets.adapter.rooms[roomName].adminId).emit("canvasRequest");

		io.sockets.adapter.rooms[roomName].bgRequesterIds.push(socket.id);
		io.to(io.sockets.adapter.rooms[roomName].adminId).emit("backgroundCanvasRequest");
	}

	socket.on("draw", data =>
	{
		if (data != null)
			socket.broadcast.to(roomName).emit("draw", data);
	});

	socket.on("receiveCanvas", (canvasData, width, height) =>
	{
		if (!isAdmin(roomName, socket.id)) // only accept canvas from an admin
			return;

		if (width < 0 || height < 0 || width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE)
			return;

		if (io.sockets.adapter.rooms[roomName].requesterIds
			&& io.sockets.adapter.rooms[roomName].requesterIds.length > 0)
		{
			io.sockets.adapter.rooms[roomName].requesterIds.forEach((userId, index, arr) =>
			{
				io.to(userId).emit("receiveCanvas", canvasData, width, height);
				arr.splice(index, 1);
			});
		}
	});

	socket.on("receiveBackgroundCanvas", canvasData =>
	{
		if (!isAdmin(roomName, socket.id)) // only accept canvas from an admin
			return;

		if (io.sockets.adapter.rooms[roomName].bgRequesterIds
			&& io.sockets.adapter.rooms[roomName].bgRequesterIds.length > 0)
		{
			io.sockets.adapter.rooms[roomName].bgRequesterIds.forEach((userId, index, arr) =>
			{
				io.to(userId).emit("receiveBackgroundCanvas", canvasData);
				arr.splice(index, 1);
			});
		}
	});

	// user changed the background
	socket.on("receiveBackgroundCanvasAll", canvasData =>
	{
		socket.broadcast.to(roomName).emit("receiveBackgroundCanvas", canvasData);
	});

	// user cleared the background
	socket.on("backgroundClearAll", () =>
	{
		socket.broadcast.to(roomName).emit("backgroundClear");
	});

	socket.on("userNameChange", newUserName =>
	{
		socket.userName = validUserName(newUserName);
	});

	socket.on("setCanvasSize", (width, height) =>
	{
		if (isAdmin(roomName, socket.id))
		{
			if (width >= 0 && height >= 0 && width <= MAX_CANVAS_SIZE && height <= MAX_CANVAS_SIZE)
				socket.broadcast.to(roomName).emit("receiveCanvasSize", width, height);
		}
	});

	socket.on("cursorPosition", (pos, size, color) =>
	{
		socket.broadcast.to(roomName).emit("cursorPosition", socket.id, pos, size, color);
	});

	socket.on("disconnect", () =>
	{
		io.sockets.in(roomName).emit("userLeave", socket.userName, socket.id);

		// remove pending canvas request
		if (io.sockets.adapter.rooms[roomName] && io.sockets.adapter.rooms[roomName].requesterIds)
		{
			const index = io.sockets.adapter.rooms[roomName].requesterIds.indexOf(socket.id);
			if (index > -1)
				io.sockets.adapter.rooms[roomName].requesterIds.splice(index, 1);
		}

		// remove pending background canvas request
		if (io.sockets.adapter.rooms[roomName] && io.sockets.adapter.rooms[roomName].bgRequesterIds)
		{
			const index = io.sockets.adapter.rooms[roomName].bgRequesterIds.indexOf(socket.id);
			if (index > -1)
				io.sockets.adapter.rooms[roomName].bgRequesterIds.splice(index, 1);
		}

		if (io.sockets.adapter.rooms[roomName] && io.sockets.adapter.rooms[roomName].length > 0)
		{
			// if disconnected user was admin, give admin privileges to the oldest connected user
			if (isAdmin(roomName, socket.id))
			{
				const userIds = Object.keys(io.sockets.adapter.rooms[roomName].sockets);
				const newAdminId = userIds[0];
				makeAdmin(roomName, newAdminId);
			}
		}
	});
});

http.listen(PORT, () =>
{
	console.log(`listening on *:${PORT}`);
});