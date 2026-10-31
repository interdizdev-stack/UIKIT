#!/usr/bin/env python3
"""Generate tokens/icons, build ZIPs, run checks and verify final composition."""
from pathlib import Path
import argparse,subprocess,sys,hashlib
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--static-only',action='store_true',help='Skip browser checks; report remains explicitly static')
args=parser.parse_args()
def run(command):subprocess.run(command,cwd=ROOT,check=True)
run(['node','scripts/build-tokens.mjs'])
run(['node','scripts/build-icons.mjs'])
run([sys.executable,'scripts/build-release.py','--skip-tokens'])
run([sys.executable,'scripts/verify.py']+(['--static-only'] if args.static_only else []))
run([sys.executable,'tests/static.py'])
for name in ['ui-kit.zip','ui-kit-catalog.zip']:
 data=(ROOT/name).read_bytes();print(name+': SHA-256 '+hashlib.sha256(data).hexdigest(),flush=True)
print('Release complete'+(' (browser checks skipped)' if args.static_only else ' with all saved checks'),flush=True)
