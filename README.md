<img width="1920" height="1080" alt="capture" src="https://github.com/user-attachments/assets/eb5f79c2-3f2c-4ddb-b8cc-061b02a56196" />
<img width="1920" height="1080" alt="capture2" src="https://github.com/user-attachments/assets/5c86999c-aed8-4fbb-9517-e809bf472c7a" />

Stremio for webOS

Standalone and optimized Stremio build for LG webOS TVs.

This project is maintained specifically for LG webOS and focuses on performance, native TV integration, improved media playback, multi-profile support, and additional TV-focused features.

Built on Stremio Theater and stripped of unnecessary non-webOS platform code for a cleaner, faster, and more streamlined LG webOS experience.

## Origin and credits

**Stremio SubEm** is an unofficial fork of [spcljense/stremio-webos](https://github.com/spcljense/stremio-webos) by Kieran Brown (spcljense). That project is an LG webOS build of the Stremio Theater frontend. This fork keeps the upstream code and adds:

- **Prefer Embedded Subtitles**: the subtitle track built into the video file, in the language chosen in Settings, is used first. Addon subtitles (for example OpenSubtitles) are used only when the file has no such track.
- **Prefer Audio Over Default**: the audio track in your chosen language is used instead of the track the file marks as default.
- A separate app ID (`org.barrfarr.stremio.subem`), so it installs alongside the official Stremio app and the upstream build.

This project is not affiliated with or endorsed by Stremio. "Stremio" is a trademark of its respective owner. The streaming server (`server.js`) is downloaded from Stremio's official distribution at build time and is not part of this repository.

**License:** the upstream repository does not publish a license. This fork therefore does not add one, and the upstream code remains under its authors' rights. The fork's own additions (`patches/subtitle-audio-priority.patch` and the `scripts/test-subem-*.js` tests) are offered to upstream and may be reused by it.
Features

* Multi-profile support for users with an active Stremio Supporter subscription
* Profile selection directly on the TV
* Support for PIN-protected profiles
* SkipDB integration for supported movies and episodes
    * Skip Intro
    * Skip Recap
    * Skip Outro
    * Visual segment markers in the playback timeline
* Faster startup and responsive TV navigation
* Native LG webOS media player integration
* Configurable preferred audio language selection
* Optional "Prefer Embedded Subtitles": built-in subtitle track in your language first, addon (OpenSubtitles) subtitles only as a fallback
* Improved handling of multiple audio tracks
* Official Stremio streaming server integration
* Optimized specifically for LG webOS TVs
* Standalone application ID, allowing installation alongside the official Stremio app

SkipDB integration

This build integrates SkipDB to provide chapter-like skip segments for supported movies and episodes.

When segment information is available in the SkipDB database, the player can identify sections such as Intro, Recap, and Outro and expose them directly during playback.

Supported segments are also displayed as visual markers in the playback timeline, making their position and duration visible while seeking.

SkipDB availability depends on whether segment data exists for the currently playing title or episode.

Preferred audio language

The official Stremio app may sometimes select the first available audio track instead of the user’s configured preferred language.

When enabled in the app's **STREMIO TV** settings, this build reads the audio tracks exposed by the LG TV’s native media pipeline and selects a matching non-commentary track for the preferred audio language configured in Stremio. If no match exists, the stream's original choice is preserved.

This provides more consistent language selection when streams contain multiple audio tracks.

Multi-profile support

Starting with stremio-webos 1.1.0, this build supports Stremio multi-profile functionality.

Multi-profile access is available only to accounts with an active Stremio Supporter subscription.

Eligible users can select between their available profiles directly on the TV. PIN-protected profiles are also supported.

Free accounts do not have access to Stremio’s multi-profile feature.

Installation alongside official Stremio

This build uses its own application ID and can therefore be installed alongside the official Stremio application on the same LG webOS TV.

This makes it possible to use or test this build without replacing the official Stremio installation.

# What this fork changes: embedded subtitles first

## The problem

With an OpenSubtitles addon installed, the stock player kept taking subtitles from the addon instead of the subtitle track built into the video file (MKV/MP4). Often it selected nothing at all and the subtitle menu showed **None**, even when the file had a track in the language chosen under Settings → Subtitles → Default Language.

Built-in tracks are usually better: they are timed for the exact release and need no download. Addon subtitles are a good fallback, but they should not replace a matching built-in track.

## Why it happened

- The player screen picks the default subtitle track, not the low-level webOS video player. In the stock Theater code, the **Default Language** branch only runs after a *secondary* subtitle language has been applied. With a single language configured, no track was picked, so the result was **None**, or the addon track from an earlier per-video choice.
- Built-in tracks are reported by an asynchronous media probe, often after the addon results have already arrived. Anything that picks "the first matching track" tends to take the addon track.
- stremio-core keeps only its own known settings fields. An extra key saved through `updateSettings` is dropped silently, so a new option cannot be stored in `profile.settings`.

## What was added

Two switches in **Settings → Playback**. Both are OFF by default and the app keeps stock behaviour while they are OFF.

- **Prefer Embedded Subtitles.** The player uses the subtitle **Default Language** from Settings and picks, in this order:
  1. the built-in (embedded) track in that language, if the file has one;
  2. otherwise the addon track (for example OpenSubtitles) in that language.

  Before falling back to an addon track, the player waits until the file's built-in tracks are known, up to 6 seconds when the file has none. The choice is made once per video, so a track you pick manually during playback is not overridden.
- **Prefer Audio Over Default.** The player switches to the audio track in the audio **Default Language** instead of the track the file marks as default. Commentary and audio-description tracks are skipped. If no matching track exists, the file's default is kept.

The switch values are stored in `localStorage` (`stremio_subem_preferEmbeddedSubtitles`, `stremio_subem_preferAudioOverDefault`) rather than in `profile.settings`, because stremio-core drops unknown settings keys. Settings and the player read the same keys.

All changes live in `patches/subtitle-audio-priority.patch`, which the build applies to the `frontend-webos/` snapshot. `make check-frontend` runs `scripts/test-subem-toggles.js` and `scripts/test-subem-subtitle-choice.js` against the built files. They check that the switches toggle and persist, and that subtitles are chosen as embedded first, addon second. See `DEVELOPMENT.md` for the technical details.
# Installation

## Homebrew Channel

For LG webOS TVs with [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel):

1. Open **Homebrew Channel** on your TV.
2. Open **Settings → Add repository**.
3. Add this public repository index:

   `https://raw.githubusercontent.com/BarrFarr/Stremio-WebOS-SubEm/main/webosbrew/apps.json`

4. Return to the app list.
5. Find **Stremio SubEm**.
6. Install and launch the app.

The index references this fork's latest release manifest. That manifest contains the direct download URL, version, SHA-256 checksum and byte size for the published package.

## GitHub Release

Prebuilt IPK packages are available from this fork's [GitHub Releases page](https://github.com/BarrFarr/Stremio-WebOS-SubEm/releases).

For the separate-install build, the package name after the next release will follow this pattern:

```text
org.barrfarr.stremio.subem_1.1.6_all.ipk
```

## Manual installation

With webOS CLI configured and the TV added as device `tv`:

```sh
ares-install --device tv org.barrfarr.stremio.subem_1.1.6_all.ipk
ares-launch --device tv org.barrfarr.stremio.subem
```

The fork uses its own App ID and service ID so it can coexist with the upstream app. It does not automatically migrate the upstream app's local storage or profile state.

## Build from source

Requirements: Node.js 20, Python 3, GNU Make, `curl`, `tar`, `patch`, `sha256sum` and the webOS CLI package.

```sh
npm install --global @webos-tools/cli
make package
```

The build uses the checked-in `frontend-webos/` snapshot, downloads the pinned Stremio webOS server and FFmpeg/FFprobe assets, verifies the FFmpeg archive checksum, applies the exact `patches/subtitle-audio-priority.patch`, verifies the resulting frontend bundles and packages the IPK.

## Manual release

Releases are built and published locally. After `make package` and package inspection, calculate the final IPK's SHA-256 and byte size, create `manifest.json`, and upload both files to the matching GitHub Release.

Playback, audio-track selection and subtitle selection should still be smoke-tested on the target LG webOS TV when a device is available.
