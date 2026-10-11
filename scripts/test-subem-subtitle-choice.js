#!/usr/bin/env node
"use strict";
// Behavioural check of the "Prefer Embedded Subtitles" choice in the BUILT player
// (service/www/player.chunk.js): embedded track in the chosen language first,
// otherwise the addon (OpenSubtitles) track in that language.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const file = path.join(process.cwd(), "service", "www", "player.chunk.js");
const src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const start = src.indexOf("const __subEmPref = ");
const end = src.indexOf("if (!be() && !__subEmActive)", start);
assert(start !== -1 && end !== -1, "SubEm subtitle choice block not found in built player.chunk.js");
const block = src.slice(start, end);

function scenario({ pref = true, lang = "pol", steps }) {
  const timers = [];
  const picked = [];
  const state = { embedded: [], addon: [], selected: false };
  const storage = { getItem: (k) => (k === "stremio_subem_preferEmbeddedSubtitles" && pref ? "true" : null) };
  const C = {
    selectSubtitlesTrack: (t) => picked.push(`embedded:${t.lang}`),
    selectExtraSubtitlesTrack: (t) => picked.push(`addon:${t.lang}`),
  };
  const ctx = {
    localStorage: storage, C, e: lang,
    He: () => ({ url: "http://example/video.mkv" }),
    be: () => state.selected, me: (v) => { state.selected = v; },
    $e: () => state.embedded, _e: () => state.addon,
    l: (list, want) => list.find((t) => t.lang === want),
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
  };
  const run = vm.compileFunction(block, [], { contextExtensions: [ctx] });
  for (const step of steps) {
    if (step === "timer") timers.splice(0).forEach((fn) => fn());
    else { Object.assign(state, step); run(); }
  }
  return picked;
}

const pl = { lang: "pol" }, en = { lang: "eng" };
// 1. Embedded PL exists -> embedded PL, even though OpenSubtitles PL is also there.
assert.deepStrictEqual(scenario({ steps: [{ addon: [pl] }, { embedded: [en, pl] }] }), ["embedded:pol"]);
// 2. File has embedded subs but no PL -> OpenSubtitles PL.
assert.deepStrictEqual(scenario({ steps: [{ embedded: [en] }, { addon: [pl] }] }), ["addon:pol"]);
// 3. File has no embedded subs at all -> OpenSubtitles PL after the probe wait.
assert.deepStrictEqual(scenario({ steps: [{ addon: [pl] }, "timer"] }), ["addon:pol"]);
// 4. OpenSubtitles PL loads first, embedded PL arrives a moment later -> still embedded PL.
assert.deepStrictEqual(scenario({ steps: [{ addon: [pl] }, { addon: [pl, en] }, { embedded: [pl] }, "timer"] }), ["embedded:pol"]);
// 5. Switch OFF -> the block does nothing (stock Stremio behaviour remains).
assert.deepStrictEqual(scenario({ pref: false, steps: [{ embedded: [pl], addon: [pl] }, "timer"] }), []);
// 6. Nothing is picked twice for the same video.
assert.deepStrictEqual(scenario({ steps: [{ embedded: [pl] }, { embedded: [pl], addon: [pl] }, "timer"] }), ["embedded:pol"]);
// 7. The language comes from Settings, not a fixed PL: with English selected, English wins.
assert.deepStrictEqual(scenario({ lang: "eng", steps: [{ embedded: [pl, en], addon: [en] }] }), ["embedded:eng"]);
assert.deepStrictEqual(scenario({ lang: "eng", steps: [{ embedded: [pl] }, { addon: [pl, en] }] }), ["addon:eng"]);
console.log("SubEm subtitle choice test passed (embedded track in the Settings language first, addon fallback).");
