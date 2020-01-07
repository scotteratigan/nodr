"use-strict";
// Ok, this is working except once it loads once it is cached, need to bust that.
// Still, fantastic!

module.exports = load;

function load(sendTextFn) {
  async function run() {
    console.log("test loaded");
    await pause(10);
    console.log("test still running");
    await pause(30);
    console.log("script ending");
  }

  function parseText(str) {
    console.log("Script detects:", str.substr(0, 10) + "...");
  }
  return { run, parseText };
}

function pause(seconds) {
  console.log("pause:", seconds);
  return new Promise((resolve, reject) => {
    if (typeof seconds !== "number")
      return reject("Error, must be called with a number");
    setTimeout(() => resolve(), seconds * 1000);
  });
}

function rt(rtEndSeconds) {
  return new Promise(async (resolve, reject) => {
    const currTime = new Date();
    // shouldn't need to wait for MS?
    const pauseMS = rtEndSeconds * 1000 - currTime.getTime(); // - currTime.getMilliseconds();
    if (pauseMS < 0) return resolve();
    await pause(pauseMS / 1000);
    return resolve();
  });
}
