package com.kdomy.litebook.utils

import com.multiplatform.webview.request.RequestInterceptor
import com.multiplatform.webview.request.WebRequest
import com.multiplatform.webview.request.WebRequestInterceptResult
import com.multiplatform.webview.web.WebViewNavigator

class ExternalRequestInterceptor(
    private val handleExternalUrl: (String) -> Unit
) : RequestInterceptor {

    override fun onInterceptUrlRequest(
        request: WebRequest,
        navigator: WebViewNavigator
    ): WebRequestInterceptResult {

        val internalUrlRegex = Regex(
            """https?://(?!(?:l|lm)\.)[^/]*(?:facebook|messenger)\.com/.*"""
        )
        val sanitizedUrl = fbRedirectSanitizer(request.url)
        return if (internalUrlRegex.containsMatchIn(sanitizedUrl) && request.isForMainFrame) {
            WebRequestInterceptResult.Allow
        } else {
            handleExternalUrl(sanitizedUrl)
            WebRequestInterceptResult.Reject
        }
    }
}