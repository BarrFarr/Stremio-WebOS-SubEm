# Stremio webOS

Custom Stremio app for LG webOS TVs. Uses a locally maintained webOS-only Stremio Theater v1.9.2 frontend with the official Stremio streaming server.

## Important: Build artifacts

Several files are **downloaded/generated at build time** and will not exist in a fresh clone:

- `service/server.js` — downloaded from `dl.strem.io` (Stremio streaming server, webOS build)
- `service/bin/ffmpeg` and `service/bin/ffprobe` — downloaded static AArch64 binaries after checksum verification
- `service/www/` — created from the checked-in `frontend-webos/` snapshot with the required subtitle/audio patch applied
- `*.ipk` — built installation package

Run `make build` to generate these before inspecting or modifying them.

## Structure

```
app/                  # webOS app shell — starts service, redirects to http://127.0.0.1:8080
  appinfo.json        # webOS app manifest (id: org.barrfarr.stremio.subem)
  index.html          # Starts server via Luna, polls :8080, redirects when ready
  services.json       # Links to server service
  icon.png

service/              # webOS service
  launch.js           # Entry point: serves www/ on :8080, proxies API to streaming server on :11470
  index.html          # Theater entry point for webOS (sets __STREMIO_SERVER_URL__ to :8080)
  package.json        # Service manifest (main: launch.js)
  services.json       # Luna service registration
  server.js           # [downloaded] Official Stremio streaming server
  www/                # [built] checked-in frontend snapshot + subtitle/audio patch

patches/              # The one patch applied to the checked-in frontend during build
  subtitle-audio-priority.patch
```

## How it works

1. `make build` downloads the Stremio server and FFmpeg dependencies, copies the checked-in `frontend-webos/` snapshot into `service/www/`, applies `patches/subtitle-audio-priority.patch`, and runs the build validator
2. `make deploy` packages the IPK via `ares-package` and installs via `ares-install`
3. On launch: `app/index.html` starts the server service via Luna, polls `:8080` with an `<img>` load, redirects when ready
4. `service/launch.js` serves the Theater frontend on `:8080` and proxies all non-static requests to the streaming server on `:11470`

The proxy exists because the app loads from `file://` which cannot XHR/fetch to `http://` origins (CORS restriction on webOS Chrome 68). Serving everything from `:8080` makes all requests same-origin.

## Patches

`frontend-webos/` is the checked-in frontend snapshot used for this build. Only `subtitle-audio-priority.patch` is applied during `make build`; the old audio-track patch was removed because it was a corrupt, overlapping diff against an older snapshot. Native track enumeration, label enrichment and switching already live in the checked-in bundle, while the applied patch adds the opt-in language selection around that code.

## Deploy

Requires Node.js 20 and the webOS CLI (`npm i -g @webos-tools/cli`). The TV must be configured as device `tv` in ares (`ares-setup-device`).

```sh
make deploy    # build + package + install + launch
make build     # download dependencies + build service/www/
make package   # build + create IPK
make restart   # close + relaunch on TV
make clean     # remove all build artifacts
```

### subtitle-audio-priority.patch

Adds two switches to Settings -> Playback (**Prefer Embedded Subtitles** and **Prefer Audio Over Default**) and extends the WebOsVideo player (`video.chunk.js`) with the behaviours they enable.

The switches are stored in `localStorage` under `stremio_subem_preferEmbeddedSubtitles` and `stremio_subem_preferAudioOverDefault` (values `"true"` / `"false"`). This is the single source of truth for both the Settings screen and the player. They are deliberately **not** stored in `profile.settings`: stremio-core's `Settings` struct only keeps its own known fields, so an unknown key sent through `updateSettings` is dropped and the switch could never stay ON. The language itself still comes from the standard Stremio fields `profile.settings.subtitlesLanguage` and `profile.settings.audioLanguage`.

The settings screen re-renders the switches through a module-scope Solid signal (`subEmRevision`). It must stay at module scope: inside the settings factory the name `n` is a local variable, not solid-js.

#### subtitleLanguage + preferEmbeddedSubtitles — embedded subtitle auto-select

On the TV the choice is made in `player.chunk.js` (the Stremio player screen, which drives the `WebOsVideo` implementation). When the **Prefer Embedded Subtitles** switch is ON and a default subtitle language is set in Settings, the player picks:

1. an embedded track in that language, if the file has one;
2. otherwise an addon track in that language (for example from OpenSubtitles).

Embedded tracks are reported by an asynchronous media probe, so an addon track is only taken once the probe has reported the file's tracks, or after a 6-second wait when the file has no embedded subtitles at all. The choice is made once per video; a track picked manually afterwards is not overridden. With the switch OFF the stock Stremio logic is unchanged. `scripts/test-subem-subtitle-choice.js` checks this on the built file.

The `HTMLVideo` fallback player (`video.chunk.js`) applies the same preference directly to the element's text tracks:

When the **Prefer Embedded Subtitles** switch is ON and `profile.settings.subtitlesLanguage` is set, the `onloadedmetadata` handler scans `d.textTracks` for a track whose `kind` is `subtitles` or `captions` and whose language matches. Only when a match exists is it set to `mode="showing"` and the other subtitle/caption tracks disabled; tracks of other kinds (chapters, metadata) are untouched. If there is no match, no track is changed and Stremio's external-subtitle logic remains in charge.

Language codes are normalised: 2-letter ISO 639-1 codes (e.g. `pl`, `en`) and region forms (e.g. `en-US`) are mapped to 3-letter ISO 639-2/T codes (`pol`, `eng`) before comparison so a track labelled `pol` matches a setting of `pl`.

#### preferAudioOverDefault — opt-in audio language auto-select

By default the player uses whatever audio track the stream starts with. Turning the **Prefer Audio Over Default** switch ON enables the existing `audioLanguage`-based auto-select in **both** places it runs:

- `onloadedmetadata` — selects the preferred track immediately when metadata loads
- `addtrack` event handler — re-runs selection when tracks are added after initial load (common with adaptive streams)

Without this flag the audio auto-select code is skipped entirely, so the stream default is preserved even when `audioLanguage` is set. A configured language is used only when a matching non-commentary track exists; otherwise the original stream choice remains active.

#### Setting values without the UI (debugging only)

Normal users use the switches in Settings. In a remote debug session the same values can be set directly:

```js
localStorage.setItem("stremio_subem_preferEmbeddedSubtitles", "true");
localStorage.setItem("stremio_subem_preferAudioOverDefault", "true");
```

The player reads the values when a video starts, so the change applies to the next playback.
