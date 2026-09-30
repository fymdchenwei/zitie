#!/usr/bin/env python3
"""Subset 宋体 / 黑体 / 仿宋 for offline web delivery.

Sources, all SIL OFL 1.1:
- 黑体: Noto Sans SC (also released as Source Han Sans). Chunks come from the
  Google Fonts CSS text= subset API, then are merged.
- 宋体: Noto Serif SC (also released as Source Han Serif), same method.
- 仿宋: 朱雀仿宋 v0.212 technical preview, https://github.com/TrionesType/zhuque

Reserved Font Names (Noto, Source Han, 思源, Zhuque, 朱雀) are not used as the
family name of these subsets. Upstream copyright stays in the name table.
楷体 reuses app/fonts/LXGWWenKaiGB-subset.woff2 and is not rebuilt here.
"""
import json, re, time, urllib.parse, urllib.request, zipfile
from io import BytesIO
from pathlib import Path
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'app'
CHARS = set()
data = json.loads((APP / 'data' / 'zitie-data.json').read_text())
for g in data['grades']:
    for t in g['terms']:
        for u in t['units']:
            for lesson in u['lessons']:
                for c in lesson['chars']:
                    CHARS.add(c['c'])
CHARS.update('陈一佳怡')
TEXT = ''.join(sorted(CHARS))
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
RESERVED = ('Noto', 'Source Han', 'SourceHan', '思源', 'Zhuque', '朱雀')
OFL = (APP / 'licenses' / 'LXGWWenKaiGB-OFL.txt').read_text().split('SIL OPEN FONT LICENSE', 1)[1]
OFL = 'SIL OPEN FONT LICENSE' + OFL


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:
            if i == 3:
                raise
            time.sleep(1.5 * (i + 1))
            print('retry', url[:80], e)


def google_chunks(family, dest):
    dest.mkdir(parents=True, exist_ok=True)
    paths = []
    step = 160
    for i in range(0, len(TEXT), step):
        chunk = TEXT[i:i + step]
        p = dest / f'{i:04d}.bin'
        if p.exists() and p.stat().st_size > 1000:
            paths.append(p)
            print(family, i, 'cached', p.stat().st_size)
            continue
        css_url = 'https://fonts.googleapis.com/css2?family=' + urllib.parse.quote(family) + '&text=' + urllib.parse.quote(chunk)
        css = get(css_url).decode('utf-8')
        urls = re.findall(r'url\((https://[^)]+)\)', css)
        if len(urls) != 1:
            raise SystemExit(f'{family} chunk {i} unexpected css:\n{css[:400]}')
        raw = get(urls[0])
        p.write_bytes(raw)
        paths.append(p)
        print(family, i, 'bytes', len(raw))
        time.sleep(0.2)
    return paths


def rename(font, family, psname, extra_copyright):
    name = font['name']
    copyrights = []
    for rec in name.names:
        if rec.nameID == 0:
            try:
                copyrights.append(rec.toUnicode())
            except Exception:
                pass
    notice = extra_copyright
    if copyrights:
        notice = copyrights[0].strip() + '\n' + extra_copyright
    license_text = 'This Font Software is licensed under the SIL Open Font License, Version 1.1.'
    # Drop localized family names and any reserved-name usage outside the copyright.
    name.names = [rec for rec in name.names if rec.nameID == 0]
    specs = [
        (0, notice),
        (1, family),
        (2, 'Regular'),
        (3, psname + ' subset'),
        (4, family + ' Regular'),
        (5, 'Version 1.000; web subset'),
        (6, psname),
        (13, license_text),
        (16, family),
    ]
    for nid, value in specs:
        name.setName(value, nid, 3, 1, 0x409)
        try:
            value.encode('mac_roman')
        except UnicodeEncodeError:
            continue
        name.setName(value, nid, 1, 0, 0)


