# LiteBook v2.0.5

## Fixes

- Fix LiteBook settings button missing on the mobile feed: corrected malformed glyph comparisons in the feed detection script so `isFeed()` correctly recognizes `m.facebook.com` and the settings button is shown again.
- Harden link handling and navigation: preserve URL parameters/fragments when sanitizing, properly handle Facebook redirectors (`l.facebook.com`/`lm.facebook.com`), reject userinfo/invalid hosts and block navigation to non-Facebook domains (including explicit malicious intents).
- Improve script loading: avoid creating/retaining a network HTTP client when running in local-scripts mode, read and assemble scripts on `Dispatchers.IO`, close remote clients safely and ensure script boundaries don't merge across concatenation.
- Reduce repeated image repair loops in the viewer: add source tracking, single-pass processing, limited retries and guards to prevent infinite rescans/re-entrancy.
- Limit WebView debugging: only enable remote/web debugging when the app is debuggable (`FLAG_DEBUGGABLE`).
- Improve URL policy tests and add feed-detection tests for the corrected glyph checks.

## Internal

- Add unit tests for script loading and URL/link policy.
- Add Node test utilities for image-repair regression and feed-detection checks.

---

# LiteBook v2.0.4

## Fixes

- Fix reel/story video downloads doing nothing (or saving the poster image instead of the video): the video is now given priority when a video view is actually active, and the real streamed URL is resolved from the segment fetched right now (reels that auto-advance are supported)
- Fix downloaded reels playing with a black screen and audio only: the audio-only fragment of the reel stream is skipped and the video fragment is downloaded instead
- Fix reels/photo downloads reusing a cached URL from an earlier video (unreadable file)
- Fix downloading a photo sometimes returning the previous video: a stale <video> element left in the DOM by Facebook no longer hijacks the download, and an expired captured video URL is refused
- Fix tall photos in the media viewer staying partially black: repeated repaint/decoding retries force a complete texture upload (also removes the forced single hardware layer on the WebView)
- Fix long-press post copy triggering too eagerly and blocking text selection: a longer deliberate hold (600 ms) is required, a finger drag keeps the native selection, and the whole-post copy no longer applies to comments
- Fix long-press post copy dropping formatting: line breaks, blank lines, indentation and spacing are now preserved
- Fix photos in the media viewer loading only halfway: the image is now re-decoded after load, and viewer images are kept out of their own GPU layer (transforms/zoom still work)
- Fix reel videos not appearing in the gallery: videos are now saved into the Movies/LiteBook media collection instead of plain Downloads
- Fix login/cookie Bloks screen text staying dark and unreadable on the AMOLED theme: the light-background detection now climbs to the outermost painted background (the black page wash), instead of stopping at the first opaque white card, so near-black text is lightened

## Internal

- Enable WebView debugging (chrome://inspect) and add a toast() bridge for download diagnostics

---

# LiteBook v2.0.3

## Fixes

- Download the correct, complete video file: the real URL is now tied to the video element that actually plays, instead of reusing a possibly stale URL from a previous video (which produced files the player could not open)

---

# LiteBook v2.0.2

## Fixes

- Download the actual video instead of the poster image when the video is paused (stories, reels)
- Fix garbled accents (cp1252 mojibake) in translations across all languages
- Fix navigation through `lm.facebook.com/l.php` redirect links
- Keep Facebook's long-press reaction picker (👍 ❤️ 😄 😮 😓 😠) working on buttons

---

# LiteBook v2.0.1

## Fixes

- Regenerate the "LB" app icon with a bolder, cleaner Segoe UI Black monogram that is no longer clipped by launcher masks
- Fix garbled "•" bullet shown on the loading splash screen

---

# LiteBook v2.0.0

## Rebranding

- New name: **LiteBook** (formerly Materialbook)
- New package: `com.kdomy.litebook`
- New logo: adaptive Material You "LB" monogram
- Updated README, issue templates, release workflow and Play Store metadata (fastlane)
- Removed references to the original author and donation links

## Fixes (since v1.0.0)

- Restore page after activity recreation, forward VIEW intents
- Copy post text on long press
- Fix partial image load in the media viewer
- Make login/cookie Bloks screen text legible on AMOLED theme
- Only lighten login/cookie Bloks screens, not the light feed
