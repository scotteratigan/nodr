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
let buffer = "";

const globals = {
  gameTime: 0,
  roomName: "",
  roomDesc: "",
  roomObjs: "",
  roomObjsList: [],
  roomObjsCount: 0,
  roomPlayers: "",
  roomExits: "",
  roomExtra: "",
  roundtimeEnd: 0,
  health: 100,
  mana: 100,
  spirit: 100,
  stamina: 100,
  concentration: 100,
  rightHand: {
    item: null,
    noun: null,
    id: null
  },
  leftHand: {
    item: null,
    noun: null,
    id: null
  },
  exp: {},
  stowedItems: [],
  wornItems: [],
  spell: null,
  castTime: 0, // contains gametime when spell is fully prepared OR gametime of last cast
  activeSpells: [],
  monsterList: [],
  monsterCount: 0,
  moved: false
};

let sendParseText = () => {};

// let subscribedScripts = [];

// runtime bools:
let hideXML = true; // type 'raw' in game to toggle
let wornInventoryMode = false;
let activeSpellMode = false;

getConnectKey((connectKey, ip, port) => {
  console.log("Received connect key:", connectKey);
  client.connect(port, ip, function() {
    console.log("Connected, sending key.".green);
    setTimeout(() => {
      client.write(connectKey + "\n");
    }, 100);
    setTimeout(() => {
      client.write("/FE:STORMFRONT /VERSION:1.0.1.22 /XML\n");
    }, 200);
    setTimeout(() => {
      client.write("l\n");
    }, 500); // testing shorter timeout here
  });
});

