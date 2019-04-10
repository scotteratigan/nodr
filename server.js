// documentation here: https://nodejs.org/api/net.html

/*
var net = require("net");

var server = net.createServer(function(socket) {
  // socket.write("Echo server\r\n");
  // socket.pipe(socket);
  socket.pipe(process.stdout);
  socket.on("error", function(err) {
    console.log(err);
  });
});

server.listen(1337, "127.0.0.1");
server.on("connection", () => {
  console.log("Client connected.");
});

server.on("error", err => {
  console.error("Error with server:", err);
});
*/
// warlock JS scripting API:
// https://github.com/sproctor/warlock2/blob/master/bundles/cc.warlock.core.script/src/main/cc/warlock/core/script/javascript/JavascriptCommands.java
