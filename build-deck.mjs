// 슬라이드-원고.md → deck/index.html
// 실행: node docs/training/slides-v2/build-deck.mjs
// 원고가 원본이다. 원고를 고친 뒤 다시 실행하면 슬라이드가 갱신된다.
// 화면에 나오지 않는 것: 발표 메모 · 애니메이션 설명 · 배점 근거 등은 발표 메모(N)로만 간다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(DIR, '슬라이드-원고.md');
const OUT = path.join(DIR, 'deck', 'index.html');
const IMG_DIR = path.join(DIR, 'images');
// 왼쪽 레일에 번호와 함께 보이는 부 이름(짧게)
const RAIL_NAMES = { 0: '시작', 1: '만든 계기', 2: '채점 기준', 3: '열매세특', 4: '탐구주제추천', 5: '자료의 활용', 6: '실습', 7: '질의 응답', 8: '당부', 9: '마침' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
const none = (s) => !s || /^\(없음/.test(s.trim());

// ── 원고 읽기 ──
const lines = readFileSync(SRC, 'utf8').split(/\r?\n/);
const parts = [];
const slides = [];
let part = null, slide = null, key = null;
for (const line of lines) {
  let m;
  if ((m = line.match(/^# (\d+)부\. (.+)$/))) { part = { id: m[1], num: m[1].padStart(2, '0'), name: m[2].trim(), first: slides.length }; parts.push(part); slide = null; continue; }
  if ((m = line.match(/^## (\d+-\d+)\. (.+)$/))) {
    slide = { id: m[1], name: m[2], part: part.id, optional: m[2].includes('〔선택〕'), fields: {}, body: [], extra: [] };
    slides.push(slide); key = null; continue;
  }
  if (!slide) continue;
  if ((m = line.match(/^- (소제목|제목|설명|이미지|띠 그림|배치|본문|발표 메모|애니메이션|각주)( \(([^)]*)\))?:\s?(.*)$/))) {
    key = m[1];
    if (key === '본문') { slide.bodyKind = m[3] || ''; if (m[4]) slide.body.push(m[4]); }
    else slide.fields[key] = m[4];
    continue;
  }
  if (/^- /.test(line)) { key = 'extra'; slide.extra.push(line.slice(2)); continue; }
  if (/^\s{2,}/.test(line) && key === '본문') { slide.body.push(line.replace(/^ {2}/, '')); continue; }
  if (/^\s{2,}/.test(line) && key === 'extra') { slide.extra.push(line.trim()); continue; }
  if (/^\s{2,}/.test(line) && key === '발표 메모') { slide.fields['발표 메모'] += ' ' + line.trim(); continue; }
}

// ── 본문 블록 만들기 ──
function parseTable(rows) {
  const cells = rows.filter((r) => !/^\|\s*-/.test(r) && !/^\|[-:| ]+\|$/.test(r)).map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  return { head: cells[0], rows: cells.slice(1) };
}

let idx = 0;
const a = () => ` class="a" style="--i:${idx++}"`;
const aCls = (cls) => ` class="a ${cls}" style="--i:${idx++}"`;

function tableHtml(t, slide) {
  const scoreCol = t.head.findIndex((h) => /^(배점|만점|지표 수)$/.test(h));
  const isTotal = (r) => /합계/.test(r[0]);
  const max = scoreCol >= 0 ? Math.max(...t.rows.filter((r) => !isTotal(r)).map((r) => parseFloat(r[scoreCol]) || 0)) : 0;
  const isNum = (v) => /^[\d.,]+$/.test(v);
  const head = t.head.some((h) => h) ? `<thead><tr>${t.head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>` : '';
  const body = t.rows.map((r) => {
    const hl = r.some((c) => /^\*\*.+\*\*$/.test(c));
    const tds = r.map((c, i) => {
      if (i === scoreCol && isNum(c)) {
        if (isTotal(r)) return `<td class="score total"><span class="sc"><b data-count="${esc(c)}">${esc(c)}</b><span class="bar none"></span></span></td>`;
        const w = max ? Math.round((parseFloat(c) / max) * 100) + '%' : '0';
        return `<td class="score"><span class="sc"><b>${esc(c)}</b><span class="bar"><i data-w="${w}"></i></span></span></td>`;
      }
      return `<td${isNum(c) && i > 0 ? ' class="num"' : ''}>${inline(c)}</td>`;
    }).join('');
    return `<tr${hl ? ' class="hl a"' : ' class="a"'} style="--i:${idx++}">${tds}</tr>`;
  }).join('');
  return `<table class="tbl${scoreCol >= 0 ? ' has-bar' : ''} cols-${t.head.length}${t.head[0] === '점수' ? ' levels' : ''}">${head}<tbody>${body}</tbody></table>`;
}

function bodyHtml(slide) {
  idx = 0;
  const out = [];
  const src = slide.body.filter((l) => l.trim() !== '');
  if (!src.length || src.every((l) => none(l))) return '';
  const statsMode = /숫자/.test(slide.bodyKind || '');
  // 단 나누기: '■ 제목' 줄로 묶음을 나눠 단(열)에 배치. 배치에 '두 단' 또는 '세 단'
  const colsM = (slide.fields['배치'] || '').match(/(두|세) 단|(표 크게)/);
  if (colsM && !slide._inBlock) {
    const groups = []; let g = null;
    for (const l of src) { const h = l.match(/^■\s*(.+)$/); if (h) { g = { title: h[1], lines: [] }; groups.push(g); } else if (g) g.lines.push(l); else { g = { title: '', lines: [l] }; groups.push(g); } }
    let k = 0;
    const html = groups.map((gr) => { const sub = { body: gr.lines, bodyKind: '', fields: {}, _inBlock: true }; const keep = idx; const inner = bodyHtml(sub); return `<section class="blk a" style="--i:${k++}">${gr.title ? `<h4>${inline(gr.title)}</h4>` : ''}${inner}</section>`; }).join('');
    return `<div class="blocks ${colsM[2] ? 'c1 big' : 'c' + (colsM[1] === '세' ? 3 : 2)}">${html}</div>`;
  }
  // 표지: "- 아이콘: 파일 | 이름" 은 오른쪽 2×2 아이콘, 나머지 줄은 왼쪽 글
  if (/^아이콘$/.test(slide.bodyKind || '')) {
    const icons = src.filter((l) => /^- 아이콘: /.test(l)).map((l) => l.replace(/^- 아이콘: /, '').split('|').map((x) => x.trim()));
    const text = src.filter((l) => /^- /.test(l) && !/^- 아이콘: /.test(l)).map((l) => `<p${aCls('presenter')}>${inline(l.replace(/^- /, ''))}</p>`).join('');
    slide.iconGrid = `<div class="icons">${icons.map(([f, label]) => `<figure${aCls('icon')}><img src="../images/${esc(f)}" alt=""><figcaption>${inline(label)}</figcaption></figure>`).join('')}</div>`;
    return text;
  }
  // 카드: "- **제목** — 설명" 항목을 카드 한 장씩으로
  // 지표 마킹: 코드 목록 + 클릭할 때마다 한 영역의 코드만 표시(파워포인트식 클릭 단계)
  if (/^지표 마킹$/.test(slide.bodyKind || '')) {
    const rows = src.filter((l) => /^- /.test(l)).map((l) => l.replace(/^- /, ''));
    const steps = (rows.find((r) => /^단계:/.test(r)) || '').replace(/^단계:\s*/, '').split('|').map((x) => x.trim()).filter(Boolean);
    const items = rows.filter((r) => !/^단계:/.test(r)).map((r) => r.split('|').map((x) => x.trim()));
    const chips = items.map(([code, name, areas], i) => {
      const idxs = (areas || '').split(',').map((a) => steps.indexOf(a.trim()) + 1).filter((n) => n > 0);
      return `<li class="chip a" style="--i:${i}" data-on="${idxs.join(' ')}"><b>${esc(code)}</b><span>${inline(name)}</span></li>`;
    }).join('');
    const tabs = steps.map((t, i) => `<li><button type="button" class="mark-tab" data-step="${i + 1}">${inline(t)}</button></li>`).join('');
    return `<div class="mark"><ol class="mark-tabs">${tabs}</ol><ul class="chips">${chips}</ul></div>`;
  }
  if (/^카드$/.test(slide.bodyKind || '')) {
    const items = src.filter((l) => /^- /.test(l)).map((l) => l.replace(/^- /, ''));
    const n = items.length;
    let cols = /단계 카드/.test(slide.fields['배치'] || '') ? 3 : n === 4 ? 2 : n <= 3 ? n : n <= 6 ? 3 : 4;
    // 그림 칸: 카드 그리드의 빈 자리를 그림으로 채운다(여백 없이). 카드 수에 따라 칸 배치를 정한다
    const imgM = (slide.fields['이미지'] || '').match(/`images\/([^`]+)`/);
    let imgCell = '';
    if (imgM) {
      slide.cardImg = true;
      const file = imgM[1];
      const plan = { 3: [2, 2, ''], 4: [3, 2, 'grid-column:3;grid-row:1 / span 2'], 5: [3, 2, ''], 6: [4, 2, 'grid-column:4;grid-row:1 / span 2'], 7: [4, 2, ''], 8: [3, 3, ''] }[n] || [n + 1, 1, ''];
      cols = plan[0];
      // "그림 넓게": 카드는 왼쪽 한 열에 쌓고, 그림이 오른쪽 전체 높이를 채운다(글이 짧은 장)
      // "그림 아래": 카드를 한 줄로 나란히, 그 아래 남는 높이 전체를 가로로 긴 그림이 채운다
      if (/그림 아래/.test(slide.fields['배치'] || '')) {
        cols = n > 3 ? 3 : n; plan[2] = 'grid-column:1 / -1'; slide.imgBelow = true;
        // 5장: 1 2 3 / 4 _ 5 (같은 너비, 가운데 비움)
        if (n === 5) slide.cardPos = { 3: 'grid-column:1;grid-row:2', 4: 'grid-column:3;grid-row:2' };
      } else if (/그림 넓게/.test(slide.fields['배치'] || '')) {
        if (n <= 4) { slide.wideImg = true; plan[2] = `grid-column:2;grid-row:1 / span ${n}`; }
        else { cols = 2; plan[2] = ''; } // 5장 이상: 2열로 쌓고 남는 칸을 그림으로
      }
      const inner = existsSync(path.join(IMG_DIR, file)) ? `<img src="../images/${esc(file)}" alt="">` : `<div class="ph"><b>${esc(file)}</b><span>그림 생성 예정</span></div>`;
      imgCell = `<figure class="card-img a" style="--i:${n};${plan[2]}">${inner}</figure>`;
    }
    return `<div class="cards${imgM ? ' with-img' : ''}${slide.wideImg ? ' wide-img' : ''}${slide.imgBelow ? ' img-below' : ''}${!imgM && Math.ceil(n / cols) === 1 ? ' one-row' : ''}" style="--n:${cols}${slide.imgBelow ? `;grid-template-rows:repeat(${Math.ceil(n / cols)}, auto) 1fr` : ''}">${items.map((t, idx) => {
      const m = t.match(/^\*\*(.+?)\*\*\s*(?:—\s*(.*))?$/);
      const pos = slide.cardPos?.[idx] || '';
      return `<div${aCls('card').replace(/"$/, pos ? ';' + pos + '"' : '"')}>${m ? `<h3${/^\d[\d,.]*\s*[가-힣]+$/.test(m[1]) ? ` data-count="${esc(m[1])}"` : /^\d[\d,~+ ]*[가-힣]+$/.test(m[1]) ? ' class="big"' : ""}>${inline(m[1]).split(" // ").join("<br>")}</h3>${m[2] ? (/단계 카드/.test(slide.fields['배치'] || '') ? `<div class="lvls">${m[2].split(" / ").map((ln) => { const q = ln.match(/^(\S+) · (.+)$/); return /^※/.test(ln) ? `<p class="lv note">${inline(ln.replace(/^※\s*/, ''))}</p>` : q ? `<p class="lv"><b>${esc(q[1])}</b><span>${inline(q[2])}</span></p>` : `<p class="lv">${inline(ln)}</p>`; }).join('')}</div>` : `<p>${inline(m[2]).split(" / ").join("<br>")}</p>`) : ""}` : `<p>${inline(t)}</p>`}</div>`;
    }).join('')}${imgCell}</div>`;
  }
  let i = 0;
  while (i < src.length) {
    const l = src[i];
    if (/^\|/.test(l)) {
      const rows = []; while (i < src.length && /^\|/.test(src[i])) rows.push(src[i++]);
      out.push(tableHtml(parseTable(rows), slide)); continue;
    }
    if (/^\d+\. /.test(l)) {
      const items = []; while (i < src.length && /^\d+\. /.test(src[i])) items.push(src[i++].replace(/^\d+\. /, ''));
      out.push(`<ol class="flow">${items.map((t) => `<li${a()}>${inline(t)}</li>`).join('')}</ol>`); continue;
    }
    if (/^- /.test(l) || /^ {2}- /.test(l)) {
      const items = []; while (i < src.length && (/^- /.test(src[i]) || /^ {2,}- /.test(src[i]))) items.push(src[i++]);
      if (statsMode && items.every((t) => / — /.test(t))) {
        const stats = items.filter((t) => !/^- 목차/.test(t));
        const rest = items.filter((t) => /^- 목차/.test(t));
        out.push(`<div class="stats">${stats.map((t) => {
          const [v, k] = t.replace(/^- /, '').split(' — ');
          const count = /\d/.test(v) ? ` data-count="${esc(v)}"` : '';
          return `<div${aCls('stat')}><div class="v"${count}>${esc(v)}</div><div class="k">${inline(k)}</div></div>`;
        }).join('')}</div>`);
        if (rest.length) out.push(`<ul class="list">${rest.map((t) => `<li${a()}>${inline(t.replace(/^- /, ''))}</li>`).join('')}</ul>`);
        continue;
      }
      out.push(`<ul class="list">${items.map((t) => {
        const sub = /^ {2,}- /.test(t);
        return `<li${sub ? aCls('sub') : a()}>${inline(t.replace(/^\s*- /, ''))}</li>`;
      }).join('')}</ul>`);
      continue;
    }
    out.push(`<p${aCls('lead')}>${inline(l)}</p>`); i++;
  }
  return out.join('\n');
}

function imageHtml(slide) {
  const f = slide.fields['이미지'];
  const m = f && f.match(/`images\/([^`]+)`/);
  if (!m) return '';
  const file = m[1];
  const kind = file.startsWith('cap-') ? 'cap' : 'ill';
  if (existsSync(path.join(IMG_DIR, file))) return `<figure><img class="${kind}" src="../images/${esc(file)}" alt=""></figure>`;
  const why = kind === 'cap' ? '실습 때 실제 화면 캡처' : '그림 생성 예정';
  return `<figure><div class="ph"><b>${esc(file)}</b><span>${why}</span></div></figure>`;
}

function titleHtml(t) {
  const [a1, ...rest] = (t || '').split(' / ');
  return rest.length ? `${inline(a1)} <em>${inline(rest.join(' '))}</em>` : inline(a1);
}

function eyebrowHtml(e, p) {
  const m = (e || '').match(/^(\d+) · (.+)$/);
  const label = m ? m[2].replace(/ — /g, ' · ') : (e || p.name);
  return `<span class="num">【${p.num}】</span><span>${inline(label)}</span>`;
}

function notesHtml(slide) {
  const out = [];
  if (slide.optional) out.push('<p><strong>〔선택〕</strong> 시간이 부족하면 넘겨도 되는 장.</p>');
  if (slide.fields['발표 메모']) out.push(`<p>${inline(slide.fields['발표 메모'])}</p>`);
  if (slide.extra.length) out.push(`<p>${slide.extra.map(inline).join('<br>')}</p>`);
  if (slide.fields['애니메이션']) out.push(`<p style="opacity:.7">애니메이션: ${inline(slide.fields['애니메이션'])}</p>`);
  return out.length ? `<div class="notes">${out.join('')}</div>` : '';
}

const slideHtml = slides.map((s) => {
  // 목차: 머리·레일·바닥 막대 숨김, 본문만. 두 열(01~04 | 05~08) 나열
  if (/목차/.test(s.fields['배치'] || '')) {
    const items = s.body.filter((l) => /^- /.test(l)).map((l) => l.replace(/^- /, '').split('|').map((x) => x.trim()));
    return `<section class="slide cover toc" data-id="${s.id}" data-part="${s.part}">
  <div class="toc-in">
  <h1 class="toc-title">${titleHtml(s.fields['제목'])}</h1>
  <ol class="toc-list" style="--rows:${Math.ceil(items.length / 2)}">${items.map(([n, t], i) => `<li class="a" style="--i:${i}"><span class="tn">${esc(n)}</span><span class="tt">${inline(t)}</span></li>`).join('')}</ol>
  </div>
  ${notesHtml(s)}
</section>`;
  }
  // 표지: 가운데 세로 배치(제목 → 아이콘 한 줄 → 날짜·장소 → 발표자). 머리·레일·바닥 막대 숨김
  if (/표지/.test(s.fields['배치'] || '')) {
    const text = bodyHtml(s);
    const icons = (s.iconGrid || '').replace('class="icons"', 'class="icons-row"');
    const [t1, ...t2] = (s.fields['제목'] || '').split(' / ');
    return `<section class="slide cover" data-id="${s.id}" data-part="${s.part}">
  <div class="cover-in">
    <h1 class="cover-title">${inline(t1)}${t2.length ? ` <em>${inline(t2.join(' '))}</em>` : ''}</h1>
    ${icons}
    <p class="cover-date a" style="--i:5">${inline(s.fields['설명'] || '')}</p>
    <div class="cover-by">${text}</div>
  </div>
  ${[...(s.fields['이미지'] || '').matchAll(/`images\/([^`]+)`/g)].map((m, i) => `<figure class="cover-art ${i ? 'right' : 'left'}">${existsSync(path.join(IMG_DIR, m[1])) ? `<img src="../images/${esc(m[1])}" alt="">` : `<div class="ph"><b>${esc(m[1])}</b><span>투명 배경 그림</span></div>`}</figure>`).join('')}
  ${notesHtml(s)}
</section>`;
  }
  const p = parts.find((x) => x.id === s.part);
  const body = bodyHtml(s);
  const bandFile = ((s.fields['띠 그림'] || '').match(/`images\/([^`]+)`/) || [])[1];
  const img = s.iconGrid || (s.cardImg ? '' : imageHtml(s));
  const desc = none(s.fields['설명']) ? '' : s.fields['설명'];
  const bottom = /이미지 하단/.test(s.fields['배치'] || '');
  const layout = body && img ? (bottom ? 'stack' : 'split') : img ? (/그림 가운데/.test(s.fields['배치'] || '') ? 'img-center' : 'img-only') : 'full';
  const solo = !body && !desc;
  return `<section class="slide${solo ? ' solo' : ''}" data-id="${s.id}" data-part="${s.part}"${s.steps ? ` data-steps="${s.steps}"` : ''}>
  <div class="head">
    <div class="eyebrow">${eyebrowHtml(s.fields['소제목'], p)}</div>
    <h1 class="title">${titleHtml(s.fields['제목'])}</h1>
    <p class="desc">${inline(desc)}</p>
  </div>
  <div class="body ${layout}${bandFile ? ' has-band' : ''}">${body ? `<div class="text"${/단계 카드/.test(s.fields['배치'] || '') ? ' data-fs="19" style="--fs:19px"' : (/글자 크게|카드/.test(s.fields['배치'] || '') || /^카드$/.test(s.bodyKind || '')) ? ' data-fs="26" style="--fs:26px"' : ''}>${body}</div>` : layout === 'img-only' ? '<div class="text"></div>' : ''}${img ? `<div class="visual">${img}</div>` : ''}</div>${bandFile ? `<figure class="band">${existsSync(path.join(IMG_DIR, bandFile)) ? `<img src="../images/${esc(bandFile)}" alt="">` : `<div class="ph"><b>${esc(bandFile)}</b><span>띠 그림 · 투명 배경</span></div>`}</figure>` : ''}
  ${s.fields['각주'] ? `<p class="footnote">${inline(s.fields['각주'])}</p>` : ''}
  ${notesHtml(s)}
</section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>생기부 AI 작업실 연수</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT.css" media="print" onload="this.media='all'">
<link rel="stylesheet" href="deck.css?v=${Date.now()}">
</head>
<body>
<button class="reading-toggle" type="button" aria-pressed="false">크게 보기</button>
<div class="stage">
  <header class="topbar">
    <div class="brand"><img class="brand-icon" src="../images/icon-workbench.png" alt="">생기부 AI 작업실<span class="brand-sub">교사 연수</span></div>
    <nav class="rail" aria-label="부 이동"></nav>
    <div class="top-right"><button class="icon-btn fs" title="전체 화면 (F)" aria-label="전체 화면">⛶</button></div>
  </header>
${slideHtml}
  <footer class="bottombar">
    <div class="page-now"><b></b><span class="name"></span><span class="of count"></span></div>
    <div class="nav"><span class="hint"><kbd>←</kbd><kbd>→</kbd> 이동 <kbd>N</kbd> 발표 메모 <kbd>F</kbd> 전체 화면</span><button class="prev" aria-label="이전">←</button><button class="next" aria-label="다음">→</button></div>
  </footer>
  <div class="progress"><i></i></div>
</div>
<div class="notes-panel" aria-live="polite"></div>
<script type="application/json" id="parts">${JSON.stringify(parts.map(({ id, num, name, first }) => ({ id, num, name, first, short: RAIL_NAMES[id] || name })))}</script>
<script src="deck.js?v=${Date.now()}"></script>
</body>
</html>
`;
writeFileSync(OUT, html.replace(/^ +$/gm, ''));
console.log(`슬라이드 ${slides.length}장 · 부 ${parts.length}개 → ${path.relative(process.cwd(), OUT)}`);