def save_subset(font, path, family, psname, notice):
    rename(font, family, psname, notice)
    font.flavor = 'woff2'
    path.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(path))
    check = TTFont(str(path))
    cmap = check.getBestCmap() or {}
    missing = [c for c in TEXT if ord(c) not in cmap]
    bad = []
    for rec in check['name'].names:
        if rec.nameID == 0:
            continue
        try:
            text = rec.toUnicode()
        except Exception:
            continue
        if any(r in text for r in RESERVED):
            bad.append((rec.nameID, text[:80]))
    print(path.name, 'KB', path.stat().st_size // 1024, 'glyphs', len(cmap), 'missing', len(missing), ''.join(missing[:30]), 'reserved', bad)
    return missing


def write_license(path, title, notice):
    path.write_text(title + '\n\n' + notice + '\n\n' + OFL, encoding='utf-8')


def main():
    work = Path('/tmp/zitie-fontbuild')
    work.mkdir(exist_ok=True)
    hei_paths = google_chunks('Noto Sans SC', work / 'hei')
    song_paths = google_chunks('Noto Serif SC', work / 'song')
    merger = Merger()
    hei = merger.merge([str(p) for p in hei_paths])
    song = merger.merge([str(p) for p in song_paths])
    save_subset(
        hei, APP / 'fonts' / 'ZitieHei-subset.woff2', 'Zitie Hei', 'ZitieHei-Regular',
        'Web subset for this copybook. Upstream: Noto Sans SC / Source Han Sans (Adobe, Google). Reserved Font Names are not used for this subset.')
    save_subset(
        song, APP / 'fonts' / 'ZitieSong-subset.woff2', 'Zitie Song', 'ZitieSong-Regular',
        'Web subset for this copybook. Upstream: Noto Serif SC / Source Han Serif (Adobe, Google). Reserved Font Names are not used for this subset.')
    zzip = get('https://github.com/TrionesType/zhuque/releases/download/v0.212/ZhuqueFangsong-v0.212.zip')
    (work / 'zhuque.zip').write_bytes(zzip)
    with zipfile.ZipFile(BytesIO(zzip)) as z:
        name = next(n for n in z.namelist() if n.lower().endswith(('.ttf', '.otf')))
        raw = z.read(name)
        print('zhuque member', name, len(raw))
    fang_src = TTFont(BytesIO(raw))
    # Keep only the copybook characters.
    from fontTools import subset
    opts = subset.Options()
    opts.flavor = None
    opts.layout_features = ['*']
    opts.notdef_outline = True
    opts.name_IDs = ['*']
    opts.drop_tables = []
    sub = subset.Subsetter(opts)
    sub.populate(text=TEXT)
    sub.subset(fang_src)
    save_subset(
        fang_src, APP / 'fonts' / 'ZitieFang-subset.woff2', 'Zitie Fang', 'ZitieFang-Regular',
        'Web subset for this copybook. Upstream: 朱雀仿宋 Zhuque Fangsong v0.212 technical preview (TrionesType / 璇玑造字), SIL OFL 1.1. This version is still marked a technical preview by the upstream project. Reserved Font Names are not used for this subset.')
    lic = APP / 'licenses'
    write_license(lic / 'ZitieHei-OFL.txt', 'Zitie Hei — subset of Noto Sans SC / Source Han Sans', 'Copyright remains with the Noto Sans CJK / Source Han Sans authors (Adobe and Google). See the copyright string inside the font. Reserved Font Name includes Noto and Source Han Sans; this subset is not published under those names.')
    write_license(lic / 'ZitieSong-OFL.txt', 'Zitie Song — subset of Noto Serif SC / Source Han Serif', 'Copyright remains with the Noto Serif CJK / Source Han Serif authors (Adobe and Google). See the copyright string inside the font. Reserved Font Name includes Noto and Source Han Serif; this subset is not published under those names.')
    write_license(lic / 'ZitieFang-OFL.txt', 'Zitie Fang — subset of 朱雀仿宋 v0.212', 'Copyright 2023-2025 璇玑造字 / TrionesType. Zhuque Fangsong v0.212 is a technical preview. Reserved names of the upstream family are not used for this subset. Source: https://github.com/TrionesType/zhuque')


if __name__ == '__main__':
    main()
