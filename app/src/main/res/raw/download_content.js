/*
 * Script to add download buttons for stories, stories highlights and reels on Facebook
 * Original Author: @YeiversonYurgaky
 */

(function() {
  // Configuration
  const CONFIG = {
    buttonZIndex: 999999,
    debug: false
  };

  // Global state
  let isProcessing = false;
  let currentContentContainer = null;
  let lastDownloadedUrl = null;
  const DOWNLOAD_BTN_ID = "litebook-global-downloader";

  // Capture real media URLs from the network. Videos streamed through MSE
  // have a blob: video.src that cannot be fetched; the actual .mp4 URLs are
  // requested through fetch/XMLHttpRequest and are captured here.
  const capturedMediaUrls = [];
  const videoUrlByElement = new Map();
  let activeVideoEl = null;
  const MEDIA_URL_RE = /\.(mp4|m4v)(\?|$)/i;

  const captureMediaUrl = (u) => {
    if (typeof u === "string" && MEDIA_URL_RE.test(u)) {
      capturedMediaUrls.push(u);
      if (capturedMediaUrls.length > 50) capturedMediaUrls.shift();
      if (activeVideoEl) {
        videoUrlByElement.set(activeVideoEl, {
          url: u,
          src: activeVideoEl.currentSrc || activeVideoEl.src,
          at: Date.now()
        });
      }
    }
  };

  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    activeVideoEl = this;
    return originalPlay.apply(this, arguments);
  };

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = function(input, init) {
      if (input && typeof input === "object" && input.url) captureMediaUrl(input.url);
      else captureMediaUrl(input);
      return originalFetch.apply(this, arguments);
    };
  }

  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    captureMediaUrl(url);
    return originalXhrOpen.apply(this, arguments);
  };

  const mediaSrcDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    "src"
  );
  if (mediaSrcDescriptor && mediaSrcDescriptor.set) {
    Object.defineProperty(HTMLMediaElement.prototype, "src", {
      get: mediaSrcDescriptor.get,
      set: function(value) {
        captureMediaUrl(value);
        return mediaSrcDescriptor.set.call(this, value);
      },
      configurable: true
    });
  }

  // Selectors for finding media content
  const SELECTORS = {
    mediaElements: [
      'div[role="dialog"] video:not([hidden])',
      'div[role="dialog"] img[src*="fbcdn"]:not([width="16"]):not([hidden])',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"] video',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"] img[src*="fbcdn"]',
      'div[data-pagelet="Story"] video',
      'div[aria-label*="reel"] video',
      'div[data-pagelet="ProfilePhoto"] img[src*="fbcdn"]'
    ],
    containers: [
      'div[role="dialog"]',
      'div[data-pagelet="Story"]',
      'div[aria-label*="story"]',
      '.story-viewer',
      '.story_viewer',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"]',
      'div[data-pagelet="ProfilePhoto"]',
      'div[aria-label*="photo"]',
      'div[data-pagelet*="ProfileAppSection"]'
    ],
    storyIndicators: [
      'div[data-sigil="story-viewer"]',
      'div[data-sigil="story-popup-header"]',
      'div[data-sigil="story-tray-item"]',
      ".story_body_container",
      ".story_viewer",
      ".story-container",
      'div[aria-label*="highlight"]',
      'div[aria-label*="Highlight"]',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"]',
      'div[data-pagelet="ProfilePhoto"]'
    ]
  };

  // Utility functions
  const debugLog = (...args) => CONFIG.debug && console.log("[ContentDownloader]", ...args);

  const isElementVisible = (element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const visibleW = Math.min(rect.right, vw) - Math.max(rect.left, 0);
    const visibleH = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    if (visibleW <= 0 || visibleH <= 0) return false;

    return (visibleW * visibleH) / (rect.width * rect.height) > 0.5;
  };


  // Find the appropriate container for the content
  const findContentContainer = (element) => {
    if (!element) return null;

    for (const selector of SELECTORS.containers) {
      const container = element.closest(selector);
      if (container) return container;
    }

    return element.parentElement;
  };

  // Get the current visible media element
  const getCurrentMediaElement = () => {
    // Try each selector in order of priority
    for (const selector of SELECTORS.mediaElements) {
      const elements = document.querySelectorAll(selector);

      // Find the first visible element
      for (const element of elements) {
        if (isElementVisible(element) && element.src) {
          return element;
        }
      }
    }

    // Fallback: look for any large visible media
    return Array.from(
      document.querySelectorAll('video:not([hidden]), img[src*="fbcdn"]:not([width="16"]):not([hidden])')
    ).find(el => {
      const rect = el.getBoundingClientRect();
      return isElementVisible(el) && rect.width > 150 && rect.height > 150 && el.src;
    });
  };

  // Check if we are in a story or reel view
  const isInStoryOrReelView = () => {
    // URL pattern checks
    const url = window.location.href;
    if (
      url.includes("/stories/") ||
      url.includes("/story.php") ||
      url.includes("/reel/") ||
      url.includes("/reels/") ||
      url.includes("/reels_center") ||
      url.includes("/videos/") ||
      url.includes("/watch") ||
      url.includes("/photo") ||
      url.includes("/photos/") ||
      url.includes("/highlights/")
    ) {
      return true;
    }

    // Element selectors check
    for (const selector of SELECTORS.storyIndicators) {
      if (document.querySelector(selector)) {
        return true;
      }
    }

    return false;
  };

  // True when the current page/view is actually showing video (reel, story,
  // watch, or a viewer dialog that contains a VISIBLE <video>). Facebook keeps
  // stale video elements and whole viewers (hidden or offscreen) in the DOM
  // after you leave a video; on a photo view the downloader must never pick
  // those up, or a photo download would return the previous video.
  const isInVideoView = () => {
    const url = window.location.href;
    if (
      url.includes("/reel/") ||
      url.includes("/reels") ||
      url.includes("/watch") ||
      url.includes("/videos/") ||
      url.includes("/story.php") ||
      url.includes("/stories/")
    ) {
      return true;
    }
    const videoViewers = [
      'div[role="dialog"]',
      'div[data-pagelet="Story"]',
      'div[data-pagelet="ReelViewer"]',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"]'
    ];
    for (const selector of videoViewers) {
      const container = document.querySelector(selector);
      if (!container) continue;
      const videos = container.querySelectorAll("video:not([hidden])");
      for (const video of videos) {
        if (isElementVisible(video)) return true;
      }
    }
    return false;
  };

  // Find the current video element, even when it is covered by its poster
  // image (paused videos) or sits inside the story/reel viewer. Only videos
  // that are genuinely in view can be selected: a stale (hidden or offscreen)
  // <video> left in the DOM by Facebook must never win over the photo the user
  // is actually looking at.
  const findVideoInView = () => {
    if (!isInVideoView()) return null;

    const visible = Array.from(
      document.querySelectorAll("video:not([hidden])")
    ).filter(el => isElementVisible(el));

    if (visible.length === 0) return null;
    if (visible.length === 1) return visible[0];

    const viewerSelectors = [
      'div[role="dialog"]',
      'div[data-pagelet="Story"]',
      'div[data-pagelet="ReelViewer"]',
      'div[aria-label*="story"]',
      'div[aria-label*="reel"]',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"]'
    ];
    for (const selector of viewerSelectors) {
      const container = document.querySelector(selector);
      if (!container) continue;
      const inViewer = visible.find(v => v.closest && v.closest(selector));
      if (inViewer) return inViewer;
    }
    return null;
  };

  // Return the URL captured for this video element, only if it still matches
  // the source the element is currently playing. Facebook reuses one <video>
  // element across reels, so an entry keyed only by element can be stale (an
  // expired signed URL that Facebook answers with an HTML page instead of
  // video, hence an unreadable file).
  const knownUrlFor = (videoEl) => {
    if (!videoEl) return null;
    const known = videoUrlByElement.get(videoEl);
    if (!known) return null;
    const src = videoEl.currentSrc || videoEl.src;
    if (known.src === src) return known.url;
    return null;
  };

  // Facebook's media URLs carry MSE range query params (bytestart/byteend)
  // that describe one buffering chunk. Downloading such a URL would save only
  // that chunk: a truncated, unreadable file. Strip them so the whole file is
  // served.
  const sanitizeVideoUrl = (u) => {
    if (!u) return u;
    try {
      const parsed = new URL(u);
      const rangeParams = ["bytestart", "byteend", "rb", "range", "start", "end"];
      for (const key of rangeParams) parsed.searchParams.delete(key);
      return parsed.toString();
    } catch (e) {
      return u;
    }
  };

  // Resolve the real MP4 URL for a video element. Videos streamed through
  // MSE use a blob: src; the real .mp4 URL is captured from fetch/XHR while
  // the video plays. Only URLs captured while THIS video element was active
  // are trusted: the global capture list may hold stale URLs from previous
  // videos, which would produce a file the user's player cannot open. If no
  // URL has been captured yet, briefly play the video muted to force the
  // network request, then restore its state.
  const resolveVideoUrl = (videoEl, done) => {
    if (!videoEl) return done(null);

    const src = videoEl.currentSrc || videoEl.src;
    if (src && !src.startsWith("blob:")) return done(src);

    const known = knownUrlFor(videoEl);
    if (known) return done(known);

    const wasPaused = videoEl.paused;
    const wasMuted = videoEl.muted;
    let finished = false;
    let timer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (timer) clearInterval(timer);
      try {
        if (!videoEl.paused) videoEl.pause();
        videoEl.muted = wasMuted;
        if (!wasPaused) {
          const p = videoEl.play();
          if (p && p.catch) p.catch(() => {});
        }
      } catch (e) {}
      done(knownUrlFor(videoEl));
    };

    try {
      videoEl.muted = true;
      const p = videoEl.play();
      if (p && p.catch) p.catch(() => finish());
    } catch (e) {
      return finish();
    }

    timer = setInterval(() => {
      if (knownUrlFor(videoEl)) finish();
    }, 150);
    setTimeout(finish, 4000);
  };

  const downloadVideo = (videoEl) => {
    resolveVideoUrl(videoEl, (url) => {
      if (!url) {
        debugLog("No downloadable video URL found");
        return;
      }
      if (window.DownloadBridge && window.DownloadBridge.downloadUrl) {
        window.DownloadBridge.downloadUrl(sanitizeVideoUrl(url), "video/mp4");
      } else {
        downloadBase64(sanitizeVideoUrl(url), "video/mp4");
      }
    });
  };

  // Download media from URL. mediaElement is the element the URL came from,
  // used to resolve blob: video sources to the URL captured for that element
  // (never a global, possibly stale, last-captured URL).
  const downloadMedia = (url, mediaElement) => {
    if (!url || typeof url !== "string") return;

    const isVideo = /\.(mp4|m4v)(\?|$)/i.test(url) || url.startsWith("blob:");

    if (isVideo) {
      let realUrl = url;
      if (url.startsWith("blob:")) {
        realUrl = knownUrlFor(mediaElement) || null;
      }

      if (!realUrl) {
        debugLog("No downloadable video URL found for blob source");
        return;
      }

      if (window.DownloadBridge && window.DownloadBridge.downloadUrl) {
        // Stream the file natively to avoid loading large videos in memory.
        window.DownloadBridge.downloadUrl(sanitizeVideoUrl(realUrl), "video/mp4");
      } else {
        downloadBase64(sanitizeVideoUrl(realUrl), "video/mp4");
      }
      return;
    }

    downloadBase64(url, "image/jpeg");
  };

  const downloadBase64 = (url, fallbackMime) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        if (window.DownloadBridge && window.DownloadBridge.downloadBase64File) {
          const reader = new FileReader();
          reader.onloadend = function() {
            if (reader.result) {
              window.DownloadBridge.downloadBase64File(
                reader.result,
                blob.type || fallbackMime || "image/jpeg"
              );
            }
          };
          reader.readAsDataURL(blob);
        }
      })
      .catch(err => {
        console.error("Error downloading media:", err);
      });
  };

  // Extract and download videos or images
  const extractAndDownloadMedia = () => {
    // Prefer the media in the CURRENT viewer: what the user is actually
    // looking at decides photo vs video. On a photo dialog this is the photo;
    // on a reel/story viewer it is the <video> (even when paused and covered
    // by its poster image).
    const mediaElement = getCurrentMediaElement();

    if (mediaElement && mediaElement.src && mediaElement.src !== lastDownloadedUrl) {
      if (mediaElement.tagName === "VIDEO") {
        downloadVideo(mediaElement);
      } else {
        downloadMedia(mediaElement.src, mediaElement);
      }
      lastDownloadedUrl = mediaElement.src;
      return;
    }

    // Fallback: a page-wide video, but only when a video is genuinely in view
    // (isInVideoView). This keeps a stale <video> element left in the DOM by
    // Facebook from hijacking a photo download.
    const videoElement = findVideoInView();
    if (videoElement && videoElement.src !== lastDownloadedUrl) {
      downloadVideo(videoElement);
      lastDownloadedUrl = videoElement.src;
      return;
    }

    // Get container to search in
    const container = currentContentContainer || document.body;

    // If no video, try with images
    const images = Array.from(container.querySelectorAll("img"))
      .filter(img =>
        img.src &&
        !img.src.includes("data:image") &&
        img.src !== lastDownloadedUrl
      )
      .filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width >= 100 && rect.height >= 100 && isElementVisible(img);
      })
      .sort((a, b) => {
        const areaA = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
        const areaB = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
        return areaB - areaA; // Largest first
      });

    if (images.length > 0) {
      downloadMedia(images[0].src);
      lastDownloadedUrl = images[0].src;
      return;
    }

    // Try background images as last resort
    const backgroundElements = Array.from(container.querySelectorAll("*"));

    for (const el of backgroundElements) {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;

      if (
        bgImage &&
        bgImage !== "none" &&
        (bgImage.includes("fbcdn.net") || bgImage.includes("fbsbx.com"))
      ) {
        const imageUrl = bgImage.replace(/^url\(['"](.+)['"]\)$/, "$1");

        if (imageUrl !== lastDownloadedUrl) {
          downloadMedia(imageUrl);
          lastDownloadedUrl = imageUrl;
          return;
        }
      }
    }

    // Nothing found
    debugLog("No media content found to download");
  };

  // Create and manage download button
  const createDownloadButton = () => {
    // Add CSS for the button
    const css = `
      #${DOWNLOAD_BTN_ID} {
        position: fixed;
        top: 70px;
        right: 15px;
        width: 40px;
        height: 40px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        border-radius: 50%;
        z-index: ${CONFIG.buttonZIndex};
        border: none;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        cursor: pointer;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 960 960" fill="white"><path d="M480,640L280,440L336,384L440,488L440,160L520,160L520,488L624,384L680,440L480,640ZM240,800Q207,800 183.5,776.5Q160,753 160,720L160,600L240,600L240,720Q240,720 240,720Q240,720 240,720L720,720Q720,720 720,720Q720,720 720,720L720,600L800,600L800,720Q800,753 776.5,776.5Q753,800 720,800L240,800Z"/></svg>');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 24px;
      }
      #${DOWNLOAD_BTN_ID}.visible {
        display: flex !important;
      }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // Create button element
    const btn = document.createElement("button");
    btn.id = DOWNLOAD_BTN_ID;
    btn.setAttribute("aria-label", "Download content");

    btn.addEventListener("click", () => {
      // Reset state
      currentContentContainer = null;
      lastDownloadedUrl = null;

      // Find current media and container
      const mediaElement = getCurrentMediaElement();
      if (mediaElement) {
        currentContentContainer = findContentContainer(mediaElement);
      }

      extractAndDownloadMedia();
    });

    document.body.appendChild(btn);

    return btn;
  };

  // Show/hide download button based on context
  const updateButtonVisibility = () => {
    let btn = document.getElementById(DOWNLOAD_BTN_ID);
    if (!btn) btn = createDownloadButton();

    if (isInStoryOrReelView() && !isFeed()) {
      const mediaElement = getCurrentMediaElement();

      // Always hide "Open in App" buttons
      hideOpenAppButtons();

      if (mediaElement) {
        currentContentContainer = findContentContainer(mediaElement);
        btn.classList.add("visible");
        return;
      }

      // Special case for highlighted stories
      const highlightedStoryContainer = document.querySelector(
        'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"]'
      );

      if (highlightedStoryContainer) {
        const mediaInHighlight = highlightedStoryContainer.querySelector(
          'video, img[src*="fbcdn"]'
        );

        if (mediaInHighlight && isElementVisible(mediaInHighlight)) {
          currentContentContainer = highlightedStoryContainer;
          btn.classList.add("visible");
          return;
        }
      }
    }

    // Hide button if not in relevant view
    btn.classList.remove("visible");
    currentContentContainer = null;
  };

  const hideOpenAppButtons = (root = document) => {
        // Find all div[role="button"] elements
        const buttons = root.querySelectorAll('div[role="button"]');

        buttons.forEach(button => {
          // Check if it contains div.fl.ac with a span containing the ó±¥¬ symbol
          const flAcDiv = button.querySelector('div.fl.ac');

          if (flAcDiv) {
            const span = flAcDiv.querySelector('span');
            if (span && span.textContent.includes('ó±¥¬')) {
              button.style.display = 'none';
            }
          }
        });
  };

  // Main processing function
  const processPage = () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      updateButtonVisibility();
    } finally {
      isProcessing = false;
    }
  };

  // Initialize
  const init = () => {
    // Reset state
    currentContentContainer = null;
    lastDownloadedUrl = null;

    // Initial check
    processPage();

    // Set up DOM observer
    const observer = new MutationObserver(mutations => {
      const hasRelevantChanges = mutations.some(
        mutation =>
          (mutation.type === "childList" && mutation.addedNodes.length > 0) ||
          (mutation.type === "attributes" &&
            (mutation.target.tagName === "VIDEO" ||
             mutation.target.tagName === "IMG"))
      );
      if (hasRelevantChanges) processPage();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "style", "class"]
    });
  };

  // Start when document is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();