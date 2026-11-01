#!/usr/bin/env python3
"""Run saved checks; --static-only skips Chrome. No package installation or remote CI."""
from pathlib import Path
import argparse,json,os,subprocess,sys,time
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--static-only',action='store_true')
args=parser.parse_args()
folder=ROOT/'test-results';folder.mkdir(exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'browserChecks':not args.static_only,'checks':[]}
node_version=subprocess.check_output(['node','--version'],text=True).strip()
assert int(node_version.lstrip('v').split('.')[0])>=22,'Node.js 22+ is required'
report['node']=node_version
if not args.static_only:
 chrome=os.environ.get('UIKIT_CHROME','/usr/bin/google-chrome')
 report['chrome']=subprocess.check_output([chrome,'--version'],text=True).strip()
def run(name,command):
 print('RUN '+name,flush=True);started=time.monotonic()
 process=subprocess.run(command,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (folder/(name+'.log')).write_text(process.stdout)
 passes=sum(line.startswith('PASS ') for line in process.stdout.splitlines())
 report['checks'].append({'name':name,'returnCode':process.returncode,'passes':passes,'seconds':round(time.monotonic()-started,2)})
 if process.returncode:
  print(process.stdout,flush=True);(folder/'verification.json').write_text(json.dumps(report,indent=2)+'\n');raise SystemExit(process.returncode)
 print('PASS '+name+(f' ({passes} assertions)' if passes else ''),flush=True)
run('tokens',['node','tests/tokens.mjs'])
run('icons',['node','scripts/build-icons.mjs','--check'])
run('assets',[sys.executable,'tests/assets.py'])
run('static',[sys.executable,'tests/static.py'])
for path in sorted(ROOT.glob('*.js'))+sorted(ROOT.joinpath('examples').glob('*.js'))+sorted(ROOT.joinpath('scripts').glob('*.mjs'))+sorted(ROOT.joinpath('tests').glob('*.mjs')):
 result=subprocess.run(['node','--check',str(path)],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if result.returncode:print(result.stdout);raise SystemExit(result.returncode)
print('PASS JavaScript syntax',flush=True)
if not args.static_only:
 run('preview',[sys.executable,'tests/preview.py'])
 for name in ['browser','inputs','dropdowns','geometry','density','patterns','mobile','pages','system','feedback','data-gallery','site-blocks','catalog','accessibility','visual']:run(name,['node','tests/'+name+'.mjs'])
if not args.static_only and os.environ.get('UIKIT_FIREFOX'):run('firefox',['node','tests/firefox.mjs'])
report['finishedAt']=datetime.now(timezone.utc).isoformat();report['status']='pass'
(folder/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS verification; report: test-results/verification.json',flush=True)
