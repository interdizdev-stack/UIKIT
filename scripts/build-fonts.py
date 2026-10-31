#!/usr/bin/env python3
"""Optional maintainer conversion: requires fonttools==4.66.1 and brotli==1.2.0."""
from pathlib import Path
import argparse, hashlib, io, json
try:
    from fontTools.ttLib import TTFont
    import fontTools, brotli
except ImportError as error:
    raise SystemExit('Use an isolated environment with fonttools==4.66.1 and brotli==1.2.0. Ready WOFF2 files are already included.') from error
ROOT = Path(__file__).resolve().parent.parent
options = argparse.ArgumentParser(description=__doc__)
options.add_argument('--check', action='store_true')
args = options.parse_args()
manifest = {'fonttools': fontTools.__version__, 'brotli': brotli.__version__, 'fonts': []}
def digest(data): return hashlib.sha256(data).hexdigest()
for family in ['manrope', 'oswald']:
    original = ROOT / 'assets/fonts' / (family + '.ttf')
    target = original.with_suffix('.woff2')
    font = TTFont(original, recalcTimestamp=False)
    font.flavor = 'woff2'
    buffer = io.BytesIO(); font.save(buffer)
    data = buffer.getvalue()
    decoded = TTFont(io.BytesIO(data), recalcTimestamp=False)
    source = TTFont(original, recalcTimestamp=False)
    assert source.getBestCmap() == decoded.getBestCmap()
    assert source.getGlyphOrder() == decoded.getGlyphOrder()
    assert source['hmtx'].metrics == decoded['hmtx'].metrics
    assert source['name'].compile(source) == decoded['name'].compile(decoded)
    assert source['fvar'].compile(source) == decoded['fvar'].compile(decoded)
    assert source['gvar'].compile(source) == decoded['gvar'].compile(decoded)
    for name in source.getGlyphOrder():
        first = source['glyf'][name].getCoordinates(source['glyf'])
        second = decoded['glyf'][name].getCoordinates(decoded['glyf'])
        assert first == second, name
    if args.check: assert target.read_bytes() == data, str(target) + ' is outdated'
    else: target.write_bytes(data)
    license_file = original.parent / (family + '-OFL.txt')
    manifest['fonts'].append({'source': original.relative_to(ROOT).as_posix(), 'sourceBytes': original.stat().st_size, 'sourceSHA256': digest(original.read_bytes()), 'woff2': target.relative_to(ROOT).as_posix(), 'woff2Bytes': len(data), 'woff2SHA256': digest(data), 'license': license_file.relative_to(ROOT).as_posix(), 'licenseSHA256': digest(license_file.read_bytes()), 'codepoints': len(source.getBestCmap()), 'glyphs': len(source.getGlyphOrder()), 'axes': [{'tag':axis.axisTag,'min':axis.minValue,'max':axis.maxValue} for axis in source['fvar'].axes]})
    print(f'{family}: {original.stat().st_size} → {len(data)} bytes; glyphs, variations, metrics, names preserved')
text = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
path = ROOT / 'assets/fonts/manifest.json'
if args.check: assert path.read_text() == text, 'Font manifest is outdated'
else: path.write_text(text)
