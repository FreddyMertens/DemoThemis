(function () {
  "use strict";

  var shell = document.querySelector("[data-omen-rive]");
  var canvas = document.getElementById("omen-brand-canvas");
  if (!shell || !canvas) return;

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !window.rive || !window.rive.Rive) return;

  var instance = null;
  var initialized = false;
  var visible = true;

  function assetUrl(relativePath) {
    return new URL(relativePath, document.baseURI).href;
  }

  function setPlayback(shouldPlay) {
    if (!instance) return;
    try {
      if (shouldPlay && typeof instance.play === "function") instance.play();
      if (!shouldPlay && typeof instance.pause === "function") instance.pause();
    } catch (error) {
      /* The static poster remains the complete fallback. */
    }
  }

  function initialize() {
    if (initialized) return;
    initialized = true;

    try {
      if (window.rive.RuntimeLoader && typeof window.rive.RuntimeLoader.setWasmUrl === "function") {
        window.rive.RuntimeLoader.setWasmUrl(assetUrl("assets/vendor/rive/rive-2.38.5.wasm"));
      }
      instance = new window.rive.Rive({
        src: assetUrl("assets/brand/omenmarketmaker/wordmark.riv"),
        canvas: canvas,
        autoplay: true,
        layout: new window.rive.Layout({
          fit: window.rive.Fit.Contain,
          alignment: window.rive.Alignment.Center,
        }),
        onLoad: function () {
          if (typeof instance.resizeDrawingSurfaceToCanvas === "function") {
            instance.resizeDrawingSurfaceToCanvas();
          }
          shell.classList.add("is-ready");
          setPlayback(visible && !document.hidden);
        },
        onLoadError: function () {
          shell.classList.remove("is-ready");
        },
      });
    } catch (error) {
      shell.classList.remove("is-ready");
    }
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible = entry.isIntersecting;
        if (visible) initialize();
        setPlayback(visible && !document.hidden);
      });
    }, { rootMargin: "240px 0px" });
    observer.observe(shell);
  } else {
    initialize();
  }

  document.addEventListener("visibilitychange", function () {
    setPlayback(visible && !document.hidden);
  });

  window.addEventListener("pagehide", function () {
    if (instance && typeof instance.cleanup === "function") instance.cleanup();
    instance = null;
  }, { once: true });
})();
