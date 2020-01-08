"use-strict";
// Adding a hook into parseText is working well. Hooks can be added and removed.

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
    addHook("test", text => console.log("Test sees:", text.substr(0, 10)));
    await pause(10);
    removeHook("test");
    console.log("Hook removed.");
    await pause(10);
  }

  function pause(seconds) {
    return new Promise(res => {
      setTimeout(res, seconds * 1000);
    });
  }

  function parseText(str) {
    Object.values(parseHooks).forEach(fn => fn(str));
  }

  return { run, parseText };
}
