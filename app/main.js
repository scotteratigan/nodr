const { app, BrowserWindow, ipcMain } = require("electron");
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
    win.webContents.send("msg", "Window loaded...");
    // win.webContents.send("msg", "Attempting to get connect key.");
    // getConnectKey(key => {
    //   win.webContents.send("msg", "Connect key:");
    //   win.webContents.send("msg", key);
    // });
  }, 3000);

  ipcMain.on("asynchronous-message", (event, arg) => {
    console.log(arg); // prints "ping"
    event.reply("asynchronous-reply", "pong");
  });
  ipcMain.on("synchronous-message", (event, arg) => {
    console.log(arg); // prints "ping"
    event.returnValue = "pong";
  });
}

app.on("ready", () => {
  createWindow();
});
