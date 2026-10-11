#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const root=process.cwd(),frontendOnly=process.argv.includes("--frontend-only");
const app=JSON.parse(fs.readFileSync(path.join(root,"app/appinfo.json"),"utf8"));
const pkg=JSON.parse(fs.readFileSync(path.join(root,"service/package.json"),"utf8"));
const appServices=JSON.parse(fs.readFileSync(path.join(root,"app/services.json"),"utf8"));
const service=JSON.parse(fs.readFileSync(path.join(root,"service/services.json"),"utf8"));
const appId="org.barrfarr.stremio.subem",serviceId=appId+".server";
assert.strictEqual(app.id,appId,"Unexpected app ID");
assert.strictEqual(app.title,"Stremio SubEm","Unexpected app title");
assert.strictEqual(pkg.name,serviceId,"Unexpected service package name");
assert.deepStrictEqual(appServices,[serviceId],"app/services.json does not reference expected service");
assert.strictEqual(service.id,serviceId,"service/services.json has inconsistent ID");
assert.deepStrictEqual(service.services.map(s=>s.name),[serviceId],"service/services.json has inconsistent service name");
if(frontendOnly){
 const dir=path.join(root,"service/www");
 const settings=fs.readFileSync(path.join(dir,"settings.chunk.js"),"utf8");
 const video=fs.readFileSync(path.join(dir,"video.chunk.js"),"utf8");
 for(const [s,k] of [[settings,"Prefer Embedded Subtitles"],[settings,"Prefer Audio Over Default"],[settings,"preferEmbeddedSubtitles"],[settings,"preferAudioOverDefault"],[video,"__prefEmb"],[video,"__prefAudioOverDef"],[video,"preferEmbeddedSubtitles"],[video,"preferAudioOverDefault"]])assert(s.includes(k),"Missing built frontend feature: "+k);
 assert(!settings.includes("stremio_prefer_embedded_subs")&&!video.includes("stremio_prefer_embedded_subs"),"Legacy subtitle flag remains");
 assert(!settings.includes("stremio_prefer_audio_over_default")&&!video.includes("stremio_prefer_audio_over_default"),"Legacy audio flag remains");
 assert(video.includes("Media probe error, falling back to direct playback"),"Direct-play fallback for failed capability probes is missing");
 console.log("Frontend verification passed.");
}else console.log("Application and service metadata verification passed.");
