#!/usr/bin/env node
"use strict";
// Behavioural check for the two SubEm switches in the BUILT frontend (service/www).
// It verifies that each switch can be turned ON, OFF and ON again, that the value
// is stored in localStorage under the key the player reads, and that the helper
// code at module scope really resolves solid-js (webpack module 9225).
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const dir = path.join(process.cwd(), "service", "www");
const settings = fs.readFileSync(path.join(dir, "settings.chunk.js"), "utf8").replace(/\r\n/g, "\n");
const video = fs.readFileSync(path.join(dir, "video.chunk.js"), "utf8").replace(/\r\n/g, "\n");
const KEYS = ["preferEmbeddedSubtitles", "preferAudioOverDefault"];

// Minimal createSignal stand-in: [getter, setter(valueOrUpdater)].
const createSignal = (initial) => {
  let value = initial;
  return [() => value, (next) => { value = typeof next === "function" ? next(value) : next; }];
};
const makeStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
};

// 1. Run settings module 5998's top level with mocked webpack modules and make sure
//    the SubEm signal is created from the solid-js module (no TypeError at load).
{
  const deep = new Proxy(function () {}, {
    get: (t, p) => (p === Symbol.toPrimitive ? () => "" : deep),
    apply: () => deep,
  });
  let n5Calls = 0;
  const solid = new Proxy({ n5: (v) => { n5Calls++; return createSignal(v); } }, {
    get: (t, p) => (p in t ? t[p] : deep),
  });
  const modules = {};
  const sandbox = { self: {}, localStorage: makeStorage() };
  sandbox.self.webpackChunkstremio_theater = { push: ([, mods]) => Object.assign(modules, mods) };
  vm.runInNewContext(settings, sandbox, { filename: "settings.chunk.js" });
  assert(modules[5998], "Settings module 5998 not found in settings.chunk.js");
  const req = (id) => (id === 9225 ? solid : deep);
  req.r = () => {};
  req.d = () => {};
  req.n = () => () => deep;
  modules[5998]({}, {}, req);
  assert.strictEqual(n5Calls, 1, "SubEm signal was not created from solid-js at module scope");
}

// 2. Evaluate the helper block exactly as built and click each switch three times.
const start = settings.indexOf("const [subEmRevision, setSubEmRevision]");
const end = settings.indexOf("const d = e => (0, c.Mj)(e).toRgbString()", start);
assert(start !== -1 && end !== -1, "SubEm helper block not found in built settings.chunk.js");
const helperSrc = settings.slice(start, end);
for (const key of KEYS) {
  assert(settings.includes(`checked: () => readSubEmSetting("${key}")`), `Switch ${key} is not bound to readSubEmSetting`);
  assert(settings.includes(`onClick: () => toggleSubEmSetting("${key}")`), `Switch ${key} is not bound to toggleSubEmSetting`);
  assert(video.includes(`localStorage.getItem("stremio_subem_${key}") === "true"`), `Player does not read stremio_subem_${key}`);
}
assert(!/checked: \(\) => !0 === b\(\)\.prefer/.test(settings), "A switch still reads profile.settings (dropped by stremio-core)");

const storage = makeStorage();
const helpers = vm.runInNewContext(
  `${helperSrc}; ({ readSubEmSetting, toggleSubEmSetting, subEmRevision });`,
  { n: { n5: createSignal }, localStorage: storage }
);
for (const key of KEYS) {
  const states = [helpers.readSubEmSetting(key)];
  for (let i = 0; i < 3; i++) {
    helpers.toggleSubEmSetting(key);
    states.push(helpers.readSubEmSetting(key));
    assert.strictEqual(storage.getItem(`stremio_subem_${key}`), String(states[states.length - 1]), `${key} not persisted`);
  }
  assert.deepStrictEqual(states, [false, true, false, true], `${key} switch sequence was ${states}`);
}
assert(helpers.subEmRevision() === 6, "Switch clicks did not notify the UI signal");
console.log("SubEm switch behaviour test passed (OFF -> ON -> OFF -> ON for both switches).");
