// Shared behaviour for the pitch site:
// scroll progress, reveal-on-scroll, nav, chapter prev/next, in-page TOC, back-to-top.
(function () {
  "use strict";

  // Canonical reading path: 6 chapters. Deep-dive pages are off-path.
  var CHAPTERS = [
    { f: "run-through.html", t: "Run-through", ch: 1 },
    { f: "demothemis.html", t: "DemoThemis", ch: 2 },
    { f: "break-the-court.html", t: "Break the court", ch: 3 },
    { f: "omenmarketmaker.html", t: "OmenMarketMaker", ch: 4 },
    { f: "bootstrap-loop.html", t: "The bootstrap loop", ch: 5 },
    { f: "governance.html", t: "Governance", ch: 6 }
  ];
  var TOTAL = CHAPTERS.length;

  function fileOf(path) {
    var clean = String(path || "").split("?")[0].split("#")[0].replace(/\\/g, "/");
    try { clean = decodeURIComponent(clean); } catch (e) { /* Keep the undecoded path. */ }
    clean = clean.replace(/\/+$/, "");
    if (!clean) return "index.html";
    var p = clean.split("/").pop();
    if (!p) return "index.html";
    if (p.indexOf(".") === -1) return (p + ".html").toLowerCase();
    return p.toLowerCase();
  }

  function linkedFile(a) {
    try {
      return fileOf(new URL(a.href, location.href).pathname);
    } catch (e) {
      return fileOf(a.getAttribute("href"));
    }
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
    var links = nav.querySelector(".nav-links");
    if (toggle && links) {
      if (!links.id) links.id = "primary-navigation";
      toggle.setAttribute("aria-controls", links.id);
    }
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    document.addEventListener("click", function (e) {
      if (toggle && !nav.contains(e.target) && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    nav.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (toggle && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    Array.prototype.forEach.call(nav.querySelectorAll(".nav-links a[href]"), function (a) {
      a.classList.remove("active");
      a.removeAttribute("aria-current");
      if (linkedFile(a) === here) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
      }
    });
  }

  // ---- series prev/next ----
  function createSeriesCard(cls, item, dir) {
    var link = document.createElement("a");
    var direction = document.createElement("span");
    var title = document.createElement("span");
    link.className = cls;
    link.href = item.f;
    direction.className = "dir";
    direction.textContent = dir;
    title.className = "ttl";
    title.textContent = item.t;
    link.appendChild(direction);
    link.appendChild(title);
    return link;
  }

  function appendSeriesContent(el, pos, links) {
    var label = document.createElement("p");
    var nav = document.createElement("div");
    label.className = "series-pos";
    label.textContent = pos;
    nav.className = "series-nav";
    links.forEach(function (link) {
      nav.appendChild(createSeriesCard(link.cls, link.item, link.dir));
    });
    el.replaceChildren(label, nav);
  }

  function renderSeries(el, pos, links) {
    el.classList.add("series-bottom");
    appendSeriesContent(el, pos, links);

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
    appendSeriesContent(top, pos, links);
  }

  function findChapterIndex(file) {
    for (var i = 0; i < CHAPTERS.length; i++) { if (CHAPTERS[i].f === file) return i; }
    return -1;
  }

  function chapterNav(pos, prev, next) {
    var links = [];
    if (prev) links.push({ cls: "prev", item: prev, dir: "\u2190 Previous chapter" });
    if (next) links.push({ cls: "next", item: next, dir: "Next chapter \u2192" });
    return { pos: pos, links: links };
  }

  function initSeries() {
    var el = document.getElementById("series");
    if (!el) return;

    var nav;

    // Home: a single call to action into chapter one.
    if (here === "index.html") {
      renderSeries(el, "The story in " + TOTAL + " chapters", [
        { cls: "next", item: CHAPTERS[0], dir: "Start \u2192" }
      ]);
      return;
    }

    var idx = findChapterIndex(here);

    // Deep dive: off the main path, route back to its parent chapter.
    if (idx === -1) {
      var parentFile = el.getAttribute("data-parent");
      if (!parentFile) return;
      var parent = { f: fileOf(parentFile), t: el.getAttribute("data-parent-title") || "Parent chapter" };
      var pIdx = findChapterIndex(parent.f);
      var dNext = pIdx !== -1 && pIdx < CHAPTERS.length - 1 ? CHAPTERS[pIdx + 1] : null;
      nav = chapterNav("Chapter navigation", parent, dNext);
      renderSeries(el, nav.pos, nav.links);
      return;
    }

    var c = CHAPTERS[idx];
    var prev = idx > 0 ? CHAPTERS[idx - 1] : null;
    var next = idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
    nav = chapterNav("Chapter " + c.ch + " of " + TOTAL, prev, next);
    renderSeries(el, nav.pos, nav.links);
  }

  // ---- in-page table of contents + scroll-spy ----
  function initToc() {
    var toc = document.getElementById("toc");
    var main = document.querySelector("main");
    if (!toc || !main) return;
    if (toc.hasAttribute("data-manual-toc")) return;
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
    var title = document.createElement("p");
    var list = document.createElement("ul");
    title.className = "toc-title";
    title.textContent = "On this page";
    entries.forEach(function (e) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.href = "#" + e.id;
      link.textContent = e.text;
      item.appendChild(link);
      list.appendChild(item);
    });
    toc.replaceChildren(title, list);
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
  function appendInfoSvg(icon) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    var stem = document.createElementNS("http://www.w3.org/2000/svg", "path");
    var dot = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "10");
    stem.setAttribute("d", "M12 16v-4");
    dot.setAttribute("d", "M12 8h.01");
    svg.appendChild(circle);
    svg.appendChild(stem);
    svg.appendChild(dot);
    icon.appendChild(svg);
  }

  function tooltipAriaLabel(text) {
    var clean = (text || "").replace(/\s+/g, " ").trim();
    if (clean.length > 180) clean = clean.slice(0, 177).replace(/\s+\S*$/, "") + "...";
    return clean ? "More information: " + clean : "More information";
  }

  function prepareTooltipTrigger(el) {
    var copy = el.getAttribute("data-tooltip") || el.getAttribute("aria-label") || "";
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    if (!el.hasAttribute("role")) el.setAttribute("role", "button");
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", tooltipAriaLabel(copy));
    Array.prototype.forEach.call(el.querySelectorAll("svg"), function (svg) {
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
    });
  }

  window.initTooltips = function() {
    const MAIN_COPIES = {
      flow: "The total value disputed through the court each month. Together with typical case value, it sets case volume and juror workload.",
      stake: "The typical value at risk in a contested case. The model uses it as a proxy for case stakes, jury size, and attack value.",
      lag: "How many weeks juror pay at risk remains pending before finality. Longer windows increase its burden and the value of delay.",
      fee: "The maximum share of case value the work-based jury quote may charge. Governance can set this ceiling only between 0.5% and 3%.",
      caseHours: "The expected evidence and decision time for each juror. It is locked with the case before selection.",
      complexity: "The published complexity multiplier applied to expected juror work. It is fixed before the draw.",
      reserveCoverage: "Current reward-reserve funding versus its target. Cases top it up only below 100% coverage.",
      jurors: "The opted-in registered juror pool before retention, availability, and draw eligibility are applied. This launch-scale model spans 100 to 5,000 jurors.",
      skill: "The chance that a careful juror reaches the correct answer before aptitude-test and reward effects are applied.",
      careless: "The assumed error rate of lazy, shortcut voting. It helps set the juror pay at risk needed to make that shortcut unprofitable.",
      slash: "The share of a juror's pending pay at risk lost when a vote is judged wrong.",
      syntheticTests: "Independently graded aptitude-test seats added each month, alongside eligible resolved-case tests.",
      bloc: "The recruited human coalition before qualification, availability, and coordination limits determine how many attackers become drawable.",
      rented: "Rented human accounts attackers try to place in the drawable pool before live face-check filtering.",
      rerolls: "Retryable jury-draw attempts available only when the one-public-draw safeguard is off. With it on, the model fixes attempts at one.",
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
        appendInfoSvg(icon);
        
        var b = label.querySelector("b") || label.querySelector("output");
        
        // Group the text node and the icon so they sit together on the left side of the flex container
        if (b && label.childNodes.length > 0 && label.childNodes[0].nodeType === 3) {
          var wrapper = document.createElement("span");
          wrapper.className = "label-text";
          wrapper.appendChild(label.childNodes[0].cloneNode(true));
          wrapper.appendChild(icon);
          label.replaceChild(wrapper, label.childNodes[0]);
        } else if (b) {
          label.insertBefore(icon, b);
        } else {
          label.appendChild(icon);
        }
      }
      

    });

    if (typeof tippy !== 'undefined') {
      Array.prototype.forEach.call(document.querySelectorAll('[data-tooltip]'), prepareTooltipTrigger);
      tippy('[data-tooltip]', {
        content(reference) {
          return reference.getAttribute('data-tooltip');
        },
        theme: 'DemoThemis',
        animation: 'shift-away',
        placement: 'top',
        trigger: 'mouseenter focus',
        hideOnClick: true,
        maxWidth: 450,
        allowHTML: false,
      });
    }
  }

  // ---- back to top ----
  function initToTop() {
    var btn = document.createElement("button");
    btn.className = "to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.textContent = "\u2191";
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
