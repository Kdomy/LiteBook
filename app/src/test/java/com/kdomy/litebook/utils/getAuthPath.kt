package com.kdomy.litebook.utils

import java.nio.file.Paths

fun getAuthPath() =
    runCatching {
        Paths.get("src/test/resources/auth.json")
    }.getOrNull()
