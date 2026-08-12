package com.kdomy.litebook.utils.jsBridge

import android.webkit.JavascriptInterface

class LiteBookSettings (
    private val toggleSettings: () -> Unit,
) {
    @JavascriptInterface
    @Suppress("unused")
    fun onSettingsToggle() = toggleSettings()
}