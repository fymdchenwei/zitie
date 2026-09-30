#!/usr/bin/env python3
"""Build offline assets into app/: data, stroke bundle, font subset, icons, service worker.
Run with: /workspace/venv/bin/python tools/build.py
Inputs (in research/): zishi/src/data/{chars,volumes}.json, fonts/LXGWWenKaiGB-Regular.ttf,
node_modules/hanzi-writer-data/*.json
"""
import json, os, re, hashlib, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'app'
Z = ROOT / 'research/zishi/src/data'
HW = ROOT / 'node_modules/hanzi-writer-data'
HEADER_CHARS = ['陈', '一', '佳', '怡']   # must match app/config.js default

C = json.load(open(Z / 'chars.json'))
V = json.load(open(Z / 'volumes.json'))

TERM = {1: '上册', 2: '下册'}
def pick_reading(ch, vol_id, lesson_id, order):
    """Reading used where the char is a 写字表 char: reading annotated in that very lesson,
    else the latest annotated reading in the same volume, else chars.json 'py'."""
    info = C[ch]
    rs = info['readings']
    for r in rs:
        if r['lesson'] == lesson_id: return r['py']
    same = [r for r in rs if r['lesson'].startswith(vol_id + '-')]
    if same: return same[-1]['py']
    return info['py']

grades = {}
stats = []
all_xiezi = []
for v in V:
    order = v['order']
    units = []
    n_x = 0
    for u in v['units']:
        lessons = []
        for lid in u['lessons']:
            l = v['lessons'][lid]
            chars = []
            for ch in l['xiezi']:
                py = pick_reading(ch, v['id'], lid, order)
                allpy = []
                for r in C[ch]['readings']:
                    if r['py'] not in allpy: allpy.append(r['py'])
                if py not in allpy: allpy.insert(0, py)
                item = {'c': ch, 'py': py}
                alt = [p for p in allpy if p != py]
                if alt: item['alt'] = alt
                chars.append(item); all_xiezi.append(ch)
            if chars:
                lessons.append({'id': lid, 'kind': l['kind'], 'no': l['num'], 'title': l['title'], 'chars': chars})
        cnt = sum(len(l['chars']) for l in lessons)
        n_x += cnt
        units.append({'no': u['no'], 'title': u['title'], 'theme': u['theme'], 'count': cnt, 'lessons': lessons})
    shizi = v['stats']['shizi']
    g = grades.setdefault(v['grade'], {'grade': v['grade'], 'terms': []})
    g['terms'].append({'term': v['term'], 'id': v['id'], 'name': v['name'], 'shizi_count': shizi,
                       'xiezi_count': n_x, 'units': units})
    stats.append((v['id'], v['name'], shizi, n_x))

out = {
    'meta': {
        'edition': '统编版（部编版）小学语文 1-6年级 共12册（数据集对应 识字表3000/写字表2500 的经典统编版；见 REPORT.md）',
        'source': 'fsiceangel/zishi (GitHub, main) src/data/{chars,volumes}.json，本项目仅重组，未改字',
        'pinyin_note': "py = 该字在写字表所在课的课本读音；alt = 该字在本套教材中出现的其他读音（多音字）；无声调符号表示轻声",
        'xiezi_total': len(all_xiezi), 'xiezi_unique': len(set(all_xiezi)),
        'shizi_total_reference': sum(s[2] for s in stats),
    },
    'grades': [grades[k] for k in sorted(grades)],
}
(APP / 'data').mkdir(parents=True, exist_ok=True)
json.dump(out, open(APP / 'data/zitie-data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(stats, open(ROOT / 'research/coverage.json', 'w'), ensure_ascii=False, indent=1)

# ---- strokes bundle (only paths; medians dropped)
need = sorted(set(all_xiezi) | set(HEADER_CHARS))
bundle = {}
missing = []
for ch in need:
    p = HW / f'{ch}.json'
    if not p.exists(): missing.append(ch); continue
    d = json.load(open(p))
    bundle[ch] = d['strokes']
json.dump(bundle, open(APP / 'data/strokes.json', 'w'), separators=(',', ':'))
print('stroke chars', len(bundle), 'missing', missing, 'max strokes', max(len(x) for x in bundle.values()))

# ---- font subset
from fontTools import subset
from fontTools.ttLib import TTFont
chars = set(need)
for hi in range(0xB0, 0xF8):           # GB2312 hanzi level1+2 (UI text headroom)
    for lo in range(0xA1, 0xFF):
        try: chars.add(bytes([hi, lo]).decode('gb2312'))
        except Exception: pass
chars |= set(chr(i) for i in range(0x20, 0x7f))
chars |= set('āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüê·、。，：；！？（）《》“”‘’—…～×○')
opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.notdef_outline = True
opts.name_IDs = ['*']; opts.name_legacy = True; opts.name_languages = ['*']
font = TTFont(ROOT / 'research/fonts/LXGWWenKaiGB-Regular.ttf')
ss = subset.Subsetter(opts); ss.populate(text=''.join(chars)); ss.subset(font)
(APP / 'fonts').mkdir(exist_ok=True)
font.flavor = 'woff2'; font.save(APP / 'fonts/LXGWWenKaiGB-subset.woff2')
print('font subset KB', os.path.getsize(APP / 'fonts/LXGWWenKaiGB-subset.woff2') // 1024)

# ---- icons (田字格 + 字)
from PIL import Image, ImageDraw, ImageFont
def icon(size, maskable=False):
    im = Image.new('RGB', (size, size), '#fffaf0'); d = ImageDraw.Draw(im)
    pad = int(size * (0.22 if maskable else 0.10))
    box = (pad, pad, size - pad, size - pad)
    red = '#c0392b'; w = max(2, size // 100)
    d.rectangle(box, outline=red, width=w * 2)
    cx = size // 2
    for t in range(pad, size - pad, max(6, size // 40)):
        if (t // max(6, size // 40)) % 2 == 0:
            d.line([(cx, t), (cx, t + max(6, size // 40) // 2 * 1)], fill='#e6a19a', width=w)
            d.line([(t, cx), (t + max(6, size // 40) // 2 * 1, cx)], fill='#e6a19a', width=w)
    f = ImageFont.truetype(str(ROOT / 'research/fonts/LXGWWenKaiGB-Regular.ttf'), int((size - 2 * pad) * 0.86))
    d.text((cx, cx), '字', font=f, fill='#222', anchor='mm')
    return im
(APP / 'icons').mkdir(exist_ok=True)
icon(192).save(APP / 'icons/icon-192.png'); icon(512).save(APP / 'icons/icon-512.png')
icon(512, True).save(APP / 'icons/icon-maskable-512.png'); icon(180).save(APP / 'icons/apple-touch-icon.png')

# ---- service worker with precache list
files = []
for p in sorted(APP.rglob('*')):
    if p.is_file() and p.name not in ('sw.js', 'sw.template.js') and not p.name.startswith('.'):
        files.append('./' + p.relative_to(APP).as_posix())
h = hashlib.sha256()
for f in files: h.update(Path(APP / f[2:]).read_bytes())
ver = h.hexdigest()[:10]
tpl = (ROOT / 'tools/sw.template.js').read_text()
tpl = tpl.replace('__VERSION__', ver).replace('__FILES__', json.dumps(['./'] + files, ensure_ascii=False, indent=1))
(APP / 'sw.js').write_text(tpl)
print('sw version', ver, 'files', len(files))
for s in stats: print(s)
