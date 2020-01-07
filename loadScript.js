"use strict";

const path = require("path");
const fs = require("fs");

function loadScript(scriptFileName, sendCommandToGame) {
  return new Promise((resolve, reject) => {
    if (!scriptFileName) return console.error("Must specify a file name!");
    const directoryPath = path.join(__dirname, "scripts");
    fs.readdir(directoryPath, async (err, fileNameList) => {
      if (err)
        return console.log(
          "Unable to open list of script files in /script directory:",
          err
        );
      // for now, no fancy checking:
      if (!fileNameList.includes(scriptFileName + ".js")) {
        console.error("Could not find script named", scriptFileName);
      }
      const scriptFullPath = path.join(directoryPath, scriptFileName + ".js");
      try {
        const load = require(scriptFullPath);
        const { run, parseText } = await load(sendCommandToGame);
        console.log("loadscript, parseText:", parseText);
        run();
        return resolve(parseText);
      } catch (err) {
        console.error("Error running script", scriptFileName, ":", err);
        return reject(() => {});
      }
    });
  });
}

module.exports = { loadScript };

// let globalParseText = () => {
//   console.log("loadScript parse text running");
// };

// function loadScript(scriptFileName) {
//   if (!scriptFileName) return console.error("Must specify a file name!");
//   const directoryPath = path.join(__dirname, "scripts");
//   fs.readdir(directoryPath, (err, fileNameList) => {
//     if (err)
//       return console.log(
//         "Unable to open list of script files in /script directory:",
//         err
//       );
//     // for now, no fancy checking:
//     if (!fileNameList.includes(scriptFileName + ".js")) {
//       console.error("Could not find script named", scriptFileName);
//     }
//     const scriptFullPath = path.join(directoryPath, scriptFileName + ".js");
//     try {
//       const { run, parseText } = require(scriptFullPath);
//       globalParseText = parseText;
//       run();
//     } catch (err) {
//       console.error("Error running script", scriptFileName, ":", err);
//     }
//   });
// }

// module.exports = { loadScript, globalParseText };
