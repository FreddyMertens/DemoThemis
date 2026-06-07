// Shared behaviour for the pitch site:
// scroll progress, reveal-on-scroll, nav, series prev/next, in-page TOC, back-to-top.
(function () {
  "use strict";

  // Canonical reading path: 7 chapters across 4 acts. Deep-dive pages are off-path.
  var CHAPTERS = [
    { f: "vision.html", t: "The vision", act: "I", actName: "The promise", ch: 1 },
    { f: "juror-court.html", t: "The court", act: "II", actName: "The mechanism", ch: 2 },
    { f: "hybrid-juror-system.html", t: "The hybrid system", act: "II", actName: "The mechanism", ch: 3 },
    { f: "prediction-market.html", t: "The market", act: "III", actName: "The bootstrap", ch: 4 },
    { f: "hybrid-juror-prediction-market-integration.html", t: "The loop", act: "III", actName: "The bootstrap", ch: 5 },
    { f: "zero-to-one.html", t: "Zero to one", act: "III", actName: "The bootstrap", ch: 6 },
    { f: "compounding.html", t: "Why it compounds", act: "IV", actName: "The payoff", ch: 7 }
  ];
  var TOTAL = CHAPTERS.length;
  var HOME = { f: "index.html", t: "The map" };

  function fileOf(path) {
    var p = (path || "").split("?")[0].split("#")[0].split("/").pop();
    return (!p) ? "index.html" : p;
  }
  var here = fileOf(location.pathname);

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  }

  // ---- scroll progress ----
  var bar = document.getElementById("progress");
  function onProgress() {
    if (!bar) return;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
    bar.style.width = (pct * 100).toFixed(2) + "%";
  }

  // ---- reveal on scroll ----
  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (!("IntersectionObserver" in window) || !items.length) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  // ---- top nav: toggles + active link ----
  function initNav() {
    var nav = document.querySelector(".sitenav");
    if (!nav) return;
    var toggle = nav.querySelector(".nav-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    var gbtn = nav.querySelector(".nav-group-btn");
    if (gbtn) {
      gbtn.addEventListener("click", function (e) {
        if (window.matchMedia("(max-width: 860px)").matches) {
          e.preventDefault();
          gbtn.parentNode.classList.toggle("open");
        }
      });
    }
    Array.prototype.forEach.call(nav.querySelectorAll("a[href]"), function (a) {
      if (fileOf(a.getAttribute("href")) === here) {
        a.classList.add("active");
        var grp = a.closest(".nav-group");
        if (grp) { var b = grp.querySelector(".nav-group-btn"); if (b) b.classList.add("active"); }
      }
    });
  }

  // ---- series prev/next ----
  function initSeries() {
    var el = document.getElementById("series");
    if (!el) return;

    // Home: a single call to action into chapter one.
    if (here === "index.html") {
      el.innerHTML = '<p class="series-pos">The story in ' + TOTAL + ' chapters</p>' +
        '<div class="series-nav"><a class="next" href="' + CHAPTERS[0].f + '">' +
        '<span class="dir">Start &rarr;</span><span class="ttl">' + CHAPTERS[0].t + '</span></a></div>';
      return;
    }

    var idx = -1;
    for (var i = 0; i < CHAPTERS.length; i++) { if (CHAPTERS[i].f === here) { idx = i; break; } }

    // Deep dive: off the main path, route back to its parent chapter.
    if (idx === -1) {
      var parent = el.getAttribute("data-parent") || "hybrid-juror-system.html";
      var ptitle = el.getAttribute("data-parent-title") || "the main thread";
      el.innerHTML = '<p class="series-pos">A deep dive &middot; off the main path</p>' +
        '<div class="series-nav">' +
        '<a class="prev" href="' + parent + '"><span class="dir">&larr; Back to</span><span class="ttl">' + ptitle + '</span></a>' +
        '<a class="next" href="' + HOME.f + '"><span class="dir">The map &rarr;</span><span class="ttl">All chapters</span></a>' +
        '</div>';
      return;
    }

    var c = CHAPTERS[idx];
    var prev = idx > 0 ? CHAPTERS[idx - 1] : HOME;
    var next = idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : HOME;
    var prevDir = idx > 0 ? "&larr; Previous" : "&larr; The map";
    var nextDir = idx < CHAPTERS.length - 1 ? "Next &rarr;" : "Finish &rarr;";
    var inner = '<a class="prev" href="' + prev.f + '"><span class="dir">' + prevDir + '</span><span class="ttl">' + prev.t + '</span></a>' +
      '<a class="next" href="' + next.f + '"><span class="dir">' + nextDir + '</span><span class="ttl">' + next.t + '</span></a>';
    el.innerHTML = '<p class="series-pos">Act ' + c.act + ' &middot; Chapter ' + c.ch + ' of ' + TOTAL + ' &middot; ' + c.actName + '</p>' +
      '<div class="series-nav">' + inner + '</div>';
  }

  // ---- in-page table of contents + scroll-spy ----
  function initToc() {
    var toc = document.getElementById("toc");
    var main = document.querySelector("main");
    if (!toc || !main) return;
    var secs = Array.prototype.slice.call(main.querySelectorAll(":scope > section"));
    var entries = [];
    secs.forEach(function (sec) {
      var h2 = sec.querySelector("h2");
      var lbl = sec.querySelector(".sec-label");
      if (!h2 && !lbl) return;
      var text = (h2 ? h2.textContent : lbl.textContent).trim();
      if (!sec.id) sec.id = slug(text) || ("s" + entries.length);
      entries.push({ id: sec.id, text: text });
    });
    if (entries.length < 3) { toc.style.display = "none"; return; }
    var ul = "";
    entries.forEach(function (e) { ul += '<li><a href="#' + e.id + '">' + e.text + '</a></li>'; });
    toc.innerHTML = '<p class="toc-title">On this page</p><ul>' + ul + '</ul>';
    var linkFor = {};
    Array.prototype.forEach.call(toc.querySelectorAll("a"), function (a) {
      linkFor[a.getAttribute("href").slice(1)] = a;
    });
    if ("IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (en.isIntersecting) {
            Object.keys(linkFor).forEach(function (k) { if (linkFor[k]) linkFor[k].classList.remove("active"); });
            if (linkFor[en.target.id]) linkFor[en.target.id].classList.add("active");
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
      entries.forEach(function (e) { var s = document.getElementById(e.id); if (s) spy.observe(s); });
    }
  }

  // ---- back to top ----
  function initToTop() {
    var btn = document.createElement("button");
    btn.className = "to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = "&uarr;";
    document.body.appendChild(btn);
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    function vis() { btn.classList.toggle("show", window.scrollY > 700); }
    window.addEventListener("scroll", vis, { passive: true });
    vis();
  }

  window.addEventListener("scroll", onProgress, { passive: true });
  window.addEventListener("resize", onProgress);
  onProgress();
  initReveal();
  initNav();
  initSeries();
  initToc();
  initToTop();
})();
