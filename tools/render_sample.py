#!/usr/bin/env python3
"""Render sample A4 worksheet to PDF + PNG with headless Chromium (Playwright). Usage: render_sample.py"""
import subprocess, time, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '-d', str(ROOT / 'app')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1000, 'height': 1400})
        pg.on('console', lambda m: print('console:', m.text))
        pg.on('pageerror', lambda e: print('pageerror:', e))
        pg.goto('http://localhost:8765/index.html?g=3&t=1&u=1')   # 三年级上册 第一单元 (含 陈/佳 等)
        pg.wait_for_selector('body[data-ready="1"]')
        pg.evaluate('document.fonts.ready')
        print(pg.inner_text('#info'))
        pg.pdf(path=str(ROOT / 'samples/sample-grade3-up-unit1.pdf'), prefer_css_page_size=True, print_background=True)
        pg.locator('.page').first.screenshot(path=str(ROOT / 'samples/sample-page1.png'))
        b.close()
finally:
    srv.terminate()
