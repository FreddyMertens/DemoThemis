// Builds a self-contained grant-review portal by inlining the real docs into the shell.
// Run from anywhere:  node docs/grant-portal/build.mjs
// Re-run after editing any source doc to refresh the portal.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const docs = join(repo, 'docs');

// Ordered manifest. `file` is resolved against repo root. Groups render in first-seen order.
const MANIFEST = [
  { id:'application', title:'Grant application',      group:'The application', badge:'done',
    file:join(docs,'GRANT_APPLICATION.md'), source:'docs/GRANT_APPLICATION.md',
    desc:'The 12-section submission copy — led by on-chain World ID and hardened against reviewer rebuttals.' },
  { id:'budget', title:'Budget & milestones',         group:'The application', badge:'done',
    file:join(docs,'GRANT_BUDGET.md'), source:'docs/GRANT_BUDGET.md',
    desc:'The priced $50k / 3-month plan: $14k Spark + $36k Scale, with user-testing (M6) as the largest line.' },

  { id:'differentiation', title:'Differentiation',    group:'Positioning',
    file:join(docs,'DIFFERENTIATION.md'), source:'docs/DIFFERENTIATION.md',
    desc:'The dated competitive scan: personhood-gated juries vs stake-weighted courts, with rebuttals handled.' },
  { id:'mechanism', title:'Real vs roadmap',          group:'Positioning',
    file:join(docs,'MECHANISM_DELTA.md'), source:'docs/MECHANISM_DELTA.md',
    desc:"Exactly what's on-chain today vs. what each funded milestone adds — the honesty map." },

  { id:'review', title:'Independent review',          group:'Diligence',
    file:join(docs,'INDEPENDENT_REVIEW.md'), source:'docs/INDEPENDENT_REVIEW.md',
    desc:'Adversarial multi-agent audit: verified strengths, weak spots, and the critical path to submission.' },
  { id:'readiness', title:'Readiness audit',          group:'Diligence',
    file:join(docs,'GRANT_READINESS.md'), source:'docs/GRANT_READINESS.md',
    desc:"The team's own rubric-by-rubric readiness assessment and what's left." },

  { id:'readme', title:'Project README',              group:'The live build',
    file:join(repo,'README.md'), source:'README.md',
    desc:"What's real on-chain, the World stack usage, and the deployed addresses." },
  { id:'demo', title:'Demo — on-chain evidence',      group:'The live build',
    file:join(docs,'DEMO.md'), source:'docs/DEMO.md',
    desc:'Clickable explorer traces: real World ID enforcement, the Sepolia cohort, and the pending capstone.' },
  { id:'capstone', title:'Capstone runbook',          group:'The live build', badge:'pending',
    file:join(docs,'CAPSTONE_RUNBOOK.md'), source:'docs/CAPSTONE_RUNBOOK.md',
    desc:'The operational checklist for the 3-human mainnet go-live.' },
];

const attr = (s) => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

let blocks = '';
let n = 0;
for (const d of MANIFEST) {
  let md;
  try { md = readFileSync(d.file, 'utf8'); }
  catch (e) { console.error('  ! missing, skipped:', d.source); continue; }
  // defensive: a literal </script> inside the doc would close the block early
  md = md.replace(/<\/script>/gi, '<\\/script>');
  blocks += `<script type="text/markdown" data-id="${attr(d.id)}" data-title="${attr(d.title)}" `
          + `data-group="${attr(d.group)}" data-badge="${attr(d.badge||'')}" `
          + `data-source="${attr(d.source)}" data-desc="${attr(d.desc||'')}">\n${md}\n</script>\n`;
  n++;
}

// Standalone HTML pages embedded via iframe (copied into the portal dir so the server serves them as siblings).
const HTML_ASSETS = [
  { id:'storyboard', title:'Demo video storyboard', group:'The live build', file:'storyboard.html',
    src:join(docs,'storyboard.html'), desc:'Shot-by-shot plan for the 3–4 minute demo video (hook → mainnet flow → scale history).' },
];
const htmlMeta = [];
for (const a of HTML_ASSETS) {
  try { copyFileSync(a.src, join(here, a.file)); htmlMeta.push({ id:a.id, title:a.title, group:a.group, file:a.file, desc:a.desc }); n++; }
  catch (e) { console.error('  ! asset missing, skipped:', a.src); }
}
blocks += `<script>window.__HTML_DOCS__ = ${JSON.stringify(htmlMeta)};</script>\n`;

const shell = readFileSync(join(here, '_shell.html'), 'utf8');
const stamp = new Date().toISOString().slice(0, 10);
const out = shell
  .replace('<!--DOCS_SCRIPTS-->', blocks)
  .replace('>generated locally<', `>built ${stamp}<`);

writeFileSync(join(here, 'index.html'), out);
console.log(`✓ built docs/grant-portal/index.html  (${n} docs, ${(out.length/1024).toFixed(0)} KB)`);
