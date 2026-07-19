(function () {
  "use strict";

  var shells = Array.prototype.slice.call(document.querySelectorAll("[data-omen-rive]"));
  if (!shells.length) return;

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !window.rive || !window.rive.Rive) return;

  var RIVE_PLAYBACK_RATE = 0.5;

  var records = shells.map(function (shell) {
    return {
      shell: shell,
      canvas: shell.querySelector("canvas"),
      instance: null,
      initialized: false,
      visible: true,
    };
  }).filter(function (record) {
    return Boolean(record.canvas);
  });
  if (!records.length) return;

  function assetUrl(relativePath) {
    return new URL(relativePath, document.baseURI).href;
  }

  if (window.rive.RuntimeLoader && typeof window.rive.RuntimeLoader.setWasmUrl === "function") {
    window.rive.RuntimeLoader.setWasmUrl(assetUrl("assets/vendor/rive/rive-2.38.5.wasm"));
  }

  function setPlayback(record, shouldPlay) {
    if (!record.instance) return;
    try {
      if (shouldPlay && typeof record.instance.play === "function") record.instance.play();
      if (!shouldPlay && typeof record.instance.pause === "function") record.instance.pause();
    } catch (error) {
      /* The static poster remains the complete fallback. */
    }
  }

  function setPlaybackRate(record) {
    if (!record.instance || typeof record.instance.advanceAndReportChanges !== "function") return;
    var advanceAtNormalRate = record.instance.advanceAndReportChanges.bind(record.instance);
    record.instance.advanceAndReportChanges = function (elapsedTime) {
      return advanceAtNormalRate(elapsedTime * RIVE_PLAYBACK_RATE);
    };
  }

  function initialize(record) {
    if (record.initialized) return;
    record.initialized = true;

    try {
      record.instance = new window.rive.Rive({
        src: assetUrl("assets/brand/omenmarketmaker/wordmark.riv"),
        canvas: record.canvas,
        autoplay: true,
        layout: new window.rive.Layout({
          fit: window.rive.Fit.Contain,
          alignment: window.rive.Alignment.Center,
        }),
        onLoad: function () {
          if (record.instance && typeof record.instance.resizeDrawingSurfaceToCanvas === "function") {
            record.instance.resizeDrawingSurfaceToCanvas();
          }
          record.shell.classList.add("is-ready");
          setPlayback(record, record.visible && !document.hidden);
        },
        onLoadError: function () {
          record.shell.classList.remove("is-ready");
        },
      });
      setPlaybackRate(record);
    } catch (error) {
      record.shell.classList.remove("is-ready");
    }
  }

  var observer = null;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        records.forEach(function (record) {
          if (record.shell !== entry.target) return;
          record.visible = entry.isIntersecting;
          if (record.visible) initialize(record);
          setPlayback(record, record.visible && !document.hidden);
        });
      });
    }, { rootMargin: "240px 0px" });
    records.forEach(function (record) {
      observer.observe(record.shell);
    });
  } else {
    records.forEach(initialize);
  }

  document.addEventListener("visibilitychange", function () {
    records.forEach(function (record) {
      setPlayback(record, record.visible && !document.hidden);
    });
  });

  window.addEventListener("pagehide", function () {
    if (observer) observer.disconnect();
    records.forEach(function (record) {
      if (record.instance && typeof record.instance.cleanup === "function") record.instance.cleanup();
      record.instance = null;
    });
  }, { once: true });
})();
