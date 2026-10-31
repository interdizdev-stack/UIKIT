"""Check offline HTML resources and both release archives with the standard library."""
from pathlib import Path, PurePosixPath
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
from zipfile import ZipFile
import posixpath
import re

ROOT = Path(__file__).resolve().parent.parent


class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        self.urls += [value for key, value in attrs if key in ('src', 'href') and value]


def references(text, css=False):
    parser = Resources()
    if css:
        urls = re.findall(r"url\(\s*['\"]?([^)'\"\s]+)", text)
    else:
        parser.feed(text)
        urls = parser.urls
    for url in urls:
        value = urlparse(url)
        if not value.scheme and value.path and not value.path.startswith('/'):
            yield unquote(value.path)


for path in [ROOT / 'index.html', *sorted((ROOT / 'examples').glob('*.html')), *sorted(ROOT.glob('*.css'))]:
    for reference in references(path.read_text(), css=path.suffix == '.css'):
        assert (path.parent / reference).exists(), f'{path.name}: missing {reference}'

for name in ['ui-kit.zip', 'ui-kit-catalog.zip']:
    with ZipFile(ROOT / name) as archive:
        assert archive.testzip() is None, name + ': CRC error'
        entries = set(archive.namelist())
        assert not any('__pycache__' in entry or entry.endswith(('.pyc','.pyo')) for entry in entries), name+': Python cache must not ship'
        for entry in entries:
            if entry.endswith('/'):
                continue
            path = ROOT / entry
            assert path.is_file() and archive.read(entry) == path.read_bytes(), name + ': outdated ' + entry
            if entry.endswith(('.html', '.css')):
                for reference in references(archive.read(entry).decode('utf-8'), css=entry.endswith('.css')):
                    target = posixpath.normpath(str(PurePosixPath(entry).parent / reference))
                    if target == name and entry == 'index.html':
                        # A download link points to the enclosing archive hosted beside index.html.
                        # A ZIP cannot contain itself; the release file is checked above.
                        assert (ROOT / name).is_file()
                        continue
                    assert target in entries, name + ': missing HTML/CSS resource ' + target
        if name == 'ui-kit-catalog.zip':
            assert archive.read('ui-kit.zip') == (ROOT / 'ui-kit.zip').read_bytes()
print('PASS offline HTML resources, ZIP CRC, current contents, and archived HTML/CSS dependencies')
