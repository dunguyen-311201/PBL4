const ipcRenderer = require('electron').ipcRenderer;

window.onload = function() {
    ipcRenderer.on("uuid", (event, data) => {
        document.getElementById("code").innerHTML = data;
    })
}

function startShare() {
    ipcRenderer.send("start-share",  document.getElementById('ip').value);
    document.getElementById("start").style.display = "none";
    document.getElementById("stop").style.display = "block";
}

function stopShare() {
    ipcRenderer.send("stop-share", {});
    document.getElementById("stop").style.display = "none";
    document.getElementById("code").innerHTML = '';
    document.getElementById("start").style.display = "block";
}

function copy() {
    var x = document.getElementById("code").textContent;
    navigator.clipboard.writeText(x)
}
