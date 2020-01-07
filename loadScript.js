"use strict";
// https://stackoverflow.com/questions/15666144/how-to-remove-module-after-require-in-node-js

const path = require("path");
const fs = require("fs");

function loadScript(scriptFileName, sendCommandToGame, globals) {
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
        clearScriptCache();
        let load = require(scriptFullPath);
        let { run, parseText } = await load(sendCommandToGame, globals);
        resolve(parseText);
        await run();
        parseText = () => {};
        console.log("Script ended:", scriptFileName);
      } catch (err) {
        console.error("Error running script", scriptFileName, ":", err);
        return reject(() => {});
      }
    });
  });
}

module.exports = { loadScript };

function clearScriptCache() {
  for (const path in require.cache) {
    if (path.endsWith(".js")) {
      // only clear *.js, not *.node
      delete require.cache[path];
    }
  }
}

// import method to test:
// import("my-module.js").then(module => {
//   CONTAINER.sayHello = module.sayHello;
//   CONTAINER.sayHello(); // hello
//   delete CONTAINER.sayHello;
//   console.log(CONTAINER.sayHello); // undefined
// });
