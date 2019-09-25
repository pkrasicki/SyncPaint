const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");

var users = [];

app.use(express.static("./dist"));

function generateRandomString(length, chars, prefix="")
{
	var str = "";

	for (var i = 0; i < length; i++)
	{
		const charIndex = Math.floor(Math.random() * (chars.length - 1));
		str += chars.charAt(charIndex);
	}

	return prefix + str;
}

function generateRoomName()
{
	const nameLength = 6;
	const chars = "abcdefghijklmnopqrstuvwxyz1234567890";
	return generateRandomString(nameLength, chars);
}

function generateUniqueUserName()
{
	const userNames = users.map(user => user.name);
	const nameLength = 6;
	const chars = "1234567890";
	var name;

	do
	{
		name = generateRandomString(nameLength, chars, "g");
	} while(userNames.indexOf(name) > -1);

	return name;
}

function getRoomNameFromUrl(url)
{
	var splitArray = url.split("/");
	return splitArray[splitArray.length - 1];
}

function changeUserName(socketId, newUserName)
{
	for (var i = 0; i < users.length; i++)
	{
		if (users[i].id == socketId)
		{
			users[i].name = newUserName
			break;
		}
	}
}

function removeUserName(socketId)
{
	for (var i = 0; i < users.length; i++)
	{
		if (users[i].id == socketId)
		{
			var name = users[i].name;
			users.splice(i, 1);
			return name;
		}
	}
}

app.get("/d", (req, res) =>
{
	res.redirect("/" + generateRoomName());
});

app.get("/draw.html", (req, res) =>
{
	res.redirect("/" + generateRoomName());
});

app.get("/:id", (req, res) =>
{
	res.sendFile(path.join(__dirname, "./dist/", "draw.html"));
});

io.on("connection", socket =>
{
	const roomName = getRoomNameFromUrl(socket.handshake.headers.referer);
	const userName = generateUniqueUserName();

	socket.join(roomName);
	users.push({ id: socket.id, name: userName });
	socket.emit("receiveRoomURL", socket.handshake.headers.referer, roomName, userName)
	socket.broadcast.to(roomName).emit("userJoin", userName);
	
	var numUsers = io.sockets.adapter.rooms[roomName].length;
	if (numUsers <= 1)
	{
		// make him admin
		io.sockets.adapter.rooms[roomName].adminId = socket.id;
	} else
	{
		// ask for current canvas
		if(!io.sockets.adapter.rooms[roomName].requesterIds)
			io.sockets.adapter.rooms[roomName].requesterIds = [];

		if(!io.sockets.adapter.rooms[roomName].bgRequesterIds)
			io.sockets.adapter.rooms[roomName].bgRequesterIds = [];

		io.sockets.adapter.rooms[roomName].requesterIds.push(socket.id);
		io.to(io.sockets.adapter.rooms[roomName].adminId).emit("canvasRequest");

		io.sockets.adapter.rooms[roomName].bgRequesterIds.push(socket.id);
		io.to(io.sockets.adapter.rooms[roomName].adminId).emit("backgroundCanvasRequest");
	}

	socket.on("draw", data =>
	{
		socket.broadcast.to(roomName).emit("draw", data);
	});

	socket.on("receiveCanvas", canvasData =>
	{
		if(io.sockets.adapter.rooms[roomName].requesterIds
			&& io.sockets.adapter.rooms[roomName].requesterIds.length > 0)
		{
			io.sockets.adapter.rooms[roomName].requesterIds.forEach((userId, index, arr) =>
			{
				io.to(userId).emit("receiveCanvas", canvasData);
				arr.splice(index, 1);
			});
		}
	});

	socket.on("receiveBackgroundCanvas", canvasData =>
	{
		if(io.sockets.adapter.rooms[roomName].bgRequesterIds
			&& io.sockets.adapter.rooms[roomName].bgRequesterIds.length > 0)
		{
			io.sockets.adapter.rooms[roomName].bgRequesterIds.forEach((userId, index, arr) =>
			{
				io.to(userId).emit("receiveBackgroundCanvas", canvasData);
				arr.splice(index, 1);
			});
		}
	});

	socket.on("receiveBackgroundCanvasAll", canvasData =>
	{
		socket.broadcast.to(roomName).emit("receiveBackgroundCanvas", canvasData);
	});

	socket.on("userNameChange", newUserName =>
	{
		changeUserName(socket.id, newUserName);
	});

	socket.on("disconnect", () =>
	{
		var userName = removeUserName(socket.id);
		io.sockets.in(roomName).emit("userLeave", userName);

		// remove pending canvas request
		if (io.sockets.adapter.rooms[roomName] && io.sockets.adapter.rooms[roomName].requesterIds)
		{
			var index = io.sockets.adapter.rooms[roomName].requesterIds.indexOf(socket.id);
			if (index > -1)
			{
				io.sockets.adapter.rooms[roomName].requesterIds.splice(index, 1);
			}
		}

		// remove pending background canvas request
		if (io.sockets.adapter.rooms[roomName] && io.sockets.adapter.rooms[roomName].bgRequesterIds)
		{
			var index = io.sockets.adapter.rooms[roomName].bgRequesterIds.indexOf(socket.id);
			if (index > -1)
			{
				io.sockets.adapter.rooms[roomName].bgRequesterIds.splice(index, 1);
			}
		}

		if (io.sockets.adapter.rooms[roomName] && io.sockets.adapter.rooms[roomName].length > 0)
		{
			// if user is admin
			if (io.sockets.adapter.rooms[roomName].adminId
				&& io.sockets.adapter.rooms[roomName].adminId == socket.id)
			{
				// make someone else admin
				var keys = Object.keys(io.sockets.adapter.rooms[roomName].sockets);
				io.sockets.adapter.rooms[roomName].adminId = keys[0];
				// TODO update clients UI to show who is current admin
			}
		}
	});
});

http.listen(3000, () =>
{
	console.log("listening on *:3000");
});