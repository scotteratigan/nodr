"use strict";
require("dotenv").config();
const colors = require("colors");
const net = require("net");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout
});
const client = new net.Socket();
const getConnectKey = require("./sge");
let gameTime = 0;
let buffer = "";
let roomName = "";
let roomDesc = "";
let roomObjs = "";
let roomObjsList = [];
let roomObjsCount = 0;
let roomPlayers = "";
let roomExits = "";
let roomExtra = "";
let lastRoundtime = 0;
let health = 100;
let mana = 100;
let spirit = 100;
let stamina = 100;
let concentration = 100;
let rightHand = null;
let rightHandNoun = null;
let rightHandId = null;
let leftHand = null;
let leftHandNoun = null;
let leftHandId = null;
let exp = {};
let stowedItems = [];
let wornItems = [];
let spell = null;
let castTime = 0; // contains gametime when spell is fully prepared OR gametime of last cast?
let activeSpells = [];
let monsterList = [];
let monsterCount = 0;

let sendParseText = () => {
  console.log("connect parseTextFn running");
};

// let sendTextFn = () => {
//   console.log("connect sendTextFn running");
// };

// let subscribedScripts = [];

// runtime bools:
let hideXML = true; // type 'raw' in game to toggle
let wornInventoryMode = false;
let activeSpellMode = false;

