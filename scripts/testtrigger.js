"use-strict";
// Adding a hook into parseText is working well. Hooks can be added and removed.
// Todo: add fn to trigger when global vars change, same way we did parseText

const utils = require("../utils");

module.exports = load;

let captureExp = false;

function load(put, globals) {
  const parseHooks = {};

  function addHook(name, fn) {
    console.log("adding fn called", name);
    console.log("with value:", fn);
    parseHooks[name] = fn;
    console.log("hooks are now:", parseHooks);
  }

  function removeHook(name) {
    delete parseHooks[name];
  }

  async function run() {
    addHook("noSit", text => {
      if (text.startsWith("You sit")) put("stand");
    });
    addHook("autocast", text => {
      if (text.startsWith("You feel fully prepared")) put("cast");
    });
    await pause(30);
    removeHook("noSit");
    removeHook("autocast");
    console.log("Hook removed.");
    await pause(10);
  }

  function pause(seconds) {
    return new Promise(res => {
      setTimeout(res, seconds * 1000);
    });
  }

  function parseText(str) {
    if (Object.values && Object.values.length) {
      Object.values(parseHooks).forEach(fn => fn(str));
    }
  }

  return { run, parseText };
}
