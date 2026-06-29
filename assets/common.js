// Shared behaviour for the pitch site:
// scroll progress, reveal-on-scroll, nav, series prev/next, in-page TOC, back-to-top.
(function () {
  "use strict";

  // Canonical reading path: 10 chapters across 4 acts. Deep-dive pages are off-path.
  var CHAPTERS = [
    { f: "vision.html", t: "The vision", act: "I", actName: "The promise", ch: 1 },
    { f: "juror-court.html", t: "The court", act: "II", actName: "The mechanism", ch: 2 },
    { f: "hybrid-juror-system.html", t: "The hybrid system", act: "II", actName: "The mechanism", ch: 3 },
    { f: "prediction-market.html", t: "The prediction market", act: "III", actName: "The bootstrap", ch: 4 },
    { f: "hybrid-juror-prediction-market-integration.html", t: "The loop", act: "III", actName: "The bootstrap", ch: 5 },
    { f: "zero-to-one.html", t: "Zero to one", act: "III", actName: "The bootstrap", ch: 6 },
    { f: "compounding.html", t: "Why it compounds", act: "IV", actName: "The payoff", ch: 7 },
    { f: "the-design.html", t: "The blueprint", act: "IV", actName: "The payoff", ch: 8 },
    { f: "governance.html", t: "Governance", act: "IV", actName: "The payoff", ch: 9 },
    { f: "game-theory.html", t: "The game-theory lab", act: "IV", actName: "The payoff", ch: 10 }
  ];
  var TOTAL = CHAPTERS.length;

  // The review arc: four rounds of attack and answer, chained after the blueprint.
  var REVIEWS = [
    { f: "breaking-the-court.html", t: "Could you break it?" },
    { f: "hardening-the-court.html", t: "Can the gaps be closed?" },
    { f: "finishing-the-court.html", t: "How deep do the fixes go?" },
    { f: "rebuilding-the-court.html", t: "What deserved to die?" }
  ];
  var BLUEPRINT = { f: "the-design.html", t: "The blueprint" };

  function fileOf(path) {
    var clean = (path || "").split("?")[0].split("#")[0];
    if (!clean || /\/$/.test(clean)) return "index.html";
    var p = clean.split("/").pop();
    if (!p) return "index.html";
    if (p.indexOf(".") === -1) return p + ".html";
    return p;
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
    Array.prototype.forEach.call(nav.querySelectorAll(".nav-group-btn"), function (gbtn) {
      gbtn.addEventListener("click", function (e) {
        if (window.matchMedia("(max-width: 860px)").matches) {
          e.preventDefault();
          gbtn.parentNode.classList.toggle("open");
        }
      });
    });
    Array.prototype.forEach.call(nav.querySelectorAll("a[href]"), function (a) {
      if (fileOf(a.getAttribute("href")) === here) {
        a.classList.add("active");
        var grp = a.closest(".nav-group");
        if (grp) { var b = grp.querySelector(".nav-group-btn"); if (b) b.classList.add("active"); }
      }
    });
  }

  // ---- series prev/next ----
  function seriesCard(cls, item, dir) {
    return '<a class="' + cls + '" href="' + item.f + '"><span class="dir">' + dir + '</span><span class="ttl">' + item.t + '</span></a>';
  }

  function renderSeries(el, html) {
    el.classList.add("series-bottom");
    el.innerHTML = html;

    if (here === "index.html") return;

    var main = document.querySelector("main");
    if (!main) return;

    var top = document.getElementById("series-top");
    if (!top) {
      top = document.createElement("nav");
      top.id = "series-top";
      top.className = "series-top";
      top.setAttribute("aria-label", "Chapter navigation");
      var toc = document.getElementById("toc");
      main.insertBefore(top, toc || main.firstChild);
    }
    top.innerHTML = html;
  }

  function findChapterIndex(file) {
    for (var i = 0; i < CHAPTERS.length; i++) { if (CHAPTERS[i].f === file) return i; }
    return -1;
  }

  function chapterNav(pos, prev, next) {
    var cards = "";
    if (prev) cards += seriesCard("prev", prev, "&larr; Previous chapter");
    if (next) cards += seriesCard("next", next, "Next chapter &rarr;");
    return '<p class="series-pos">' + pos + '</p><div class="series-nav">' + cards + '</div>';
  }

  function initSeries() {
    var el = document.getElementById("series");
    if (!el) return;

    var html;

    // Home: a single call to action into chapter one.
    if (here === "index.html") {
      html = '<p class="series-pos">The story in ' + TOTAL + ' chapters</p>' +
        '<div class="series-nav">' + seriesCard("next", CHAPTERS[0], "Start &rarr;") + '</div>';
      renderSeries(el, html);
      return;
    }

    var idx = findChapterIndex(here);

    // The review arc: rounds chain into each other, bracketed by the blueprint.
    var rIdx = -1;
    for (var r = 0; r < REVIEWS.length; r++) { if (REVIEWS[r].f === here) { rIdx = r; break; } }
    if (rIdx !== -1) {
      var rPrev = rIdx > 0 ? REVIEWS[rIdx - 1] : BLUEPRINT;
      var rNext = rIdx < REVIEWS.length - 1 ? REVIEWS[rIdx + 1] : null;
      html = chapterNav('The review &middot; Round ' + (rIdx + 1) + ' of ' + REVIEWS.length, rPrev, rNext);
      renderSeries(el, html);
      return;
    }

    // Deep dive: off the main path, route back to its parent chapter.
    if (idx === -1) {
      var parentFile = el.getAttribute("data-parent");
      if (!parentFile) return;
      var parent = { f: fileOf(parentFile), t: el.getAttribute("data-parent-title") || "Parent chapter" };
      var pIdx = findChapterIndex(parent.f);
      var dNext = pIdx !== -1 && pIdx < CHAPTERS.length - 1 ? CHAPTERS[pIdx + 1] : null;
      html = chapterNav('Chapter navigation', parent, dNext);
      renderSeries(el, html);
      return;
    }

    var c = CHAPTERS[idx];
    var prev = idx > 0 ? CHAPTERS[idx - 1] : null;
    var next = idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
    html = chapterNav('Act ' + c.act + ' &middot; Chapter ' + c.ch + ' of ' + TOTAL + ' &middot; ' + c.actName, prev, next);
    renderSeries(el, html);
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

      // ---- tooltips ----
  window.initTooltips = function() {
    const MAIN_COPIES = {
      flow: "The total dollar value of ordinary cases expected to arrive in court each month.",
      stake: "The typical dollar amount at risk in a contested case.",
      challenge: "The percentage of total case flow that escalates to court instead of settling quietly.",
      lag: "The number of weeks an appeal delays final settlement, locking up staked funds.",
      fee: "The percentage fee taken from settlements to fund juror pay, rewards, and operations.",
      payShare: "The percentage of the settlement fee distributed directly to jurors as base pay.",
      rewardShare: "The percentage of the settlement fee distributed to a pool to reward high-quality jurors over time.",
      jurors: "The total number of active, retained jurors available in the system.",
      skill: "The probability that a careful juror will vote correctly on a case.",
      careless: "The extra mistake rate caused by lazy jurors voting randomly or carelessly.",
      slash: "The percentage of a juror\'s staked funds they lose if they vote on the wrong side.",
      bloc: "The number of coordinated human attackers trying to capture a panel.",
      rented: "The number of honest juror accounts that attackers have secretly rented.",
      rerolls: "The number of times a panel is redrawn to prevent attackers from predicting the outcome.",
      watchCost: "The dollar cost for an independent watcher to monitor one settlement window.",
      falseRate: "The percentage of settlements where someone attempts to slip through a false assertion."
    };

    let allAssumptions = [];
    Object.keys(MAIN_COPIES).forEach(function(id) {
      allAssumptions.push({ domId: id, copy: MAIN_COPIES[id] });
    });

    if (typeof ASSUMPTIONS !== "undefined") {
      ASSUMPTIONS.forEach(function(a) {
        allAssumptions.push({ domId: "assumption_" + a.id, copy: a.copy });
      });
    }

    allAssumptions.forEach(function(a) {
      if (!a.copy) return;
      
      // 1. Add info icon to the label
      var label = document.querySelector('label[for="' + a.domId + '"]');
      if (label) {
        var icon = document.createElement("span");
        icon.className = "info-icon";
        icon.setAttribute("data-tooltip", a.copy);
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
        var b = label.querySelector("b") || label.querySelector("output");
        if (b) {
          label.insertBefore(icon, b);
        } else {
          label.appendChild(icon);
        }
      }
      

    });

    if (typeof tippy !== 'undefined') {
      tippy('[data-tooltip]', {
        content(reference) {
          return reference.getAttribute('data-tooltip');
        },
        theme: 'demothemis',
        animation: 'shift-away',
        placement: 'top',
        maxWidth: 250,
      });
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
