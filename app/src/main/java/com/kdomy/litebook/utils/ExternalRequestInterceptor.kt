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

        val sanitizedUrl = fbRedirectSanitizer(request.url)
        val isInternal = isInternalWebUrl(request.url)

        return if (isInternal) {
            WebRequestInterceptResult.Allow
        } else {
            handleExternalUrl(sanitizedUrl)
            WebRequestInterceptResult.Reject
        }
    }
}
