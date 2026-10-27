package com.kdomy.litebook

import com.kdomy.litebook.utils.Script
import com.kdomy.litebook.utils.fetchScripts
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class ScriptLoadingTest {
    @Test fun localScriptsKeepOrderAndSkipDisabledResources() = runBlocking {
        val read = mutableListOf<Int>()
        val result = fetchScripts(listOf(
            Script(true, 1, "one.js"), Script(false, 2, "two.js"), Script(true, 3, "three.js")
        )) { id -> read.add(id); "// script $id" }
        assertEquals(listOf(1, 3), read)
        assertEquals("// script 1\n;\n// script 3", result)
    }

    @Test fun noEnabledScriptsProducesNoContent() = runBlocking {
        assertEquals("", fetchScripts(emptyList()) { error("Unexpected resource read") })
    }
}
