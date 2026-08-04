package com.eepiemi.materialbook.utils

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.view.View
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.ActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.multiplatform.webview.web.AccompanistWebChromeClient
import com.multiplatform.webview.web.PlatformWebViewParams

// src: https://github.com/KevinnZou/compose-webview-multiplatform

@Composable
fun fileChooserWebViewParams(
    fullscreenHost: FrameLayout? = null,
    onFullscreenChange: (Boolean) -> Unit = {},
): Pair<PlatformWebViewParams, () -> Unit> {
    var fileChooserIntent by remember { mutableStateOf<Intent?>(null) }

    val webViewChromeClient =
        remember {
            FileChoosableWebChromeClient(
                fullscreenHost = fullscreenHost,
                onShowFilePicker = { fileChooserIntent = it },
                onFullscreenChange = onFullscreenChange,
            )
        }

    val hideFullscreen =
        remember {
            { webViewChromeClient.hideCustomView() }
        }

    val launcher =
        rememberLauncherForActivityResult(
            contract = ActivityResultContracts.StartActivityForResult(),
        ) { result: ActivityResult ->
            if (result.resultCode != Activity.RESULT_OK) {
                webViewChromeClient.cancelFileChooser()
                return@rememberLauncherForActivityResult
            }

            val intent = result.data
            if (intent == null) {
                webViewChromeClient.cancelFileChooser()
                return@rememberLauncherForActivityResult
            }

            val singleFile: Uri? = intent.data
            val multiFiles: List<Uri>? = intent.getUris()

            when {
                singleFile != null -> webViewChromeClient.onReceiveFiles(arrayOf(singleFile))
                multiFiles != null -> webViewChromeClient.onReceiveFiles(multiFiles.toTypedArray())
                else -> {
                    webViewChromeClient.cancelFileChooser()
                }
            }
        }

    LaunchedEffect(key1 = fileChooserIntent) {
        fileChooserIntent?.let {
            try {
                launcher.launch(fileChooserIntent!!)
            } catch (_: ActivityNotFoundException) {
                webViewChromeClient.cancelFileChooser()
            }
        }
    }

    return PlatformWebViewParams(chromeClient = webViewChromeClient) to hideFullscreen
}

private fun Intent.getUris(): List<Uri>? {
    val clipData = clipData ?: return null
    return (0 until clipData.itemCount).map { clipData.getItemAt(it).uri }
}

private class FileChoosableWebChromeClient(
    private val fullscreenHost: FrameLayout?,
    private val onShowFilePicker: (Intent) -> Unit,
    private val onFullscreenChange: (Boolean) -> Unit,
) : AccompanistWebChromeClient() {
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null

    override fun onShowFileChooser(
        webView: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?,
    ): Boolean {
        this.filePathCallback = filePathCallback
        val filePickerIntent = fileChooserParams?.createIntent()

        if (filePickerIntent == null) cancelFileChooser()
        else onShowFilePicker(filePickerIntent)

        return true
    }

    override fun onShowCustomView(
        view: View?,
        callback: WebChromeClient.CustomViewCallback?,
    ) {
        if (customView != null) {
            callback?.onCustomViewHidden()
            return
        }

        val host = fullscreenHost
        if (view == null || host == null) {
            callback?.onCustomViewHidden()
            return
        }

        customView = view
        customViewCallback = callback
        host.addView(
            view,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        onFullscreenChange(true)
    }

    override fun onHideCustomView() {
        val view = customView
        if (view != null) {
            (view.parent as? ViewGroup)?.removeView(view)
        }
        customViewCallback?.onCustomViewHidden()
        customView = null
        customViewCallback = null
        onFullscreenChange(false)
    }

    override fun onPermissionRequest(request: PermissionRequest) {
        request.grant(request.resources)
    }

    fun hideCustomView() {
        if (customView != null) onHideCustomView()
    }

    fun onReceiveFiles(uris: Array<Uri>) {
        filePathCallback?.onReceiveValue(uris)
        filePathCallback = null
    }

    fun cancelFileChooser() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
    }
}
