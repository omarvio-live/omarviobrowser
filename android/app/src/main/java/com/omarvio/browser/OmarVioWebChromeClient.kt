package com.omarvio.browser

import android.net.Uri
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.GeolocationPermissions
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView

/**
 * OMARVIO BROWSER - Native WebChromeClient
 * Handles JavaScript dialogs, fullscreen HTML5 video (YouTube/Facebook),
 * file uploads (onShowFileChooser), protected media permissions,
 * progress updates, and prevents UI thread freezing or blank screens.
 */
class OmarVioWebChromeClient(
    private val onProgressChanged: (Int) -> Unit = {},
    private val onTitleReceived: (String) -> Unit = {},
    private val onShowFilePicker: ((ValueCallback<Array<Uri>>, FileChooserParams?) -> Boolean)? = null,
    private val onEnterFullscreen: ((View, CustomViewCallback) -> Unit)? = null,
    private val onExitFullscreen: (() -> Unit)? = null
) : WebChromeClient() {

    override fun onProgressChanged(view: WebView?, newProgress: Int) {
        super.onProgressChanged(view, newProgress)
        onProgressChanged(newProgress)
    }

    override fun onReceivedTitle(view: WebView?, title: String?) {
        super.onReceivedTitle(view, title)
        title?.let { onTitleReceived(it) }
    }

    override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
        if (view != null && callback != null && onEnterFullscreen != null) {
            onEnterFullscreen.invoke(view, callback)
        } else {
            super.onShowCustomView(view, callback)
        }
    }

    override fun onHideCustomView() {
        if (onExitFullscreen != null) {
            onExitFullscreen.invoke()
        } else {
            super.onHideCustomView()
        }
    }

    override fun onShowFileChooser(
        webView: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?
    ): Boolean {
        if (filePathCallback != null && onShowFilePicker != null) {
            return onShowFilePicker.invoke(filePathCallback, fileChooserParams)
        }
        return super.onShowFileChooser(webView, filePathCallback, fileChooserParams)
    }

    override fun onPermissionRequest(request: PermissionRequest?) {
        // Grant protected media / audio-video stream permissions required by modern PWAs and players
        request?.let {
            val allowed = it.resources.filter { res ->
                res == PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID ||
                    res == PermissionRequest.RESOURCE_AUDIO_CAPTURE ||
                    res == PermissionRequest.RESOURCE_VIDEO_CAPTURE
            }.toTypedArray()
            if (allowed.isNotEmpty()) {
                it.grant(allowed)
                return
            }
        }
        super.onPermissionRequest(request)
    }

    override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
        return true
    }

    override fun onJsAlert(
        view: WebView?,
        url: String?,
        message: String?,
        result: JsResult?
    ): Boolean {
        result?.confirm()
        return true
    }

    override fun onJsConfirm(
        view: WebView?,
        url: String?,
        message: String?,
        result: JsResult?
    ): Boolean {
        result?.confirm()
        return true
    }

    override fun onJsPrompt(
        view: WebView?,
        url: String?,
        message: String?,
        defaultValue: String?,
        result: JsPromptResult?
    ): Boolean {
        result?.confirm(defaultValue ?: "")
        return true
    }

    override fun onGeolocationPermissionsShowPrompt(
        origin: String?,
        callback: GeolocationPermissions.Callback?
    ) {
        callback?.invoke(origin, false, false)
    }
}
