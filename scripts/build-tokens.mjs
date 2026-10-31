import { readFile, writeFile } from 'node:fs/promises';
import { generateTokens } from './token-model.mjs';

const root = new URL('../', import.meta.url);
const tokens = JSON.parse(await readFile(new URL('tokens.json', root), 'utf8'));
const result = generateTokens(tokens);
if (process.argv.includes('--check')) {
  for (const [file, expected] of [['tokens.css', result.css], ['tokens.js', result.js]]) {
    if (await readFile(new URL(file, root), 'utf8') !== expected) throw new Error(file + ' is outdated; run node scripts/build-tokens.mjs');
  }
  console.log('Token schema and generated files are valid');
} else {
  await writeFile(new URL('tokens.css', root), result.css);
  await writeFile(new URL('tokens.js', root), result.js);
  console.log('Generated tokens.css and tokens.js');
}
