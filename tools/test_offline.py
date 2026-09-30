import subprocess, time, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766', '-d', str(ROOT / 'app')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 800}); pg = ctx.new_page()
        pg.goto('http://localhost:8766/index.html'); pg.wait_for_selector('body[data-ready="1"]')
        pg.evaluate("navigator.serviceWorker.ready.then(()=>1)"); time.sleep(3)
        print('sw controller:', pg.evaluate("!!navigator.serviceWorker.controller"), 'cache keys:', pg.evaluate("caches.keys()"))
        print('cached entries:', pg.evaluate("caches.keys().then(k=>caches.open(k[0])).then(c=>c.keys()).then(r=>r.length)"))
        srv.terminate(); time.sleep(1)
        ctx.set_offline(True)
        pg2 = ctx.new_page(); pg2.goto('http://localhost:8766/index.html?g=6&t=2'); pg2.wait_for_selector('body[data-ready="1"]', timeout=10000)
        print('OFFLINE OK:', pg2.inner_text('#info'))
        pg2.screenshot(path=str(ROOT / 'samples/mobile-offline.png'))
        b.close()
finally:
    srv.terminate()
