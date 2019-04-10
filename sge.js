/*
  based on documentation found here: https://web.archive.org/web/20060728052541/http://www.krakiipedia.org/wiki/SGE_protocol_saved_post

  EAccess-Protocol Documentation (amazing):
  https://github.com/WarlockFE/warlock2/wiki/EAccess-Protocol

  M:
  M       CS      CyberStrike     DR      DragonRealms    DRD     DragonRealms Development        DRF     DragonRealms The Fallen DRT     DragonRealms Prime Test  DRX     DragonRealms Platinum   GS3     GemStone IV     GS4D    GemStone IV Development GSF     GemStone IV Shattered   GST     GemStone IV Prime Test   GSX     GemStone IV Platinum

  P:
  P       CS2     1495    CS.EC   250     CS.EC   200     DR      1495    DR.EC   250     DR.P    2500    DR      1495    DR.EC   250     DR.P    2500     DRF     1995    DRF.EC  250     DR.P    2500    DRT     1495    DRT.EC  250     DRT.P   2500    DRX     1000    DRX.EC  -1      DR.P    2500     GS3     1495    GS3.EC  250     GS3.P   2500    GS3     1495    GS3.EC  250     GS3.P   2500    GSF     -1      GSF.EC  250     GS3.P   2500     GSX     1000    GSX.EC  -1      GS3.P   2500    GSX     1000    GSX.EC  -1      GS3.P   2500

  when attempting login, if account is invalid we get this:
  A               NORECORD
  if account is good but password hash is bad we get this:
  A               PASSWORD
  after too many failed login attempts? :
  A       ACCOUNTNAME  PROBLEM
  */

// todo: check that all required process.env values exist and are valid

function getGameKey(cb) {
  require("dotenv").config();
  const net = require("net");
  let connectKey = null;
  let hashKey = null; // hashKey vals can be 64 <= x <= 127
  const sgeClient = new net.Socket();
  // todo: move everything inside function to avoid polluting global scope

  sgeClient.connect(7900, "eaccess.play.net", () => {
    // todo: add error handling here
    console.log("Connected, to eaccess.play.net:7900");
    setTimeout(() => {
      sgeSendStr("K\n");
    }, 5);
  });

  sgeClient.on("data", data => {
    console.log("data received:");
    console.log(data);
    if (!hashKey) {
      hashKey = [...data];
      console.log("hash key from Simu:", JSON.stringify(hashKey));
      setTimeout(() => {
        console.log("Sending authentication string...");
        const hashedPassArr = hashPassword();
        console.log(`A\t${process.env.ACCOUNT}\t${hashedPassArr}\r\n`);
        sgeClient.write(`A\t${process.env.ACCOUNT}\t`);
        const buffPW = Buffer.from(hashedPassArr); // this HAS to be written as a buffer because of invalid ASCII values!
        sgeClient.write(buffPW);
        sgeClient.write("\r\n");
      }, 5);
      return;
    }
    const text = data.toString();
    if (text.startsWith("A")) {
      // A       ACCOUNT KEY     longAlphaNumericString        Subscriber Name
      if (text.includes("KEY")) {
        console.log("Authentication SUCCESSFUL!");
        sgeSendStr("M\n");
        return;
      } else {
        console.error(text);
        console.error(
          "Authentication failed. Please check USERNAME and PASSWORD in .env file."
        );
        return;
      }
    }
    if (text.startsWith("M")) {
      console.log("gamesList:", text);
      sgeSendStr(`N\t${process.env.INSTANCE}\n`);
      return;
    }
    if (text.startsWith("N")) {
      console.log("game versions:", text);
      sgeSendStr(`G\t${process.env.INSTANCE}\n`);
      return;
    }
    if (text.startsWith("G")) {
      console.log("gameInfo:", text);
      sgeSendStr("C\n");
      return;
    }
    if (text.startsWith("C")) {
      accountList = text
        .trim()
        .split("\t")
        .slice(5);
      let charList = []; // not using this right now, but could be useful in the future
      let charSlotNames = {};
      for (let i = 0; i < accountList.length; i += 2) {
        charList.push({ slot: accountList[i], name: accountList[i + 1] });
        charSlotNames[accountList[i + 1]] = accountList[i];
      }
      // grabbing character name from .env file, and ensuring the case is correct:
      const desiredCharacterName = process.env.CHARACTER.toLowerCase().split(
        ""
      );
      desiredCharacterName[0] = desiredCharacterName[0].toUpperCase();
      const charName = desiredCharacterName.join("");
      const slotName = charSlotNames[charName];
      console.log("charList:", charList);
      console.log("charSlotNames:", charSlotNames);
      sgeSendStr(`L\t${slotName}\tSTORM\n`);
      return;
    }
    if (text.startsWith("L")) {
      console.log("Login text:", text);
      connectKey = text.match(/KEY=(\S+)/)[1];
      console.log("Connect key captured as:", connectKey);
      sgeClient.destroy();
      return;
    }
    console.error("Error - unknown text received:");
    console.error(text);
  });

  function hashPassword() {
    const PASS = process.env.PASSWORD;
    console.log(`Hashing password (${PASS})`);
    let hashedPassword = [];
    PASS.split("").forEach((char, i) => {
      const result = hashChar(PASS[i], hashKey[i]);
      hashedPassword.push(result);
    });
    return hashedPassword; // returning as an array of ints
  }

  function hashChar(pwChar, hashNum) {
    let returnVal = hashNum ^ (pwChar.charCodeAt(0) - 32);
    returnVal += 32;
    return returnVal;
    // return String.fromCharCode(returnVal);
  }

  function sgeSendStr(str) {
    console.log("Sending:", str);
    sgeClient.write(str);
  }

  sgeClient.on("close", function() {
    console.log("SGE connection closed.");
    cb(connectKey);
  });
}

module.exports = getGameKey;
