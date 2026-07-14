import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAddress, keccak256 } from 'viem';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const casesRoot = path.join(webRoot, 'public', 'cases');
const queueRoot = path.join(casesRoot, 'queue');
const manifestPath = path.join(casesRoot, 'question-queue.json');

const requiredCaseKeys = [
  'sequence',
  'title',
  'type',
  'standard',
  'question',
  'yesRule',
  'judgedAsOf',
  'simulated',
].sort();
const requiredEntryKeys = ['sequence', 'slug', 'uri', 'criteriaHash', 'title'].sort();
const forbiddenKeyPart = /(answer|evidence|private|source|url)/i;
const urlPattern = /(?:https?:\/\/|www\.)/i;
const isoUtcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const errors = [];

const fail = (message) => errors.push(message);
const sameKeys = (value, keys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify(keys);

const parseJson = async (filePath, label) => {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    fail(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
};

const findForbiddenContent = (value, location) => {
  if (typeof value === 'string') {
    if (urlPattern.test(value)) fail(`${location}: URLs are not allowed`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenContent(item, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeyPart.test(key)) fail(`${location}.${key}: forbidden field`);
    findForbiddenContent(child, `${location}.${key}`);
  }
};

const manifest = await parseJson(manifestPath, 'question-queue.json');
if (manifest) {
  if (manifest.version !== 1) fail('manifest.version must be 1');
  if (manifest.policy !== 'one-active-at-a-time') {
    fail('manifest.policy must be one-active-at-a-time');
  }
  if (typeof manifest.officialOpener !== 'string' || !isAddress(manifest.officialOpener)) {
    fail('manifest.officialOpener must be a valid address');
  }
  if (!Array.isArray(manifest.questions) || manifest.questions.length !== 21) {
    fail('manifest.questions must contain exactly 21 entries');
  }
}

const entries = Array.isArray(manifest?.questions) ? manifest.questions : [];
const files = (await readdir(queueRoot)).filter((file) => file.endsWith('.json')).sort();
if (files.length !== 21) fail(`queue folder must contain exactly 21 JSON files; found ${files.length}`);

const seenSlugs = new Set();
for (let index = 0; index < entries.length; index += 1) {
  const expectedSequence = index + 1;
  const entry = entries[index];
  const location = `manifest.questions[${index}]`;

  if (!sameKeys(entry, requiredEntryKeys)) {
    fail(`${location}: fields must be sequence, slug, uri, criteriaHash, title`);
  }
  if (entry.sequence !== expectedSequence) fail(`${location}.sequence must be ${expectedSequence}`);
  if (typeof entry.slug !== 'string' || !/^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) {
    fail(`${location}.slug is invalid`);
    continue;
  }
  if (seenSlugs.has(entry.slug)) fail(`${location}.slug is duplicated`);
  seenSlugs.add(entry.slug);

  const expectedUri = `/cases/queue/${entry.slug}.json`;
  if (entry.uri !== expectedUri) fail(`${location}.uri must be ${expectedUri}`);
  if (typeof entry.title !== 'string' || entry.title.trim().length < 3) fail(`${location}.title is invalid`);

  const fileName = `${entry.slug}.json`;
  if (!files.includes(fileName)) {
    fail(`${location}: missing ${fileName}`);
    continue;
  }

  const filePath = path.join(queueRoot, fileName);
  const fileBytes = await readFile(filePath);
  const expectedHash = keccak256(new Uint8Array(fileBytes));
  if (entry.criteriaHash !== expectedHash) {
    fail(`${location}.criteriaHash must match the exact bytes of ${fileName}`);
  }

  const caseData = await parseJson(filePath, fileName);
  if (!caseData) continue;
  if (!sameKeys(caseData, requiredCaseKeys)) {
    fail(`${fileName}: fields must be ${requiredCaseKeys.join(', ')}`);
  }
  if (caseData.sequence !== expectedSequence) fail(`${fileName}: sequence must be ${expectedSequence}`);
  if (caseData.title !== entry.title) fail(`${fileName}: title must match the manifest`);
  if (caseData.type !== 'question') fail(`${fileName}: type must be question`);
  if (caseData.standard !== 'public-research') fail(`${fileName}: standard must be public-research`);
  if (caseData.simulated !== false) fail(`${fileName}: simulated must be false`);
  if (typeof caseData.question !== 'string' || !caseData.question.trim().endsWith('?')) {
    fail(`${fileName}: question must be a non-empty question`);
  }
  if (typeof caseData.yesRule !== 'string' || !/^Vote YES only if /.test(caseData.yesRule)) {
    fail(`${fileName}: yesRule must begin with \"Vote YES only if \"`);
  }
  if (
    typeof caseData.judgedAsOf !== 'string' ||
    !isoUtcPattern.test(caseData.judgedAsOf) ||
    Number.isNaN(Date.parse(caseData.judgedAsOf))
  ) {
    fail(`${fileName}: judgedAsOf must be a valid ISO UTC timestamp`);
  }
  findForbiddenContent(caseData, fileName);
}

for (const file of files) {
  const slug = file.slice(0, -'.json'.length);
  if (!seenSlugs.has(slug)) fail(`${file}: file is not listed in the manifest`);
}

if (errors.length > 0) {
  console.error(`Question queue validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('PASS  question queue manifest');
  console.log('PASS  exact file hashes and fixed official opener');
  console.log('PASS  21 sequential public-research cases');
  console.log('PASS  no evidence, sources, URLs, answers, or private fields');
}
