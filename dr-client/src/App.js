import React, { Component } from "react";
// import logo from "./logo.svg";
import "./App.css";
import Header from "./Header";
import Game from "./Game";

class App extends Component {
  state = {
    loggedIn: false
  };

  getLoginKey = (accountName, password) => {
    console.log("attempting login with:", accountName, password);
    getGameKey();
    this.setState({ loggedIn: true });
  };

  render() {
    return (
      <div className="App">
        <Header getLoginKey={this.getLoginKey} loggedIn={this.state.loggedIn} />
        <Game />
      </div>
    );
  }
}

export default App;

function getGameKey(account, password) {
  var connection = new WebSocket("ws://eaccess.play.net:7900", {
    isTrusted: true
  });
  connection.onopen = () => {
    console.log("Connection opened!");
    connection.send("K\n");
  };

  connection.onerror = function(error) {
    console.log("WebSocket Error " + JSON.stringify(error));
  };

  connection.onmessage = function(e) {
    console.log("Server: " + e.data);
  };

  // const net = require("net");
  // const io = require("socket.io-client");
  // const sgeClient = io("http://eaccess.play.net:7900");
  // let connectKey = null;
  // let hashKey = null; // hashKey vals can be 64 <= x <= 127

  // sgeClient.connect();
  // sgeClient.on("connection", socket => {
  //   console.log("Connected!");
  //   setTimeout(() => {
  //     sgeClient.disconnect();
  //   }, 3000);
  // });

  // sgeClient.on("disconnect", () => {
  //   console.log("Disconnected.");
  // });

  /*
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
        console.log(`A\t${account}\t${hashedPassArr}\r\n`);
        sgeClient.write(`A\t${account}\t`);
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
      const accountList = text
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
    const PASS = password;
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
    // cb(connectKey);
    alert("Key is:", connectKey);
  });

  */
}
