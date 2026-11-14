package com.omarvio.browser

import android.webkit.WebBackForwardList
import android.webkit.WebHistoryItem
import android.webkit.WebView

/**
 * OMARVIO BROWSER - WebBackForwardList Navigation Manager
 * 
 * Provides an intelligent history traversal strategy for physical back button events
 * and UI back triggers. Inspects the WebBackForwardList to skip transient redirect URLs
 * (e.g., Google /url?q=, DuckDuckGo /l/?uddg=, and about:blank), ensuring that physical
 * back button presses navigate step-by-step through real user-visited pages instead of
 * prematurely exiting the application or resetting to the initial home view.
 */
object WebBackNavigationManager {

    /**
     * Determines whether the WebView can navigate back to a valid, meaningful history item.
     */
    fun canNavigateBack(webView: WebView?): Boolean {
        if (webView == null) return false
        val list: WebBackForwardList = webView.copyBackForwardList()
        val currentIndex = list.currentIndex
        if (currentIndex <= 0) {
            return webView.canGoBack()
        }

        var targetIndex = currentIndex - 1
        while (targetIndex >= 0) {
            val item: WebHistoryItem? = list.getItemAtIndex(targetIndex)
            val url = item?.url
            if (!isSkippableHistoryEntry(url)) {
                return true
            }
            targetIndex--
        }
        return webView.canGoBack()
    }

    /**
     * Determines whether the WebView can navigate forward to a valid history item.
     */
    fun canNavigateForward(webView: WebView?): Boolean {
        if (webView == null) return false
        val list: WebBackForwardList = webView.copyBackForwardList()
        val currentIndex = list.currentIndex
        val size = list.size
        if (currentIndex < 0 || currentIndex >= size - 1) {
            return webView.canGoForward()
        }

        var targetIndex = currentIndex + 1
        while (targetIndex < size) {
            val item: WebHistoryItem? = list.getItemAtIndex(targetIndex)
            val url = item?.url
            if (!isSkippableHistoryEntry(url)) {
                return true
            }
            targetIndex++
        }
        return webView.canGoForward()
    }

    /**
     * Executes back navigation by skipping intermediate redirects and tracking traps.
     * Returns true if a navigation step was performed, or false if at root.
     */
    fun navigateBack(webView: WebView?): Boolean {
        if (webView == null) return false
        val list: WebBackForwardList = webView.copyBackForwardList()
        val currentIndex = list.currentIndex
        if (currentIndex <= 0) {
            if (webView.canGoBack()) {
                webView.goBack()
                return true
            }
            return false
        }

        var targetIndex = currentIndex - 1
        while (targetIndex >= 0) {
            val item: WebHistoryItem? = list.getItemAtIndex(targetIndex)
            val url = item?.url
            if (!isSkippableHistoryEntry(url)) {
                val steps = targetIndex - currentIndex
                if (webView.canGoBackOrForward(steps)) {
                    webView.goBackOrForward(steps)
                    return true
                }
            }
            targetIndex--
        }

        // Fallback to standard webView.goBack() if list walk did not find an explicit match
        if (webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return false
    }

    /**
     * Executes forward navigation by skipping transient redirect pages.
     */
    fun navigateForward(webView: WebView?): Boolean {
        if (webView == null) return false
        val list: WebBackForwardList = webView.copyBackForwardList()
        val currentIndex = list.currentIndex
        val size = list.size
        if (currentIndex < 0 || currentIndex >= size - 1) return false

        var targetIndex = currentIndex + 1
        while (targetIndex < size) {
            val item: WebHistoryItem? = list.getItemAtIndex(targetIndex)
            val url = item?.url
            if (!isSkippableHistoryEntry(url)) {
                val steps = targetIndex - currentIndex
                if (webView.canGoBackOrForward(steps)) {
                    webView.goBackOrForward(steps)
                    return true
                }
            }
            targetIndex++
        }

        if (webView.canGoForward()) {
            webView.goForward()
            return true
        }
        return false
    }

    /**
     * Identifies intermediate redirect pages that should not trap the back button.
     */
    private fun isSkippableHistoryEntry(url: String?): Boolean {
        if (url.isNullOrEmpty() || url == "about:blank") return true
        val lower = url.lowercase()
        if (lower.contains("/url?q=") || lower.contains("/url?url=")) return true
        if (lower.contains("duckduckgo.com/l/?") || lower.contains("uddg=")) return true
        if (lower.contains("facebook.com/l.php") || lower.contains("facebook.com/flx/warn")) return true
        if (lower.contains("google.com/httpservice/retry")) return true
        return false
    }
}
