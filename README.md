# OMARVIO BROWSER

> **"আমার ফোন, আমার ডেটা – কাউকে দেব না!"**  
> **Zero Admin Panel · Zero Central Database · Zero Tracking · 100% Open-Source Auditable**

OMARVIO BROWSER is a privacy-first, ad-free browser built for **Android**, **Web/PWA**, and **Desktop (Windows & Linux)** with zero analytics, zero telemetry, and zero central user-data collection.

---

## Privacy & Open-Source Guarantee (সহজ প্রমাণ)

Anyone can audit every line of this repository and confirm:
1. **No Admin Panel & No Central Database:** There is no backend user table, no login server, and no remote control panel collecting your browsing activity.
2. **100% On-Device Data:** Your bookmarks, history, vault PIN/biometrics, downloads, and preferences stay strictly on your own phone or computer.
3. **No Analytics / Ad SDKs:** Zero Google Analytics, Firebase, Mixpanel, or third-party tracking SDKs exist in either the Android app, Desktop app, or Web PWA.
4. **No Hardcoded Secrets:** All signing keys (`OMARVIO_KEYSTORE_*`) and runtime API keys (`GEMINI_API_KEY`) live strictly in **GitHub Secrets** and **Cloudflare Secret Vault**—never in public source files.

---

## Platforms & Architecture

| Platform | Engine & Experience | Status |
| :--- | :--- | :--- |
| **Android Native App** | Kotlin + Jetpack Compose Native Home + Pooled Chromium WebView + O(1) AdBlock + Biometric Vault + `.mht` Offline Archive | Active (`.apk` / `.aab` via GitHub Releases) |
| **Windows & Linux Desktop** | Electron + Direct Chromium `WebContentsView` + Zero-Proxy Ad/Tracker Filtering + Shared React UI | Ready for CI/CD Build (`.exe`, `.AppImage`, `.deb`) |
| **Web / PWA & Edge API** | React + Vite + Cloudflare Pages (`/api/apk-status`, `/api/filter-lists`, `/api/ai/chat`) + Quick Reader & Download Hub | Live at `omarvio-browser.pages.dev` |

---

## Official Downloads & Verification

- **Official Web & Download Hub:** [https://omarvio-browser.pages.dev](https://omarvio-browser.pages.dev)
- **Official Android APK (Latest Release):** [Download `omarvio-browser.apk`](https://github.com/omarvio-live/omarviobrowser/releases/latest/download/omarvio-browser.apk)
- **Architecture & Complete Roadmap:** [`OMARVIO_ARCHITECTURE_AND_ROADMAP.md`](./OMARVIO_ARCHITECTURE_AND_ROADMAP.md)
- **Security Policy:** [`SECURITY.md`](./SECURITY.md)

### Official Release Signing Certificate (`SHA-256`)
- **Package ID:** `com.omarvio.browser`
- **Signing SHA-256:** *Pending permanent keystore setup by project owner in GitHub Secrets (`OMARVIO_KEYSTORE_BASE64`). Once published, verify the fingerprint in `public/.well-known/assetlinks.json`.*

---

## License & Brand Protection

- Source code is licensed under the **[Apache License 2.0](./LICENSE)**.
- The **OMARVIO** / **OMARVIO BROWSER** name, logos, and official release identities remain protected trademarks of **OMARVIO GLOBAL LTD.** Forked builds must use their own distinct name, icon, and package identifier.
