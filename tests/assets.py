"""Validate committed fonts, licenses, icon metadata and release versions without optional build tools."""
from pathlib import Path
import hashlib,json,re,ast
ROOT=Path(__file__).resolve().parent.parent
for p in ROOT.joinpath('scripts').glob('*.py'): ast.parse(p.read_text(),filename=str(p))
fonts=json.loads((ROOT/'assets/fonts/manifest.json').read_text())
for font in fonts['fonts']:
 for path,digest in [('source','sourceSHA256'),('woff2','woff2SHA256'),('license','licenseSHA256')]:
  data=(ROOT/font[path]).read_bytes();assert hashlib.sha256(data).hexdigest()==font[digest],font[path]
 assert (ROOT/font['woff2']).read_bytes().startswith(b'wOF2')
 assert font['codepoints']>400 and font['glyphs']>500
 assert any(axis['tag']=='wght' for axis in font['axes'])
icons=json.loads((ROOT/'vendor/lucide-core.json').read_text())
for key,digest in [('source','sourceSHA256'),('subset','subsetSHA256')]: assert hashlib.sha256((ROOT/icons[key]).read_bytes()).hexdigest()==icons[digest]
assert icons['subsetBytes']<icons['originalBytes']/5
for path in ['vendor/bootstrap-LICENSE.txt','vendor/lucide-LICENSE.txt','assets/fonts/manrope-OFL.txt','assets/fonts/oswald-OFL.txt']: assert (ROOT/path).stat().st_size>100
for p in [ROOT/'README.md',*ROOT.joinpath('docs').glob('*.md')]:
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if ':' not in target and not target.startswith('#'): assert (p.parent/target.split('#')[0]).exists(),(p,target)
version=json.loads((ROOT/'tokens.json').read_text())['version']
assert version in (ROOT/'index.html').read_text() and version in (ROOT/'CHANGELOG.md').read_text()
print('PASS font/icon SHA-256, licenses, axes/coverage, docs, Python syntax and release version')
