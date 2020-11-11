const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require('fs');

const { resolve_peer_dependencies } = require('./resolve-peer-dependencies');
const { gc } = require("./gc");

const input = fs.readFileSync(process.argv[2]);
const steps = [input.toString()];
steps.push(JSON.stringify(gc(resolve_peer_dependencies(JSON.parse(steps[0])))));
while (steps[steps.length - 1] !== steps[steps.length - 2]) {
  steps.push(JSON.stringify(gc(resolve_peer_dependencies(JSON.parse(steps[steps.length - 1])))));
}

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
