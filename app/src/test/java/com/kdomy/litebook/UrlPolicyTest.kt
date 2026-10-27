package com.kdomy.litebook

import com.kdomy.litebook.utils.fbRedirectSanitizer
import com.kdomy.litebook.utils.isInternalWebUrl
import org.junit.Assert.*
import org.junit.Test

class UrlPolicyTest {
    @Test fun onlyRealFacebookAndMessengerHostsAreInternal() {
        listOf("https://facebook.com", "https://m.facebook.com/a", "https://www.messenger.com/", "https://fb.watch/video", "https://M.FACEBOOK.COM/").forEach {
            assertTrue(it, isInternalWebUrl(it))
        }
        listOf("https://evilfacebook.com/", "https://facebook.com.evil.org/", "https://facebook.com@evil.org/", "https://l.facebook.com/l.php", "https://lm.facebook.com/l.php", "http://facebook.com/", "javascript:alert(1)", "not a URL").forEach {
            assertFalse(it, isInternalWebUrl(it))
        }
    }

    @Test fun sanitizingPreservesEncodingFlagsAndFragments() {
        assertEquals("https://example.org/a?q=a%20b&flag#section", fbRedirectSanitizer("https://example.org/a?q=a%20b&fbclid=track&flag#section"))
        assertEquals("https://example.org/?q=a%2Bb#part", fbRedirectSanitizer("https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.org%2F%3Fq%3Da%252Bb%23part&flag"))
        assertEquals("https://facebook.com/#feed", fbRedirectSanitizer("https://facebook.com/#feed"))
    }
}
