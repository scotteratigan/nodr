const { app, BrowserWindow } = require("electron");
const getConnectKey = require("./sge");

function createWindow() {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  win.loadFile("index.html");
  win.webContents.openDevTools();

  setTimeout(() => {
    win.webContents.send("msg", "Attempting to get connect key.");
    getConnectKey(key => {
      win.webContents.send("msg", "Connect key:");
      win.webContents.send("msg", key);
    });
  }, 3000);
}

app.on("ready", () => {
  createWindow();
});
