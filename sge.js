// based on documentation found here: https://web.archive.org/web/20060728052541/http://www.krakiipedia.org/wiki/SGE_protocol_saved_post

// EAccess-Protocol Documentation (amazing):
// https://github.com/WarlockFE/warlock2/wiki/EAccess-Protocol

// M:
// M       CS      CyberStrike     DR      DragonRealms    DRD     DragonRealms Development        DRF     DragonRealms The Fallen DRT     DragonRealms Prime Test  DRX     DragonRealms Platinum   GS3     GemStone IV     GS4D    GemStone IV Development GSF     GemStone IV Shattered   GST     GemStone IV Prime Test   GSX     GemStone IV Platinum

// P:
// P       CS2     1495    CS.EC   250     CS.EC   200     DR      1495    DR.EC   250     DR.P    2500    DR      1495    DR.EC   250     DR.P    2500     DRF     1995    DRF.EC  250     DR.P    2500    DRT     1495    DRT.EC  250     DRT.P   2500    DRX     1000    DRX.EC  -1      DR.P    2500     GS3     1495    GS3.EC  250     GS3.P   2500    GS3     1495    GS3.EC  250     GS3.P   2500    GSF     -1      GSF.EC  250     GS3.P   2500     GSX     1000    GSX.EC  -1      GS3.P   2500    GSX     1000    GSX.EC  -1      GS3.P   2500

// when attempting login, if account is invalid we get this:
// A               NORECORD
// if account is good but password hash is bad we get this:
// A               PASSWORD
// after too many failed login attempts? :
// A       ACCOUNTNAME  PROBLEM

const net = require("net");
require("dotenv").config();
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout
});

let hashKey = null; // hashKey vals can be 64 <= x <= 127

const client = new net.Socket();
client.connect(7900, "eaccess.play.net", function() {
  console.log("Connected, sending KEY");
  setTimeout(() => {
    sendString("K\n");
  }, 500);
});

client.on("data", data => {
  console.log("data received:");
  console.log(data);
  if (!hashKey) {
    hashKey = [...data];
    console.log("hashKey set as:", hashKey);
    console.log("hashKey.length:", hashKey.length);
    const hashedPassword = hashPassword();
    const loginStr = `A\t${process.env.ACCOUNT}\t${hashedPassword}\0\r\n`;
    setTimeout(() => {
      sendString(loginStr);
    }, 300);
  }
  const text = data.toString();
  console.log("text received:");
  console.log(text);
});

client.on("close", function() {
  console.log("Connection closed");
});

function hashPassword() {
  const PASS = process.env.PASSWORD;
  console.log("Hashing password (${PASS})");
  let hashedPassword = "";
  for (let i = 0; i < PASS.length; i++) {
    hashedPassword += hashChar(PASS[i], hashKey[i]);
  }
  return hashedPassword;
}

function hashChar(pwChar, hashNum) {
  let returnVal = hashNum ^ (pwChar.charCodeAt(0) - 32);
  returnVal += 32;
  return String.fromCharCode(returnVal);
}

function sendString(str) {
  console.log("Sending:", str);
  client.write(str);
}

function getCommand() {
  // recursive function to get commands from player
  readline.question(`>`, command => {
    sendString(command + "\n");
    getCommand();
  });
}

getCommand();
