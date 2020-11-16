"use strict";
exports.__esModule = true;
//const { app, BrowserWindow, ipcMain } = require("electron");
var fs = require("fs");
var resolve_peer_dependencies_1 = require("./resolve-peer-dependencies");
var gc_1 = require("./gc");
var input = fs.readFileSync(process.argv[2]);
var steps = [JSON.parse(input.toString())];
steps.push(gc_1.gc(resolve_peer_dependencies_1.resolve_peer_dependencies(steps[0])));
while (steps[steps.length - 1] !== steps[steps.length - 2]) {
    steps.push(resolve_peer_dependencies_1.resolve_peer_dependencies(steps[steps.length - 1]));
}
console.log(JSON.stringify({ nodes: steps[steps.length - 1].nodes, links: steps[steps.length - 1].links.filter(function (l) { return l.type !== "peer"; }) }, undefined, 2));
/*
function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile('index.html');
  //win.webContents.openDevTools();
}

process.stdin.on('data', _d => {
  step = resolve_peer_dependencies(step);
  createWindow();
})

ipcMain.on('get-iterations', (event) => {
  event.returnValue = 1;
})

ipcMain.on('get-graph', (event, i) => {
  if (i === 0) { event.returnValue = steps[0] }
  else { event.returnValue = steps[steps.length - 1]}
})

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
*/
