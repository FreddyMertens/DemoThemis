const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

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
    await page.goto(`${RUN_THROUGH_URL}?layoutAudit=1`, { waitUntil: "load" });
    const stages = await page.evaluate(() => window.__layoutAudit.stages());

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const viewportResults = await page.evaluate((stageList) => {
        const results = [];
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
        return results;
      }, stages);
      checks += stages.reduce((total, current) => total + current.steps + 1, 0);
      viewportResults.forEach(({ current, step, issue }) => {
        failures.push(`${viewport.label} event ${String(current.index + 1).padStart(2, "0")} step ${step}/${current.steps} (${current.title}): ${issue}`);
      });
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