getConnectKey((connectKey, ip, port) => {
  console.log("connect.js has received connect key:", connectKey);
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
  // detects incomplete data fragments - if line does not end with \r\n, the data is split and we need to await the next packet before displaying/parsing all the data
  let gameStr = buffer + data.toString(); // todo: use actual buffer here
  if (!gameStr.match(/\r\n$/)) {
    buffer += gameStr;
    return;
  }
  buffer = "";

  gameStr.split("\r\n").forEach(line => parseXmlByLine(line));
  if (hideXML) {
    gameStr = gameStr.replace(/<pushStream[\s\S]+<popStream\/>/m, ""); // removes special multi-line tags
    gameStr = gameStr.replace(/<component id='exp[\s\S]+<\/component>/, ""); // hides exp messages
    gameStr = gameStr.replace(/<[^>]+>/g, ""); // removes single-line tags
  }
  gameStr = gameStr.replace(/^\s*\r?\n/g, ""); // strip all whitespace
  gameStr = gameStr.replace(/&gt;/g, ""); // make the prompt >
  try {
    sendParseText(gameStr);
  } catch (err) {
    console.error("Error:", err);
    console.log("sendParseText:", sendParseText);
  }

  console.log(gameStr);
  // console.log("---------------------------------");
});

client.on("close", function() {
  console.log("Connection closed");
  process.exit(0);
});

getCommand();

function getCommand() {
  // recursive function to get commands from player (todo: convert to loop)
  // todo: make prompt here match game prompt (readline.question)
  readline.question(``, async commands => {
    if (commands === "raw") {
      hideXML = !hideXML;
      console.log("hideXML:", hideXML);
    } else if (commands.startsWith(".")) {
      const scriptName = commands.substr(1);
      console.log("Script detected:", scriptName);
      try {
        const scriptImport = require("./loadScript"); // doing this here so I can update dynamically w/o reconnecting constantly
        const { loadScript } = scriptImport;
        // const { loadScript } = loader();
        console.log("awaiting...");
        const parseText = await loadScript(scriptName, sendCommandToGame); // pass a fn which can be used to send commands to game
        console.log("awaited, parseText:", parseText);
        sendParseText = parseText;
      } catch (err) {
        console.error("error:", err);
      }
    } else {
      sendCommandToGame(commands);
    }
    getCommand();
  });
}

function sendCommandToGame(commands) {
  commands.split(";").forEach(command => {
    client.write(command + "\n");
    console.log("COMMAND: " + command);
  });
}

function parseXmlByLine(line) {
  if (wornInventoryMode && !line.startsWith("<popStream")) {
    wornItems.push(line.trim());
    return;
  }
  if (activeSpellMode && !line.startsWith("<popStream/>")) {
    activeSpells.push(line.trim());
  }
  const xmlMatch = line.match(/^<(\w+)/);
  if (!xmlMatch) return;
  // console.log("xmlMatch:", xmlMatch);
  switch (xmlMatch[1]) {
    case "prompt":
      gameTime = line.match(/^<prompt time="(\d+)"/)[1];
      // console.log("gameTime:", gameTime);
      return;
    case "roundTime":
      lastRoundtime = line.match(/^<roundTime value='(\d+)'/)[1];
      // console.log("lastRoundtime:", lastRoundtime);
      break;
    case "nav":
      // indicates the start of movement, but doesn't seem to convey any useful info
      break;
    case "pushBold":
    case "popBold":
      // activates bold
      return;
    case "clearStream":
      if (line === '<clearStream id="percWindow"/>') {
        activeSpells = [];
      }
      // prior to spell list
      // <clearStream id="percWindow"/>
      return;
    case "pushStream":
      // beginning of spell list
      if (line.startsWith('<pushStream id="percWindow')) {
        activeSpellMode = true;
        const firstActiveSpell = line.substring(29).trim();
        activeSpells.push(firstActiveSpell);
      }
      return;
    case "popStream":
      // end of spell list, inventory, etc
      if (wornInventoryMode) {
        wornInventoryMode = false;
        console.log("wornItems:", wornItems);
      } else if (activeSpellMode) {
        activeSpellMode = false;
        console.log("activeSpells:", activeSpells);
      }
      return;
    case "streamWindow":
      // new room...
      const roomMatch = line.match(
        /<streamWindow id='\w+' title='\w+' subtitle=" - \[(.+)\]"/
      );
      if (roomMatch) {
        roomName = roomMatch[1];
        console.log("roomName:", roomName);
      } else {
        console.error("error grabbing roomName");
      }
      return;
    case "right":
      return parseHandXML(line, "right");
    case "left":
      return parseHandXML(line, "left");
    case "component":
      return parseComponentXML(line);
    case "dialogData":
      return parseDialogDataXML(line);
    case "clearContainer":
      return parseContainerItems(line);
    case "spell":
      return parseSpellXml(line);
    case "castTime":
      castTime = parseInt(line.match(/<castTime value='(\d+)'\/>/)[1]);
      return console.log("castTime:", castTime);
    case "resource":
    // used for pictures? lol
    case "style":
    // used in room descriptions, but I'm not using this one because look/peer fools this one
    // <style id="roomName" />[Northeast Wilds, Grimsage Way]
    case "compass":
      // shows room exits, but again this is not as accurate as alternate method which only sends on actual movement, so ignore
      // <compass><dir value="s"/></compass><prompt time="1569561088">&gt;</prompt>
      return;
    case "output":
      // enter monospace mode: <output class="mono"/>
      // exit monospace mode: <output class=""/>
      return;
    case "indicator":
    // <indicator id="IconKNEELING" visible="n"/><indicator id="IconPRONE" visible="n"/><indicator id="IconSITTING" visible="n"/><indicator id="IconSTANDING" visible="y"/><indicator id="IconKNEELING" visible="n"/><indicator id="IconPRONE" visible="n"/><indicator id="IconSITTING" visible="n"/><indicator id="IconSTANDING" visible="y"/>You stand back up.
    // a change in status (keeling/standing/sitting/possibly bleeding/stunned/dead?)
    default:
      console.log("Unknown xml:", xmlMatch[1]);
      return;
  }
}

function parseComponentXML(line) {
  /*
  <component id='room desc'>An enormous tower of grey marble rises imposingly from the ground, its stones fitted so closely that it appears to be one seamless spear of earth.  The top of the tower gleams brightly, the light reflecting from the panes of a skylight set into the roof.  A set of gleaming ebonwood doors inlaid with gold lead into the tower.</component>
  <component id='room objs'>You also see a gloop bucket.</component>
  <component id='room players'></component>
  <component id='room exits'>Obvious paths: <d>south</d>.<compass></compass></component>
  <component id='room extra'></component>
  wtf is extra?
  */
  const matchType = line.match(/<component id='([^']+)'/);
  const matchVal = line.match(/<component id='.+'>(.*)<\/component>/);

  if (matchType[1].startsWith("exp")) {
    const skill = matchType[1].substring(4);
    const value = matchVal[1].trim();
    if (value) {
      console.log(`Exp in ${skill} - ${value}`);
      exp.skill = value;
    } else {
      console.log(`Skill pulsed ${skill}`);
    }
    // <component id='exp Warding'></component> <- this means skill is not learning (login msgs)
    return;
  }
  // console.log("matchType:", matchType[1]);
  // console.log("matchVal:", matchVal[1]);
  switch (matchType[1]) {
    case "room desc":
      roomDesc = matchVal[1];
      if (roomDesc) console.log("roomDesc:", roomDesc);
      break;
    case "room objs":
      // todo: break this out into separate function
      // <component id='room objs'>You also see some dirt, a leaf, a twig, a weathered roadsign, a bucket of viscous gloop and a narrow footpath.</component>
      // no great way to split the string into an array because items like ball and chain exist
      // I'll do it a hacky way for now;
      roomObjs = matchVal[1];
      roomObjsCount = 0;
      monsterList = [];
      monsterCount = 0;
      if (!roomObjs) {
        roomObjsList = [];
        return;
      }
      roomObjsList = roomObjs
        .replace(/^You also see /, "")
        .replace(/\.$/, "")
        .replace(" and ", ", ")
        .split(", ");
      roomObjsCount = roomObjsList.length;
      console.log(`roomObjsList (${roomObjsCount}): ${roomObjsList}`);
      if (!roomObjs.includes("<pushBold/>")) return;
      monsterList = roomObjs
        .match(/<pushBold\/>([^<]+)<popBold\/>/g)
        .map(mobMatch => mobMatch.match(/<pushBold\/>([^<]+)<popBold\/>/)[1]);
      monsterCount = monsterList.length;
      if (monsterCount) console.log("mobs:", monsterCount, ":", monsterList);
      // roomObjs: You also see <pushBold/>a ship's rat<popBold/>, <pushBold/>a ship's rat<popBold/> and <pushBold/>a ship's rat<popBold/>.
      break;
    case "room players":
      roomPlayers = matchVal[1];
      if (roomPlayers) console.log("roomPlayers:", roomPlayers);
      break;
    case "room exits":
      roomExits = matchVal[1];
      if (roomExits) console.log("roomExits:", roomExits);
      break;
    case "room extra":
      roomExtra = matchVal[1];
      if (roomExtra) console.log("roomExtra:", roomExtra);
      break;
    default:
      console.log("Uknown matchType:", matchType[1], "with val:", matchVal[1]);
      break;
  }
}

