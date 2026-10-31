import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateTokens, validateTokens } from '../scripts/token-model.mjs';

const root = new URL('../', import.meta.url);
const source = JSON.parse(await readFile(new URL('tokens.json', root), 'utf8'));
const generated = generateTokens(source);
assert.equal(await readFile(new URL('tokens.css', root), 'utf8'), generated.css, 'generated CSS must match source');
assert.equal(await readFile(new URL('tokens.js', root), 'utf8'), generated.js, 'generated JS must match source');

const invalid = [
  ['invalid theme color', t => { t.themes.light.text = 'red'; }],
  ['missing dark token', t => { delete t.themes.dark.field; }],
  ['invalid CSS name', t => { t.spacing['space;bad'] = '10px'; }],
  ['invalid dimension', t => { t.controls.md = 'large'; }],
  ['invalid opacity', t => { t.opacity.disabled = 2; }],
  ['invalid weight', t => { t.typography.weights.regular = 2000; }],
  ['invalid line height', t => { t.typography.lineHeights.body = 0; }],
  ['unknown preset reference', t => { t.typography.presets.body.size = 'missing'; }],
  ['invalid duration', t => { t.motion.normal = 'slow'; }],
  ['CSS declaration injection', t => { t.shadows.md = 'none; color:red'; }],
  ['invalid layer', t => { t.layers.modal = -1; }],
  ['invalid version', t => { t.version = 'next'; }],
  ['missing required token', t => { delete t.colors.accent; }],
  ['missing density mode', t => { delete t.density.compact; }],
  ['missing density role', t => { delete t.density.default['row-height']; }],
  ['invalid density length', t => { t.density.compact['control-height'] = 'small'; }],
  ['mismatched density roles', t => { t.density.compact.extra = '1px'; }],
  ['unknown font family', t => { t.typography.presets.code.family = 'missing'; }],
  ['unknown density mode', t => { t.density['bad-mode'] = t.density.default; }],
  ['zero density control', t => { t.density.compact['control-height'] = '0px'; }]
];
for (const [name, change] of invalid) {
  const value = structuredClone(source);
  change(value);
  assert.throws(() => validateTokens(value), TypeError, name);
}

const declared = new Set([...generated.css.matchAll(/(--ui-[\w-]+):/g)].map(match => match[1]));
for (const file of ['ui-kit.css', 'catalog.css']) {
  const css = await readFile(new URL(file, root), 'utf8');
  for (const [, name] of css.matchAll(/var\((--ui-[\w-]+)/g)) assert(declared.has(name), file + ': missing token ' + name);
}
console.log('PASS token generation, ' + invalid.length + ' invalid-schema cases, and all CSS token references');
