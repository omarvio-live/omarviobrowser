# OMARVIO BROWSER - ProGuard Rules for Android WebView & Jetpack Compose
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-dontwarn android.webkit.**
-keep class com.omarvio.browser.** { *; }
