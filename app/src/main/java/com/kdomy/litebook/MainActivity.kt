package com.kdomy.litebook

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import androidx.core.view.WindowCompat
import com.kdomy.litebook.ui.screens.LiteBookWebView
import com.kdomy.litebook.ui.theme.LiteBookTheme
import com.kdomy.litebook.utils.isInternalWebUrl

class MainActivity : ComponentActivity() {

    private val urlState = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        urlState.value = intent?.data?.toString()?.takeIf(::isInternalWebUrl)

        setContent {
            LiteBookTheme {
                LiteBookWebView(
                    url = urlState.value
                        ?: "https://facebook.com/"
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.data?.toString()?.takeIf(::isInternalWebUrl)?.let { urlState.value = it }
    }
}
