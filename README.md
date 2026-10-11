<img width="1920" height="1080" alt="capture" src="https://github.com/user-attachments/assets/eb5f79c2-3f2c-4ddb-b8cc-061b02a56196" />
<img width="1920" height="1080" alt="capture2" src="https://github.com/user-attachments/assets/5c86999c-aed8-4fbb-9517-e809bf472c7a" />

Stremio for webOS

Standalone and optimized Stremio build for LG webOS TVs.

This project is maintained specifically for LG webOS and focuses on performance, native TV integration, improved media playback, multi-profile support, and additional TV-focused features.

Built on Stremio Theater and stripped of unnecessary non-webOS platform code for a cleaner, faster, and more streamlined LG webOS experience.

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
* Optional embedded subtitle language preference
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

This build reads the audio tracks exposed by the LG TV’s native media pipeline and automatically selects the track matching the preferred audio language configured in Stremio.

This provides more consistent language selection when streams contain multiple audio tracks.

Multi-profile support

Starting with stremio-webos 1.1.0, this build supports Stremio multi-profile functionality.

Multi-profile access is available only to accounts with an active Stremio Supporter subscription.

Eligible users can select between their available profiles directly on the TV. PIN-protected profiles are also supported.

Free accounts do not have access to Stremio’s multi-profile feature.

Installation alongside official Stremio

This build uses its own application ID and can therefore be installed alongside the official Stremio application on the same LG webOS TV.

This makes it possible to use or test this build without replacing the official Stremio installation.

# Installation

## Homebrew Channel

For LG webOS TVs with [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel):

1. Open **Homebrew Channel** on your TV.
2. Open **Settings → Add repository**.
3. Add this public repository index:

   `https://raw.githubusercontent.com/BarrFarr/Stremio-WebOS-SubEm/release/1.1.5-subaudio/webosbrew/apps.json`

4. Return to the app list.
5. Find **Stremio SubEm**.
6. Install and launch the app.

The index references this fork's latest release manifest. That manifest must be published alongside the IPK and contains the direct download URL, version, SHA-256 checksum and byte size. The new source configuration does not become installable through Homebrew until a release with both assets exists.

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

The build uses the checked-in `frontend-webos/` snapshot, downloads the pinned Stremio webOS server and FFmpeg/FFprobe assets, verifies the FFmpeg archive checksum, applies `patches/subtitle-audio-priority.patch`, verifies the resulting frontend bundles and packages the IPK. It does not blindly apply the legacy patches over a snapshot that may already contain those changes.

## Release automation

CI is intended to build and validate branch pushes and pull requests without publishing a release. Publishing is a separate operation triggered by a semantic-version tag such as `v1.1.6`. The release workflow builds and inspects the IPK, computes its SHA-256 and size, creates `manifest.json`, and publishes both as release assets.

A successful CI build is not a substitute for manually testing playback and track selection on the target LG webOS TV.
