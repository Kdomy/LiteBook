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
