#!/usr/bin/env python3
"""Serve the UI KIT preview without exposing repository or local configuration files."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIRS = {'assets', 'vendor', 'examples', 'docs', 'integrations'}
PUBLIC_FILES = {
    'index.html', 'catalog.css', 'catalog.js', 'catalog-examples.js', 'ui-kit.css', 'ui-kit.js',
    'ui-kit-forms.js', 'ui-kit-theme.js', 'ui-kit-table.js', 'ui-kit-components.js', 'ui-kit-inputs.js', 'ui-kit-feedback.js', 'ui-kit-patterns.js', 'cookie-consent.js',
    'tokens.json', 'tokens.css', 'tokens.js', 'ui-kit.zip', 'ui-kit-catalog.zip',
    'README.md', 'DESIGN.md', 'CHANGELOG.md', 'ROADMAP.md',
}


class PreviewHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        parts = [part for part in unquote(urlsplit(self.path).path).split('/') if part]
        if any(part.startswith('.') for part in parts):
            self.send_error(403)
            return None
        if parts and parts[0] not in PUBLIC_DIRS and '/'.join(parts) not in PUBLIC_FILES:
            self.send_error(404)
            return None
        if not Path(self.translate_path(self.path)).resolve().is_relative_to(ROOT):
            self.send_error(403)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8083)
    options = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(ROOT))
    with ThreadingHTTPServer((options.bind, options.port), handler) as server:
        print(f'UI KIT: http://{options.bind}:{options.port}/', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
