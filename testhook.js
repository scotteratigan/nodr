const hooks = {};
let key = "roundtime";
hooks[key] = {
  fn: () => {},
  cb: () => {}
};

async function loop() {
  await pause(1);
  console.log("paused...");
  await pause(1);
  console.log("paused...");
  await pause(1);
  console.log("paused...");
}

async function mainLoop() {
  console.log("started mainLoop...");
  await pause(4);
  console.log("mainloop done");
}

loop();
mainLoop();

function pause(seconds) {
  return new Promise(res => setTimeout(res, seconds * 1000));
}
