var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const open = require('open');
const publicIp = require('public-ip');
var config = require('config');
var my_ip = '';

(async() => {
    my_ip = await publicIp.v4() + '';
})();

app.use("/public", express.static(__dirname + '/views'));
app.get('/view', (req, res) => {
    res.sendFile(__dirname + '/views/display.html');
})
app.get('/', (req, res) => {
    res.set({ "Content-Type": 'text/html' })
    res.send("<html lang='en'><head><title>Teamviewer</title> <link rel='stylesheet' href='../public/style.css'>" +
        "</head><body><div class='divcenter'><h2>My IP: " + my_ip +
        "</h2><p style='font-size:20px;'>Please send IP Address to your partner and request the code to connect.<a href='view'>Redirects to the control page</a></p></div>" +
        "</body></html>")
    res.end()
})

io.on('connection', (socket) => {

    socket.on("join-message", (roomId) => {
        socket.join(roomId);
        console.log("User joined in a room : " + roomId);
    })

    socket.on("screen-data", function(data) {
        data = JSON.parse(data);
        var room = data.room;
        var imgStr = data.image;
        socket.broadcast.to(room).emit('screen-data', imgStr);
    })

    socket.on("mouse-move", function(data) {
        var room = JSON.parse(data).room;
        socket.broadcast.to(room).emit("mouse-move", data);
    })

    socket.on("mouse-click", function(data) {
        var room = JSON.parse(data).room;
        socket.broadcast.to(room).emit("mouse-click", data);
    })

    socket.on("type-up", function(data) {
        var room = JSON.parse(data).room;
        socket.broadcast.to(room).emit("type_up", data);
    })
    socket.on("type-down", function(data) {
        var room = JSON.parse(data).room;
        socket.broadcast.to(room).emit("type_down", data);
    })

    socket.on("disconnect", () => {
        console.log("Connection has been disconnected!");
    });
})

var server_port = process.env.YOUR_PORT || process.env.PORT || config.get("server.port");
http.listen(server_port, () => {
    open(config.get("server.url"));
})
