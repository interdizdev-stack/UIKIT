import { createServer } from 'node:http';
import { readFile, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function browser(run) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!path.startsWith(root + '/')) { response.writeHead(403); response.end(); return; }
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
      response.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream'); response.end(await readFile(path));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const profile = await mkdtemp(join(tmpdir(), 'uikit-test-profile-'));
  const chrome = spawn(process.env.UIKIT_CHROME || '/usr/bin/google-chrome', ['--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  let socket;
  try {
    let targets;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; targets = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); if (targets.length) break; } catch {}
      await sleep(50);
    }
    if (!targets?.length) throw new Error('Chrome did not start');
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let sequence = 0; const pending = new Map(), exceptions = [];
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) { const request = pending.get(message.id); if (!request) return; pending.delete(message.id); clearTimeout(request.timeout); if (message.error) request.reject(message.error); else request.resolve(message.result); }
      else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
    });
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
      pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => { const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
    const navigate = async path => {
      await call('Page.navigate', { url: /^(file:|https?:)/.test(path) ? path : origin + '/' + path });
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) { await sleep(30); if (await evaluate('document.readyState === "complete" && Boolean(window.BrandUI)')) { ready = true; break; } }
      if (!ready) throw new Error('Page initialization failed: ' + path);
      await evaluate('document.fonts.ready.then(()=>true)');
    };
    const viewport = width => call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    const key = async value => {
      const codes = { Enter: 13, Escape: 27, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Tab: 9, Home: 36, End: 35 };
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: value, code: value, windowsVirtualKeyCode: codes[value], ...(value === 'Enter' ? { text: '\r' } : {}) });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: value, code: value, windowsVirtualKeyCode: codes[value] });
    };
    const screenshot = async name => { await mkdir(join(root, 'test-results'), { recursive: true }); const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(join(root, 'test-results', name), Buffer.from(result.data, 'base64')); };
    await call('Page.enable'); await call('Runtime.enable'); await call('Emulation.setFocusEmulationEnabled', { enabled: true });
    await run({ call, evaluate, navigate, viewport, key, screenshot, exceptions, origin });
    if (exceptions.length) throw new Error('JavaScript exceptions: ' + JSON.stringify(exceptions));
  } finally { socket?.close(); chrome.kill('SIGTERM'); server.close(); }
}
