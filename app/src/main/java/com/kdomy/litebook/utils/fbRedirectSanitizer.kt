package com.kdomy.litebook.utils

import java.net.URI
import java.net.URLDecoder
import java.util.Locale

fun isInternalWebUrl(link: String): Boolean = runCatching {
    val uri = URI(link)
    val host = uri.host?.lowercase(Locale.ROOT) ?: return false
    uri.scheme.equals("https", ignoreCase = true) && uri.rawUserInfo == null &&
        host !in setOf("l.facebook.com", "lm.facebook.com") &&
        (host == "fb.watch" || host == "facebook.com" || host.endsWith(".facebook.com") ||
            host == "messenger.com" || host.endsWith(".messenger.com"))
}.getOrDefault(false)

fun fbRedirectSanitizer(link: String): String = runCatching {
    var uri = URI(link)
    if (uri.host in setOf("l.facebook.com", "lm.facebook.com") && uri.path == "/l.php") {
        val target = uri.rawQuery?.split('&')?.firstOrNull { it.substringBefore('=') == "u" }
            ?.substringAfter('=', "") ?: return link
        uri = URI(URLDecoder.decode(target, "UTF-8"))
    }
    if (!uri.scheme.equals("https", true) && !uri.scheme.equals("http", true)) return link
    // Preserve signed parameters, percent escapes, flags and fragments.
    val query = uri.rawQuery?.split('&')?.filterNot { it.substringBefore('=') == "fbclid" }
        ?.joinToString("&")
    buildString {
        append(uri.toString().substringBefore('#').substringBefore('?'))
        if (!query.isNullOrEmpty()) append('?').append(query)
        uri.rawFragment?.let { append('#').append(it) }
    }
}.getOrDefault(link)