function parseDialogDataXML(line) {
  // <dialogData id='minivitals'><skin id='manaSkin' name='manaBar' controls='mana' left='20%' top='0%' width='20%' height='100%'/><progressBar id='mana' value='100' text='mana 100%' left='20%' customText='t' top='0%' width='20%' height='100%'/></dialogData>
  const dialogTypeMatch = line.match(/<progressBar id='(\w+)'/);
  const dialogValMatch = line.match(/ value='(\d+)' /);
  const dialogType = dialogTypeMatch ? dialogTypeMatch[1] : null;
  const dialogVal = dialogValMatch ? dialogValMatch[1] : null;
  switch (dialogType) {
    case "mana":
      mana = parseInt(dialogVal);
      console.log("mana:", mana);
      break;
    case "stamina":
      stamina = parseInt(dialogVal);
      console.log("stamina:", stamina);
      break;
    case "concentration":
      concentration = parseInt(dialogVal);
      console.log("concentration:", concentration);
      break;
    default:
      console.log("Uknown dialogType:", dialogType);
      break;
  }
}

function parseHandXML(line, hand) {
  // <right exist="1085840" noun="sword">short sword</right>
  // <right>Empty</right>

  // inventory list follows hand xml:
  wornInventoryMode = true;
  wornItems = [];
  const emptyHandMatch = line.match(/^<\w+>Empty/);
  if (emptyHandMatch) {
    if (hand === "right") {
      rightHand = null;
      rightHandNoun = null;
      rightHandId = null;
      console.log("Right hand is empty.");
    } else {
      leftHand = null;
      leftHandNoun = null;
      leftHandId = null;
      console.log("Left hand is empty.");
    }
    return;
  }
  const item = line.match(/<\w+ exist="\d+" noun="\w+">([^<]+)</)[1];
  const itemId = line.match(/<\w+ exist="(\d+)"/)[1];
  const itemNoun = line.match(/<\w+ exist="\d+" noun="(\w+)">/)[1];
  console.log(`Item in ${hand}: ${item} (${itemId} - ${itemNoun})`);
  if (hand === "right") {
    rightHand = item;
    rightHandNoun = itemId;
    rightHandNoun = itemNoun;
  } else {
    leftHand = item;
    leftHandNoun = itemId;
    leftHandNoun = itemNoun;
  }
}

function parseContainerItems(line) {
  // <clearContainer id="stow"/><inv id='stow'>In the sack:</inv><inv id='stow'> a vault book with a tooled leather cover</inv><inv id='stow'> a misshaped deobar caddy</inv>You get a ...
  // start with index 1 to get actual items:
  stowedItems = line
    .match(/<inv id='stow'>([^<]+)<\/inv>/g)
    .map(itemStr => itemStr.match(/<inv id='stow'>([^<]+)<\/inv>/)[1].trim());
  console.log("stowedItems:", stowedItems);
}

function parseSpellXml(line) {
  if (line === "<spell>None</spell>") {
    console.log("No spell.");
    spell = null;
  }
  const spellMatch = line.match(/<spell exist='spell'>([^<]+)<\/spell>/);
  spell = spellMatch ? spellMatch[1] : null;
  console.log("Spell:", spell);
}

// function parsePushStream(line) {
//   /*
//   <pushStream id="percWindow"/>Swirling Winds  (10 roisaen)
//   Ethereal Shield  (10 roisaen)
//   <popStream/><castTime value='1569565556'/>
//   */
// }

// function sendToScripts(gameText) {
//   subscribedScripts.forEach(script => {
//     script.parseText(gameText);
//   });
// }

// function addScriptSubscription(script) {
//   subscribedScripts.push(script);
// }
