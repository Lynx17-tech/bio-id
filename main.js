const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let serverProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the index.html from your www folder
  win.loadFile('index.html');
  
  // Optional: Maximize on start
  win.maximize();
}

app.whenReady().then(() => {
  // Automatically start the backend server
  serverProcess = fork(path.join(__dirname, 'server.js'));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill the server process when the app is closed
  if (serverProcess) serverProcess.kill();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