client.on("data", data => {
  // detects incomplete data fragments - if line does not end with \r\n, the data is split and we need to await the next packet before displaying/parsing all the data
  let gameStr = buffer + data.toString(); // todo: use actual buffer here?
  if (!gameStr.match(/\r\n$/)) {
    buffer += gameStr;
    return;
  }
  buffer = "";

  gameStr.split("\r\n").forEach(line => parseXmlByLine(line));
  if (hideXML) {
    gameStr = gameStr.replace(/<pushStream[\s\S]+<popStream\/>/m, ""); // removes special multi-line tags
    gameStr = gameStr.replace(/<component id='exp[\s\S]+<\/component>/g, ""); // hides exp messages
    gameStr = gameStr.replace(/<component id='room .*<\/component>/g, ""); // removes double-room messaging
    gameStr = gameStr.replace(/<clearContainer .*<\/inv>/, ""); // fixes: In the carpetbag: nothingYou get a fir stick from inside your leather-clasped carpetbag.
    gameStr = gameStr.replace(/<(left|right)>.*\/>/, ""); // fixes displaying hand items in game window when getting/stowing

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

  // console.log(gameStr);
  gameStr.split("\r\n").forEach(line => {
    if (line.length > 0) console.log(line); // remove empty lines, for now. (option eventually?)
  });
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
    } else if (commands === "#var") {
      console.log(globals);
    } else if (commands.startsWith(".")) {
      const scriptName = commands.substr(1);
      console.log("Script detected:", scriptName);
      try {
        const scriptImport = require("./loadScript"); // doing this here so I can update dynamically w/o reconnecting constantly
        const { loadScript } = scriptImport;
        // const { loadScript } = loader();
        console.log("awaiting...");
        sendParseText = await loadScript(
          scriptName,
          sendCommandToGame,
          globals
        ); // return value is function that sends text to game
        // sendParseText = parseText;
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
  // if (wornInventoryMode && !line.startsWith("<popStream")) {
  if (wornInventoryMode && line.startsWith("  ")) {
    globals.wornItems.push(line.trim());
    return;
  }
  if (activeSpellMode && !line.startsWith("<popStream/>")) {
    globals.activeSpells.push(line.trim());
  }
  const xmlMatch = line.match(/^<(\w+)/);
  if (!xmlMatch) return;
  // console.log("xmlMatch:", xmlMatch);
  switch (xmlMatch[1]) {
    case "prompt":
      globals.gameTime = line.match(/^<prompt time="(\d+)"/)[1];
      // console.log("gameTime:", gameTime);
      return;
    case "roundTime":
      const rtMatch = line.match(/^<roundTime value='(\d+)'\/>(.*)/);
      try {
        globals.roundtimeEnd = rtMatch[1];
        console.log(rtMatch[2]);
        sendParseText(rtMatch[2]);
      } catch (err) {
        console.error("Error processing RT line:", err, line);
      }
      // console.log("roundtimeEnd:", roundtimeEnd);
      break;
    case "nav":
      // indicates the start of movement, but doesn't seem to convey any useful info
      // console.log("nav detected, moved rooms.");
      globals.moved = true;
      // todo: fire event when this happens
      break;
    case "pushBold":
    case "popBold":
      // activates bold, ignoring for now
      return;
    case "clearStream":
      if (line === '<clearStream id="percWindow"/>') {
        globals.activeSpells = [];
      }
      // prior to spell list
      // <clearStream id="percWindow"/>
      return;
    case "pushStream":
      // beginning of spell list
      if (line.startsWith('<pushStream id="percWindow')) {
        activeSpellMode = true;
        const firstActiveSpell = line.substring(29).trim();
        globals.activeSpells.push(firstActiveSpell);
      }
      return;
    case "popStream":
      // end of spell list, inventory, etc
      if (wornInventoryMode) {
        wornInventoryMode = false;
        console.log("wornItems:", globals.wornItems);
      } else if (activeSpellMode) {
        activeSpellMode = false;
        // console.log("activeSpells:", globals.activeSpells);
      }
      return;
    case "streamWindow":
      // new room...
      const roomMatch = line.match(
        /<streamWindow id='main' title='Story' subtitle=" - \[(.+)\]"/
      );
      if (roomMatch) {
        globals.roomName = roomMatch[1];
        // console.log("roomName:", globals.roomName);
      } else {
        // console.error("error grabbing roomName"); // ignoring error since this sends twice on each movement
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
      try {
        globals.castTime = parseInt(
          line.match(/<castTime value='(\d+)'\/>/)[1]
        );
        return console.log("castTime:", globals.castTime);
      } catch (err) {
        return console.error("Error parsing spell time:", err);
      }
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
      if (!hideXML) console.log("Unknown xml:", xmlMatch[1], line);
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
  let matchType;
  let matchVal;
  try {
    // todo: combine this regex:
    matchType = line.match(/<component id='([^']+)'/);
    matchVal = line.match(/<component id='.+'>(.*)<\/component>/);
  } catch (err) {
    console.error("Error trying to parseComponentXML:", err);
    return;
  }

  if (matchType[1].startsWith("exp")) {
    try {
      const skill = matchType[1].substring(4);
      const value = matchVal[1].trim();
      // todo: this is pretty essential...
      if (value) {
        // console.log(`Exp in ${skill} - ${value}`);
        // globals.exp[skill] = value;
      } else {
        // console.log(`Skill pulsed ${skill}`); // todo: hook in fn here
      }
      // <component id='exp Warding'></component> <- this means skill is not learning (login msgs)
      return;
    } catch (err) {
      console.error("Error parsing exp:", err);
    }
  }

  // console.log("matchType:", matchType[1]);
  // console.log("matchVal:", matchVal[1]);
  switch (matchType[1]) {
    case "room desc":
      const roomDesc = matchVal[1];
      if (roomDesc) {
        globals.roomDesc = roomDesc;
        // console.log("roomDesc:", roomDesc);
      }
      break;
    case "room objs":
      // todo: break this out into separate function
      // <component id='room objs'>You also see some dirt, a leaf, a twig, a weathered roadsign, a bucket of viscous gloop and a narrow footpath.</component>
      // no great way to split the string into an array because items like ball and chain exist
      // I'll do it a hacky way for now;
      try {
        const roomObjs = matchVal[1];
        const monsterList = [];
        if (!roomObjs) {
          globals.roomObjsList = [];
          globals.monsterCount = 0;
          globals.roomObjsCount = 0;
          return;
        }
        globals.roomObjsList = roomObjs
          .replace(/^You also see /, "")
          .replace(/\.$/, "")
          .replace(" and ", ", ")
          .split(", ");
        globals.roomObjsCount = globals.roomObjsList.length;
        // console.log(
        //   `roomObjsList (${globals.roomObjsCount}): ${globals.roomObjsList}`
        // );
        if (!roomObjs.includes("<pushBold/>")) return;
        globals.monsterList = roomObjs
          .match(/<pushBold\/>([^<]+)<popBold\/>/g)
          .map(mobMatch => mobMatch.match(/<pushBold\/>([^<]+)<popBold\/>/)[1]);
        globals.monsterCount = monsterList.length;
        // if (globals.monsterCount) console.log("mobs:", globals.monsterCount, ":", globals.monsterList);
        // roomObjs: You also see <pushBold/>a ship's rat<popBold/>, <pushBold/>a ship's rat<popBold/> and <pushBold/>a ship's rat<popBold/>.
      } catch (err) {
        console.error("Error parsing room objs:", err);
      }
      break;
    case "room players":
      globals.roomPlayers = matchVal[1];
      // if (globals.roomPlayers) console.log("roomPlayers:", globals.roomPlayers);
      break;
    case "room exits":
      globals.roomExits = matchVal[1];
      // if (globals.roomExits) console.log("roomExits:", globals.roomExits);
      break;
    case "room extra":
      globals.roomExtra = matchVal[1];
      // if (globals.roomExtra) console.log("roomExtra:", globals.roomExtra);
      break;
    default:
      console.log("Uknown matchType line is:", line);
      break;
  }
}

function parseDialogDataXML(line) {
  // <dialogData id='minivitals'><skin id='manaSkin' name='manaBar' controls='mana' left='20%' top='0%' width='20%' height='100%'/><progressBar id='mana' value='100' text='mana 100%' left='20%' customText='t' top='0%' width='20%' height='100%'/></dialogData>
  const dialogTypeMatch = line.match(/<progressBar id='(\w+)'/);
  const dialogValMatch = line.match(/ value='(\d+)' /);
  const dialogType = dialogTypeMatch ? dialogTypeMatch[1] : null;
  const dialogVal = dialogValMatch ? dialogValMatch[1] : null;
  try {
    var dialogValInt = parseInt(dialogVal);
    setGlobal(dialogType, dialogValInt);
  } catch (err) {
    console.error("Error parsing dialogVal to integer:", err);
  }
}

function setGlobal(key, value) {
  // todo: add hook here for certain keys firing
  // if (key === "stamina") console.log("setGlobal - stamina change");
  global[key] = value;
}

function parseHandXML(line, hand) {
  // <right exist="1085840" noun="sword">short sword</right>
  // <right>Empty</right>

  // inventory list follows hand xml:
  wornInventoryMode = true;
  globals.wornItems = [];
  const emptyHandMatch = line.match(/^<\w+>Empty/);
  if (emptyHandMatch) {
    if (hand === "right") {
      globals.rightHand = {
        item: null,
        noun: null,
        id: null
      };
      // console.log("Right hand is empty.");
    } else {
      globals.leftHand = {
        item: null,
        noun: null,
        id: null
      };
      // console.log("Left hand is empty.");
    }
    return;
  }
  const item = line.match(/<\w+ exist="\d+" noun="\w+">([^<]+)</)[1];
  const id = line.match(/<\w+ exist="(\d+)"/)[1];
  const noun = line.match(/<\w+ exist="\d+" noun="(\w+)">/)[1];
  console.log(`Item in ${hand}: ${item} (${id} - ${noun})`);
  if (hand === "right") {
    if (globals.rightHand.id !== id) {
      // only fire event on change.
      globals.rightHand = { item, id, noun };
    }
  } else {
    if (globals.leftHand.id !== id) {
      globals.leftHand = { item, id, noun };
    }
  }
}

function parseContainerItems(line) {
  // <clearContainer id="stow"/><inv id='stow'>In the sack:</inv><inv id='stow'> a vault book with a tooled leather cover</inv><inv id='stow'> a misshaped deobar caddy</inv>You get a ...
  // start with index 1 to get actual items:
  try {
    globals.stowedItems = line
      .match(/<inv id='stow'>([^<]+)<\/inv>/g)
      .map(itemStr => itemStr.match(/<inv id='stow'>([^<]+)<\/inv>/)[1].trim());
    console.log("stowedItems:", globals.stowedItems);
  } catch (err) {
    console.error("Error with parseContainerItems:", err);
  }
}

function parseSpellXml(line) {
  if (line === "<spell>None</spell>") {
    console.log("No spell.");
    globals.spell = null;
  }
  const spellMatch = line.match(/<spell exist='spell'>([^<]+)<\/spell>/);
  globals.spell = spellMatch ? spellMatch[1] : null;
  console.log("Spell:", globals.spell);
}

// Unknown xml: exposeContainer
// Uknown dialogType: health
// Uknown dialogType: spirit
// Unknown xml: openDialog
