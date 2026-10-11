DEVICE ?= tv
APP_ID := $(shell python3 -c 'import json; print(json.load(open("app/appinfo.json"))["id"])')
SERVER_VERSION ?= 4.20.19
FFMPEG_VERSION ?= 7.0.2
FFMPEG_URL ?= https://johnvansickle.com/ffmpeg/releases/ffmpeg-$(FFMPEG_VERSION)-arm64-static.tar.xz
FFMPEG_SHA256 ?= f4149bb2b0784e30e99bdda85471c9b5930d3402014e934a5098b41d0f7201b1
VERSION := $(shell python3 -c 'import json; print(json.load(open("app/appinfo.json"))["version"])')
IPK = $(APP_ID)_$(VERSION)_all.ipk
PATCH = patches/subtitle-audio-priority.patch

.PHONY: build package deploy launch restart clean check-frontend

service/server.js:
	@echo "==> Downloading Stremio server v$(SERVER_VERSION)..."
	@curl -fLsS --retry 3 --retry-delay 2 -o $@ "https://dl.strem.io/server/v$(SERVER_VERSION)/webos/server.js" || { rm -f $@; exit 1; }

service/bin/.ffmpeg-ready:
	@echo "==> Downloading and verifying static ffmpeg/ffprobe v$(FFMPEG_VERSION) (aarch64)..."
	@mkdir -p service/bin /tmp/stremio-ffmpeg
	@rm -f /tmp/stremio-ffmpeg/ffmpeg.tar.xz
	@curl -fLsS --retry 3 --retry-delay 2 -o /tmp/stremio-ffmpeg/ffmpeg.tar.xz "$(FFMPEG_URL)"
	@echo "$(FFMPEG_SHA256)  /tmp/stremio-ffmpeg/ffmpeg.tar.xz" | sha256sum -c -
	@tar xJ --strip-components=1 -f /tmp/stremio-ffmpeg/ffmpeg.tar.xz -C /tmp/stremio-ffmpeg
	@test -x /tmp/stremio-ffmpeg/ffmpeg
	@test -x /tmp/stremio-ffmpeg/ffprobe
	@cp /tmp/stremio-ffmpeg/ffmpeg /tmp/stremio-ffmpeg/ffprobe service/bin/
	@chmod +x service/bin/ffmpeg service/bin/ffprobe
	@touch $@
	@rm -rf /tmp/stremio-ffmpeg

service/bin/ffmpeg service/bin/ffprobe: service/bin/.ffmpeg-ready
	@test -x $@

build: service/server.js service/bin/ffmpeg service/bin/ffprobe
	@test -d frontend-webos || (echo "ERROR: frontend-webos/ is missing" && exit 1)
	@test -f "$(PATCH)" || (echo "ERROR: required patch $(PATCH) is missing" && exit 1)
	@rm -rf service/www
	@mkdir -p service/www
	@cp -a frontend-webos/. service/www/
	@patch --batch --forward --fuzz=0 -p0 -d service/www < "$(PATCH)"
	@$(MAKE) check-frontend

check-frontend:
	@node scripts/verify-build.js --frontend-only

package: build
	@rm -f "$(IPK)"
	@ares-package --no-minify app service -o .
	@test -s "$(IPK)" || (echo "ERROR: package $(IPK) was not created" && exit 1)

deploy: package
	@ares-install --device $(DEVICE) "$(IPK)"
	@ares-launch --device $(DEVICE) "$(APP_ID)"

launch:
	@ares-launch --device $(DEVICE) "$(APP_ID)"

restart:
	@-ares-launch --device $(DEVICE) --close "$(APP_ID)"
	@sleep 1
	@ares-launch --device $(DEVICE) "$(APP_ID)"

clean:
	rm -rf service/www service/server.js service/bin *.ipk
