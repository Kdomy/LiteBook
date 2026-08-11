package com.eepiemi.materialbook

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import androidx.core.view.WindowCompat
import com.eepiemi.materialbook.ui.screens.MaterialbookWebView
import com.eepiemi.materialbook.ui.theme.MaterialbookTheme

class MainActivity : ComponentActivity() {

    private val urlState = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        urlState.value = intent?.data?.toString()

        setContent {
            MaterialbookTheme {
                MaterialbookWebView(
                    url = urlState.value
                        ?: "https://facebook.com/"
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent?.data?.toString()?.let { urlState.value = it }
    }
}