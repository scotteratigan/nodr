// connects to DRF currently
const KEY = `ENTERYOURKEYHERE`; // enter key from .sal file here

const net = require("net");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout
});

const client = new net.Socket();
client.connect(11321, "fallen.dr.game.play.net", function() {
  console.log("Connected, sending KEY");
  setTimeout(() => {
    client.write(KEY);
    client.write("\n");
  }, 500);
  setTimeout(() => {
    client.write(KEY);
    client.write("\n");
  }, 1000);
});

client.on("data", data => {
  const text = data.toString();
  console.log(text);
  // client.destroy();
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
