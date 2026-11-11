// 생기부 AI 작업실 연수 슬라이드 v2 — 넘기기 · 화면 맞춤 · 효과
// ← → Space PgUp PgDn Home End: 이동 · F: 전체 화면 · N: 발표 메모 · #/번호: 그 장으로
(() => {
  const stage = document.querySelector('.stage');
  const slides = [...document.querySelectorAll('.slide')];
  const parts = JSON.parse(document.getElementById('parts').textContent);
  const rail = document.querySelector('.rail');
  const nowNum = document.querySelector('.page-now b');
  const nowName = document.querySelector('.page-now .name');
  const nowCount = document.querySelector('.page-now .count');
  const bar = document.querySelector('.progress i');
  const notesPanel = document.querySelector('.notes-panel');
  const readingToggle = document.querySelector('.reading-toggle');
  readingToggle.addEventListener('click', () => {
    const enabled = document.documentElement.classList.toggle('reading');
    readingToggle.setAttribute('aria-pressed', String(enabled));
    readingToggle.textContent = enabled ? '화면에 맞추기' : '크게 보기';
    window.scrollTo(0, 0);
  });
  let cur = -1;

  // 화면에 맞춰 무대 배율 조정(스크롤 없음)
  const fitStage = () => stage.style.setProperty('--scale', Math.min(innerWidth / 1600, innerHeight / 900));
  addEventListener('resize', fitStage); fitStage();

  // 레일: 부 번호
  parts.forEach((p) => {
    const b = document.createElement('button');
    b.innerHTML = `<span class="rn">${p.num}</span><span class="rl">${p.short}</span>`; b.title = p.name;
    b.addEventListener('click', () => go(p.first));
    rail.append(b);
  });

  // 본문이 넘치면 글자 크기를 줄여 맞춘다(최소 13px)
  function fitBody(slide) {
    const text = slide.querySelector('.body .text');
    if (!text) return;
    let fs = Number(text.dataset.fs || 22);
    text.style.setProperty('--fs', fs + 'px');
    let guard = 0;
    const stacked = text.parentElement.classList.contains("stack");
    while (!stacked && text.scrollHeight > text.clientHeight + 20 && fs > 13 && guard++ < 40) {
      fs -= 0.5; text.style.setProperty('--fs', fs + 'px');
    }
    // 제목·설명이 무대 폭을 넘으면 그 장만 살짝 줄인다(위치는 그대로)
    for (const [sel, min] of [['.title', 34], ['.desc', 15]]) {
      const el = slide.querySelector(sel); if (!el) continue;
      el.style.fontSize = '';
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth + 1 && size > min) { size -= 1; el.style.fontSize = size + 'px'; }
    }
  }

  // 숫자 올라가기
  function countUp(slide) {
    slide.querySelectorAll('[data-count]').forEach((el) => {
      const raw = el.dataset.count; const m = raw.match(/[\d,]+(\.\d+)?/);
      if (!m) return;
      const target = parseFloat(m[0].replace(/,/g, '')); const dec = (m[1] || '').length ? m[1].length - 1 : 0;
      const pre = raw.slice(0, m.index), post = raw.slice(m.index + m[0].length);
      const t0 = performance.now(), dur = 1100;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        const v = (target * e).toFixed(dec);
        el.textContent = pre + Number(v).toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + post;
        if (k < 1 && slide.classList.contains('on')) requestAnimationFrame(step); else el.textContent = raw;
      };
      el.textContent = pre + '0' + post;
      setTimeout(() => requestAnimationFrame((t) => { step(t); }), 450);
    });
    slide.querySelectorAll('.tbl .bar i').forEach((i) => { i.style.width = '0'; requestAnimationFrame(() => requestAnimationFrame(() => { i.style.width = i.dataset.w; })); });
  }

  // 클릭 단계(파워포인트식): data-steps 가 있는 장은 다음/이전이 먼저 단계를 넘긴다
  function setStep(s, k) {
    s.dataset.step = k;
    s.querySelectorAll('[data-on]').forEach((el) => el.classList.toggle('lit', k > 0 && el.dataset.on.split(' ').includes(String(k))));
    s.querySelectorAll('.mark-tab').forEach((t) => { const on = Number(t.dataset.step) === k; t.classList.toggle('cur', on); t.setAttribute('aria-pressed', on); });
    s.classList.toggle('marking', k > 0);
  }
  function next() {
    const s = slides[cur]; const n = Number(s?.dataset.steps || 0);
    if (n && Number(s.dataset.step || 0) < n) return setStep(s, Number(s.dataset.step || 0) + 1);
    go(cur + 1);
  }
  function prev() {
    const s = slides[cur]; const n = Number(s?.dataset.steps || 0);
    if (n && Number(s.dataset.step || 0) > 0) return setStep(s, Number(s.dataset.step || 0) - 1);
    go(cur - 1);
  }
  function go(n) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    if (n === cur) return;
    const prev = slides[cur];
    if (prev) { prev.classList.remove('on'); }
    const s = slides[n];
    // 애니메이션을 처음부터 다시: 클래스를 떼었다가 다음 프레임에 붙인다
    void s.offsetWidth;
    if (s.dataset.steps || s.querySelector('.mark')) setStep(s, 0);
    s.classList.add('on');
    cur = n;
    const part = parts.find((p) => p.id === s.dataset.part);
    stage.className = 'stage ' + (part ? 'p' + part.id : '') + (s.classList.contains('cover') ? ' is-cover' : '') + (s.classList.contains('solo') ? ' is-solo' : '');
    [...rail.children].forEach((b, i) => b.classList.toggle('on', parts[i].id === s.dataset.part));
    nowNum.textContent = part ? part.num : '';
    nowName.textContent = part ? part.name : '';
    nowCount.textContent = `${n + 1} / ${slides.length}`;
    bar.style.width = ((n + 1) / slides.length * 100) + '%';
    fitBody(s); countUp(s);
    const notes = s.querySelector('.notes');
    notesPanel.innerHTML = `<h4>${s.dataset.id} 발표 메모</h4>` + (notes ? notes.innerHTML : '<p>메모 없음</p>');
    if (location.hash !== '#/' + (n + 1)) history.replaceState(null, '', '#/' + (n + 1));
  }

  const fromHash = () => { const m = location.hash.match(/#\/(\d+)/); return m ? Number(m[1]) - 1 : 0; };
  addEventListener('hashchange', () => go(fromHash()));
  document.querySelector('.nav .prev').addEventListener('click', () => prev());
  document.querySelector('.nav .next').addEventListener('click', () => next());
  // 무대 왼쪽은 이전, 오른쪽은 다음(단계 → 장). 상호작용 요소는 제외
  stage.addEventListener('click', (e) => {
    if (e.target.closest('button, a, input, select, textarea, [contenteditable], .rail, .notes-panel, .mark')) return;
    const bounds = stage.getBoundingClientRect();
    if (e.clientX < bounds.left + bounds.width / 2) prev(); else next();
  });
  // 영역 뱃지: 누르면 그 영역 코드 표시, 같은 뱃지를 다시 누르면 해제
  stage.addEventListener('click', (e) => { const b = e.target.closest('.mark-tab'); if (!b) return; const s = b.closest('.slide'); const k = Number(b.dataset.step); setStep(s, Number(s.dataset.step || 0) === k ? 0 : k); });
  document.querySelector('.fs').addEventListener('click', () => toggleFs());
  const toggleFs = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if ((k === 'Enter' || k === ' ') && e.target?.closest?.('button, a, input, select, textarea, [contenteditable]:not([contenteditable="false"])')) return;
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === 'f' || k === 'F') toggleFs();
    else if (k === 'n' || k === 'N') notesPanel.classList.toggle('open');
    else if (k === 'Escape') notesPanel.classList.remove('open');
  });

  // 글꼴이 늦게 오면 크기 맞춤을 다시
  (document.fonts?.ready || Promise.resolve()).then(() => { const s = slides[cur]; if (s) fitBody(s); });
  // 첫 장은 첫 화면 그리기 뒤에 켠다(바로 켜면 일부 브라우저에서 애니메이션 시계가 멈춘 채 시작됨)
  const start = () => requestAnimationFrame(() => requestAnimationFrame(() => go(fromHash())));
  if (document.readyState === "complete") start(); else addEventListener("load", start, { once: true });
})();

