// Builds a self-contained grant-review portal by inlining the real docs into the shell.
// Run from anywhere:  node docs/grant-portal/build.mjs
// Re-run after editing any source doc to refresh the portal.
import { readFileSync, writeFileSync, copyFileSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const docs = join(repo, 'docs');

// Ordered manifest. `file` is resolved against repo root. Groups render in first-seen order.
const MANIFEST = [
  { id:'application', title:'Grant application',      group:'The application', badge:'done',
    file:join(docs,'GRANT_APPLICATION.md'), source:'docs/GRANT_APPLICATION.md',
    desc:'The 12-section submission copy — led by the on-chain World ID 4 Production verifier and hardened against reviewer rebuttals.' },
  { id:'budget', title:'Budget & milestones',         group:'The application', badge:'done',
    file:join(docs,'GRANT_BUDGET.md'), source:'docs/GRANT_BUDGET.md',
    desc:'One milestone-gated $50k / 3-month request that completes the production-ready DemoThemis v1.' },

  { id:'differentiation', title:'Differentiation',    group:'Positioning',
    file:join(docs,'DIFFERENTIATION.md'), source:'docs/DIFFERENTIATION.md',
    desc:'The dated competitive scan: personhood-gated juries vs stake-weighted courts, with rebuttals handled.' },
  { id:'mechanism', title:'MVP vs roadmap',           group:'Positioning',
    file:join(docs,'MECHANISM_DELTA.md'), source:'docs/MECHANISM_DELTA.md',
    desc:"The current MVP capability boundary and what each funded milestone adds." },

  { id:'review', title:'Independent review',          group:'Diligence',
    file:join(docs,'INDEPENDENT_REVIEW.md'), source:'docs/INDEPENDENT_REVIEW.md',
    desc:'Adversarial multi-agent audit: verified strengths, weak spots, and the critical path to submission.' },
  { id:'readiness', title:'Readiness audit',          group:'Diligence',
    file:join(docs,'GRANT_READINESS.md'), source:'docs/GRANT_READINESS.md',
    desc:"The team's own rubric-by-rubric readiness assessment and what's left." },
  { id:'liveness', title:'Case liveness recovery',   group:'Diligence', badge:'done',
    file:join(docs,'LIVENESS_RECOVERY.md'), source:'docs/LIVENESS_RECOVERY.md',
    desc:'Eligible-party preflight, first-draw fee/principal unwind, no-show recovery, and immutable timing in the current MVP.' },

  { id:'readme', title:'Project README',              group:'The live build',
    file:join(repo,'README.md'), source:'README.md',
    desc:"How to run the current MVP, what it implements, and how the funded roadmap remains clearly separated." },
  { id:'demo', title:'Demo — on-chain evidence',      group:'The live build',
    file:join(docs,'DEMO.md'), source:'docs/DEMO.md',
    desc:'Developer evidence for the v4 Staging test, cohort run, and current v4 Production-gated MVP.' },
  { id:'capstone', title:'Capstone runbook',          group:'The live build', badge:'pending',
    file:join(docs,'CAPSTONE_RUNBOOK.md'), source:'docs/CAPSTONE_RUNBOOK.md',
    desc:'The operational checklist for a three-seat / at-least-four-human current MVP evidence run.' },
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
    src:join(docs,'storyboard.html'), desc:'A complete recording plan with the team, Run-through, one document tour including Break the Court, an honest live-versus-funded scope slide, a seven-stage MVP walkthrough, and the two closing challenges.' },
];
const htmlMeta = [];
for (const a of HTML_ASSETS) {
  try { copyFileSync(a.src, join(here, a.file)); htmlMeta.push({ id:a.id, title:a.title, group:a.group, file:a.file, desc:a.desc }); n++; }
  catch (e) { console.error('  ! asset missing, skipped:', a.src); }
}
try { cpSync(join(docs, 'storyboard-assets'), join(here, 'storyboard-assets'), { recursive:true, force:true }); }
catch (e) { console.error('  ! storyboard assets missing, skipped:', join(docs, 'storyboard-assets')); }
blocks += `<script>window.__HTML_DOCS__ = ${JSON.stringify(htmlMeta)};</script>\n`;

const shell = readFileSync(join(here, '_shell.html'), 'utf8');
const stamp = new Date().toISOString().slice(0, 10);
const out = shell
  .replace('<!--DOCS_SCRIPTS-->', blocks)
  .replace('>generated locally<', `>built ${stamp}<`);

writeFileSync(join(here, 'index.html'), out);
console.log(`✓ built docs/grant-portal/index.html  (${n} docs, ${(out.length/1024).toFixed(0)} KB)`);
