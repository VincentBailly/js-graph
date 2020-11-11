const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require('fs');

const { resolve_peer_dependencies } = require('./resolve-peer-dependencies');
const { gc } = require("./gc");

const input = fs.readFileSync(process.argv[2]);
const iterations = JSON.parse(process.argv[3]);
const steps = [input.toString()];
for (let i = 0; i < iterations; i++) {
  steps.push(JSON.stringify(gc(resolve_peer_dependencies(JSON.parse(steps[i])))));
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
  event.returnValue = iterations;
})

ipcMain.on('get-graph', (event, i) => {
  event.returnValue = steps[i];
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
