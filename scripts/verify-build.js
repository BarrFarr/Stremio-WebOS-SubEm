#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = process.cwd();
const frontendOnly = process.argv.includes("--frontend-only");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const app = readJson("app/appinfo.json");
const pkg = readJson("service/package.json");
const appServices = readJson("app/services.json");
const service = readJson("service/services.json");
const appId = "org.barrfarr.stremio.subem";
const serviceId = `${appId}.server`;
const version = "1.1.6";

assert.strictEqual(app.id, appId, "Unexpected app ID");
assert.strictEqual(app.version, version, "Unexpected app version");
assert.strictEqual(app.title, "Stremio SubEm", "Unexpected app title");
assert.strictEqual(pkg.name, serviceId, "Unexpected service package name");
assert.strictEqual(pkg.version, version, "Unexpected service version");
assert.deepStrictEqual(appServices, [serviceId], "app/services.json does not reference expected service");
assert.strictEqual(service.id, serviceId, "service/services.json has inconsistent ID");
assert.deepStrictEqual(service.services.map((entry) => entry.name), [serviceId], "service/services.json has inconsistent service name");
assert(fs.existsSync(path.join(root, "app", app.icon)), "Application icon is missing");

if (!frontendOnly) {
  console.log("Application and service metadata verification passed.");
  process.exit(0);
}

const dir = path.join(root, "service", "www");
const settings = fs.readFileSync(path.join(dir, "settings.chunk.js"), "utf8");
const video = fs.readFileSync(path.join(dir, "video.chunk.js"), "utf8");

for (const [source, text] of [
  [settings, "Prefer Embedded Subtitles"],
  [settings, "Prefer Audio Over Default"],
  [settings, "preferEmbeddedSubtitles"],
  [settings, "preferAudioOverDefault"],
  [video, "__prefEmb"],
  [video, "__prefAudioOverDef"],
  [video, "preferEmbeddedSubtitles"],
  [video, "preferAudioOverDefault"],
  [video, "__normS"],
  [video, "__normA"],
]) {
  assert(source.includes(text), `Missing built frontend feature: ${text}`);
}

assert(!settings.includes("stremio_prefer_embedded_subs") && !video.includes("stremio_prefer_embedded_subs"), "Legacy subtitle flag remains");
assert(!settings.includes("stremio_prefer_audio_over_default") && !video.includes("stremio_prefer_audio_over_default"), "Legacy audio flag remains");
assert(video.includes("Media probe error, falling back to direct playback"), "Direct-play fallback for failed capability probes is missing");
console.log("Frontend verification passed.");
