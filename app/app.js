import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);
const SVGNS = 'http://www.w3.org/2000/svg';
const A4 = { w: 210, h: 297 };
const BAND = 7.5;
const THUMB = 7;
const q = new URLSearchParams(location.search);

let DATA, STROKES;
let saved = {};
try { saved = JSON.parse(localStorage.getItem('zitie-state') || '{}'); } catch { saved = {}; }

async function init() {
  [DATA, STROKES] = await Promise.all([
    fetch('data/zitie-data.json').then((r) => r.json()),
    fetch('data/strokes.json').then((r) => r.json()),
  ]);
  await document.fonts.load('16px WenKai', '陈一佳怡āáǎàēéěèīíǐì').catch(() => {});
  buildGrades();
  buildNames();
  const grade = q.get('g') || saved.g || 1;
  setGrade(grade);
  setTerm(q.get('t') || saved.t || 1);
  fillUnits(q.get('u') || saved.u || 1);
  const name = q.get('name') || saved.name || '';
  if ([...$('name').options].some((o) => o.value === name)) $('name').value = name;
  syncNameStyle();
  $('term').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    setTerm(b.dataset.v);
    fillUnits($('unit').value);
    renderPreview();
    persist();
  };
  $('unit').onchange = () => { renderPreview(); persist(); };
  $('name').onchange = () => { syncNameStyle(); renderPreview(); persist(); };
  $('go').onclick = confirmGenerate;
  $('back').onclick = () => show('p-set');
  $('print').onclick = () => window.print();
  $('pdf').onclick = () => window.print();
  window.addEventListener('resize', fit);
  renderPreview();
  document.body.dataset.ready = '1';
  document.body.dataset.view = 'settings';
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

const curGrade = () => DATA.grades.find((x) => x.grade == document.body.dataset.grade) || DATA.grades[0];
const curTerm = () => curGrade().terms.find((t) => t.term == document.body.dataset.term) || curGrade().terms[0];

