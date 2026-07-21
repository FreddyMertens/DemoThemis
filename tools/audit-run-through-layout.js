const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

function loadPlaywrightChromium() {
  try {
    return require("playwright").chromium;
  } catch (primaryError) {
    const runtimeModules = path.resolve(path.dirname(process.execPath), "..", "node_modules");
    const pnpmStore = path.join(runtimeModules, ".pnpm");
    if (fs.existsSync(pnpmStore)) {
      const corePackage = fs.readdirSync(pnpmStore).find((name) => name.startsWith("playwright-core@"));
      const bundledCore = corePackage && path.join(pnpmStore, corePackage, "node_modules", "playwright-core");
      if (bundledCore && fs.existsSync(bundledCore)) return require(bundledCore).chromium;
    }
    throw new Error("Playwright is required for the run-through layout audit. Run npm install at the project root first.\n" + primaryError.message);
  }
}

const chromium = loadPlaywrightChromium();

const ROOT = path.resolve(__dirname, "..");
const RUN_THROUGH_URL = pathToFileURL(path.join(ROOT, "run-through.html")).href;
const VIEWPORTS = [
  { width: 231, height: 392, label: "reported-231" },
  { width: 280, height: 560, label: "small-280" },
  { width: 320, height: 640, label: "small-320" },
  { width: 360, height: 720, label: "phone-360" },
  { width: 390, height: 844, label: "phone-390" },
  { width: 430, height: 860, label: "phone-430" },
  { width: 620, height: 900, label: "mobile-boundary-620" },
  { width: 720, height: 900, label: "tablet-boundary-720" },
  { width: 760, height: 900, label: "surface-boundary-760" },
  { width: 980, height: 900, label: "desktop-boundary-980" },
  { width: 1280, height: 900, label: "desktop-1280" },
];

function unique(items) {
  return Array.from(new Set(items));
}

