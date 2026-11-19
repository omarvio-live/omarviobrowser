# Security & Zero-Tracking Policy — OMARVIO BROWSER

> **"আমার ফোন, আমার ডেটা – কাউকে দেব না!"**  
> OMARVIO BROWSER operates with **Zero Admin Panel**, **Zero Central User Database**, and **Zero Telemetry**.

---

## 1. Secret Management Policy (Zero Hardcoded Keys)
This public repository **never** contains real signing certificates, keystores, or runtime API keys:
- **Android / Desktop Signing Keys:** Stored strictly inside encrypted **GitHub Actions Repository Secrets** (`OMARVIO_KEYSTORE_BASE64`, `OMARVIO_KEYSTORE_PASSWORD`, `OMARVIO_KEY_ALIAS`, `OMARVIO_KEY_PASSWORD`) and never committed to source control.
- **AI / Server Runtime Secrets:** `GEMINI_API_KEY` and optional vault secrets are injected solely at runtime via **Cloudflare Pages Encrypted Environment Variables** or local un-committed `.env` files.
- **Public Verification Fingerprints:** Only public `SHA-256` signing certificate fingerprints are published in `public/.well-known/assetlinks.json` and release metadata so users can verify official builds.

---

## 2. Verifiable Local-First Data Architecture
- **No Central Database / Admin Panel:** User bookmarks, browsing history, vault PIN/biometrics, custom shortcuts, and downloaded files remain **100% locally on the user's device** (`SharedPreferences`, `localStorage`, local app storage).
- **No Analytics SDKs:** No Google Analytics, Firebase Telemetry, Facebook Pixel, or third-party crash/ad trackers exist anywhere in the codebase.
- **Direct Native Loading:** Android and Desktop apps load websites directly from the user's device with local O(1) ad/tracker blocking—never routing Android/Desktop traffic through a central surveillance server.

---

## 3. Verifying Official Releases
Official releases are built transparently from this repository via GitHub Actions and published exclusively under:
- **Repository:** `https://github.com/omarvio-live/omarviobrowser`
- **Official Web & API Hub:** `https://omarvio-browser.pages.dev`

*(Note: Once the permanent release keystore is configured in GitHub Secrets, the verified `SHA-256` signing certificate fingerprint will be published here and in `public/.well-known/assetlinks.json`.)*

---

## 4. Reporting a Security Vulnerability
If you discover a security issue, please report it responsibly without disclosing exploit payloads publicly first:
- **Email:** `omarvio.official@gmail.com`
- **Telegram:** `https://t.me/omarvio_official`
