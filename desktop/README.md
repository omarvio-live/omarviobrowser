# OMARVIO BROWSER — Windows & Linux Desktop App

Direct **Zero-Proxy** Chromium Desktop Browser powered by Electron `WebContentsView` with built-in Ad & Tracker Shields, HTTPS-Only upgrades, and Energy Saver tab sleeping.

## Features
- **Zero-Proxy Direct Chromium:** Loads YouTube, Google, Facebook, and all web apps directly without middleman proxy hops.
- **Native O(1) Domain Ad/Tracker Blocker:** Blocks major ad & analytics domains and strips `fbclid`/`gclid`/`utm_*` tracking parameters at the Chromium `session.webRequest` layer.
- **Multi-Tab Pool & Energy Saver:** Instant 0ms switching between active `WebContentsView` tabs; Energy Saver mode sleeps inactive tabs to free RAM.

## Local Development (Computer)
```bash
cd desktop
npm install
npm start
```

## Automated Cloud Builds (No Computer Needed)
GitHub Actions workflow `.github/workflows/build-desktop.yml` automatically compiles:
- **Windows:** `.exe` (NSIS Installer + Portable)
- **Linux:** `.AppImage` + `.deb`

Simply trigger the workflow from GitHub **Actions -> Build OmarVio Desktop (Windows & Linux)** or push a `v*` tag.