async function main() {
  const localBrowser = [
    process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find((candidate) => candidate && fs.existsSync(candidate));
  const browser = await chromium.launch({
    headless: true,
    ...(localBrowser ? { executablePath: localBrowser } : {}),
  });
  const page = await browser.newPage({ viewport: VIEWPORTS[0] });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.ResizeObserver = class LayoutAuditResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    window.MutationObserver = class LayoutAuditMutationObserver {
      observe() {}
      takeRecords() { return []; }
      disconnect() {}
    };
  });
  const failures = [];
  let checks = 0;

  try {
    await page.goto(`${RUN_THROUGH_URL}?layoutAudit=1&coachmarkAudit=1`, { waitUntil: "load" });
    const stages = await page.evaluate(() => window.__layoutAudit.stages());
    const coachmarkModes = { floating: 0, inline: 0, none: 0 };

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const viewportAudit = await page.evaluate((stageList) => {
        const results = [];
        const coachmarks = { floating: 0, inline: 0, none: 0 };
        const auditCurrentState = () => {
            const visible = (element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
            };
            const label = (element) => {
              const text = (element.textContent || "").replace(/\s+/g, " ").trim();
              return `${element.tagName.toLowerCase()}.${Array.from(element.classList).join(".")}:${text.slice(0, 72)}`;
            };
            const root = document.getElementById("productDemo");
            const surface = root && root.querySelector(".sim-surface-frame");
            const output = [];

            const target = root && root.querySelector(".guided-target:not(:disabled)");
            const activeTarget = target || (() => {
              const continuation = document.getElementById("runNext");
              return continuation && continuation.classList.contains("guided-target") && !continuation.hidden && !continuation.disabled ? continuation : null;
            })();
            if (activeTarget && window.__coachmarkAudit) {
              activeTarget.scrollIntoView({ block: "center", inline: "nearest" });
              const snapshot = window.__coachmarkAudit.recompute();
              const coach = document.getElementById("guidedCoachmark");
              const latest = snapshot && snapshot.latest;
              const mode = snapshot && snapshot.mode || "none";
              coachmarks[mode] = (coachmarks[mode] || 0) + 1;
              if (!coach || !visible(coach)) {
                output.push("active action is missing its visible dynamic label");
              } else {
                const actionLabel = (activeTarget.getAttribute("data-action-label") || "").trim();
                const actionInfo = (activeTarget.getAttribute("data-action-info") || "").trim();
                const coachText = (coach.textContent || "").replace(/\s+/g, " ").trim();
                if (actionLabel && !coachText.includes(actionLabel)) output.push(`dynamic label lost action text: ${actionLabel}`);
                if (actionInfo && !coachText.includes(actionInfo)) output.push(`dynamic label lost explainer text: ${actionInfo.slice(0, 54)}`);
                if (!coach.querySelector(".target-callout-step")) output.push("dynamic label lost its step progress");
                const coachRect = coach.getBoundingClientRect();
                const targetRect = activeTarget.getBoundingClientRect();
                const overlapX = Math.min(coachRect.right, targetRect.right) - Math.max(coachRect.left, targetRect.left);
                const overlapY = Math.min(coachRect.bottom, targetRect.bottom) - Math.max(coachRect.top, targetRect.top);
                if (overlapX > .5 && overlapY > .5) output.push("dynamic label overlaps its action button");
                if (mode === "floating") {
                  if (coachRect.left < -1 || coachRect.top < -1 || coachRect.right > innerWidth + 1 || coachRect.bottom > innerHeight + 1) {
                    output.push(`floating action label outside viewport ${Math.round(coachRect.left)},${Math.round(coachRect.top)}..${Math.round(coachRect.right)},${Math.round(coachRect.bottom)}`);
                  }
                  if (!latest || latest.textOverlaps !== 0) output.push(`floating action label crosses ${latest ? latest.textOverlaps : "unknown"} text rows`);
                  if (!latest || latest.connectorTextOverlaps !== 0) output.push(`action connector crosses ${latest ? latest.connectorTextOverlaps : "unknown"} text rows`);
                  const connector = document.querySelector(".coachmark-connector");
                  const path = connector && connector.querySelector("[data-coachmark-path]");
                  const endpoint = connector && connector.querySelector("[data-coachmark-endpoint]");
                  if (!latest || !latest.connectorVisible || !connector || connector.hidden || !path || !path.getAttribute("d") || !endpoint || endpoint.hasAttribute("hidden")) {
                    output.push("floating action label is missing its validated button connector");
                  }
                } else if (mode === "inline") {
                  const slot = coach.closest(".coachmark-inline-slot");
                  const connector = document.querySelector(".coachmark-connector:not([hidden])");
                  if (!slot || !slot.parentElement || !slot.parentElement.contains(activeTarget)) output.push("inline fallback is not positioned beside its action button");
                  if (connector) output.push("inline fallback retained a stale connector");
                } else {
                  output.push("active action label has no resolved placement mode");
                }
              }
            } else if (!activeTarget) {
              coachmarks.none += 1;
            }

            if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
              output.push(`page horizontal overflow ${document.documentElement.scrollWidth}/${document.documentElement.clientWidth}`);
            }
            if (root && root.scrollWidth > root.clientWidth + 1) {
              output.push(`product demo horizontal overflow ${root.scrollWidth}/${root.clientWidth}`);
            }
            if (surface && surface.scrollWidth > surface.clientWidth + 1) {
              output.push(`active surface horizontal overflow ${surface.scrollWidth}/${surface.clientWidth}`);
            }

            const textSelectors = [
              ".record-copy strong", ".record-copy span", ".record-value",
              ".live-card-title", ".receipt-detail dt", ".receipt-detail dd",
              ".mini-row > *", ".app-row > *", ".checkout-row > *",
              ".protocol-record-row > *", ".settlement-copy > *",
            ].join(",");
            root && root.querySelectorAll(textSelectors).forEach((element) => {
              if (!visible(element)) return;
              const text = (element.textContent || "").replace(/\s+/g, " ").trim();
              if (text.length < 4) return;
              const rect = element.getBoundingClientRect();
              const fontSize = parseFloat(getComputedStyle(element).fontSize) || 12;
              if (rect.width < Math.min(34, fontSize * 2.35) && rect.height > fontSize * 2.8) {
                output.push(`collapsed text ${Math.round(rect.width)}x${Math.round(rect.height)} ${label(element)}`);
              }
            });

            const overflowSelectors = [
              ".record-copy", ".record-value", ".receipt-detail", ".receipt-detail dd",
              ".live-card-title", ".live-field", ".mini-row", ".app-row",
              ".checkout-row", ".protocol-record-row", ".settlement-copy",
              ".ticket-summary", ".liquidity-preview", ".face-check", ".check-item",
              ".participant", ".leg-card", ".app-route-step", ".evidence-item",
            ].join(",");
            root && root.querySelectorAll(overflowSelectors).forEach((element) => {
              if (!visible(element)) return;
              const style = getComputedStyle(element);
              if (/auto|scroll/.test(style.overflowX)) return;
              if (element.scrollWidth > element.clientWidth + 2) {
                output.push(`clipped or escaping content ${element.scrollWidth}/${element.clientWidth} ${label(element)}`);
              }
            });

            if (surface) {
              const surfaceRect = surface.getBoundingClientRect();
              root.querySelectorAll(".live-card, .protocol-record").forEach((card) => {
                if (!visible(card)) return;
                const rect = card.getBoundingClientRect();
                if (rect.left < surfaceRect.left - 1 || rect.right > surfaceRect.right + 1) {
                  output.push(`card outside active surface ${Math.round(rect.left)}..${Math.round(rect.right)} ${label(card)}`);
                }
              });
            }

            root && root.querySelectorAll(".live-card:not(.block-record)").forEach((card) => {
              if (!visible(card)) return;
              const children = Array.from(card.children).filter((element) => {
                if (!visible(element)) return false;
                const style = getComputedStyle(element);
                return style.position !== "absolute" && style.position !== "fixed";
              });
              for (let i = 0; i < children.length; i += 1) {
                const a = children[i].getBoundingClientRect();
                for (let j = i + 1; j < children.length; j += 1) {
                  const b = children[j].getBoundingClientRect();
                  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                  if (overlapX > 3 && overlapY > 3) {
                    output.push(`card child overlap ${label(children[i])} <> ${label(children[j])}`);
                  }
                }
              }
            });

            root && root.querySelectorAll(".activity-record > summary").forEach((summary) => {
              if (!visible(summary)) return;
              const children = Array.from(summary.children).filter(visible);
              for (let i = 0; i < children.length; i += 1) {
                const a = children[i].getBoundingClientRect();
                for (let j = i + 1; j < children.length; j += 1) {
                  const b = children[j].getBoundingClientRect();
                  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                  if (overlapX > 2 && overlapY > 2) {
                    output.push(`record summary overlap ${label(children[i])} <> ${label(children[j])}`);
                  }
                }
              }
            });

            root && root.querySelectorAll("button, a, summary, input, textarea").forEach((element) => {
              if (!visible(element)) return;
              const rect = element.getBoundingClientRect();
              if (rect.right > innerWidth + 1 || rect.left < -1) {
                output.push(`interactive control outside viewport ${Math.round(rect.left)}..${Math.round(rect.right)} ${label(element)}`);
              }
            });
            return Array.from(new Set(output));
        };

        stageList.forEach((current) => {
          for (let step = 0; step <= current.steps; step += 1) {
            window.__layoutAudit.goTo(current.index, step);
            auditCurrentState().forEach((issue) => {
              results.push({ current, step, issue });
            });
          }
        });
        return { results, coachmarks };
      }, stages);
      checks += stages.reduce((total, current) => total + current.steps + 1, 0);
      Object.keys(coachmarkModes).forEach((mode) => {
        coachmarkModes[mode] += viewportAudit.coachmarks[mode] || 0;
      });
      viewportAudit.results.forEach(({ current, step, issue }) => {
        failures.push(`${viewport.label} event ${String(current.index + 1).padStart(2, "0")} step ${step}/${current.steps} (${current.title}): ${issue}`);
      });

      const productViewIssues = await page.evaluate(() => {
        const issues = [];
        const visible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return !element.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        };
        ["all", "omen", "demothemis"].forEach((focus) => {
          const root = document.getElementById("systemStateMachine");
          const focusButton = root.querySelector(`[data-machine-focus="${focus}"]`);
          if (focusButton) focusButton.click();
          const states = Array.from(root.querySelectorAll(".machine-state"));
          const visibleStates = states.filter(visible);
          const selected = root.querySelector(`[data-machine-focus="${focus}"][aria-checked="true"]`);
          if (!selected) issues.push(`${focus}: selected product radio is missing`);
          if (!visibleStates.length) issues.push(`${focus}: product view contains no visible states`);
          if (focus !== "all" && visibleStates.some((state) => ![focus, "shared"].includes(state.dataset.owner))) {
            issues.push(`${focus}: another product remains visible`);
          }
          if (focus !== "all" && !visibleStates.some((state) => state.dataset.owner === "shared")) {
            issues.push(`${focus}: shared handoffs disappeared`);
          }
          if (root.scrollWidth > root.clientWidth + 1) {
            const rootRect = root.getBoundingClientRect();
            const culprits = Array.from(root.querySelectorAll("*")).filter(visible).map((element) => {
              const rect = element.getBoundingClientRect();
              const escapes = rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1;
              const scrolls = element.scrollWidth > element.clientWidth + 1;
              if (!escapes && !scrolls) return null;
              return `${element.tagName.toLowerCase()}.${Array.from(element.classList).join(".")}[${Math.round(rect.width)}:${element.scrollWidth}/${element.clientWidth}]`;
            }).filter(Boolean).slice(0, 4);
            issues.push(`${focus}: state map horizontal overflow ${root.scrollWidth}/${root.clientWidth}${culprits.length ? ` via ${culprits.join(", ")}` : ""}`);
          }
          root.querySelectorAll("button:not([hidden])").forEach((button) => {
            const rect = button.getBoundingClientRect();
            if (rect.left < -1 || rect.right > innerWidth + 1) issues.push(`${focus}: visible map button outside viewport`);
          });
        });
        const allButton = document.querySelector('[data-machine-focus="all"]');
        if (allButton) allButton.click();
        return Array.from(new Set(issues));
      });
      checks += 3;
      productViewIssues.forEach((issue) => failures.push(`${viewport.label} product filter: ${issue}`));
    }

    if (process.env.RUN_THROUGH_LAYOUT_PROOF === "1") {
      const proofDir = path.join(ROOT, "artifacts", "run-through-layout");
      fs.mkdirSync(proofDir, { recursive: true });
      for (const viewport of [VIEWPORTS[0], VIEWPORTS[9]]) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.evaluate(() => window.__layoutAudit.goTo(1, 2));
        const geometry = await page.evaluate(() => {
          const rect = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const box = element.getBoundingClientRect();
            return {
              selector,
              top: Math.round(box.top),
              bottom: Math.round(box.bottom),
              width: Math.round(box.width),
              height: Math.round(box.height),
              scrollHeight: element.scrollHeight,
              clientHeight: element.clientHeight,
            };
          };
          return [
            rect("#productDemo"),
            rect(".sim-live-preview"),
            rect(".sim-app-viewport"),
            rect("#system-state-machine"),
          ];
        });
        console.log(`Proof geometry ${viewport.width}px: ${JSON.stringify(geometry)}`);
        await page.locator(".sim-live-preview").screenshot({
          path: path.join(proofDir, `event-02-order-record-${viewport.width}px.png`),
        });
      }
      console.log(`Saved visual proofs to ${proofDir}.`);
    }

    console.log(`Audited ${checks} rendered run-through states across ${VIEWPORTS.length} viewport sizes.`);
    console.log(`Action-label placements: ${coachmarkModes.floating} floating, ${coachmarkModes.inline} inline fallback, ${coachmarkModes.none} states without an active action.`);
    if (failures.length) {
      console.error(`${failures.length} layout issue(s):`);
      unique(failures).forEach((failure) => console.error(`- ${failure}`));
      process.exitCode = 1;
    } else {
      console.log("Run-through layout audit passed.");
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
