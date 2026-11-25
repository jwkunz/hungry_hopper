#!/usr/bin/env node
// The project's version lives in one file, VERSION, at the repository root.
//   - the Android build reads it directly (versionName, and versionCode = major*10000 + minor*100 + patch);
//   - the web build takes its version from web/package.json (and web/package-lock.json), which this script keeps in step.
//
//   node scripts/version.mjs                 print the version
//   node scripts/version.mjs set 3.1.0       change the version everywhere
//   node scripts/version.mjs check [tag]     fail if anything disagrees (and if `tag`, e.g. v3.1.0, is not this version)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));
const SEMVER = /^\d+\.\d+\.\d+$/;

export const currentVersion = () => read('VERSION').trim();

function mismatches(version) {
  const bad = [];
  const pkg = readJson('web/package.json');
  if (pkg.version !== version) bad.push(`web/package.json says ${pkg.version}`);
  const lock = readJson('web/package-lock.json');
  if (lock.version !== version) bad.push(`web/package-lock.json says ${lock.version}`);
  if (lock.packages?.['']?.version !== version) bad.push(`web/package-lock.json root package says ${lock.packages?.['']?.version}`);
  if (!/rootProject\.file\("\.\.\/VERSION"\)/.test(read('Android/app/build.gradle.kts'))) bad.push('Android/app/build.gradle.kts does not read VERSION');
  return bad;
}

function setJsonVersion(path, version) {
  const j = readJson(path);
  j.version = version;
  if (j.packages?.['']) j.packages[''].version = version;
  writeFileSync(join(root, path), `${JSON.stringify(j, null, 2)}\n`);
}

const [cmd, arg] = process.argv.slice(2);
if (!cmd) {
  console.log(currentVersion());
} else if (cmd === 'set') {
  if (!SEMVER.test(arg || '')) { console.error('Usage: node scripts/version.mjs set MAJOR.MINOR.PATCH'); process.exit(2); }
  writeFileSync(join(root, 'VERSION'), `${arg}\n`);
  setJsonVersion('web/package.json', arg);
  setJsonVersion('web/package-lock.json', arg);
  console.log(`Version is now ${arg} (VERSION, web/package.json and web/package-lock.json).`);
} else if (cmd === 'check') {
  const v = currentVersion();
  const problems = SEMVER.test(v) ? mismatches(v) : [`VERSION is "${v}", expected MAJOR.MINOR.PATCH`];
  if (arg && arg !== `v${v}`) problems.push(`the tag ${arg} does not match VERSION ${v} (expected v${v})`);
  if (problems.length) { console.error(`Version problems:\n  - ${problems.join('\n  - ')}`); process.exit(1); }
  console.log(`All version files agree: ${v}${arg ? ` (tag ${arg})` : ''}`);
} else {
  console.error('Usage: node scripts/version.mjs [set X.Y.Z | check [tag]]'); process.exit(2);
}
