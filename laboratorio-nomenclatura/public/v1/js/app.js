/* Laboratorio de Nomenclatura — lógica del juego */
(function () {
  'use strict';
  const B = window.BANCO, L = window.LAB;
  const { fHTML, ionHTML, shuffle, esc } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const LEVELS = {
    1: { name: 'Detective', n: 8, desc: 'Clasifica con el mapa de familias y elige el nombre.' },
    2: { name: 'Ensamble', n: 8, desc: 'Arma la fórmula con iones: la carga total debe ser cero.' },
    3: { name: 'Decodificador', n: 6, desc: 'Calcula la valencia con 2·O − H y sube a la escalera.' }
  };
  const MAX_BASE = (LEVELS[1].n + LEVELS[2].n + LEVELS[3].n) * 100;
  const HELP_COST = 10, STREAK_BONUS = 20;

  /* ---------------- estado ---------------- */
  const S = {
    player: { nombre: '', mat: '', grupo: '' }, mode: 'reto', level: 1, items: [], idx: 0,
    score: 0, base: 0, streak: 0, bestStreak: 0, first: 0, done: 0, t0: 0, tick: null,
    lvlScore: { 1: 0, 2: 0, 3: 0 }, review: [], item: null, ctxCard: 'mapa'
  };

  /* ---------------- pantallas ---------------- */
  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + id));
    window.scrollTo(0, 0);
  }
  $$('[data-go]').forEach(b => b.addEventListener('click', () => { stopTimer(); show(b.dataset.go); }));

  /* ---------------- registro ---------------- */
  const params = new URLSearchParams(location.search);
  const lockedGroup = params.get('grupo');
  try {
    const saved = JSON.parse(localStorage.getItem('labnom-player') || 'null');
    if (saved) { $('#i-nombre').value = saved.nombre || ''; $('#i-mat').value = saved.mat || ''; $('#i-grupo').value = saved.grupo || ''; }
  } catch (e) { /* sin almacenamiento */ }
  if (lockedGroup) { $('#i-grupo').value = L.normGrupo(lockedGroup); $('#i-grupo').readOnly = true; }
  $('#lnk-rank').href = 'ranking.html' + (lockedGroup ? '?grupo=' + encodeURIComponent(L.normGrupo(lockedGroup)) : '');

  $$('.mode[data-mode]').forEach(b => b.addEventListener('click', () => {
    S.mode = b.dataset.mode;
    $$('.mode[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('#f-inicio').addEventListener('submit', e => {
    e.preventDefault();
    const nombre = $('#i-nombre').value.trim().replace(/\s+/g, ' ');
    const mat = L.normMat($('#i-mat').value);
    const grupo = L.normGrupo($('#i-grupo').value);
    if (nombre.split(' ').length < 2) return ($('#i-err').textContent = 'Escribe tu nombre y al menos un apellido.');
    if (mat.length < 4) return ($('#i-err').textContent = 'Revisa tu matrícula.');
    if (!$('#i-grupo').value.trim()) return ($('#i-err').textContent = 'Escribe tu grupo.');
    $('#i-err').textContent = '';
    S.player = { nombre, mat, grupo };
    try { localStorage.setItem('labnom-player', JSON.stringify(S.player)); } catch (e2) { /* ok */ }
    if (S.mode === 'reto') startReto(); else show('practica');
  });
  $$('[data-prac]').forEach(b => b.addEventListener('click', () => startPractice(+b.dataset.prac)));

  /* ---------------- selección de reactivos ---------------- */
  const pool = lvl => B.items.filter(i => i.lvl.includes(lvl));
  const pick = (arr, used) => { const c = shuffle(arr.filter(x => !used.has(x.id))); const x = c[0] || shuffle(arr)[0]; used.add(x.id); return x; };
  function buildLevel(lvl) {
    const used = new Set(), P = pool(lvl), out = [];
    const byFam = f => P.filter(i => i.fam === f);
    if (lvl === 1) {
      const fams = shuffle(['binaria', 'haluro', 'hidruro_met', 'hidruro_vol', 'oxido', 'peroxido', 'hidroxido', 'oxoacido', 'oxisal', 'sal_acida']).slice(0, 8);
      fams.forEach(f => out.push({ it: pick(byFam(f), used) }));
    } else if (lvl === 2) {
      const fams = shuffle(['oxisal', 'oxisal', 'sal_acida', 'hidroxido', 'binaria', 'oxido', 'peroxido', 'hidruro_met']);
      const modes = shuffle(['iones', 'iones', 'iones', 'iones', 'nombre', 'nombre', 'nombre', 'nombre']);
      fams.forEach((f, k) => out.push({ it: pick(byFam(f).filter(i => i.ion), used), mode: modes[k] }));
    } else {
      const acids = byFam('oxoacido'), salts = byFam('oxisal'), acidSalts = byFam('sal_acida');
      out.push({ it: pick(acids, used), mode: 'acido' });
      out.push({ it: pick(acids.filter(i => i.dec.pre), used), mode: 'acido' });
      out.push({ it: pick(acids.filter(i => i.dec.inv && !i.dec.pre), used), mode: 'inverso' });
      out.push({ it: pick(salts.filter(i => !i.dec.trap), used), mode: 'sal' });
      out.push({ it: pick(Math.random() < .5 ? salts.filter(i => i.dec.trap) : salts.filter(i => i.dec.simp && !i.dec.trap), used), mode: 'sal' });
      out.push({ it: pick(acidSalts, used), mode: 'sal' });
      const head = out.slice(0, 2), rest = shuffle(out.slice(2));
      out.length = 0; out.push(...head, ...rest);
    }
    return out;
  }

  /* ---------------- flujo ---------------- */
  function resetRun() {
    Object.assign(S, { score: 0, base: 0, streak: 0, bestStreak: 0, first: 0, done: 0, lvlScore: { 1: 0, 2: 0, 3: 0 }, review: [] });
  }
  function startReto() {
    resetRun(); S.mode = 'reto'; S.t0 = Date.now(); startTimer();
    $('#b-salir').classList.add('hidden'); $('#h-time-w').classList.remove('hidden');
    startLevel(1);
  }
  function startPractice(lvl) {
    resetRun(); S.mode = 'practica';
    $('#b-salir').classList.remove('hidden'); $('#h-time-w').classList.add('hidden');
    startLevel(lvl);
  }
  $('#b-salir').addEventListener('click', () => show('practica'));
  function startLevel(lvl) {
    S.level = lvl; S.items = buildLevel(lvl); S.idx = 0;
    $('#h-lvl').textContent = `Nivel ${lvl} · ${LEVELS[lvl].name}`;
    show('juego'); nextItem();
  }
  function startTimer() {
    stopTimer();
    S.tick = setInterval(() => { $('#h-time').textContent = L.fmtTime((Date.now() - S.t0) / 1000); }, 500);
  }
  function stopTimer() { if (S.tick) clearInterval(S.tick); S.tick = null; }

  function drawDots() {
    $('#h-dots').innerHTML = S.items.map((x, k) => `<i class="${k < S.idx ? x.cls || 'done' : k === S.idx ? 'cur' : ''}"></i>`).join('');
  }
  function hud() {
    $('#h-score').textContent = S.score; $('#h-streak').textContent = S.streak ? '🔥' + S.streak : '0';
  }
  function bump(id) { const e = $(id); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }

  function nextItem() {
    if (S.idx >= S.items.length) return endLevel();
    const slot = S.items[S.idx];
    S.item = { slot, it: slot.it, earned: 0, max: 100, errors: 0, help: false, free: false };
    drawDots(); hud(); keyHandler = null;
    const st = $('#stage'); st.innerHTML = '';
    if (S.level === 1) renderL1(st); else if (S.level === 2) renderL2(st); else renderL3(st);
  }
  function addPoints(p) {
    S.item.earned += p;
    if (p > 0) { S.score += p; hud(); bump('#h-score'); }
  }
  function finishItem() {
    const I = S.item, perfect = I.errors === 0 && !I.help;
    const earned = Math.max(0, I.earned);
    if (I.earned < 0) S.score -= I.earned; // no restar más de lo ganado en el reactivo
    S.base += earned; S.lvlScore[S.level] += earned; S.done++;
    if (perfect) {
      S.first++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak);
      if (S.streak >= 3) { S.score += STREAK_BONUS; }
    } else S.streak = 0;
    I.slot.cls = earned >= 90 ? 'done' : earned >= 40 ? 'half' : 'miss';
    if (!perfect) S.review.push(I.it);
    hud(); if (perfect) bump('#h-streak');
    S.idx++;
    const st = $('#stage');
    const row = document.createElement('div'); row.className = 'next-row';
    const bonus = perfect && S.streak >= 3 ? ` <span class="muted">· racha +${STREAK_BONUS}</span>` : '';
    row.innerHTML = `<span class="muted" style="margin-right:auto;align-self:center">+${earned} pts${bonus}</span><button class="btn primary" id="b-next">${S.idx >= S.items.length ? 'Terminar estación ▶' : 'Siguiente ▶'}</button>`;
    st.appendChild(row);
    const b = $('#b-next'), born = Date.now(); setTimeout(() => b.focus({ preventScroll: true }), 400);
    b.addEventListener('click', () => { if (Date.now() - born > 350) nextItem(); });
    b.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function endLevel() {
    const lvl = S.level;
    $('#e-title').textContent = `${LEVELS[lvl].name}: ${S.lvlScore[lvl]} / ${LEVELS[lvl].n * 100}`;
    $('#e-score').textContent = S.mode === 'reto' ? S.score : '';
    $('#e-kick').textContent = `Estación ${lvl} completada`;
    $('#e-msg').textContent = S.mode === 'reto' ? 'Puntaje acumulado del reto' : 'Práctica: este puntaje no se registra.';
    const goBtn = $('#e-go');
    if (S.mode === 'reto' && lvl < 3) {
      $('#e-next').innerHTML = `<b>Siguiente: Nivel ${lvl + 1} · ${LEVELS[lvl + 1].name}</b><p class="muted" style="margin:.3em 0 0">${LEVELS[lvl + 1].desc}</p>`;
      goBtn.textContent = 'Continuar ▶'; goBtn.onclick = () => startLevel(lvl + 1);
    } else if (S.mode === 'reto') {
      $('#e-next').innerHTML = '<b>¡Terminaste las tres estaciones!</b><p class="muted" style="margin:.3em 0 0">Genera tu constancia y tu código de evidencia.</p>';
      goBtn.textContent = 'Ver resultados ▶'; goBtn.onclick = finalScreen;
      stopTimer(); S.time = Math.round((Date.now() - S.t0) / 1000);
    } else {
      $('#e-next').innerHTML = `<b>¿Otra ronda?</b><p class="muted" style="margin:.3em 0 0">${S.review.length ? 'Te conviene repasar: ' + S.review.slice(-6).map(i => fHTML(i.f)).join(', ') : 'Sin errores. ¡Excelente!'}</p>`;
      goBtn.textContent = 'Otra ronda ▶'; goBtn.onclick = () => { resetRun(); startLevel(lvl); };
    }
    show('entre');
  }

  /* ---------------- componentes ---------------- */
  // Opciones múltiples: 2 errores permitidos, luego se revela.
  function mcq(container, options, correct, max, onDone, { html = false, explain } = {}) {
    let tries = 0, closed = false;
    const opts = shuffle(options);
    container.innerHTML = `<div class="opts">${opts.map((o, k) => `<button class="opt" data-k="${k}"><kbd>${k + 1}</kbd><span>${html ? o : esc(o)}</span></button>`).join('')}</div><div class="fb"></div>`;
    const btns = $$('.opt', container);
    const choose = k => {
      if (closed) return;
      const b = btns[k]; if (!b || b.disabled) return;
      if (opts[k] === correct) {
        b.classList.add('ok'); closed = true; btns.forEach(x => (x.disabled = true));
        const pts = tries === 0 ? max : tries === 1 ? Math.round(max / 2) : 0;
        if (tries === 0) feedback(container.querySelector('.fb'), 'ok', '¡Correcto!', '');
        onDone(pts, tries);
      } else {
        tries++; S.item.errors++; b.classList.add('bad'); b.disabled = true;
        if (tries >= 2) {
          const kk = opts.indexOf(correct); btns[kk].classList.add('ok'); closed = true; btns.forEach(x => (x.disabled = true));
          feedback(container.querySelector('.fb'), 'bad', 'Respuesta:', (html ? correct : esc(correct)) + (explain ? ' — ' + explain : ''));
          onDone(0, tries);
        } else feedback(container.querySelector('.fb'), 'bad', 'Aún no.', explain ? 'Pista: ' + explain : 'Intenta otra vez.');
      }
    };
    btns.forEach((b, k) => b.addEventListener('click', () => choose(k)));
    keyHandler = e => { const n = +e.key; if (n >= 1 && n <= opts.length) choose(n - 1); };
  }
  let keyHandler = null;
  document.addEventListener('keydown', e => {
    if ($('#m-atajos').classList.contains('on') || !$('#s-juego').classList.contains('on')) return;
    if (e.target.tagName === 'INPUT') return;
    if (keyHandler) keyHandler(e);
  });
  function feedback(el, kind, title, body, card) {
    if (!el) return;
    el.innerHTML = `<div class="feedback ${kind}"><b>${title}</b><p>${body || ''}</p>${card ? `<button class="btn small" data-card="${card}">💡 ${L.CARDS[card].t}</button>` : ''}</div>`;
    const b = el.querySelector('[data-card]'); if (b) b.addEventListener('click', () => openCards(card, true));
  }
  function numStep(container, label, expected, max, hints, onDone, card) {
    let tries = 0, closed = false;
    container.insertAdjacentHTML('beforeend', `<div class="numstep"><p style="margin:.2em 0 .5em">${label}</p>
      <div class="numin"><input type="number" inputmode="numeric" aria-label="Respuesta"><button class="btn primary small">Comprobar</button></div><div class="fb"></div></div>`);
    const box = container.lastElementChild, inp = $('input', box), btn = $('button', box), fb = $('.fb', box);
    inp.focus({ preventScroll: true });
    const go = () => {
      if (closed || inp.value === '') return;
      if (+inp.value === expected) {
        closed = true; inp.disabled = btn.disabled = true; inp.style.borderColor = 'var(--ok)';
        feedback(fb, 'ok', '¡Correcto!', '');
        onDone(tries === 0 ? max : tries === 1 ? Math.round(max / 2) : 0);
      } else {
        tries++; S.item.errors++; inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
        if (tries >= 2) {
          closed = true; inp.value = expected; inp.disabled = btn.disabled = true;
          feedback(fb, 'bad', 'Era ' + expected + '.', hints[1] || hints[0], card); onDone(0);
        } else feedback(fb, 'bad', 'Aún no.', hints[0], card);
      }
    };
    btn.addEventListener('click', go); inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  /* ---------------- NIVEL 1: Detective ---------------- */
  function renderL1(st) {
    const it = S.item.it; S.ctxCard = 'mapa';
    st.innerHTML = `<p class="prompt">Reactivo ${S.idx + 1} de ${S.items.length} · clasifica y nombra</p>
      <div class="bigformula">${fHTML(it.f)}</div>
      <div class="grid2">
        <div class="box" id="l1-tree"><h3><span class="step-n">1</span> ¿A qué familia pertenece?</h3><div class="trail"></div><div class="node"></div><div class="fb"></div></div>
        <div class="box" id="l1-name" style="opacity:.45"><h3><span class="step-n">2</span> ¿Cómo se llama?</h3><div class="mc"><p class="muted">Primero clasifica.</p></div></div>
      </div>`;
    const expected = L.pathTo(it.fam), box = $('#l1-tree');
    let node = L.TREE, errs = 0;
    const ask = () => {
      if (node.leaf) {
        const pts = Math.max(10, 50 - 15 * errs);
        $('.node', box).innerHTML = `<div class="family">✔ ${L.FAM[node.leaf]}</div>`;
        $('.fb', box).innerHTML = '';
        addPoints(pts); keyHandler = null;
        return stepName();
      }
      const exp = expected.find(([n]) => n === node)[1];
      $('.node', box).innerHTML = `<p class="node-q">${node.q}</p><div class="yn"><button class="btn" data-a="si"><kbd>S</kbd> Sí</button><button class="btn" data-a="no"><kbd>N</kbd> No</button></div>`;
      const answer = a => {
        if (a === exp) {
          $('.trail', box).insertAdjacentHTML('beforeend', `<span>${node.s} <b>${a === 'si' ? 'Sí' : 'No'}</b></span>`);
          node = node[a]; $('.fb', box).innerHTML = ''; ask();
        } else {
          errs++; S.item.errors++;
          const b = $(`[data-a="${a}"]`, box); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
          feedback($('.fb', box), 'bad', 'Revisa:', node.hint, 'mapa');
        }
      };
      $$('[data-a]', box).forEach(b => b.addEventListener('click', () => answer(b.dataset.a)));
      keyHandler = e => { const k = e.key.toLowerCase(); if (k === 's') answer('si'); if (k === 'n') answer('no'); };
    };
    const stepName = () => {
      const nb = $('#l1-name'); nb.style.opacity = 1;
      mcq($('.mc', nb), [it.name, ...it.wrong], it.name, 50, pts => { addPoints(pts); finishItem(); },
        { explain: explainName(it) });
      S.ctxCard = ['oxoacido'].includes(it.fam) ? 'escalera' : ['oxisal', 'sal_acida'].includes(it.fam) ? 'osito' : 'stock';
    };
    ask();
  }
  function explainName(it) {
    const c = it.ion && B.cations[it.ion.c];
    if (['oxoacido'].includes(it.fam)) return `aplica 2·O − H para saber la valencia y ubícala en la escalera de sufijos.`;
    if (['oxisal', 'sal_acida'].includes(it.fam)) return `cambia –oso→–ito, –ico→–ato${it.fam === 'sal_acida' ? ' y no olvides el prefijo hidrogeno-' : ''}${c && /\(/.test(c.n) ? '; indica la valencia del metal en romanos' : ''}.`;
    if (c && /\(/.test(c.n)) return `el ${c.n.split(' ')[0]} tiene más de una valencia: escribe con romanos la que usa (${c.n.match(/\((.+)\)/)[1]}).`;
    if (c) return `el ${c.n} tiene una sola valencia: no lleva número romano.`;
    return 'revisa la tarjeta “Cómo se nombra”.';
  }

  /* ---------------- NIVEL 2: Ensamble ---------------- */
  function tileHTML(key, kind) {
    const d = kind === 'c' ? B.cations[key] : B.anions[key];
    const sym = d.s === 'O2' ? 'O<sub>2</sub>' : fHTML(d.s);
    const q = Math.abs(d.q), ch = (q > 1 ? q : '') + (d.q > 0 ? '+' : '−');
    return `<div class="tile ${kind === 'a' ? 'an' : ''}" data-key="${esc(key)}" data-kind="${kind}" tabindex="0" role="button" aria-label="${esc(d.n)} ${ch}">
      <span class="ch">${ch}</span><span class="sym">${sym}</span><span class="nm">${esc(d.n)}</span></div>`;
  }
  function formulaFrom(ck, ak, nc, na) {
    const c = B.cations[ck], a = B.anions[ak];
    const part = (s, n, poly) => n === 1 ? s : poly ? `(${s})${n}` : `${s}${n}`;
    const an = a.kind === 'peroxido' ? `O${2 * na}` : part(a.s, na, a.poly);
    return part(c.s, nc, c.poly) + an;
  }
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  function distractIons(it) {
    const cc = B.cations[it.ion.c], aa = B.anions[it.ion.a];
    const cs = new Set([it.ion.c]);
    Object.keys(B.cations).filter(k => B.cations[k].s === cc.s && k !== it.ion.c).forEach(k => cs.add(k));
    shuffle(Object.keys(B.cations)).forEach(k => { if (cs.size < 4) cs.add(k); });
    const as = new Set([it.ion.a]);
    shuffle(Object.keys(B.anions).filter(k => B.anions[k].grp === aa.grp && k !== it.ion.a)).forEach(k => { if (as.size < 3) as.add(k); });
    shuffle(Object.keys(B.anions)).forEach(k => { if (as.size < 4) as.add(k); });
    return { cats: shuffle([...cs].slice(0, 4)), ans: shuffle([...as].slice(0, 4)) };
  }
  function renderL2(st) {
    const it = S.item.it, mode = S.item.slot.mode; S.ctxCard = 'cruce';
    const c = B.cations[it.ion.c], a = B.anions[it.ion.a];
    const head = mode === 'iones'
      ? `<p class="prompt">Reactivo ${S.idx + 1} de ${S.items.length} · ensambla estos iones</p><div class="bigname">${ionHTML(c.s, c.q)} &nbsp;+&nbsp; ${a.s === 'O2' ? 'O<sub>2</sub><sup>2−</sup>' : ionHTML(a.s, a.q)}</div>`
      : `<p class="prompt">Reactivo ${S.idx + 1} de ${S.items.length} · formula este compuesto</p><div class="bigname">${esc(it.name)}</div>`;
    const ions = mode === 'iones' ? { cats: [it.ion.c], ans: [it.ion.a] } : distractIons(it);
    st.innerHTML = `${head}
      <div class="box">
        <h3><span class="step-n">1</span> ${mode === 'iones' ? 'Arrastra (o toca) los iones al reactor y ajusta los subíndices' : 'Elige el catión y el anión correctos, llévalos al reactor y ajusta los subíndices'}</h3>
        <div class="tray-label">Cationes</div><div class="tray" id="t-c">${ions.cats.map(k => tileHTML(k, 'c')).join('')}</div>
        <div class="tray-label">Aniones</div><div class="tray" id="t-a">${ions.ans.map(k => tileHTML(k, 'a')).join('')}</div>
        <div class="tray-label">Reactor</div>
        <div class="reactor" id="reactor">
          <div class="slot" id="sl-c"><div class="empty">catión</div><div class="counter"><button data-d="c-">−</button><output id="n-c">1</output><button data-d="c+">+</button></div></div>
          <div class="plus">+</div>
          <div class="slot" id="sl-a"><div class="empty">anión</div><div class="counter"><button data-d="a-">−</button><output id="n-a">1</output><button data-d="a+">+</button></div></div>
        </div>
        <div class="meter"><div class="meter-bar"><div class="pos"></div><div class="neg"></div></div><div class="meter-txt"><span id="m-pos">+0</span><span class="sum" id="m-sum">Σ = 0</span><span id="m-neg">−0</span></div></div>
        <div class="preview" id="preview"></div>
        <div class="next-row" style="margin-top:6px"><button class="btn primary" id="b-check">Verificar fórmula</button></div>
        <div class="fb" id="fb2"></div>
      </div>
      <div class="box hidden" id="l2-name" style="margin-top:14px"><h3><span class="step-n">2</span> ¿Cómo se llama?</h3><div class="mc"></div></div>`;
    const R = { c: null, a: null, nc: 1, na: 1 };
    let ionErr = 0, fErr = 0, closed = false;
    const update = () => {
      $('#n-c').textContent = R.nc; $('#n-a').textContent = R.na;
      const qc = R.c ? B.cations[R.c].q * R.nc : 0, qa = R.a ? B.anions[R.a].q * R.na : 0, sum = qc + qa;
      const scale = Math.max(6, Math.abs(qc), Math.abs(qa));
      $('.meter-bar .pos').style.width = (50 * qc / scale) + '%';
      $('.meter-bar .neg').style.width = (50 * -qa / scale) + '%';
      $('#m-pos').textContent = R.c ? `${R.nc} × (+${B.cations[R.c].q}) = +${qc}` : '+0';
      $('#m-neg').textContent = R.a ? `${R.na} × (${B.anions[R.a].q}) = ${qa}` : '−0';
      $('#m-sum').textContent = `Σ = ${sum > 0 ? '+' : ''}${sum}`; $('#m-sum').classList.toggle('zero', sum === 0 && R.c && R.a);
      $('#preview').innerHTML = R.c && R.a ? fHTML(formulaFrom(R.c, R.a, R.nc, R.na)) : '<span class="muted" style="font-size:1rem">la fórmula aparecerá aquí</span>';
    };
    const place = (key, kind) => {
      if (closed) return;
      R[kind] = key;
      const slot = $(kind === 'c' ? '#sl-c' : '#sl-a');
      slot.firstElementChild.outerHTML = tileHTML(key, kind);
      const placed = slot.firstElementChild; placed.title = 'Toca para regresarlo';
      placed.addEventListener('click', () => { if (closed) return; R[kind] = null; placed.outerHTML = `<div class="empty">${kind === 'c' ? 'catión' : 'anión'}</div>`; markTray(); update(); });
      markTray(); update();
    };
    const markTray = () => $$('#t-c .tile, #t-a .tile').forEach(t => t.classList.toggle('gone', R[t.dataset.kind] === t.dataset.key));
    $$('[data-d]', st).forEach(b => b.addEventListener('click', () => {
      if (closed) return;
      const [k, op] = [b.dataset.d[0], b.dataset.d[1]], f = k === 'c' ? 'nc' : 'na';
      R[f] = Math.min(6, Math.max(1, R[f] + (op === '+' ? 1 : -1))); update();
    }));
    enableDrag($$('#t-c .tile, #t-a .tile'), $('#reactor'), place);
    update();
    $('#b-check').addEventListener('click', () => {
      if (closed) return;
      const fb = $('#fb2');
      if (!R.c || !R.a) return feedback(fb, 'bad', 'Falta un ion.', 'Lleva un catión y un anión al reactor.');
      if (R.c !== it.ion.c || R.a !== it.ion.a) {
        ionErr++; S.item.errors++;
        const wrongC = R.c !== it.ion.c, wrongA = R.a !== it.ion.a;
        let msg = wrongC ? `El catión no corresponde: “${esc(it.name.split(' de ').slice(1).join(' de '))}” indica ${esc(B.cations[it.ion.c].n)}. ` : '';
        if (wrongA) msg += `El anión no corresponde a “${esc(it.name.split(' de ')[0].toLowerCase())}”.`;
        if (ionErr >= 3) { place(it.ion.c, 'c'); place(it.ion.a, 'a'); msg += ' Te los coloqué; ahora ajusta los subíndices.'; }
        return feedback(fb, 'bad', 'Revisa los iones.', msg, it.fam === 'oxisal' || it.fam === 'sal_acida' ? 'osito' : 'stock');
      }
      const sum = B.cations[R.c].q * R.nc + B.anions[R.a].q * R.na;
      if (sum !== 0 || gcd(R.nc, R.na) !== 1) {
        fErr++; S.item.errors++;
        const msg = sum !== 0 ? `La carga total es ${sum > 0 ? '+' : ''}${sum}. Ajusta los subíndices hasta que Σ = 0.`
          : `Es neutra, pero no está simplificada: divide ${R.nc} y ${R.na} entre ${gcd(R.nc, R.na)}.${B.anions[R.a].kind === 'peroxido' ? ' (El O₂ del peróxido no se toca.)' : ''}`;
        if (fErr >= 3) { R.nc = it.ion.nc; R.na = it.ion.na; update(); }
        else return feedback(fb, 'bad', 'Aún no.', msg, 'cruce');
      }
      // fórmula correcta (o revelada tras 3 errores)
      closed = true; $('#b-check').disabled = true; $$('[data-d]', st).forEach(b => (b.disabled = true));
      const ionPts = mode === 'nombre' ? (ionErr === 0 ? 40 : ionErr === 1 ? 20 : 0) : 0;
      const fPts = fErr === 0 ? 60 : fErr === 1 ? 30 : fErr === 2 ? 10 : 0;
      addPoints(ionPts + fPts);
      feedback(fb, fErr >= 3 ? 'bad' : 'ok', fErr >= 3 ? 'Fórmula correcta:' : '¡Fórmula correcta!', `${fHTML(it.f)} &nbsp;·&nbsp; (+${B.cations[it.ion.c].q * it.ion.nc}) + (${B.anions[it.ion.a].q * it.ion.na}) = 0`);
      if (mode === 'iones') {
        const nb = $('#l2-name'); nb.classList.remove('hidden');
        mcq($('.mc', nb), [it.name, ...it.wrong], it.name, 40, p => { addPoints(p); finishItem(); }, { explain: explainName(it) });
        S.ctxCard = it.fam === 'oxisal' || it.fam === 'sal_acida' ? 'osito' : 'stock';
        nb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else { S.item.earned += 0; finishItem(); }
    });
  }
  function enableDrag(tiles, zone, place) {
    tiles.forEach(t => {
      let sx = 0, sy = 0, ghost = null, moved = false;
      t.addEventListener('pointerdown', e => {
        if (t.classList.contains('gone')) return;
        sx = e.clientX; sy = e.clientY; moved = false; t.setPointerCapture(e.pointerId);
      });
      t.addEventListener('pointermove', e => {
        if (!t.hasPointerCapture(e.pointerId)) return;
        if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) {
          moved = true; ghost = t.cloneNode(true); ghost.classList.add('ghost'); document.body.appendChild(ghost);
        }
        if (ghost) {
          ghost.style.left = (e.clientX - 48) + 'px'; ghost.style.top = (e.clientY - 48) + 'px';
          const r = zone.getBoundingClientRect();
          zone.classList.toggle('over', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom);
        }
      });
      const end = e => {
        if (!t.hasPointerCapture(e.pointerId)) return;
        t.releasePointerCapture(e.pointerId);
        const r = zone.getBoundingClientRect();
        const inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
        if (ghost) { ghost.remove(); ghost = null; }
        zone.classList.remove('over');
        if (!moved || inside) place(t.dataset.key, t.dataset.kind);
      };
      t.addEventListener('pointerup', end);
      t.addEventListener('pointercancel', () => { if (ghost) ghost.remove(); ghost = null; zone.classList.remove('over'); });
      t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(t.dataset.key, t.dataset.kind); } });
    });
  }

  /* ---------------- NIVEL 3: Decodificador ---------------- */
  const EL_NAME = { Cl: 'cloro', Br: 'bromo', I: 'yodo', S: 'azufre', Se: 'selenio', N: 'nitrógeno', P: 'fósforo', As: 'arsénico', C: 'carbono', B: 'boro', Cr: 'cromo', Mn: 'manganeso' };
  function ladder(container, d, labels, names, max, onDone, revealValues = true) {
    let tries = 0, closed = false;
    container.insertAdjacentHTML('beforeend', `<div><div class="ladder">${d.lad.map((v, k) => `<button class="rung" data-v="${v}" style="margin-bottom:${k * 10}px"><span class="val">${revealValues ? v : '?'}</span><span class="lab">${labels[k]}</span></button>`).join('')}</div><div class="fb"></div></div>`);
    const box = container.lastElementChild, fb = $('.fb', box);
    const rungs = $$('.rung', box);
    rungs.forEach(r => r.addEventListener('click', () => {
      if (closed) return;
      const v = +r.dataset.v;
      if (v === d.V) {
        closed = true; r.classList.add('ok'); rungs.forEach(x => (x.disabled = true));
        if (!revealValues) rungs.forEach((x, k) => { $('.val', x).textContent = d.lad[k]; });
        feedback(fb, 'ok', names[d.lad.indexOf(v)], '');
        onDone(tries === 0 ? max : tries === 1 ? Math.round(max / 2) : 0);
      } else {
        tries++; S.item.errors++; r.classList.add('bad'); r.disabled = true;
        if (tries >= 2 || rungs.filter(x => !x.disabled).length === 1) {
          closed = true; const ok = rungs[d.lad.indexOf(d.V)]; ok.classList.add('ok'); rungs.forEach(x => (x.disabled = true));
          feedback(fb, 'bad', 'Era: ' + names[d.lad.indexOf(d.V)], `valencia ${d.V}`, 'escalera'); onDone(0);
        } else feedback(fb, 'bad', 'Ese peldaño no.', 'Ubica tu valencia entre las del elemento: de la menor a la mayor.', 'escalera');
      }
    }));
  }
  function renderL3(st) {
    const it = S.item.it, d = it.dec, mode = S.item.slot.mode, X = d.X;
    const counts = `<div class="calc">O = <span class="hl-o">${d.O}</span> · H = <span class="hl-h">${d.H}</span> · nº de ${X} = <span class="hl-x">${d.nX}</span>${mode === 'sal' ? ` · metal: ${esc(B.cations[it.ion.c].s)}, subíndice ${it.ion.nc}` : ''}</div>`;
    const steps = (n, t) => `<h3 style="margin-top:14px"><span class="step-n">${n}</span> ${t}</h3>`;
    if (mode === 'acido') {
      S.ctxCard = 'atajo';
      st.innerHTML = `<p class="prompt">Reactivo ${S.idx + 1} de ${S.items.length} · decodifica el oxoácido</p><div class="bigformula">${fHTML(it.f)}</div>
        <div class="box" id="l3">${counts}${steps(1, `Valencia del ${EL_NAME[X]}: V = (2·O − H) ÷ nº de ${X}`)}</div>`;
      const box = $('#l3');
      numStep(box, `¿Cuánto vale V?`, d.V, 50, [`Sustituye: (2·${d.O} − ${d.H}) ÷ ${d.nX}`, `(2·${d.O} − ${d.H}) ÷ ${d.nX} = ${d.V}`], p => {
        addPoints(p); S.ctxCard = 'escalera';
        box.insertAdjacentHTML('beforeend', steps(2, `Súbela a la escalera del ${EL_NAME[X]} y obtén el nombre${d.pre ? ` (lleva el prefijo ${d.pre}-)` : ''}`));
        ladder(box, d, d.labels, d.names, 50, p2 => { addPoints(p2); finishItem(); });
      }, 'atajo');
    } else if (mode === 'sal') {
      S.ctxCard = 'atajo';
      const c = B.cations[it.ion.c];
      const fixed = !/\(/.test(c.n);
      st.innerHTML = `<p class="prompt">Reactivo ${S.idx + 1} de ${S.items.length} · decodifica la ${d.t === 'salacida' ? 'sal ácida' : 'oxisal'}</p><div class="bigformula">${fHTML(it.f)}</div>
        <div class="box" id="l3">${counts}${steps(1, 'Carga del anión')}</div>`;
      const box = $('#l3');
      const qHint = d.trap
        ? ['Si tomas el subíndice del metal (1), la valencia del no metal sale imposible: la fórmula estaba simplificada.', `La carga real es ${d.q}. Ver “Trampa: fórmula simplificada”.`]
        : fixed ? [`El ${c.n} siempre trabaja con +${c.q}. Carga del anión = (${c.q} × ${it.ion.nc}) ÷ ${it.ion.na}.`, `(${c.q} × ${it.ion.nc}) ÷ ${it.ion.na} = ${d.q}`]
          : [`Si la fórmula no está simplificada, la carga del anión es el subíndice del metal.`, `Carga del anión = ${d.q}`];
      numStep(box, '¿Qué carga tiene el anión? (escribe solo el número)', d.q, 25, qHint, p => {
        addPoints(p);
        box.insertAdjacentHTML('beforeend', steps(2, `Valencia del ${EL_NAME[X]}: V = 2·O − H − carga`));
        numStep(box, '¿Cuánto vale V?', d.V, 25, [`2·${d.O} − ${d.H} − ${d.q}`, `2·${d.O} − ${d.H} − ${d.q} = ${d.V}`], p2 => {
          addPoints(p2); S.ctxCard = 'osito';
          box.insertAdjacentHTML('beforeend', steps(3, 'Escalera con “osito y atico”: ¿qué anión es?'));
          ladder(box, d, d.labels, d.names, 25, p3 => {
            addPoints(p3);
            box.insertAdjacentHTML('beforeend', steps(4, 'Nombre completo de la sal') + '<div class="mc"></div>');
            mcq(box.lastElementChild, [it.name, ...it.wrong], it.name, 25, p4 => { addPoints(p4); finishItem(); }, { explain: explainName(it) });
          });
        }, d.trap ? 'trampa' : 'atajo');
      }, d.trap ? 'trampa' : 'atajo');
    } else { // inverso: nombre -> fórmula
      S.ctxCard = 'oxagua';
      const inv = d.inv;
      st.innerHTML = `<p class="prompt">Reactivo ${S.idx + 1} de ${S.items.length} · formula el oxoácido</p><div class="bigname">${esc(it.name)}</div>
        <div class="box" id="l3">${steps(1, `¿Qué valencia usa el ${EL_NAME[X]}? Toca el peldaño de su sufijo`)}</div>`;
      const box = $('#l3');
      ladder(box, d, d.labels, d.lad.map(v => `valencia ${v}`), 25, p => {
        addPoints(p);
        box.insertAdjacentHTML('beforeend', steps(2, `Óxido del ${EL_NAME[X]} con valencia ${d.V} (simplificado)`) + '<div class="mc"></div>');
        mcq(box.lastElementChild, [inv.ox, ...inv.oxw].map(fHTML), fHTML(inv.ox), 25, p2 => {
          addPoints(p2);
          box.insertAdjacentHTML('beforeend', steps(3, '¿Cuántas moléculas de agua le sumas?') + '<div class="mc"></div>');
          const W = { 1: '+ 1 H₂O', 2: '+ 2 H₂O', 3: '+ 3 H₂O (orto: B, P, As, Sb)' };
          mcq(box.lastElementChild, [W[1], W[2], W[3]], W[inv.w], 25, p3 => {
            addPoints(p3);
            box.insertAdjacentHTML('beforeend', steps(4, 'Suma y simplifica: ¿cuál es la fórmula?') + '<div class="mc"></div>');
            mcq(box.lastElementChild, [it.f, ...inv.fw].map(fHTML), fHTML(it.f), 25, p4 => { addPoints(p4); finishItem(); }, { html: true });
          }, { explain: 'normal = +1 H₂O, salvo B, P, As y Sb (+3).' });
        }, { html: true, explain: 'el óxido es X₂O_V y se simplifica si se puede.' });
      });
    }
  }

  /* ---------------- atajos (modal) ---------------- */
  let freeOpen = false;
  function openCards(card, free) {
    const m = $('#m-atajos');
    const inReto = S.mode === 'reto' && $('#s-juego').classList.contains('on') && S.item;
    const charge = inReto && !free && !S.item.help && !S.item.free;
    if (charge) { S.item.help = true; S.score -= HELP_COST; S.item.earned -= HELP_COST; hud(); }
    if (free && S.item) S.item.free = true;
    $('#m-cost').textContent = inReto ? (charge ? `Abrir atajos cuesta ${HELP_COST} puntos en este reactivo (ya descontados; puedes consultarlos libremente hasta el siguiente).` : (S.item.help || S.item.free) ? 'Consulta libre en este reactivo.' : '') : '';
    $('#m-tabs').innerHTML = Object.entries(L.CARDS).map(([k, v]) => `<button role="tab" data-t="${k}" aria-selected="${k === card}">${v.t}</button>`).join('');
    const showTab = k => { $$('#m-tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === k))); $('#m-body').innerHTML = L.CARDS[k].html(); };
    $$('#m-tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.t)));
    showTab(card || 'mapa');
    m.classList.add('on'); $('#m-close').focus();
  }
  $('#b-atajo').addEventListener('click', () => openCards(S.ctxCard, false));
  $('#m-close').addEventListener('click', () => $('#m-atajos').classList.remove('on'));
  $('#m-atajos').addEventListener('click', e => { if (e.target.id === 'm-atajos') $('#m-atajos').classList.remove('on'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#m-atajos').classList.remove('on'); });

  /* ---------------- final ---------------- */
  async function finalScreen() {
    const pct = Math.round(100 * S.base / MAX_BASE);
    S.result = { score: S.score, pct, time: S.time, first: S.first, total: S.done, streak: S.bestStreak, date: new Date() };
    $('#f-name').textContent = S.player.nombre;
    $('#f-score').textContent = S.score;
    $('#f-pct').textContent = pct + '%';
    $('#f-time').textContent = L.fmtTime(S.time);
    $('#f-first').textContent = `${S.first}/${S.done}`;
    $('#f-streak').textContent = S.bestStreak;
    $('#f-review').innerHTML = S.review.length
      ? S.review.map(i => `<div style="margin:.2em 0">${fHTML(i.f)} — ${esc(i.name)}</div>`).join('')
      : '¡Sin errores! Todo al primer intento.';
    $('#f-rlink').href = 'ranking.html?grupo=' + encodeURIComponent(S.player.grupo);
    show('final');
    const code = await L.makeCode({ score: S.score, pct, time: S.time, matricula: S.player.mat, date: S.result.date });
    S.result.code = code; $('#f-code').textContent = code;
    submitScore();
  }
  async function submitScore() {
    const msg = $('#f-rank');
    msg.textContent = 'Registrando en el ranking…'; msg.style.color = '';
    try {
      const r = await fetch('/api/score', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: S.player.nombre, matricula: S.player.mat, grupo: S.player.grupo, code: S.result.code,
          detalle: { l1: S.lvlScore[1], l2: S.lvlScore[2], l3: S.lvlScore[3], first: S.first, streak: S.bestStreak } })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'error');
      msg.innerHTML = j.mejorado
        ? `✅ Registrado. Vas en el lugar <b>#${j.posicion}</b> de ${j.participantes} en ${esc(S.player.grupo)}.`
        : `✅ Registrado. Tu mejor intento sigue siendo ${j.mejor} pts (lugar #${j.posicion} de ${j.participantes}).`;
      msg.style.color = 'var(--ok)';
    } catch (e) {
      msg.innerHTML = 'No se pudo registrar en el ranking (¿sin conexión?). Tu código sigue siendo válido. <button class="btn small" id="f-retry">Reintentar</button>';
      msg.style.color = 'var(--bad)';
      $('#f-retry').addEventListener('click', submitScore);
    }
  }
  $('#f-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(S.result.code); $('#f-copy').textContent = '¡Copiado!'; }
    catch (e) { const r = document.createRange(); r.selectNode($('#f-code')); getSelection().removeAllRanges(); getSelection().addRange(r); }
    setTimeout(() => ($('#f-copy').textContent = 'Copiar código'), 1800);
  });
  $('#f-png').addEventListener('click', () => {
    const R = S.result, cv = document.createElement('canvas'); cv.width = 1400; cv.height = 860;
    const x = cv.getContext('2d');
    x.fillStyle = '#F7F3EC'; x.fillRect(0, 0, 1400, 860);
    x.fillStyle = '#7B1E3A'; x.fillRect(0, 0, 1400, 150);
    x.fillStyle = '#fff'; x.font = '700 28px "Atkinson Hyperlegible", sans-serif';
    x.fillText('Universidad Xochicalco · CEUX Ensenada · Composición de la Materia', 60, 62);
    x.font = '800 52px "Bricolage Grotesque", sans-serif'; x.fillText('Constancia · Laboratorio de Nomenclatura', 60, 122);
    x.fillStyle = '#1E1A1B'; x.font = '700 46px "Atkinson Hyperlegible", sans-serif'; x.fillText(S.player.nombre, 60, 240);
    x.fillStyle = '#5B5357'; x.font = '28px "Atkinson Hyperlegible", sans-serif';
    x.fillText(`Matrícula ${S.player.mat}   ·   Grupo ${S.player.grupo}   ·   ${R.date.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}`, 60, 290);
    const kp = [['Puntaje', R.score], ['Aprovechamiento', R.pct + '%'], ['Tiempo', L.fmtTime(R.time)], ['1er intento', `${R.first}/${R.total}`]];
    kp.forEach(([k, v], i) => {
      const bx = 60 + i * 325;
      x.fillStyle = '#FFFDF9'; x.strokeStyle = '#E4DCD2'; x.lineWidth = 2; x.beginPath(); x.roundRect(bx, 340, 300, 170, 18); x.fill(); x.stroke();
      x.fillStyle = '#5B5357'; x.font = '700 22px "Atkinson Hyperlegible", sans-serif'; x.fillText(k.toUpperCase(), bx + 24, 385);
      x.fillStyle = '#7B1E3A'; x.font = '800 64px "Bricolage Grotesque", sans-serif'; x.fillText(String(v), bx + 24, 470);
    });
    x.fillStyle = '#1E1A1B'; x.beginPath(); x.roundRect(60, 560, 1280, 140, 18); x.fill();
    x.fillStyle = '#C9A0AE'; x.font = '700 22px "IBM Plex Mono", monospace'; x.fillText('CÓDIGO DE EVIDENCIA', 96, 605);
    x.fillStyle = '#fff'; x.font = '700 60px "IBM Plex Mono", monospace'; x.fillText(R.code, 96, 672);
    x.fillStyle = '#5B5357'; x.font = '22px "Atkinson Hyperlegible", sans-serif';
    x.fillText(`Niveles: Detective ${S.lvlScore[1]} · Ensamble ${S.lvlScore[2]} · Decodificador ${S.lvlScore[3]} · mejor racha ${R.streak}`, 60, 760);
    x.fillText('El código está firmado con la matrícula; el docente lo valida en el verificador.', 60, 800);
    const a = document.createElement('a');
    a.download = `Constancia_Nomenclatura_${S.player.mat}.png`; a.href = cv.toDataURL('image/png'); a.click();
  });

  // Exponer para pruebas automatizadas
  window.__LAB_STATE = S;
})();
