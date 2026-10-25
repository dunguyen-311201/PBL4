// Fails when a tracked file contains Vietnamese text (AGENTS.md › Language).
//
// Files still waiting for translation are listed in .language-allowlist. The list may only
// shrink: an entry whose file no longer contains Vietnamese is also an error, so every
// translation task has to remove the entries it finished.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

// Letters used in Vietnamese but not in English, as code-point ranges so that this file
// contains none of them itself.
const RANGES = [
  [0xe0, 0xe3],
  [0xe8, 0xea],
  [0xec, 0xed],
  [0xf2, 0xf5],
  [0xf9, 0xfa],
  [0xfd, 0xfd],
  [0x103, 0x103],
  [0x111, 0x111],
  [0x129, 0x129],
  [0x169, 0x169],
  [0x1a1, 0x1a1],
  [0x1b0, 0x1b0],
  [0x1ea1, 0x1ef9],
];
const hex = (n) => `\\u{${n.toString(16)}}`;
const VIETNAMESE = new RegExp(`[${RANGES.map(([a, b]) => `${hex(a)}-${hex(b)}`).join('')}]`, 'iu');
const IGNORED = [
  /^legacy\//, // frozen 2021 code
  /^pnpm-lock\.yaml$/,
  /\.(png|jpe?g|gif|ico|pdf|woff2?)$/i,
  /^\.ai\/translation-glossary\.md$/, // source terms by design; deleted by T-009
];
const ALLOWLIST_FILE = '.language-allowlist';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter((f) => f !== '' && !IGNORED.some((re) => re.test(f)));

const allowlist = existsSync(ALLOWLIST_FILE)
  ? new Set(
      readFileSync(ALLOWLIST_FILE, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== '' && !l.startsWith('#')),
    )
  : new Set();

const errors = [];
for (const file of tracked) {
  if (!existsSync(file)) continue;
  const hits = readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, i) => (VIETNAMESE.test(line) ? [i + 1] : []));

  if (allowlist.has(file)) {
    if (hits.length === 0) errors.push(`${file}: translated — remove it from ${ALLOWLIST_FILE}`);
  } else if (hits.length > 0) {
    const shown = hits.slice(0, 5).join(', ') + (hits.length > 5 ? ', …' : '');
    errors.push(`${file}: Vietnamese text on line ${shown}`);
  }
}
for (const entry of allowlist) {
  if (!tracked.includes(entry)) errors.push(`${ALLOWLIST_FILE}: "${entry}" is not a tracked file`);
}

if (errors.length > 0) {
  process.stderr.write(`Language check failed (everything in this repo is English):\n`);
  for (const e of errors) process.stderr.write(`  ${e}\n`);
  process.exit(1);
}
const pending = allowlist.size > 0 ? ` (${allowlist.size} file(s) still on ${ALLOWLIST_FILE})` : '';
process.stdout.write(`Language check passed${pending}.\n`);
