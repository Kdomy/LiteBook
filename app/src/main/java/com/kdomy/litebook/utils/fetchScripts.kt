package com.kdomy.litebook.utils

import androidx.annotation.RawRes
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

const val SCRIPT_SRC = "https://raw.githubusercontent.com/Kdomy/LiteBook/refs/heads/main/app/src/main/res/raw/"
const val SCRIPTS_LOCAL_ONLY: Boolean = true

data class Script(
    val isEnabled: Boolean,
    @param:RawRes val resourceId: Int,
    val scriptTitle: String
)

suspend fun fetchScripts(
    scripts: List<Script>,
    fallbackContent: (Int) -> String
): String = withContext(Dispatchers.IO) {
    val enabled = scripts.filter { it.isEnabled }
    // The normal startup path needs no network engine or sockets.
    if (SCRIPTS_LOCAL_ONLY) {
        return@withContext enabled.joinToString("\n;\n") { fallbackContent(it.resourceId) }
    }
    val client = HttpClient(OkHttp) {
        install(HttpTimeout) { requestTimeoutMillis = 10_000 }
    }
    try {
        buildString {
            for (script in enabled) {
                val content = try {
                    val response = client.get(SCRIPT_SRC + script.scriptTitle)
                    check(response.status == HttpStatusCode.OK)
                    response.bodyAsText()
                } catch (cancelled: CancellationException) {
                    throw cancelled
                } catch (_: Exception) {
                    fallbackContent(script.resourceId)
                }
                append(content).append("\n;\n")
            }
        }
    } finally {
        client.close()
    }
}
