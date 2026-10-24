const { app, BrowserWindow, ipcMain } = require('electron')
const { v4: uuidv4 } = require('uuid');
const screenshot = require('screenshot-desktop');
const robot = require("robotjs");

var socket = null;
var interval;
var uuid = '';

function createWindow() {
    const win = new BrowserWindow({
        width: 600,
        height: 260,
        webPreferences: {
            nodeIntegration: true
        }
    })
    win.removeMenu();
    win.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
ipcMain.on("start-share", function(event, arg) {
    if (arg.length == 0 && arg == '') return;
    socket = require('socket.io-client')('http://' + arg + ':5000');
    
    if (uuid == '')
        uuid = uuidv4();
    socket.emit("join-message", uuid);
    event.reply("uuid", uuid);

    interval = setInterval(function() {
        screenshot().then((img) => {
            var imgStr = new Buffer(img).toString('base64');

            var obj = {};
            obj.room = uuid;
            obj.image = imgStr;

            socket.emit("screen-data", JSON.stringify(obj));
        })
    }, 500)
    
    socket.on("mouse-move", function(data) {
        var obj = JSON.parse(data);
        var x = obj.x*4/3;
        var y = obj.y*4/3;
        robot.moveMouse(x, y);
    })

    socket.on("connect", () => {
	console.clear();
        console.log("Connected successfully!");
    });

    socket.on("disconnect", () => {
	console.clear();
        console.log("Connection has been disconnected!");
    });

    socket.on("mouse-click", function(data) {
        var obj = JSON.parse(data);
        var e = obj.e;
        if (e == 2) robot.mouseClick('right');
        else robot.mouseClick();
    })

    socket.on("type_down", function(data) {
        var obj = JSON.parse(data);
        var key = obj.key;
        if (key.localeCompare('shift') === 0) robot.keyToggle('shift', 'down')
        if (key.localeCompare('control') === 0) robot.keyToggle('control', 'down')
    })

    socket.on("type_up", function(data) {
        var obj = JSON.parse(data);
        var key = obj.key;
        robot.keyToggle(key, 'up')
    })
})

ipcMain.on("stop-share", function(event, arg) {
    clearInterval(interval);
    socket.disconnect()
})
