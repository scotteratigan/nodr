// connects to DRF currently
require("dotenv").config();
const colors = require("colors");
const net = require("net");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout
});
const client = new net.Socket();
const getConnectKey = require("./sge");
let gametime = 0;
let buffer = "";

getConnectKey((connectKey, ip, port) => {
  console.log("connect.js has received connect key:", connectKey);
  // todo: change the connect url depending upon the game instance...
  // client.connect(11321, "fallen.dr.game.play.net", function() {
  client.connect(port, ip, function() {
    console.log("Connected, sending KEY".green);
    setTimeout(() => {
      client.write(connectKey + "\n");
    }, 100);
    setTimeout(() => {
      client.write("/FE:STORMFRONT /VERSION:1.0.1.22 /XML\n");
    }, 200);
    setTimeout(() => {
      client.write("l\n");
    }, 1000);
  });
});

client.on("data", data => {
  // detect incomplete data fragments - if line does not end with \r\n, the data is split and we need to await the next packet before displaying/parsing all the data
  const tempStr = buffer + data.toString();
  if (!tempStr.match(/\r\n$/)) {
    buffer = tempStr;
    return;
  }
  const textArr = tempStr.split(/\r\n/);
  buffer = "";
  let bold = false;
  textArr.forEach(line => {
    if (line.startsWith("<")) {
      if (line.startsWith("<pushBold/>")) {
        line = line.substring(11);
        bold = true;
      } else if (line.startsWith("<popBold/>")) {
        line = line.substring(10);
        bold = false;
      } else if (line.startsWith("<prompt time")) {
        line = line.match(/"(\d+)"/)[1];
        gameTime = parseInt(line);
      }
    }
    console.log(bold ? line.cyan : line);
  });
  console.log("---------------------------------");
});

client.on("close", function() {
  console.log("Connection closed");
});

function getCommand() {
  // recursive function to get commands from player
  readline.question(`>`, command => {
    client.write(command + "\n");
    getCommand();
  });
}

getCommand();
