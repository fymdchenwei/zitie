import subprocess, time, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
preview = Path('/tmp/zitie-preview')
preview.mkdir(exist_ok=True)
link = preview / 'zitie'
if link.is_symlink() or link.exists():
    link.unlink()
link.symlink_to(ROOT / 'app')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8766', '-d', str(preview)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

def rows(page):
    return page.eval_on_selector_all('[data-row]', "els => els.map(e => e.getAttribute('data-kind') + ':' + e.getAttribute('data-row') + e.getAttribute('data-py'))")

try:
    with sync_playwright() as p:
        chrome = Path('/usr/local/bin/google-chrome')
        b = p.chromium.launch(executable_path=str(chrome), args=['--no-sandbox']) if chrome.exists() else p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844})
        pg = ctx.new_page()
        pg.goto('http://127.0.0.1:8766/zitie/')
        pg.wait_for_selector('body[data-ready="1"]')
        assert pg.input_value('#name') == ''
        pg.select_option('#unit', '1')
        pg.select_option('#name', '陈佳怡')
        pg.click('#go')
        pg.wait_for_selector('body[data-name-rows="3"]')
        got = rows(pg)
        assert got[:3] == ['name:陈chén', 'name:佳jiā', 'name:怡yí'], got[:5]
        assert pg.get_attribute('body', 'data-lesson-rows') == '17', pg.get_attribute('body', 'data-lesson-rows')
        assert got[3] == 'lesson:一yī', got[3]
        assert len(got) == 20
        pg.evaluate("navigator.serviceWorker.ready.then(()=>1)")
        time.sleep(2)
        print('sw controller:', pg.evaluate("!!navigator.serviceWorker.controller"), 'cache keys:', pg.evaluate("caches.keys()"))
        print('cached entries:', pg.evaluate("caches.keys().then(k=>caches.open(k[0])).then(c=>c.keys()).then(r=>r.length)"))
        srv.terminate()
        time.sleep(1)
        ctx.set_offline(True)
        pg2 = ctx.new_page()
        pg2.goto('http://127.0.0.1:8766/zitie/')
        pg2.wait_for_selector('body[data-ready="1"]', timeout=10000)
        pg2.select_option('#name', '')
        pg2.select_option('#unit', '1')
        pg2.click('#go')
        pg2.wait_for_selector('body[data-name-rows="0"]')
        assert pg2.get_attribute('body', 'data-lesson-rows') == '17'
        assert rows(pg2)[0] == 'lesson:一yī'
        print('OFFLINE OK:', pg2.inner_text('#rtip'))
        pg2.click('#back')
        pg2.select_option('#font', 'song')
        pg2.click('#go')
        pg2.wait_for_selector('body[data-font="song"]')
        fam = pg2.eval_on_selector('[data-glyph-font]', 'e => getComputedStyle(e).fontFamily')
        assert 'ZitieSong' in fam, fam
        assert pg2.get_attribute('body', 'data-lesson-rows') == '17'
        print('OFFLINE FONT', fam)
        pg2.screenshot(path=str(ROOT / 'samples/mobile-offline.png'))
        b.close()
finally:
    srv.terminate()
