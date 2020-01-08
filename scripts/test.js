"use-strict";
// Ok, this is working except once it loads once it is cached, need to bust that.
// Still, fantastic!

const utils = require("../utils");

module.exports = load;

let captureExp = false;

function load(put, globals) {
  async function run() {
    // await move("east");
    // await move("ne");
    // await move("go bridge");
    // await moveList([
    //   "Northwest",
    //   "North",
    //   "West",
    //   "North",
    //   "North",
    //   "North",
    //   "North",
    //   "North",
    //   "West",
    //   "North"
    // ]);
    // await dirMove(
    //   "Directions towards Intelligence training in Crossing: South, South, South, South, GO low gate, West, West, North, Northeast, and you're there."
    // );
    // put("app bro");
    // put("exp");
    // await pause(30);
    // put("gouge");
    // await pause(3);
    // put("gouge");
    // await pause(3);
    // put("gouge");
    // await pause(3);
    // put("gouge");
    // await pause(3);
    // put("gouge");
    // await pause(3);
    // put("gouge");
    // await pause(3);
    // put("gouge");
    // await pause(3);
    // put("gouge");
    // await pause(3);
    // put("gouge");
    // await pause(3);
    // await sendRT("forage rock");
    // await sendRT("hide");
    // await sendRT("forage rock");
    // await pause(5);
    // await roundtime();
    // put("west");
    // await pause(5);
    // put("east");
    // return new Promise(async (resolve, reject) => {
    //   // put("sit");
    //   // put("exp 0");
    //   put("appraise broadsword");
    //   // await rtPause();
    //   await pause(8.5);
    //   put("stand");
    //   // console.log("Globals:");
    //   // console.log(globals);
    //   // put("appraise my small sack");
    //   // await pause(8);
    //   // put("appraise my broadsword");
    //   // await pause(8);
    //   // put("exp");
    //   return resolve();
    // });
  }

  function dirMove(str) {
    // return new Promise(async res => {    });
    const moveArr = str
      .replace(/^Directions towards .+: /, "")
      .replace(/, and you're there\.$/, "")
      .replace(/, and /, ", ")
      .replace(".", "")
      .split(", ");
    return moveList(moveArr);
  }

  function move(command) {
    return new Promise(res => {
      globals.moved = false;
      put(command);
      let i = 0;
      let interval = setInterval(() => {
        i++;
        if (globals.moved || i > 40 * 5) {
          // 5 seconds max
          clearInterval(interval);
          return res();
        }
      }, 25); // every 25 ms
    });
  }

  async function moveList(moves) {
    return new Promise(async res => {
      for (let i = 0; i < moves.length; i++) {
        await move(moves[i]);
      }
    });
  }

  function sendRT(command) {
    return new Promise(async res => {
      const prevRoundtimeEnd = globals.roundtimeEnd;
      put(command);
      await newRtValue(prevRoundtimeEnd);
      const pauseSeconds = calculateRT();
      await pause(pauseSeconds);
      return res();
    });
  }

  function parseText(str) {
    if (str && str.startsWith("You sit down.")) return put("stand");

    if (str && str.startsWith("...wait")) {
      console.log("command failed to send");
    }

    str &&
      str.split("\r\n").forEach(line => {
        // console.log("LINE:", line);
        if (
          line.startsWith(
            "          SKILL: Rank/Percent towards next rank/Amount learning/Mindstate Fraction"
          )
        ) {
          console.log("---EXP DETECTED---");
          captureExp = true;
        } else if (line.startsWith("Total Ranks Displayed:")) {
          captureExp = false;
          console.log("---exp mode off---");
        } else if (captureExp) {
          try {
            //    Shield Usage:      3 00% clear          (0/34)     Light Armor:      3 00% clear          (0/34)
            // globals.gameTime = line.match(/^<prompt time="(\d+)"/)[1];
            if (line) {
              // todo: make this dry...
              let skillMatch = line.match(
                /^\s+([^:]+):\s+(\d+) (\d\d)% \w+\s+\((\d+)/
              );
              if (skillMatch) {
                const skillName = utils.getSkillName(skillMatch[1]);
                const skillRanks = parseFloat(
                  skillMatch[2] + "." + skillMatch[3]
                );
                const skillRate = parseInt(skillMatch[4]);
                const skillPct = parseFloat((skillRate / 34).toFixed(2));
                if (!globals.exp[skillName]) globals.exp[skillName] = {}; // todo: initialize this
                globals.exp[skillName].ranks = skillRanks;
                globals.exp[skillName].rate = skillRate;
                globals.exp[skillName].pct = skillPct;
                // console.log("Skill:", skillMatch);
              }
              skillMatch = line.match(
                /\s+([^\):]+):\s+(\d+) (\d\d)% \w+\s+\((\d+)\/34\)$/
              );
              if (skillMatch) {
                const skillName = utils.getSkillName(skillMatch[1]);
                const skillRanks = parseFloat(
                  skillMatch[2] + "." + skillMatch[3]
                );
                const skillRate = parseInt(skillMatch[4]);
                const skillPct = parseFloat((skillRate / 34).toFixed(2));
                if (!globals.exp[skillName]) globals.exp[skillName] = {}; // todo: initialize this
                globals.exp[skillName].ranks = skillRanks;
                globals.exp[skillName].rate = skillRate;
                globals.exp[skillName].pct = skillPct;
              }
            }
          } catch (err) {
            console.error("Error capturing exp:", err);
          }
        }
      });

    // console.log("Script detects:", str.substr(0, 10) + "...");
  }

  // pause functions are now broken, probably an error in nesting promises :/

  function pause(seconds) {
    return new Promise(res => {
      setTimeout(res, seconds * 1000);
    });
  }

  function newRtValue(prevRoundtimeEnd) {
    return new Promise(async res => {
      let i = 0;
      let interval = setInterval(() => {
        if (prevRoundtimeEnd !== globals.roundtimeEnd || i > 30) {
          // wait 3 seconds max;
          clearInterval(interval);
          return res();
        }
      }, 100);
    });
  }

  function calculateRT() {
    const currTime = new Date();
    const pauseMS =
      globals.roundtimeEnd * 1000 -
      currTime.getTime() +
      currTime.getMilliseconds();
    return pauseMS / 1000;
  }

  // function roundtime() {
  //   return new Promise(async (res, rej) => {
  //     console.log("awaiting roundtime...");
  //     const currTime = new Date();
  //     const pauseMS =
  //       globals.roundtimeEnd * 1000 -
  //       currTime.getTime() +
  //       currTime.getMilliseconds();
  //     await pause(pauseMS / 1000);
  //     return res();
  //   });
  // }
  // function rtPause() {
  //   // Need a global RT object for this to work
  //   return new Promise(async (resolve, reject) => {
  //     await pause(1000); // waiting for rt value to get set
  //     console.log("Waited a sec...");
  //     const currTime = new Date();
  //     console.log("currTime.getTime()", currTime.getTime());
  //     console.log("globals.roundtimeEnd:", globals.roundtimeEnd);
  //     // shouldn't need to wait for MS?
  //     const pauseMS = globals.roundtimeEnd * 1000 - currTime.getTime(); // - currTime.getMilliseconds();
  //     console.log("pausing for:", pauseMS / 1000, "seconds");
  //     if (pauseMS < 0) return resolve();
  //     await pause(pauseMS / 1000);
  //     return resolve();
  //   });
  // }

  function forage(item) {
    return new Promise(async (resolve, reject) => {
      await put(`forage ${item}`);
      setTimeout(() => resolve(), 5000);
    });
  }

  return { run, parseText };
}
