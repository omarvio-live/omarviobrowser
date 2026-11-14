# OMARVIO Browser — Native Android (Chromium WebView)

এই ফোল্ডারে OMARVIO Browser-এর সম্পূর্ণ নেটিভ অ্যান্ড্রয়েড সোর্স কোড (`Kotlin + Jetpack Compose + Hardware-Accelerated Chromium WebView`) রয়েছে।

## বৈশিষ্ট্যসমূহ
- **১০০% সরাসরি ওয়েব লোডিং (কোনো প্রক্সি বাধা নেই):** Google, YouTube, Facebook, Wikipedia, DuckDuckGo, Bing, Firefox ও যেকোনো ওয়েবসাইট Chrome/Firefox-এর মতো সরাসরি ওপেন হয়।
- **স্টেপ-বাই-স্টেপ ব্যাক নেভিগেশন (`WebBackNavigationManager.kt`):** ফিজিক্যাল ব্যাক বাটন চাপলে সোজা হোমে ড্রপ না হয়ে `WebBackForwardList` অনুযায়ী ধাপে ধাপে পূর্বের পেজে ফিরে যায়।
- **সম্পূর্ণ ব্রাউজার সক্ষমতা:** Desktop Mode টগল, Fullscreen HTML5 ভিডিও প্লেব্যাক, ফাইল আপলোড (`onShowFileChooser`), DownloadManager ইন্টিগ্রেশন, SSL ও মিক্সড কন্টেন্ট সাপোর্ট এবং ডিফল্ট ব্রাউজার হিসেবে সেট করার সুবিধা।
- **বিল্ট-ইন অ্যাড ও ট্র্যাকার ব্লকার (`AdBlockEngine.kt`):** নেটওয়ার্ক রিকোয়েস্ট লেভেলে বিজ্ঞাপন ও ট্র্যাকার ব্লক করে।

## ওপেন-সোর্স থেকে সরাসরি APK তৈরি ও ডাউনলোড লিংক পাওয়ার নিয়ম
১. পুরো প্রোজেক্টটি আপনার পাবলিক GitHub রিপোতে Push করুন।
২. রিপোর **Actions** ট্যাবে `.github/workflows/build-apk.yml` স্বয়ংক্রিয়ভাবে চলবে এবং `omarvio-browser.apk` কম্পাইল করে **Releases (v2.0.0)** সেকশনে পাবলিশ করবে।
৩. এরপর নিচের ডিরেক্ট লিংকটি যেকোনো অ্যান্ড্রয়েড ফোনে শেয়ার করলে ১ ক্লিকেই APK ফাইলটি ডাউনলোড ও ইনস্টল হবে:

```text
https://github.com/<আপনার-ইউজারনেম>/<রিপোর-নাম>/releases/latest/download/omarvio-browser.apk
```
