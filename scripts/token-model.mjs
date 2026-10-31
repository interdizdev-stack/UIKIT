const hex = /^#[0-9a-f]{6}$/i;
const length = /^(?:\d+(?:\.\d+)?)(?:px|rem|em|%)$/;
const safe = value => typeof value === 'string' && value.length > 0 && !/[;{}<>\n]/.test(value);

export function validateTokens(tokens) {
  const errors = [];
  const requireValue = (valid, path) => { if (!valid) errors.push(path); };
  const record = (object, path, test) => {
    if (!object || typeof object !== 'object' || Array.isArray(object) || !Object.keys(object).length) { errors.push(path); return; }
    for (const [key, value] of Object.entries(object)) {
      requireValue(/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(key) && test(value), path + '.' + key);
    }
  };
  requireValue(safe(tokens?.name), 'name');
  requireValue(typeof tokens?.version === 'string' && /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(tokens.version), 'version');
  record(tokens?.colors, 'colors', value => typeof value === 'string' && hex.test(value));
  const requiredGroups = {
    colors: ['accent', 'accent-hover', 'accent-active', 'ink', 'white', 'danger-fill', 'danger-hover'],
    spacing: ['1', '2', '3', '4', '5', '6', '7'], radius: ['sm', 'md', 'lg'],
    motion: ['fast', 'normal'], easing: ['standard'], shadows: ['sm', 'md', 'lg'],
    layers: ['dropdown', 'cookie', 'offcanvas', 'modal', 'select', 'tooltip'],
    controls: ['sm', 'md', 'lg', 'field', 'icon'], icons: ['sm', 'md', 'lg', 'xl'],
    opacity: ['disabled', 'muted', 'tint'], layout: ['container', 'reading', 'gutter', 'section', 'section-mobile'],
    borders: ['width', 'focus-width', 'focus-offset']
  };
  for (const [group, keys] of Object.entries(requiredGroups)) {
    for (const key of keys) requireValue(tokens?.[group]?.[key] !== undefined, group + '.' + key);
  }
  const themeKeys = ['bg', 'surface', 'field', 'text', 'muted', 'border', 'border-control', 'subtle', 'accent-text', 'success', 'warning', 'danger', 'info'];
  for (const theme of ['light', 'dark']) {
    const values = tokens?.themes?.[theme];
    record(values, 'themes.' + theme, value => typeof value === 'string' && hex.test(value));
    for (const key of themeKeys) requireValue(values?.[key] !== undefined, 'themes.' + theme + '.' + key);
  }
  if (tokens?.themes?.light && tokens?.themes?.dark) {
    requireValue(Object.keys(tokens.themes.light).sort().join() === Object.keys(tokens.themes.dark).sort().join(), 'themes: matching keys');
  }
  const type = tokens?.typography;
  requireValue(safe(type?.body), 'typography.body');
  requireValue(safe(type?.heading), 'typography.heading');
  requireValue(safe(type?.mono), 'typography.mono');
  record(type?.sizes, 'typography.sizes', value => typeof value === 'string' && length.test(value) && parseFloat(value) > 0);
  record(type?.weights, 'typography.weights', value => Number.isInteger(value) && value >= 100 && value <= 900);
  record(type?.lineHeights, 'typography.lineHeights', value => typeof value === 'number' && value >= 1 && value <= 3);
  record(type?.letterSpacing, 'typography.letterSpacing', value => value === '0' || (typeof value === 'string' && /^-?\d*\.?\d+(?:em|px)$/.test(value)));
  record(type?.presets, 'typography.presets', value => value && ['body', 'heading', 'mono'].includes(value.family) &&
    type.sizes?.[value.size] !== undefined && type.weights?.[value.weight] !== undefined &&
    type.lineHeights?.[value.lineHeight] !== undefined && type.letterSpacing?.[value.letterSpacing] !== undefined &&
    (!value.minSize || type.sizes?.[value.minSize] !== undefined));
  for (const group of ['spacing', 'radius', 'controls', 'icons', 'layout', 'borders']) {
    record(tokens?.[group], group, value => typeof value === 'string' && length.test(value));
  }
  record(tokens?.shadows, 'shadows', safe);
  record(tokens?.layers, 'layers', value => Number.isInteger(value) && value >= 0);
  record(tokens?.opacity, 'opacity', value => typeof value === 'number' && value >= 0 && value <= 1);
  record(tokens?.motion, 'motion', value => typeof value === 'string' && /^\d+(?:\.\d+)?(?:ms|s)$/.test(value));
  record(tokens?.easing, 'easing', value => safe(value) && /^(?:linear|ease(?:-in|-out|-in-out)?|cubic-bezier\([\d.,\s-]+\))$/.test(value));
  const densityKeys = ['control-height', 'control-font-size', 'control-padding-x', 'button-padding-x', 'row-height', 'table-padding-y', 'list-padding-y', 'avatar-size', 'menu-height', 'surface-padding', 'stack-gap', 'field-gap', 'chip-height'];
  requireValue(Object.keys(tokens?.density || {}).sort().join() === 'compact,default', 'density: known modes');
  for (const mode of ['default', 'compact']) {
    record(tokens?.density?.[mode], 'density.' + mode, value => typeof value === 'string' && length.test(value));
    for (const key of densityKeys) requireValue(tokens?.density?.[mode]?.[key] !== undefined, 'density.' + mode + '.' + key);
    for (const key of ['control-height', 'control-font-size', 'row-height', 'avatar-size', 'menu-height', 'chip-height']) requireValue(parseFloat(tokens?.density?.[mode]?.[key]) > 0, 'density.' + mode + '.' + key + ': positive');
  }
  if (tokens?.density?.default && tokens?.density?.compact) requireValue(Object.keys(tokens.density.default).sort().join() === Object.keys(tokens.density.compact).sort().join(), 'density: matching keys');
  if (errors.length) throw new TypeError('Invalid design tokens: ' + errors.join(', '));
  return tokens;
}

