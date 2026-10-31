"""Check the public preview allowlist with localhost and an isolated server."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from urllib.request import urlopen
from urllib.error import HTTPError
import importlib.util, threading, sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('uikit_preview',ROOT/'scripts/serve.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Quiet(module.PreviewHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
try:
 for path in ['/DESIGN.md','/integrations/skills/use-ui-kit/SKILL.md','/examples/workspace.html','/docs/mobile.md','/catalog-examples.js']:
  with urlopen('http://127.0.0.1:'+str(server.server_port)+path) as response:assert response.status==200 and response.read()==(ROOT/path.lstrip('/')).read_bytes()
 for path in ['/.git/config','/scripts/serve.py','/integrations/','/docs/','/tokens.json/../.git/config','/agy%20audit.md']:
  try:urlopen('http://127.0.0.1:'+str(server.server_port)+path);raise AssertionError(path)
  except HTTPError as error:assert error.code in [403,404],(path,error.code)
 print('PASS preview serves adoption/templates and rejects private paths and directory listings')
finally:server.shutdown();server.server_close();thread.join()