function buildGrades() {
  const gEl = $('grades');
  DATA.grades.forEach((x) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = x.grade;
    b.dataset.grade = x.grade;
    b.setAttribute('aria-label', `${x.grade}年级`);
    b.onclick = () => {
      setGrade(x.grade);
      fillUnits($('unit').value);
      renderPreview();
      persist();
    };
    gEl.appendChild(b);
  });
}
function setGrade(v) {
  const g = DATA.grades.some((x) => x.grade == v) ? String(v) : String(DATA.grades[0].grade);
  document.body.dataset.grade = g;
  v = g;
  [...$('grades').children].forEach((c) => {
    const on = c.dataset.grade == v;
    c.classList.toggle('on', on);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function setTerm(v) {
  const term = curGrade().terms.some((t) => t.term == v) ? String(v) : String(curGrade().terms[0].term);
  document.body.dataset.term = term;
  [...$('term').children].forEach((c) => {
    const on = c.dataset.v === term;
    c.classList.toggle('on', on);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function unitLabel(unit) {
  return unit.title.includes('单元') ? `第${unit.no}单元` : unit.title;
}
function fillUnits(prefer) {
  const u = $('unit');
  const prev = prefer ?? u.value;
  u.innerHTML = '';
  curTerm().units.forEach((x) => u.add(new Option(unitLabel(x), x.no)));
  const ok = [...u.options].some((o) => o.value === String(prev));
  u.value = ok ? String(prev) : u.options[0].value;
}
function buildNames() {
  const n = $('name');
  CONFIG.names.forEach((name) => n.add(new Option(name, name)));
}
function syncNameStyle() {
  $('name').classList.remove('hl');
}
function currentName() { return $('name').value; }
function currentUnit() {
  const term = curTerm();
  return term.units.find((u) => u.no == $('unit').value) || term.units[0];
}
function nameRows(name) {
  return [...name].map((c) => ({ c, py: CONFIG.namePinyin[c] || '', kind: 'name' }));
}
function lessonRows() {
  const list = [];
  currentUnit().lessons.forEach((l) => l.chars.forEach((c) => list.push({ c: c.c, py: c.py || '', kind: 'lesson' })));
  return list;
}
function metaLine() {
  const term = curTerm();
  const unit = term.units.find((u) => u.no == $('unit').value) || term.units[0];
  const termLabel = term.term == 1 ? '上学期' : '下学期';
  return `${curGrade().grade}年级 · ${termLabel} · ${unitLabel(unit)}`;
}
function persist() {
  localStorage.setItem('zitie-state', JSON.stringify({
    g: document.body.dataset.grade,
    t: document.body.dataset.term,
    u: $('unit').value,
    name: currentName(),
  }));
}

function cells(ch, py, n) {
  let h = '';
  for (let i = 0; i < n; i++) {
    const cls = i === 0 ? 'std' : (i <= 2 ? 'ghost' : '');
    const g = i <= 2 ? `<span class="g">${ch}</span>` : '';
    h += `<div class="cell"><div class="py">${i === 0 ? py : ''}</div><div class="tz ${cls}">${g}</div></div>`;
  }
  return h;
}
function renderPreview() {
  const pv = $('pv');
  const name = currentName();
  const lessons = lessonRows();
  const head = name ? nameRows(name) : [];
  const title = name
    ? `姓名 ${head.length} 行在前 · 随后本单元生字 ${lessons.length} 行`
    : `不加姓名 · 只生成本单元生字 ${lessons.length} 行`;
  const sample = head.length ? head : lessons.slice(0, 2);
  const rows = sample.length
    ? `<div class="rows">` + sample.map((r) => `<div class="row" style="--n:5">${cells(r.c, r.py, 5)}</div>`).join('') + `</div>`
    : '<div class="pv-empty">这个单元没有写字表生字</div>';
  const py = head.map((r) => r.py).filter(Boolean).join(' / ');
  pv.innerHTML = `<div class="pv-h"><span>${title}</span>${py ? `<span class="t">${py}</span>` : ''}</div>`
    + rows
    + '<div class="pv-foot">每字一行：拼音 + 标准字 + 浅灰描红 + 空白田字格</div>';
}

function show(id) {
  document.querySelectorAll('.view').forEach((p) => p.classList.toggle('active', p.id === id));
  document.body.dataset.view = id === 'p-res' ? 'result' : 'settings';
  if (id !== 'p-res') {
    delete document.body.dataset.rows;
    delete document.body.dataset.nameRows;
    delete document.body.dataset.lessonRows;
  }
  window.scrollTo(0, 0);
}
function confirmGenerate() {
  renderSheet();
  show('p-res');
  fit();
}

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

const defined = new Set();
function defChar(ch) {
  if (defined.has(ch)) return true;
  const strokes = STROKES[ch];
  if (!strokes) return false;
  const defs = $('defs').querySelector('defs');
  strokes.forEach((d, i) => el('path', { id: `s-${ch}-${i}`, d }, defs));
  const g = el('g', { id: `g-${ch}` }, defs);
  strokes.forEach((_, i) => el('use', { href: `#s-${ch}-${i}` }, g));
  defined.add(ch);
  return true;
}
function placeChar(parent, ch, x, y, size, fill, pad = 0.07, upTo = null, hiFill = null) {
  const s = (size * (1 - 2 * pad)) / 1024;
  const g = el('g', { transform: `translate(${x + size * pad} ${y + size * pad}) scale(${s} ${s}) translate(0 900) scale(1 -1)` }, parent);
  const n = STROKES[ch].length;
  if (upTo === null) { el('use', { href: `#g-${ch}`, fill }, g); return; }
  for (let i = 0; i <= upTo && i < n; i++) el('use', { href: `#s-${ch}-${i}`, fill: i === upTo && hiFill ? hiFill : fill }, g);
}

function buildPage(rows, meta, pageNo, pageCount, o) {
  const cell = o.cell;
  const cols = Math.floor((A4.w - 2 * CONFIG.pageMargin.side) / cell);
  const gridW = cols * cell;
  const x0 = (A4.w - gridW) / 2;
  const page = document.createElement('div');
  page.className = 'sheet';
  page.dataset.page = String(pageNo);
  const svg = el('svg', { class: 'pg', viewBox: `0 0 ${A4.w} ${A4.h}`, xmlns: SVGNS }, page);
  const red = '#c0392b', faint = '#e3a59d';
  const top = CONFIG.pageMargin.top;
  const title = el('text', { x: A4.w / 2, y: top + 5, 'font-size': 6.2, 'text-anchor': 'middle', fill: '#111', class: 'hdrtext' }, svg);
  title.textContent = '小学汉字字帖';
  el('text', { x: x0, y: top + 11, 'font-size': 3.6, fill: '#333' }, svg).textContent = meta;
  if (o.name) {
    const right = el('text', { x: x0 + gridW, y: top + 11, 'font-size': 3.6, fill: '#333', 'text-anchor': 'end' }, svg);
    right.append('姓名 ');
    const nm = el('tspan', { 'font-size': 5, fill: '#111' }, right);
    nm.textContent = o.name;
  }
  el('line', { x1: x0, x2: x0 + gridW, y1: top + 13.5, y2: top + 13.5, stroke: red, 'stroke-width': 0.5 }, svg);
  const rowH = BAND + cell;
  let y = top + CONFIG.headerHeightMm;
  rows.forEach((it) => {
    const row = el('g', { 'data-row': it.c, 'data-py': it.py, 'data-kind': it.kind || 'lesson' }, svg);
    const py = el('text', { x: x0 + cell / 2, y: y + BAND - 1.4, 'font-size': 4.6, 'text-anchor': 'middle', fill: '#222' }, row);
    py.textContent = it.py;
    const strokes = STROKES[it.c] || [];
    if (o.steps && strokes.length) {
      const maxT = Math.floor(((cols - 1) * cell) / THUMB);
      const n = Math.min(strokes.length, maxT);
      const start = strokes.length - n;
      for (let i = 0; i < n; i++) {
        const tx = x0 + cell + i * THUMB;
        el('rect', { x: tx + 0.3, y: y + 0.3, width: THUMB - 0.6, height: BAND - 0.6, fill: 'none', stroke: '#ddd', 'stroke-width': 0.15 }, row);
        placeChar(row, it.c, tx + 0.3, y + 0.3, THUMB - 0.6, '#333', 0.04, start + i, red);
      }
    }
    const gy = y + BAND;
    for (let c = 0; c < cols; c++) {
      const gx = x0 + c * cell;
      el('rect', { x: gx, y: gy, width: cell, height: cell, fill: 'none', stroke: red, 'stroke-width': 0.35 }, row);
      el('line', { x1: gx + cell / 2, x2: gx + cell / 2, y1: gy, y2: gy + cell, stroke: faint, 'stroke-width': 0.2, 'stroke-dasharray': '1.2 0.9' }, row);
      el('line', { x1: gx, x2: gx + cell, y1: gy + cell / 2, y2: gy + cell / 2, stroke: faint, 'stroke-width': 0.2, 'stroke-dasharray': '1.2 0.9' }, row);
      if (STROKES[it.c]) {
        if (c === 0) placeChar(row, it.c, gx, gy, cell, '#111');
        else if (c <= o.trace) placeChar(row, it.c, gx, gy, cell, '#cfcfcf');
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

function renderSheet() {
  const name = currentName();
  const head = name ? nameRows(name) : [];
  const lessons = lessonRows();
  const list = head.concat(lessons);
  list.forEach((c) => defChar(c.c));
  const cell = CONFIG.gridMm;
  const trace = CONFIG.traceCount;
  const steps = CONFIG.showStrokeSteps;
  const rpp = rowsPerPage(cell);
  const pages = $('pages');
  pages.innerHTML = '';
  const count = Math.max(1, Math.ceil(list.length / rpp) || 1);
  const meta = metaLine();
  for (let p = 0; p < count; p++) {
    pages.appendChild(buildPage(list.slice(p * rpp, (p + 1) * rpp), meta, p + 1, count, { cell, trace, steps, name }));
  }
  const missing = list.filter((c) => !STROKES[c.c]).map((c) => c.c);
  const missPy = list.filter((c) => !c.py).map((c) => c.c);
  const who = name ? `姓名 ${name} ${head.length} 行 + 生字 ${lessons.length} 行` : `不加姓名 · 生字 ${lessons.length} 行`;
  let tip = `${meta} · ${who} · 共 ${list.length} 行 · 每字一行 · A4 打印`;
  if (!list.length) tip = `${meta} · 本单元没有写字表生字`;
  if (missing.length) tip += `；缺笔顺 ${[...new Set(missing)].join('')}`;
  if (missPy.length) tip += `；缺拼音 ${[...new Set(missPy)].join('')}`;
  $('rtip').textContent = tip;
  document.body.dataset.rows = String(list.length);
  document.body.dataset.nameRows = String(head.length);
  document.body.dataset.lessonRows = String(lessons.length);
  persist();
  fit();
}
function fit() {
  const pages = $('pages');
  if (!pages.childElementCount) return;
  const w = 210 * 96 / 25.4;
  const avail = Math.min(window.innerWidth, 720) - 28;
  pages.style.zoom = Math.min(1, avail / w);
}
init();