const declarations = (entries, prefix = '') => Object.entries(entries).map(([name, value]) => `  --ui-${prefix}${name}: ${value};`).join('\n');
const rgb = values => Object.fromEntries(Object.entries(values).map(([name, value]) => [name + '-rgb', value.slice(1).match(/.{2}/g).map(part => parseInt(part, 16)).join(', ')]));
const themeDeclarations = theme => declarations(theme) + '\n' + declarations(rgb(theme));

export function generateTokens(input) {
  const tokens = validateTokens(input);
  const type = tokens.typography;
  const presets = Object.entries(type.presets).flatMap(([name, preset]) => {
    const values = {
      'font-family': type[preset.family], 'font-size': type.sizes[preset.size],
      'font-weight': type.weights[preset.weight], 'line-height': type.lineHeights[preset.lineHeight],
      'letter-spacing': type.letterSpacing[preset.letterSpacing]
    };
    if (preset.minSize) values['min-size'] = type.sizes[preset.minSize];
    return [declarations(values, 'type-' + name + '-')];
  });
  const css = [
    '/* Generated from tokens.json with node scripts/build-tokens.mjs. */', ':root {',
    declarations(tokens.colors, 'color-'), declarations(rgb(tokens.colors), 'color-'),
    declarations(tokens.spacing, 'space-'), declarations(tokens.radius, 'radius-'),
    declarations(tokens.motion, 'motion-'), declarations(tokens.easing, 'ease-'),
    declarations(type.sizes, 'font-size-'), declarations(type.weights, 'font-weight-'),
    declarations(type.lineHeights, 'line-height-'), declarations(type.letterSpacing, 'letter-spacing-'),
    `  --ui-font-body: ${type.body};`, `  --ui-font-heading: ${type.heading};`, ...presets,
    declarations(tokens.shadows, 'shadow-'), declarations(tokens.layers, 'z-'),
    declarations(tokens.controls, 'control-'), declarations(tokens.icons, 'icon-'),
    declarations(tokens.opacity, 'opacity-'), declarations(tokens.layout, 'layout-'),
    declarations(tokens.borders, 'border-'), declarations(tokens.density.default, 'density-'), themeDeclarations(tokens.themes.light), '}',
    '[data-bs-theme="light"] {', themeDeclarations(tokens.themes.light), '}',
    '[data-bs-theme="dark"] {', themeDeclarations(tokens.themes.dark), '}',
    ...Object.entries(tokens.density).flatMap(([mode, values]) => [`[data-ui-density="${mode}"] {`, declarations(values, 'density-'), '}']), ''
  ].join('\n');
  return { css, js: `/* Generated from tokens.json. */\nwindow.BrandTokens = ${JSON.stringify(tokens, null, 2)};\n` };
}
