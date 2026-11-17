# OMARVIO BROWSER — ফুল সিস্টেম আর্কিটেকচার, ওয়ার্কফ্লো ডায়াগ্রাম এবং কমপ্লিট রোডম্যাপ

> **সংস্করণ (Current Release Manifest):** `v2.0.0.14` (`versionCode: 14`)  
> **Android Package ID:** `com.omarvio.browser` (`targetSdk 35`, `minSdk 26`)  
> **Web & Edge Host:** `https://omarvio-browser.pages.dev` (Cloudflare Pages + KV + Express Dev/Node Core)  
> **মূল দর্শন:** *"আমার ফোন, আমার ডেটা – কাউকে দেব না!"* — জিরো ট্র্যাকিং, অ্যাড-মুক্ত দ্রুত ব্রাউজিং, একক UI সিঙ্ক এবং ১০০% ব্রাউজার-নিয়ন্ত্রিত ডাউনলোড ও ইন-অ্যাপ আপডেট।

---

## সূচিপত্র
1. [পুরো সিস্টেমের ওভারভিউ ও ১টি কোর কনসেপ্ট](#১-পুরো-সিস্টেমের-ওভারভিউ-ও-১টি-কোর-কনসেপ্ট)
2. [মাস্টার আর্কিটেকচার ডায়াগ্রাম (Web + Edge + Android + CI/CD)](#২-মাস্টার-আর্কিটেকচার-ডায়াগ্রাম)
3. [ওয়েবসাইট ও এজ প্রক্সি আর্কিটেকচার (কিভাবে কাজ করে)](#৩-ওয়েবসাইট-ও-এজ-প্রক্সি-আর্কিটেকচার)
4. [অ্যান্ড্রয়েড অ্যাপ আর্কিটেকচার ও ব্রিজ (কিভাবে কাজ করে)](#৪-অ্যান্ড্রয়েড-অ্যাপ-আর্কিটেকচার-ও-নেটিভ-ক্রোমিয়াম-ইঞ্জিন)
5. [ইন-অ্যাপ APK আপডেট, ডাউনলোড ওনারশিপ ও WhatsApp/Messenger ডায়াগ্রাম](#৫-ইন-অ্যাপ-apk-আপডেট-ডাউনলোড-হাব-এবং-whatsappmessenger-লিংক-ফ্লো)
6. [✅ সম্পন্ন হওয়া সব কাজ (Completed & Verified Checklist)](#৬--সম্পন্ন-হওয়া-সব-কাজ-completed--verified)
7. [⏳ বাকি কাজ ও পরবর্তী ধাপসমূহ (Remaining Work & Next Roadmap)](#৭--বাকি-কাজ-ও-পরবর্তী-ধাপসমূহ-remaining-work--next-steps)

---

## ১. পুরো সিস্টেমের ওভারভিউ ও ১টি কোর কনসেপ্ট

**OMARVIO BROWSER** মূলত একটি **Single-UI, Dual-Engine Architecture**-এ তৈরি:

1. **ওয়েবসাইট (`omarvio-browser.pages.dev`):** এটি একই সাথে একটি পূর্ণাঙ্গ **PWA ওয়েব ব্রাউজার** এবং **অ্যান্ড্রয়েড অ্যাপের ডিস্ট্রিবিউশন/আপডেট হাব**। ওয়েবসাইটে ব্রাউজ করার সময় `iframe` নিরাপত্তা বাধা (`X-Frame-Options` / `CSP`) কাটাতে রিকোয়েস্টগুলো প্রথমে ক্লায়েন্ট-সাইড `adblocker` মিডলওয়্যার এবং পরে Cloudflare Edge Proxy (`/api/proxy`) দিয়ে ফিল্টার ও ক্লিন হয়ে রেন্ডার হয়।
2. **অ্যান্ড্রয়েড অ্যাপ (`MainActivity.kt`):** অ্যান্ড্রয়েড অ্যাপের **Home Screen UI** সরাসরি ওয়েবসাইটের React UI (`?androidShell=1`) লোড করে—ফলে ওয়েবসাইটে কোনো UI আপডেট দিলে সাথে সাথেই অ্যাপেও UI আপডেট হয়ে যায় (অফলাইনে অটোমেটিক নেটিভ ফলব্যাক সহ)। কিন্তু ইউজার যখনই কোনো ওয়েবসাইট বা সার্চ ওপেন করে, তখন `OmarvioAndroid` JS Bridge সেই লিংকটি **অ্যান্ড্রয়েডের নেটিভ Chromium WebView (`OmarVioWebViewClient`)**-এ পাঠিয়ে দেয়—যাতে Google, YouTube, Facebook, বা যেকোনো সাইট **০ms গতিতে কোনো প্রক্সি বাধা ছাড়াই সরাসরি** লোড হয় এবং `AdBlockEngine.kt` নেটিভ লেয়ারে অ্যাড/ট্র্যাকার ব্লক করে।

---

## ২. মাস্টার আর্কিটেকচার ডায়াগ্রাম

```mermaid
flowchart TB
    subgraph DEV["Developer & CI/CD Pipeline"]
        GIT["GitHub Repo (omarvio-live/omarviobrowser)"]
        GHA["GitHub Actions (.github/workflows/build-apk.yml)"]
        REL["GitHub Releases (omarvio-browser.apk)"]
        MANIFEST["public/apk-release.json (v2.0.0.14 / code 14)"]
        GIT -->|push main / tag v*| GHA
        GHA -->|Gradle assembleRelease + apksigner| REL
        GHA -->|Sync version & versionCode| MANIFEST
    end

    subgraph CLOUD["Web & Cloudflare Pages Edge Layer"]
        CF["Cloudflare Pages / Express Server (server.ts)"]
        SW["Service Worker (public/sw.js)"]
        PROXY["/api/proxy & /api/proxy-download"]
        APKAPI["/api/apk-status & /api/download-apk"]
        SEO["Zero-Tracker SEO (index.html, robots.txt, sitemap.xml)"]
        CF --> SW
        CF --> PROXY
        CF --> APKAPI
        CF --> SEO
        MANIFEST --> APKAPI
    end

    subgraph WEB["Web / PWA Client (React + Vite + Tailwind)"]
        APP["src/App.tsx + Omnibox + BrowserHome"]
        ADMW["src/engine/adblocker.ts Middleware\n(6 Granular Lists + HTTPS-Only)"]
        BFRAME["src/components/BrowserFrame.tsx\n(Reading Mode + HTTPS Warning)"]
        DLWEB["src/engine/inAppDownloader.ts\n+ DownloadsModal.tsx"]
        APP --> ADMW --> BFRAME --> PROXY
        BFRAME --> DLWEB
    end

    subgraph ANDROID["Native Android App (com.omarvio.browser)"]
        INTENT["AndroidManifest Intent Filters\n(VIEW http/https/web+omarvio & SEND text/plain)"]
        MAIN["MainActivity.kt (Jetpack Compose Shell)"]
        HOMEWV["Home WebView (?androidShell=1)\n+ OmarvioAndroid JS Bridge"]
        NATWV["Native Chromium WebView\n(OmarVioWebViewClient.kt)"]
        ADKT["AdBlockEngine.kt\n(EasyList, EasyPrivacy, Badger, PeterLowe, Malware, Annoyances)"]
        DLHUB["Owned In-App Downloads Hub\n+ DownloadManager + FileProvider Auto-Installer"]

        INTENT -->|Unwrap URL + Strip Trackers| MAIN
        MAIN --> HOMEWV
        HOMEWV <-->|OmarvioAndroid Bridge| MAIN
        MAIN --> NATWV
        NATWV <--> ADKT
        MAIN --> DLHUB
        APKAPI -->|Check versionCode & version| MAIN
        REL -->|Direct APK Download| DLHUB
    end
```

---

## ৩. ওয়েবসাইট ও এজ প্রক্সি আর্কিটেকচার

### ৩.১ ওয়েবসাইটের রিকোয়েস্ট লাইফসাইকেল (কিভাবে একটি সাইট লোড হয়)

```mermaid
sequenceDiagram
    autonumber
    actor User as ইউজার (Web / PWA)
    participant Omni as Omnibox / BrowserHome
    participant MW as adblocker.ts Middleware
    participant Clinic as security.ts (Link Clinic)
    participant Frame as BrowserFrame.tsx
    participant Edge as /api/proxy (Cloudflare / Express)
    participant Target as Target Website

    User->>Omni: URL বা ভয়েস সার্চ ইনপুট
    Omni->>MW: runAdblockerMiddleware({ url, settings })
    MW->>MW: 1. Redirect আনর্যাপ (l.facebook, google/url, ddg)
    MW->>MW: 2. ট্র্যাকিং টোকেন মুছে ফেলা (utm_*, fbclid, wa_click_id)
    MW->>MW: 3. HTTPS-Only Mode থাকলে http:// -> https:// আপগ্রেড
    alt ম্যালওয়্যার/অ্যাড/ট্র্যাকার URL
        MW-->>User: Pre-flight ব্লক + Blocked Counter বৃদ্ধি
    else ক্লিন URL
        MW->>Clinic: auditUrlSecurity(cleanUrl)
        alt ঝুঁকিপূর্ণ / ফিশিং লিংক
            Clinic-->>User: LinkClinicModal সতর্কবার্তা
        else নিরাপদ
            Clinic->>Frame: লোড রিকোয়েস্ট (&tb=&af=&ho=&lists=)
            Frame->>Edge: GET /api/proxy?url=...&lists=...&ho=...
            alt সক্রিয় লিস্টে অ্যাড/ট্র্যাকার ম্যাচ
                Edge-->>Frame: 204 No Content / Empty Shield JS-CSS
            else HTTPS-Only অন ও TLS/SSL ব্যর্থ
                Edge-->>Frame: HTTPS-Only Mode Warning HTML + postMessage
                Frame-->>User: Go Back to Safety / Continue HTTP Anyway
            else বৈধ ওয়েবসাইট
                Edge->>Target: Clean Fetch (No Telemetry)
                Target-->>Edge: HTML / Asset Response
                Edge->>Edge: স্ট্রিপ X-Frame-Options/CSP + ইনজেক্ট Conditional Cosmetic CSS
                Edge-->>Frame: স্যানিটাইজড পেজ (Reading Mode ও Link Bridge সহ)
            end
        end
    end
```

### ৩.২ ওয়েব ফ্রন্টএন্ড ও ব্যাকএন্ড মডিউলসমূহ
| লেয়ার | মূল ফাইলসমূহ | দায়িত্ব ও কার্যপ্রণালী |
| :--- | :--- | :--- |
| **UI & Tabs** | `src/App.tsx`, `BrowserHome.tsx`, `Omnibox.tsx`, `TabSwitcherModal.tsx`, `NavigationBar.tsx`, `ChromeMenuDropdown.tsx` | অভিন্ন হোম ও ব্রাউজিং হেডার, Web Speech API ভয়েস সার্চ, ড্র্যাগ-অ্যান্ড-ড্রপ ট্যাব গ্রুপ, ইনকগনিটো, ডার্ক/OLED থিম। |
| **Privacy & Shields** | `src/engine/adblocker.ts`, `SettingsDrawer.tsx`, `SiteControlsModal.tsx`, `public/sw.js` | ৬টি Granular ব্লক-লিস্ট টগল, HTTPS-Only টগল ও সেশন বাইপাস সেট, Service Worker strict hostname suffix ম্যাচিং। |
| **Rendering & Reader** | `src/components/BrowserFrame.tsx`, `SmartReaderView.tsx`, `src/engine/readerExtractor.ts` | সাইডবার/অ্যাড/ফুটার মুক্ত **Reading Mode**, **HTTPS-Only Warning Card**, ও `postMessage` ইউআরএল সিঙ্ক। |
| **Downloads & Files** | `src/engine/inAppDownloader.ts`, `DownloadsModal.tsx`, `DocumentViewerModal.tsx`, `/api/proxy-download` | সব ডাউনলোড ব্রাউজারের লোকাল ইনডেক্সড স্টোরে ও `DownloadsModal`-এ সংরক্ষণ + অফলাইন ডকুমেন্ট/APK ব্যাজ। |
| **Server & Edge** | `server.ts`, `functions/api/proxy.ts`, `functions/api/apk-status.ts`, `functions/api/download-apk.ts` | Express + Cloudflare Pages Functions সমানতালে `lists`, `ho`, `allowHttp`, ও রিলিজ ম্যানিফেস্ট হ্যান্ডেল করে। |
| **SEO (Zero-Tracker)** | `index.html`, `public/robots.txt`, `public/sitemap.xml` | Google সার্চ ইনডেক্সিং ও `SoftwareApplication` Schema.org JSON-LD—সম্পূর্ণ অ্যানালিটিক্স/ট্র্যাকার-মুক্ত। |

---

## ৪. অ্যান্ড্রয়েড অ্যাপ আর্কিটেকচার ও নেটিভ ক্রোমিয়াম ইঞ্জিন

### ৪.১ নেটিভ অ্যাপের কম্পোনেন্ট ডায়াগ্রাম

```mermaid
flowchart LR
    subgraph OS["Android OS (API 26–35+)"]
        WA["WhatsApp / Messenger / External Link"]
        SYS["System Status Bar & Nav Bar Insets"]
        DM["Android DownloadManager"]
        PKG["Android Package Installer (FileProvider)"]
    end

    subgraph APP["OMARVIO Android App (com.omarvio.browser)"]
        M["AndroidManifest.xml\n- singleTask\n- VIEW (http, https, web+omarvio)\n- SEND (text/plain)\n- REQUEST_INSTALL_PACKAGES\n- FileProvider"]
        MA["MainActivity.kt (Compose Shell)\n- windowInsetsTopHeight(statusBars)\n- Multi-Tab & Bookmarks/History\n- Granular 6-List Settings Modal\n- Owned In-App Downloads Hub"]
        HWV["Home WebView\n(cloudflare ?androidShell=1)\n+ Offline Fallback UI"]
        JSB["OmarvioJsBridge (@JavascriptInterface)\nopenUrl, setHttpsOnly, setPrivacyConfig,\nopenDownloads, checkAppUpdate"]
        NWV["Native Chromium WebView\n+ OmarVioWebViewClient.kt"]
        ABE["AdBlockEngine.kt\n- EASYLIST_AD_HOSTS\n- EASYPRIVACY_HOSTS\n- PRIVACY_BADGER_HOSTS\n- PETER_LOWE_HOSTS\n- MALWARE_HOSTS\n- Conditional Cosmetic CSS"]
        BR["BroadcastReceiver\n(ACTION_DOWNLOAD_COMPLETE)"]
    end

    WA --> M --> MA
    SYS --> MA
    MA --> HWV
    HWV <--> JSB <--> MA
    MA --> NWV
    NWV <--> ABE
    NWV -->|SSL/TLS Fail under HTTPS-Only| MA
    MA -->|enqueue| DM
    DM -->|complete event| BR --> PKG
    MA -->|Install / Open / Share| PKG
```

### ৪.২ হোম UI সিঙ্ক মেকানিজম (কেন ওয়েব ও অ্যাপের হোম এক থাকে)
1. অ্যাপ চালু হলে `MainActivity.kt` প্রথমে `https://omarvio-browser.pages.dev/?androidShell=1` লোড করে `Home WebView`-তে দেখায় (এবং অফলাইন থাকলে সাথে সাথে নেটিভ Fallback হোম দেখায়)।
2. ওয়েব অ্যাপ `isAndroidNativeShell()` দ্বারা বুঝতে পারে এটি অ্যাপের ভেতরে চলছে—তাই Web `InstallBanner` লুকিয়ে ফেলে এবং সার্চ/লিংক/সেটিংস/ডাউনলোডের সব কল `window.OmarvioAndroid` JS Bridge-এ পাঠায়।
3. `OmarvioAndroid.setPrivacyConfig(json)` ওয়েবের সব ৬টি ফিল্টার লিস্ট ও `HTTPS-Only` স্টেট সাথে সাথে নেটিভ `AdBlockEngine.kt` এবং `SharedPreferences`-এ সিঙ্ক করে দেয়।

---

## ৫. ইন-অ্যাপ APK আপডেট, ডাউনলোড হাব এবং WhatsApp/Messenger লিংক ফ্লো

### ৫.১ ইন-অ্যাপ অটো আপডেট ও ইনস্টলার ডায়াগ্রাম

```mermaid
sequenceDiagram
    autonumber
    participant App as MainActivity.kt (vLocal / codeLocal)
    participant API as /api/apk-status?t=timestamp
    participant User as ইউজার
    participant DM as Android DownloadManager
    participant RX as BroadcastReceiver
    participant FP as FileProvider + PackageInstaller

    App->>API: GET /api/apk-status (Cache-Control: no-cache) + GitHub Raw Fallback
    API-->>App: { version: "2.0.0.14", versionCode: 14, directApkUrl }
    App->>App: তুলনা: (remoteCode > localCode) || isNewerVersion(remoteVer, localVer)
    alt নতুন আপডেট পাওয়া গেছে
        App-->>User: সবুজ "নতুন আপডেট (v2.0.0.14)" ব্যানার + স্থায়ী টপ "আপডেট" বাটন দেখানো
        User->>App: "আপডেট" বাটনে ট্যাপ
        App->>DM: অ্যাপের Downloads ফোল্ডারে APK enqueue + downloads_json-এ সেভ
        App-->>User: ব্যানারে "ডাউনলোড হাব" ও প্রগ্রেস স্ট্যাটাস
        DM-->>RX: ACTION_DOWNLOAD_COMPLETE (dmId)
        RX->>App: স্ট্যাটাস "completed" আপডেট
        RX->>FP: canRequestPackageInstalls() চেক -> FileProvider URI তৈরি
        FP-->>User: সরাসরি Android "Install Update?" সিস্টেম পপআপ ওপেন!
    else আপডেট নেই
        App-->>User: Settings থেকে ম্যানুয়াল চেকে "সর্বশেষ সংস্করণে আছে" মেসেজ
    end
```

### ৫.২ WhatsApp / Messenger থেকে সরাসরি "Open with OMARVIO" ফ্লো
1. কেউ WhatsApp বা Messenger-এ কোনো লিংক বা লিংকযুক্ত টেক্সট পাঠালে বা **"Share -> OMARVIO BROWSER"** করলে `AndroidManifest.xml`-এর `VIEW` (`http`, `https`, `web+omarvio`) এবং `SEND` (`text/plain`) ফিল্টার **OMARVIO BROWSER**-কে ওপেন অপশন/সাজেশন হিসেবে দেখায়।
2. `launchMode="singleTask"` থাকায় নতুন ডুপ্লিকেট অ্যাপ ইনস্ট্যান্স না খুলে `onNewIntent()` ট্রিগার হয়।
3. `extractIntentUrl()` রেজেক্স দিয়ে শেয়ার করা টেক্সট থেকে `https?://...` আলাদা করে, `AdBlockEngine.unwrapRedirectUrl()` দিয়ে `l.facebook.com`, `lm.facebook.com`, `google.*/url` আনর্যাপ করে এবং `fbclid`, `wa_click_id`, `utm_*` মুছে ক্লিন সাইটটি ওপেন করে।

---

## ৬. ✅ সম্পন্ন হওয়া সব কাজ (Completed & Verified)

| ক্যাটাগরি | সম্পন্ন ফিচার ও ফাইল রেফারেন্স | স্ট্যাটাস |
| :--- | :--- | :---: |
| **Core Web UI & Consistency** | Home ও Browsing মোডে একীভূত হেডার, Trending Queries ও Recent Bookmarks, OLED ডার্ক মোড (`App.tsx`, `BrowserHome.tsx`, `SettingsDrawer.tsx`) | ✅ ওকে |
| **Omnibox & Tabs** | Web Speech API ভয়েস সার্চ (`Omnibox.tsx`), Drag-and-Drop Visual Tab Groups ও Context Menu (`TabSwitcherModal.tsx`) | ✅ ওকে |
| **Android Multi-Tab State Preservation** | Android ট্যাবে `WebView.saveState` / `restoreState` বান্ডল সংরক্ষণ যাতে ট্যাব সুইচে হিস্ট্রি ও স্ক্রল থাকে (`MainActivity.kt`) | ✅ ওকে |
| **Reading Mode & Offline `.mht` / Web Saver** | ওয়েব ও অ্যান্ড্রয়েডে রিডার মোড; Web-এ রিয়েল পেজ কন্টেন্ট সেভ + `DocumentViewerModal` রেন্ডারার, Android-এ `saveWebArchive` `.mht` সেভ (`inAppDownloader.ts`, `DocumentViewerModal.tsx`, `MainActivity.kt`) | ✅ ওকে |
| **Granular Adblocker (6 Lists) + Auto-Sync** | ৬টি Granular ব্লক-লিস্ট + নতুন `/api/filter-lists` (Express + Cloudflare) থেকে ডাইনামিক ডোমেইন সিঙ্ক (`adblocker.ts`, `AdBlockEngine.kt`, `functions/api/filter-lists.ts`, `server.ts`) | ✅ ওকে |
| **HTTPS-Only Mode & Exceptions Manager** | `http://` -> `https://` আপগ্রেড, **Warning** স্ক্রিন, ও `SharedPreferences`/`localStorage`-এ পার্সিস্টেড HTTP ব্যতিক্রম তালিকা ও Revoke/Clear All UI (`SettingsDrawer.tsx`, `MainActivity.kt`) | ✅ ওকে |
| **Biometric & PIN Privacy Vault Lock** | Web-এ SHA-256 Vault PIN (`vault.ts`, `SettingsDrawer.tsx`) ও Android-এ প্ল্যাটফর্ম `BiometricPrompt` (API 28+) + PIN ফলব্যাক (`MainActivity.kt`, `USE_BIOMETRIC`) | ✅ ওকে |
| **Energy Saver Mode & Live Memory Dashboard** | স্লিপিং ট্যাবে ব্যাকগ্রাউন্ড প্রসেস সীমিত (`max 1 alive`) ও `html.omarvio-energy-saver` UI অ্যানিমেশন থ্রটল; `SettingsDrawer` ও Android `MainActivity.kt`-এ রিয়েল-টাইম Heap/RAM মিটার + হাই-এনার্জি ট্যাব (`স্লিপ`, `বন্ধ`, `সব ব্যাকগ্রাউন্ড স্লিপ`) (`energySaver.ts`, `tabManager.ts`, `metrics.ts`, `SettingsDrawer.tsx`, `MainActivity.kt`) | ✅ ওকে |
| **Always-Visible Top Update Button & Auto-Sync** | Web (`App.tsx` হেডার, `InstallBanner.tsx`, `BrowserHome.tsx`, `SettingsDrawer.tsx`) ও Android (`MainActivity.kt` স্থায়ী টপ চিপ, ভার্সন-বেজড ব্যানার, `ON_RESUME` রিফ্রেশ, GitHub Raw ফলব্যাক) — প্রতিটি নতুন রিলিজে সরাসরি টপ আপডেট বাটন দৃশ্যমান | ✅ ওকে |
| **100% Real-Time Icons & Buttons Audit** | `FindInPageBar` প্রকৃত `TreeWalker` DOM ম্যাচ ও হাইলাইট, `CameraLensModal` রিয়েল `BarcodeDetector` ও গ্যালারি QR স্ক্যান + ভিজ্যুয়াল সার্চ, `Omnibox` লক সাইট-কন্ট্রোল, `TabSwitcherModal` কম্প্যাক্ট গ্রিড ও স্লিপ অপশন, `SiteControlsModal` পার্সিস্টেড হোস্ট পারমিশন, `ClearDataModal` সময়সীমা ফিল্টার, `SmartShareModal` BroadcastChannel P2P বিম | ✅ ওকে |
| **In-App APK Update, AAB & Production Signing** | `versionCode` + `version` ডুয়েল চেক, `BroadcastReceiver` + `FileProvider` অটো-ইনস্টলার, Env-driven `release` signingConfig + `.apk` ও `.aab` CI/CD (`build.gradle.kts`, `build-apk.yml`) | ✅ ওকে |
| **Browser-Owned Downloads Hub** | সকল ডাউনলোড (APK, `.mht`, PDF, মিডিয়া) ব্রাউজারের নিজস্ব ডাউনলোড হাবে সেভ, ইনস্টল, ওপেন, শেয়ার ও ডিলিট (`DownloadsModal.tsx`, `inAppDownloader.ts`, `MainActivity.kt`) | ✅ ওকে |
| **WhatsApp / Messenger & App Links** | `ACTION_VIEW` (`autoVerify="true"`), `ACTION_SEND`, রেজেক্স URL এক্সট্র্যাকশন ও সোশ্যাল রিডাইরেক্ট আনর্যাপিং + `public/.well-known/assetlinks.json` (`AndroidManifest.xml`, `server.ts`) | ✅ ওকে |
| **Status Bar Inset Fix** | Android 15/16 ও MIUI/HyperOS-এ ঘড়ি/ব্যাটারি ওভারল্যাপ বন্ধে ডেডিকেটেড `windowInsetsTopHeight(WindowInsets.statusBars)` (`MainActivity.kt`) | ✅ ওকে |
| **Zero-Tracker SEO & Speed** | Google ডিসকভারির জন্য জিরো-ট্র্যাকার `index.html`, `robots.txt`, `sitemap.xml` এবং Service Worker-এ strict hostname suffix ম্যাচিং (`public/sw.js`) | ✅ ওকে |

---

## ৭. ⏳ পরবর্তী অপারেশনাল ও পাবলিশিং ধাপ (External Credentials & Deployment)

কোডবেস ও অটোমেশন পাইপলাইনের সব ফিচার ইতোমধ্যেই সম্পন্ন হয়েছে। লাইভ পাবলিশিংয়ের জন্য শুধু প্রজেক্ট ওনার-নির্ভর নিচের অপারেশনাল কাজগুলো করতে হবে:

1. **Release Keystore (`.jks`) তৈরি ও GitHub Secrets যুক্ত করা:**
   - আপনার কম্পিউটারে `keytool` দিয়ে একটি স্থায়ী `.jks` কী-স্টোর তৈরি করে `base64` কনভার্ট করুন এবং রিপোজিটরির **Settings -> Secrets -> Actions**-এ যুক্ত করুন:
     - `OMARVIO_KEYSTORE_BASE64`, `OMARVIO_KEYSTORE_PASSWORD`, `OMARVIO_KEY_ALIAS`, `OMARVIO_KEY_PASSWORD`
   - কী-স্টোর না দেওয়া পর্যন্ত `build-apk.yml` নিরাপদে ডিফল্ট সাইনিংয়ে কাজ করবে; কী-স্টোর সেট করলেই প্রোডাকশন `.apk` ও `.aab` তৈরি হবে।
2. **Digital Asset Links SHA-256 আপডেট:**
   - আপনার `.jks` ফাইলের SHA-256 ফিঙ্গারপ্রিন্ট (`apksigner verify --print-certs` থেকে লগে দেখা যাবে) নিয়ে `public/.well-known/assetlinks.json`-এর `sha256_cert_fingerprints` অ্যারেতে বসিয়ে Cloudflare Pages-এ ডিপ্লয় করুন।
3. **GitHub Push / Release Build ও Real-Phone টেস্ট:**
   - `main` ব্রাঞ্চে পুশ করে GitHub Actions থেকে নতুন `omarvio-browser.apk` ও `omarvio-browser.aab` রিলিজ নিন এবং পুরনো ভার্সনের ফোনে অটো-আপডেট ও WhatsApp/Messenger লিংক ওপেনিং যাচাই করুন।
4. **Google Search Console & Play Store সাবমিশন:**
   - Google Search Console-এ `https://omarvio-browser.pages.dev/sitemap.xml` সাবমিট করুন এবং Play Console-এ `omarvio-browser.aab` আপলোড করুন।

---

*এই রোডম্যাপটি সরাসরি বর্তমান প্রজেক্টের কোডবেস (`src/`, `server.ts`, `functions/api/`, `android/`, `.github/workflows/build-apk.yml`, `public/`) পর্যালোচনা করে আপডেট করা হয়েছে।*
