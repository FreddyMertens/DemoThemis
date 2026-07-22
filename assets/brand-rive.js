(function () {
  "use strict";

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !window.rive || !window.rive.Rive) return;

  var RIVE_PLAYBACK_RATE = 0.5;
  var loaderScript = document.currentScript;
  var records = [];
  var observer = null;
  var resizeObserver = null;
  var mutationObserver = null;
  var syncFrame = 0;

  function assetUrl(relativePath) {
    var base = loaderScript && loaderScript.src
      ? new URL(".", loaderScript.src)
      : new URL("assets/", document.baseURI);
    return new URL(relativePath, base).href;
  }

  if (window.rive.RuntimeLoader && typeof window.rive.RuntimeLoader.setWasmUrl === "function") {
    window.rive.RuntimeLoader.setWasmUrl(assetUrl("vendor/rive/rive-2.38.5.wasm"));
  }

  function recordForShell(shell) {
    for (var i = 0; i < records.length; i += 1) {
      if (records[i].shell === shell) return records[i];
    }
    return null;
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

  function resize(record) {
    if (!record || !record.instance || typeof record.instance.resizeDrawingSurfaceToCanvas !== "function") return;
    try {
      record.instance.resizeDrawingSurfaceToCanvas();
    } catch (error) {
      /* The current frame and poster remain usable. */
    }
  }

  function initialize(record) {
    if (record.initialized || !record.shell.isConnected) return;
    record.initialized = true;

    try {
      record.instance = new window.rive.Rive({
        src: assetUrl("brand/omenmarketmaker/wordmark.riv"),
        canvas: record.canvas,
        autoplay: true,
        layout: new window.rive.Layout({
          fit: window.rive.Fit.Contain,
          alignment: window.rive.Alignment.Center,
        }),
        onLoad: function () {
          resize(record);
          if (!record.shell.isConnected) {
            release(record);
            return;
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

  function register(shell) {
    if (!shell || recordForShell(shell)) return;
    var canvas = shell.querySelector("canvas");
    if (!canvas) return;
    var record = {
      shell: shell,
      canvas: canvas,
      instance: null,
      initialized: false,
      visible: !observer,
    };
    records.push(record);
    if (observer) observer.observe(shell);
    else initialize(record);
    if (resizeObserver) resizeObserver.observe(shell);
  }

  function release(record) {
    if (!record) return;
    if (observer) observer.unobserve(record.shell);
    if (resizeObserver) resizeObserver.unobserve(record.shell);
    if (record.instance && typeof record.instance.cleanup === "function") {
      try {
        record.instance.cleanup();
      } catch (error) {
        /* The detached canvas is already inert. */
      }
    }
    record.instance = null;
    var index = records.indexOf(record);
    if (index >= 0) records.splice(index, 1);
  }

  function syncShells() {
    syncFrame = 0;
    records.slice().forEach(function (record) {
      if (!record.shell.isConnected) release(record);
    });
    Array.prototype.slice.call(document.querySelectorAll("[data-omen-rive]")).forEach(register);
  }

  function scheduleSync() {
    if (syncFrame) return;
    syncFrame = window.requestAnimationFrame(syncShells);
  }

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var record = recordForShell(entry.target);
        if (!record) return;
        record.visible = entry.isIntersecting;
        if (record.visible) initialize(record);
        setPlayback(record, record.visible && !document.hidden);
      });
    }, { rootMargin: "240px 0px" });
  }

  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        resize(recordForShell(entry.target));
      });
    });
  }

  syncShells();

  if ("MutationObserver" in window && document.body) {
    mutationObserver = new MutationObserver(scheduleSync);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("visibilitychange", function () {
    records.forEach(function (record) {
      setPlayback(record, record.visible && !document.hidden);
    });
  });

  window.addEventListener("pagehide", function () {
    if (observer) observer.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
    if (mutationObserver) mutationObserver.disconnect();
    if (syncFrame) window.cancelAnimationFrame(syncFrame);
    records.slice().forEach(release);
  }, { once: true });
})();
