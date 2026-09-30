import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);
const SVGNS = 'http://www.w3.org/2000/svg';
const A4 = { w: 210, h: 297 };
const BAND = 7.5;            // 拼音 + 笔顺缩略图带高度 (mm)
const THUMB = 7;             // 笔顺缩略图宽 (mm)
const state = JSON.parse(localStorage.getItem('zitie-state') || '{}');

let DATA, STROKES;
const q = new URLSearchParams(location.search);

async function init() {
  [DATA, STROKES] = await Promise.all([
    fetch('data/zitie-data.json').then((r) => r.json()),
    fetch('data/strokes.json').then((r) => r.json()),
  ]);
  await document.fonts.load('16px WenKai', '陈一佳怡āáǎà').catch(() => {});
  const g = $('grade');
  DATA.grades.forEach((x) => g.add(new Option(`${x.grade}年级`, x.grade)));
  g.value = q.get('g') || state.g || 1;
  fillTerms(); $('term').value = q.get('t') || state.t || 1;
  fillUnits(); $('unit').value = q.get('u') ?? state.u ?? 0;
  $('gridMm').value = q.get('grid') || state.grid || CONFIG.gridMm;
  $('trace').value = q.get('trace') || state.trace || 4;
  $('steps').checked = q.has('steps') ? q.get('steps') !== '0' : (state.steps ?? CONFIG.showStrokeSteps);
  $('hdr').value = (q.get('hdr') ? [...q.get('hdr')] : (state.hdr || CONFIG.headerChars)).join(CONFIG.headerSeparator);
  g.onchange = () => { fillTerms(); fillUnits(); render(); };
  $('term').onchange = () => { fillUnits(); render(); };
  ['unit', 'gridMm', 'trace', 'steps', 'hdr'].forEach((id) => ($(id).onchange = render));
  $('hdr').oninput = render;
  $('print').onclick = () => window.print();
  window.addEventListener('resize', fit);
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

const curGrade = () => DATA.grades.find((x) => x.grade == $('grade').value);
const curTerm = () => curGrade().terms.find((t) => t.term == $('term').value) || curGrade().terms[0];
function fillTerms() {
  const t = $('term'); t.innerHTML = '';
  curGrade().terms.forEach((x) => t.add(new Option(x.term == 1 ? '上册' : '下册', x.term)));
}
function fillUnits() {
  const u = $('unit'); u.innerHTML = '';
  const term = curTerm();
  u.add(new Option(`全册（${term.xiezi_count}字）`, 0));
  term.units.filter((x) => x.count).forEach((x) => u.add(new Option(`${x.title}（${x.count}字）`, x.no)));
}

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

// 定义：每个字的每一笔 path，及整字 group（hanzi-writer 坐标：1024 方框，y 向上）
const defined = new Set();
function defChar(ch) {
  if (defined.has(ch)) return true;
  const strokes = STROKES[ch]; if (!strokes) return false;
  const defs = $('defs').querySelector('defs');
  strokes.forEach((d, i) => el('path', { id: `s-${ch}-${i}`, d }, defs));
  const g = el('g', { id: `g-${ch}` }, defs);
  strokes.forEach((_, i) => el('use', { href: `#s-${ch}-${i}` }, g));
  defined.add(ch); return true;
}
// 把汉字放进以 (x,y) 为左上角、边长 size(mm) 的方框
function placeChar(parent, ch, x, y, size, fill, pad = 0.07, upTo = null, hiFill = null) {
  // hanzi-writer 官方坐标：1024 方框，字形 y 向上，基线变换为 scale(1,-1) translate(0,-900)
  const s = (size * (1 - 2 * pad)) / 1024;
  const g = el('g', { transform: `translate(${x + size * pad} ${y + size * pad}) scale(${s} ${s}) translate(0 900) scale(1 -1)` }, parent);
  const n = STROKES[ch].length;
  if (upTo === null) { el('use', { href: `#g-${ch}`, fill }, g); return; }
  for (let i = 0; i <= upTo && i < n; i++) el('use', { href: `#s-${ch}-${i}`, fill: i === upTo && hiFill ? hiFill : fill }, g);
}

function headerChars() {
  return [...$('hdr').value].filter((c) => c.trim());
}

function buildPage(rows, meta, pageNo, pageCount, o) {
  const cell = o.cell, cols = Math.floor((A4.w - 2 * CONFIG.pageMargin.side) / cell);
  const gridW = cols * cell, x0 = (A4.w - gridW) / 2;
  const page = document.createElement('div'); page.className = 'page';
  const svg = el('svg', { class: 'pg', viewBox: `0 0 ${A4.w} ${A4.h}`, xmlns: SVGNS }, page);
  const red = '#c0392b', faint = '#e3a59d';
  // 页眉
  const top = CONFIG.pageMargin.top;
  const hc = headerChars();
  const t = el('text', { x: x0, y: top + 9, 'font-size': 9, fill: '#111', 'letter-spacing': 1.5, class: 'hdrtext' }, svg);
  t.textContent = hc.join(CONFIG.headerSeparator);
  const r = el('text', { x: x0 + gridW, y: top + 4.5, 'font-size': 3.4, fill: '#444', 'text-anchor': 'end' }, svg);
  r.textContent = meta;
  const r2 = el('text', { x: x0 + gridW, y: top + 10.5, 'font-size': 3.6, fill: '#444', 'text-anchor': 'end' }, svg);
  r2.textContent = '姓名：__________   日期：__________';
  el('line', { x1: x0, x2: x0 + gridW, y1: top + 13, y2: top + 13, stroke: red, 'stroke-width': 0.5 }, svg);
  const rowH = BAND + cell;
  let y = top + CONFIG.headerHeightMm - 3 + 2;
  rows.forEach((it) => {
    // 拼音
    const py = el('text', { x: x0 + cell / 2, y: y + BAND - 1.4, 'font-size': 4.6, 'text-anchor': 'middle', fill: '#222' }, svg);
    py.textContent = it.py;
    // 笔顺缩略图
    const strokes = STROKES[it.c] || [];
    if (o.steps && strokes.length) {
      const maxT = Math.floor(((cols - 1) * cell) / THUMB);
      const n = Math.min(strokes.length, maxT);
      const start = strokes.length - n;   // 超长时保留最后 n 步（一般不会发生，最多23笔）
      for (let i = 0; i < n; i++) {
        const tx = x0 + cell + i * THUMB;
        el('rect', { x: tx + 0.3, y: y + 0.3, width: THUMB - 0.6, height: BAND - 0.6, fill: 'none', stroke: '#ddd', 'stroke-width': 0.15 }, svg);
        placeChar(svg, it.c, tx + 0.3, y + 0.3, THUMB - 0.6, '#333', 0.04, start + i, red);
      }
    }
    const gy = y + BAND;
    // 田字格
    for (let c = 0; c < cols; c++) {
      const gx = x0 + c * cell;
      el('rect', { x: gx, y: gy, width: cell, height: cell, fill: 'none', stroke: red, 'stroke-width': 0.35 }, svg);
      el('line', { x1: gx + cell / 2, x2: gx + cell / 2, y1: gy, y2: gy + cell, stroke: faint, 'stroke-width': 0.2, 'stroke-dasharray': '1.2 0.9' }, svg);
      el('line', { x1: gx, x2: gx + cell, y1: gy + cell / 2, y2: gy + cell / 2, stroke: faint, 'stroke-width': 0.2, 'stroke-dasharray': '1.2 0.9' }, svg);
      if (STROKES[it.c]) {
        if (c === 0) placeChar(svg, it.c, gx, gy, cell, '#111');
        else if (c <= o.trace) placeChar(svg, it.c, gx, gy, cell, '#cfcfcf');
      }
    }
    y += rowH;
  });
  const pn = el('text', { x: A4.w / 2, y: A4.h - 4, 'font-size': 3, 'text-anchor': 'middle', fill: '#999' }, svg);
  pn.textContent = `${pageNo} / ${pageCount}`;
  return page;
}

function rowsPerPage(cell) {
  const avail = A4.h - CONFIG.pageMargin.top - CONFIG.headerHeightMm - CONFIG.pageMargin.bottom;
  return Math.max(1, Math.floor(avail / (BAND + cell)));
}

function render() {
  const term = curTerm();
  const uno = Number($('unit').value);
  const units = uno ? term.units.filter((u) => u.no === uno) : term.units;
  const list = [];
  units.forEach((u) => u.lessons.forEach((l) => l.chars.forEach((c) => list.push(c))));
  list.forEach((c) => defChar(c.c));
  const cell = Number($('gridMm').value), trace = Number($('trace').value), steps = $('steps').checked;
  const rpp = rowsPerPage(cell);
  const pages = $('pages'); pages.innerHTML = '';
  const count = Math.max(1, Math.ceil(list.length / rpp));
  const meta = `${term.name}${uno ? ' · ' + units[0].title : ' · 全册'}`;
  for (let p = 0; p < count; p++) pages.appendChild(buildPage(list.slice(p * rpp, (p + 1) * rpp), meta, p + 1, count, { cell, trace, steps }));
  const missing = list.filter((c) => !STROKES[c.c]).length;
  $('info').textContent = `${meta}：写字表 ${list.length} 字（本册规定 ${term.xiezi_count}），每页 ${rpp} 行 × ${Math.floor((A4.w - 2 * CONFIG.pageMargin.side) / cell)} 格，共 ${count} 页${missing ? '；缺笔顺数据 ' + missing + ' 字' : ''}`;
  localStorage.setItem('zitie-state', JSON.stringify({ g: $('grade').value, t: $('term').value, u: $('unit').value, grid: cell, trace, steps, hdr: headerChars() }));
  fit();
  document.body.dataset.ready = '1';
}
function fit() {
  const w = 210 * 96 / 25.4; const avail = window.innerWidth - 12;
  $('pages').style.zoom = Math.min(1, avail / w);
}
init();
