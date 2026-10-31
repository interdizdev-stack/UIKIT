#!/usr/bin/env python3
"""Build reproducible offline distributions without third-party Python packages."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import argparse
import subprocess

ROOT = Path(__file__).resolve().parent.parent


def files(paths):
    result = []
    for name in paths:
        path = ROOT / name
        if path.is_dir():
            result.extend(p for p in path.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in {'.pyc', '.pyo'})
        elif path.is_file():
            result.append(path)
        else:
            raise FileNotFoundError(name)
    return sorted(set(result))


def build(name, paths):
    entries = files(paths)
    with ZipFile(ROOT / name, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
        for path in entries:
            info = ZipInfo(path.relative_to(ROOT).as_posix(), (1980, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())
    with ZipFile(ROOT / name) as archive:
        assert archive.testzip() is None, name + ': CRC error'
        for path in entries:
            assert archive.read(path.relative_to(ROOT).as_posix()) == path.read_bytes()
    print(f'{name}: {len(entries)} files, verified')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--skip-tokens', action='store_true', help='Tokens were already generated in this run')
    options = parser.parse_args()
    if not options.skip_tokens:
        subprocess.run(['node', str(ROOT / 'scripts/build-tokens.mjs')], cwd=ROOT, check=True)
    core = ['README.md', 'CHANGELOG.md', 'ROADMAP.md', 'DESIGN.md', 'integrations', 'docs', 'ui-kit.css', 'ui-kit.js',
            'ui-kit-forms.js', 'ui-kit-theme.js', 'ui-kit-table.js', 'ui-kit-components.js', 'ui-kit-inputs.js', 'ui-kit-feedback.js', 'ui-kit-patterns.js', 'cookie-consent.js', 'tokens.json', 'tokens.css', 'tokens.js', 'vendor',
            'assets/fonts', 'assets/graphics', 'assets/gallery', 'assets/avatars', 'examples', 'scripts/build-tokens.mjs', 'scripts/token-model.mjs']
    build('ui-kit.zip', core)
    build('ui-kit-catalog.zip', core + ['index.html', 'catalog.css', 'catalog.js', 'catalog-examples.js',
          'assets/references', 'assets/catalog-preview.png', 'ui-kit.zip',
          'scripts', 'tests'])


if __name__ == '__main__':
    main()
