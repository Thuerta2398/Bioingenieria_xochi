/* Expedición Nomenclatura 2.0 — motor del juego */
(function () {
  'use strict';
  const B = window.BANCO, L = window.LAB, W = window.MUNDOS;
  const { fHTML, ionHTML, shuffle, esc } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PASS = 70, FREE_EVENTS = 4, EVENT_COST = 50, STREAK_BONUS = 10;
  const MAX_BASE = W.reduce((s, w) => s + w.n_items * 100, 0);

  /* ================= persistencia ================= */
  let P = null;            // perfil persistente del estudiante
  const KEY = m => 'expnom2:' + m;
  function blank(player) {
    return { v: 2, player, worlds: {}, integ: { salidas: 0, fuera: 0, pegados: 0, copias: 0, atajos: 0 }, active: 0, created: Date.now() };
  }
  function save() { try { localStorage.setItem(KEY(P.player.mat), JSON.stringify(P)); localStorage.setItem('expnom2:last', JSON.stringify(P.player)); } catch (e) { /* sin almacenamiento */ } }
  function load(player) {
    try { const raw = localStorage.getItem(KEY(player.mat)); if (raw) { const o = JSON.parse(raw); if (o && o.v === 2) { o.player = player; return o; } } } catch (e) { /* ok */ }
    return blank(player);
  }

  /* ================= utilidades ================= */
  function norm(s) {
    const R = { 1: 'i', 2: 'ii', 3: 'iii', 4: 'iv', 5: 'v', 6: 'vi', 7: 'vii' };
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[()\[\].,;:¡!¿?"'`´_\-]/g, ' ').replace(/\b([1-7])\b/g, d => R[d])
      .replace(/\s+/g, ' ').trim().replace(/^(el|la|los|las) /, '');
  }
  const accepted = list => new Set(list.map(norm));
  function penalty() {
    const i = P.integ;
    return (Math.max(0, i.salidas - FREE_EVENTS) + Math.max(0, i.pegados - FREE_EVENTS)) * EVENT_COST;
  }
  function totals() {
    let pts = 0, base = 0, passed = 0;
    W.forEach(w => { const r = P.worlds[w.n]; if (r) { pts += r.pts; base += r.base; if (r.passed) passed++; } });
    return { pts, base, passed, pen: penalty(), score: Math.max(0, pts - penalty()), pct: Math.round(100 * base / MAX_BASE) };
  }
  const unlocked = n => n === 0 || !!(P.worlds[n - 1] && P.worlds[n - 1].passed);
  const starsOf = pct => pct >= 95 ? 3 : pct >= 85 ? 2 : pct >= PASS ? 1 : 0;
  const starHTML = k => '<span class="stars">' + [0, 1, 2].map(i => `<span class="${i < k ? 'on' : ''}">★</span>`).join('') + '</span>';
  function toast(msg, warn) {
    const t = document.createElement('div'); t.className = 'toast' + (warn ? ' warn' : ''); t.innerHTML = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3800);
  }
  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + id));
    $('#topbar').classList.toggle('hidden', id === 'title');
    window.scrollTo(0, 0); refreshTop();
  }
  function refreshTop() {
    if (!P) return;
    const t = totals();
    $('#tb-who').innerHTML = `${esc(L.shortName(P.player.nombre))}<small>${esc(P.player.grupo)} · ${esc(P.player.mat)}</small>`;
    $('#tb-lbl').textContent = `Mundos superados ${t.passed}/7`;
    $('#tb-pct').textContent = t.pct + '%';
    $('#tb-bar').style.width = (100 * t.passed / 7) + '%';
    $('#tb-pts').textContent = t.score;
    const i = P.integ;
    $('#tb-out').innerHTML = `↗ <b>${i.salidas}</b>`; $('#tb-out').classList.toggle('warn', i.salidas > FREE_EVENTS);
    $('#tb-paste').innerHTML = `📋 <b>${i.pegados}</b>`; $('#tb-paste').classList.toggle('warn', i.pegados > FREE_EVENTS);
  }

  /* ================= integridad ================= */
  let awayStart = 0;
  const inGame = () => P && ($('#s-play').classList.contains('on') || $('#s-brief').classList.contains('on'));
  function goneAway() { if (inGame() && !awayStart) awayStart = Date.now(); }
  function cameBack() {
    if (!awayStart) return;
    const secs = (Date.now() - awayStart) / 1000; awayStart = 0;
    if (secs < 0.8 || !P) return;
    P.integ.salidas++; P.integ.fuera += Math.round(secs); save(); refreshTop();
    const n = P.integ.salidas;
    toast(n > FREE_EVENTS ? `⚠️ Saliste de la ventana (${n}). Se descontaron ${EVENT_COST} puntos.` : `⚠️ Saliste de la ventana (${n} de ${FREE_EVENTS} sin descuento). Quedó registrado.`, true);
  }
  window.addEventListener('blur', goneAway);
  window.addEventListener('focus', cameBack);
  document.addEventListener('visibilitychange', () => { document.hidden ? goneAway() : cameBack(); });
  function blockPaste(e) {
    if (!P || $('#s-title').classList.contains('on')) return;
    e.preventDefault(); e.stopPropagation();
    P.integ.pegados++; save(); refreshTop();
    const n = P.integ.pegados;
    toast(n > FREE_EVENTS ? `🚫 Pegar no está permitido (${n}). Se descontaron ${EVENT_COST} puntos.` : `🚫 Pegar no está permitido (${n} de ${FREE_EVENTS} sin descuento).`, true);
  }
  document.addEventListener('paste', blockPaste, true);
  document.addEventListener('drop', blockPaste, true);
  document.addEventListener('beforeinput', e => { if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') blockPaste(e); }, true);
  ['copy', 'cut'].forEach(ev => document.addEventListener(ev, e => {
    if (!inGame()) return;
    e.preventDefault(); P.integ.copias++; save(); toast('🚫 Copiar está deshabilitado en la expedición. Quedó registrado.', true);
  }, true));
  document.addEventListener('contextmenu', e => { if (inGame()) e.preventDefault(); });
  setInterval(() => { if (P && $('#s-play').classList.contains('on') && document.visibilityState === 'visible') { P.active++; if (P.active % 15 === 0) save(); } }, 1000);

  /* ================= registro ================= */
  const params = new URLSearchParams(location.search);
  const lockedGroup = params.get('grupo');
  try { const last = JSON.parse(localStorage.getItem('expnom2:last') || 'null'); if (last) { $('#r-nombre').value = last.nombre; $('#r-mat').value = last.mat; $('#r-grupo').value = last.grupo; $('#r-go').textContent = 'Continuar expedición ▶'; } } catch (e) { /* ok */ }
  if (lockedGroup) { $('#r-grupo').value = L.normGrupo(lockedGroup); $('#r-grupo').readOnly = true; }
  $('#f-reg').addEventListener('submit', e => {
    e.preventDefault();
    const nombre = $('#r-nombre').value.trim().replace(/\s+/g, ' '), mat = L.normMat($('#r-mat').value), grupo = L.normGrupo($('#r-grupo').value);
    if (nombre.split(' ').length < 2) return ($('#r-err').textContent = 'Escribe tu nombre y al menos un apellido.');
    if (mat.length < 4) return ($('#r-err').textContent = 'Revisa tu matrícula.');
    if (!$('#r-grupo').value.trim()) return ($('#r-err').textContent = 'Escribe tu grupo.');
    P = load({ nombre, mat, grupo }); save();
    $('#lnk-rank').href = 'ranking.html?grupo=' + encodeURIComponent(grupo);
    renderMap(); show('map');
  });

  /* ================= mapa ================= */
  let selected = 0;
  const NODES = [[90, 330], [215, 240], [345, 300], [470, 190], [600, 270], [720, 160], [850, 90]];
  function renderMap() {
    const cur = W.findIndex(w => unlocked(w.n) && !(P.worlds[w.n] && P.worlds[w.n].passed));
    selected = cur < 0 ? 6 : cur;
    let path = `M ${NODES[0][0]} ${NODES[0][1]}`;
    for (let i = 1; i < NODES.length; i++) {
      const [x0, y0] = NODES[i - 1], [x1, y1] = NODES[i];
      path += ` C ${x0 + 60} ${y0}, ${x1 - 60} ${y1}, ${x1} ${y1}`;
    }
    let nodes = '';
    W.forEach((w, i) => {
      const [x, y] = NODES[i], r = P.worlds[w.n], un = unlocked(w.n), passed = r && r.passed;
      const fill = passed ? w.color : un ? '#2B1C36' : '#1A1020', stroke = un ? w.color : '#3A2848';
      nodes += `<g class="node ${un ? '' : 'locked'} ${i === cur ? 'cur' : ''}" data-w="${i}" tabindex="0" role="button" aria-label="Mundo ${i}: ${esc(w.name)}">
        ${i === cur ? `<circle class="ring" cx="${x}" cy="${y}" r="38" fill="none" stroke="${w.color}" stroke-width="3"/>` : ''}
        <g class="disc"><circle cx="${x}" cy="${y}" r="${w.boss ? 42 : 36}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
        <text x="${x}" y="${y + 9}" text-anchor="middle" font-size="26">${un ? w.icon : '🔒'}</text></g>
        <text x="${x}" y="${y + 62}" text-anchor="middle" font-size="13" font-weight="800" fill="#F6EEF3" font-family="Figtree">Mundo ${i}</text>
        <text x="${x}" y="${y + 79}" text-anchor="middle" font-size="16" fill="${r && r.stars ? '#F5B83D' : '#4B3560'}">${'★'.repeat(r ? r.stars : 0)}${'☆'.repeat(3 - (r ? r.stars : 0))}</text></g>`;
    });
    $('#map').innerHTML = `<svg viewBox="0 0 940 440" role="img" aria-label="Mapa de mundos">
      <path d="${path}" fill="none" stroke="#3A2848" stroke-width="14" stroke-linecap="round"/>
      <path d="${path}" fill="none" stroke="#F5B83D" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round" opacity=".7"/>
      <text x="30" y="40" font-family="Unbounded" font-size="20" font-weight="700" fill="#F6EEF3">Mapa de la expedición</text>
      <text x="30" y="62" font-family="Figtree" font-size="13" fill="#C2B0C2">Supera cada mundo con 70 % para abrir el siguiente</text>
      ${nodes}</svg>`;
    $$('#map .node').forEach(n => {
      const go = () => { selected = +n.dataset.w; renderCard(); };
      n.addEventListener('click', go); n.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
    renderCard(); refreshTop();
  }
  function renderCard() {
    const w = W[selected], r = P.worlds[w.n], un = unlocked(w.n);
    $('#wcard').innerHTML = `<div class="kicker">Mundo ${w.n}${w.boss ? ' · jefe final' : ''}</div>
      <h3>${w.icon} ${esc(w.name)}</h3>
      ${starHTML(r ? r.stars : 0)}
      <ul>${w.temas.map(t => `<li>${t}</li>`).join('')}</ul>
      <p class="dim" style="font-size:.9rem;margin:6px 0">${w.n_items} reactivos · ${r ? `mejor: <b style="color:var(--ink)">${r.pct}%</b> · intentos: ${r.attempts}` : 'sin intentos'}</p>
      ${un ? `<button class="b go" style="width:100%" id="w-go">${r ? (r.passed ? 'Repetir (mejorar estrellas)' : 'Reintentar') : 'Entrar ▶'}</button>`
        : `<div class="lockmsg">🔒 Supera el Mundo ${w.n - 1} con ${PASS}% para abrirlo</div>`}`;
    const b = $('#w-go'); if (b) b.addEventListener('click', () => openBrief(w.n));
  }
  $('#lnk-report').addEventListener('click', e => { e.preventDefault(); renderReport(); });

  /* ================= repaso ================= */
  function openBrief(n) {
    const w = W[n];
    $('#brief').innerHTML = `<div class="sub">Repaso · Mundo ${n}</div><h2>${w.icon} ${esc(w.name)}</h2>${w.brief}
      <div class="next"><button class="b line" id="br-back">← Mapa</button><button class="b go" id="br-go">¡Listo, a jugar! ▶</button></div>`;
    const t = $('#brief-tree'); if (t) t.innerHTML = L.treeSVG();
    $('#br-back').addEventListener('click', () => { renderMap(); show('map'); });
    $('#br-go').addEventListener('click', () => startWorld(n));
    show('brief');
  }

  /* ================= armado de cada mundo ================= */
  const Qs = (lv, sub, t) => B.q.filter(q => q.lv === lv && (!sub || q.sub === sub) && (!t || q.t === t));
  function take(list, k, used) {
    const out = [];
    for (const x of shuffle(list)) {
      const key = x.ref || x.fans || (x.ans && x.ans[0]) || x.ok || x.id;
      if (out.length >= k) break;
      if (used.has(key) || used.has(x.id)) continue;
      used.add(key); used.add(x.id); out.push({ kind: 'q', q: x });
    }
    return out;
  }
  const itemsBy = f => B.items.filter(f);
  function buildWorld(n) {
    const u = new Set(); let out = [];
    const T = (lv, sub, t, k) => out.push(...take(Qs(lv, sub, t), k, u));
    if (n === 0) { T(0, 'Símbolos', 'mcq', 2); T(0, 'Símbolos', 'open', 2); T(0, 'Estados de oxidación', 'mcq', 1); T(0, 'Iones', 'open', 2); T(0, 'Sustancias simples', null, 1); }
    if (n === 1) { T(1, '¿Qué sistema es?', 'mcq', 2); T(1, 'Sufijos –oso/–ico', 'mcq', 2); T(1, 'Stock → tradicional', 'open', 2); T(1, 'Tradicional → Stock', 'open', 2); }
    if (n === 2) { T(2, 'Anhídridos', 'open', 2); T(2, 'Óxidos ácidos', 'formula', 1); T(2, 'Óxidos de nitrógeno', 'open', 1); T(2, 'Hidruros volátiles', 'open', 2); T(2, 'Sales volátiles', 'mcq', 2); T(2, 'Binarios iónicos', 'formula', 2); }
    if (n === 3) {
      shuffle(['binaria', 'haluro', 'hidruro_met', 'hidruro_vol', 'oxido', 'peroxido', 'hidroxido', 'oxoacido', 'oxisal', 'sal_acida']).slice(0, 6)
        .forEach(f => out.push({ kind: 'tree', it: shuffle(itemsBy(i => i.fam === f))[0] }));
    }
    if (n === 4) {
      const acids = itemsBy(i => i.fam === 'oxoacido');
      out.push({ kind: 'dec', mode: 'acido', it: shuffle(acids.filter(i => !i.dec.pre))[0] });
      out.push({ kind: 'dec', mode: 'acido', it: shuffle(acids.filter(i => !i.dec.pre))[1] });
      out.push({ kind: 'dec', mode: 'acido', it: shuffle(acids.filter(i => i.dec.pre))[0] });
      out.forEach(x => u.add(x.it.id));
      T(4, 'Orto, meta y di', 'open', 2); T(4, 'Formula el oxoácido', 'formula', 1); T(4, 'Hidróxidos', 'open', 1);
    }
    if (n === 5) {
      const salts = itemsBy(i => i.fam === 'oxisal');
      const pickS = f => { const c = shuffle(salts.filter(i => f(i) && !u.has(i.id)))[0]; u.add(c.id); return c; };
      out.push({ kind: 'ens', mode: 'iones', it: pickS(() => true) });
      out.push({ kind: 'ens', mode: 'nombre', it: pickS(i => i.trad.length) });
      out.push({ kind: 'ens', mode: 'iones', it: pickS(() => true) });
      out.push({ kind: 'dec', mode: 'sal', it: pickS(i => !i.dec.trap) });
      out.push({ kind: 'dec', mode: 'sal', it: pickS(i => Math.random() < .5 ? i.dec.trap : i.dec.simp) });
      T(5, 'Oxisales', 'open', 1); T(5, 'Oxisales: formular', 'formula', 1);
    }
    if (n === 6) {
      T(6, 'Oxisales ácidas', 'open', 2); T(6, 'Sales ácidas: formular', 'formula', 1);
      T(6, 'Sales ácidas de hidrácidos', 'open', 1); T(6, 'Sales ácidas de hidrácidos', 'formula', 1);
      const boss = [...take(Qs(2, 'Binarios iónicos', 'formula'), 1, u), ...take(Qs(4, 'Formula el oxoácido', 'formula'), 1, u), ...take(Qs(5, 'Oxisales', 'open'), 1, u)];
      boss.forEach(b => (b.boss = true)); out.push(...boss);
    }
    return out;
  }

  /* ================= sesión de juego ================= */
  let S = null, keyHandler = null;
  function startWorld(n) {
    S = { n, items: buildWorld(n), idx: 0, base: 0, bonus: 0, streak: 0, review: [] };
    $('#p-w').textContent = `${W[n].icon} Mundo ${n} · ${W[n].name}`;
    show('play'); nextItem();
  }
  $('#p-quit').addEventListener('click', () => {
    if (S && S.idx < S.items.length && !confirmQuit()) return;
    S = null; renderMap(); show('map');
  });
  function confirmQuit() {
    const st = $('#stage');
    if (st.dataset.q === '1') return true;
    st.dataset.q = '1';
    toast('Si sales ahora, este intento no se guarda. Toca “Mapa” otra vez para confirmar.');
    setTimeout(() => { st.dataset.q = ''; }, 4000);
    return false;
  }
  function seg() {
    $('#p-seg').innerHTML = S.items.map((x, i) => `<i class="${i < S.idx ? x.cls : i === S.idx ? 'now' : ''}"></i>`).join('');
    $('#p-pts').textContent = S.base + S.bonus;
  }
  let I = null; // reactivo actual
  function nextItem() {
    if (S.idx >= S.items.length) return endWorld();
    const it = S.items[S.idx];
    I = { slot: it, earned: 0, errors: 0 };
    keyHandler = null; seg();
    const st = $('#stage'); st.innerHTML = ''; st.dataset.q = '';
    const head = `<div class="sub">${it.boss ? '👑 Jefe final · ' : ''}Reactivo ${S.idx + 1} de ${S.items.length}${it.q && it.q.sub ? ' · ' + esc(it.q.sub) : ''}</div>`;
    st.insertAdjacentHTML('beforeend', head);
    if (it.kind === 'q') renderQ(st, it.q);
    else if (it.kind === 'tree') renderTree(st, it.it);
    else if (it.kind === 'ens') renderEns(st, it.it, it.mode);
    else renderDec(st, it.it, it.mode);
  }
  function add(p) { I.earned += p; S.base += p; seg(); }
  function finish() {
    const perfect = I.errors === 0;
    if (perfect) { S.streak++; if (S.streak >= 3) S.bonus += STREAK_BONUS; } else S.streak = 0;
    I.slot.cls = I.earned >= 90 ? 'ok' : I.earned >= 40 ? 'mid' : 'bad';
    if (!perfect) S.review.push(I.slot);
    S.idx++; seg();
    const st = $('#stage');
    st.insertAdjacentHTML('beforeend', `<div class="next"><span class="dim">+${I.earned} pts${perfect && S.streak >= 3 ? ` · racha 🔥${S.streak} +${STREAK_BONUS}` : ''}</span><button class="b go" id="b-next">${S.idx >= S.items.length ? 'Ver resultado ▶' : 'Siguiente ▶'}</button></div>`);
    const b = $('#b-next'), born = Date.now(); setTimeout(() => b.focus({ preventScroll: true }), 400); b.addEventListener('click', () => { if (Date.now() - born > 350) nextItem(); });
    b.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  document.addEventListener('keydown', e => {
    if (!$('#s-play').classList.contains('on') || $('#m-help').classList.contains('on')) return;
    if (e.target.tagName === 'INPUT') return;
    if (keyHandler) keyHandler(e);
  });
  function msg(el, kind, title, body) { el.innerHTML = `<div class="msg ${kind}"><b>${title}</b><p>${body || ''}</p></div>`; }
  const pts3 = (max, tries) => tries === 0 ? max : tries === 1 ? Math.round(max / 2) : 0;

  /* ---------- opción múltiple ---------- */
  function mcq(box, options, correct, max, done, { fx = false, hint } = {}) {
    let tries = 0, closed = false;
    const opts = shuffle(options);
    box.insertAdjacentHTML('beforeend', `<div class="opts">${opts.map((o, k) => `<button class="opt" data-k="${k}"><kbd>${k + 1}</kbd><span class="${fx ? 'fx' : ''}">${fx ? fHTML(o) : esc(o)}</span></button>`).join('')}</div><div class="fb"></div>`);
    const btns = $$('.opt', box).slice(-opts.length), fb = $$('.fb', box).pop();
    const choose = k => {
      const b = btns[k]; if (closed || !b || b.disabled) return;
      if (opts[k] === correct) { b.classList.add('ok'); closed = true; btns.forEach(x => (x.disabled = true)); if (!tries) msg(fb, 'ok', '¡Correcto!'); done(pts3(max, tries)); }
      else {
        tries++; I.errors++; b.classList.add('bad'); b.disabled = true;
        if (tries >= 2) { btns[opts.indexOf(correct)].classList.add('ok'); closed = true; btns.forEach(x => (x.disabled = true)); msg(fb, 'bad', 'Era:', (fx ? fHTML(correct) : esc(correct)) + (hint ? '. ' + hint : '')); done(0); }
        else msg(fb, 'bad', 'Aún no.', hint ? 'Pista: ' + hint : 'Intenta otra vez.');
      }
    };
    btns.forEach((b, k) => b.addEventListener('click', () => choose(k)));
    keyHandler = e => { const n = +e.key; if (n >= 1 && n <= opts.length) choose(n - 1); };
  }
  /* ---------- respuesta abierta ---------- */
  function openQ(box, answers, max, done, { hint, label = 'Escribe tu respuesta' } = {}) {
    let tries = 0, closed = false; const ok = accepted(answers);
    box.insertAdjacentHTML('beforeend', `<div class="answer"><input type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="${label}" placeholder="${label}"><button class="b go">Comprobar</button></div>
      <p class="help-line">No importan mayúsculas ni acentos. Para valencias usa romanos o números: hierro (III) = hierro (3).</p><div class="fb"></div>`);
    const inp = $$('.answer input', box).pop(), btn = $$('.answer button', box).pop(), fb = $$('.fb', box).pop();
    inp.focus({ preventScroll: true });
    const go = () => {
      if (closed || !inp.value.trim()) return;
      if (ok.has(norm(inp.value))) {
        closed = true; inp.classList.add('ok'); inp.disabled = btn.disabled = true;
        const alt = answers.filter(a => norm(a) !== norm(inp.value));
        msg(fb, 'ok', '¡Correcto!', alt.length ? 'También se acepta: ' + alt.slice(0, 3).map(esc).join(' · ') : '');
        done(pts3(max, tries));
      } else {
        tries++; I.errors++; inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake', 'bad');
        if (tries >= 2) { closed = true; inp.disabled = btn.disabled = true; msg(fb, 'bad', 'Respuesta esperada:', answers.slice(0, 3).map(esc).join(' · ')); done(0); }
        else msg(fb, 'bad', 'Aún no.', hint || 'Revisa terminaciones (–ito/–ato, –oso/–ico) y la valencia.');
      }
    };
    btn.addEventListener('click', go); inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    inp.addEventListener('input', () => inp.classList.remove('bad'));
  }
  /* ---------- teclado de fórmulas ---------- */
  const POOL = ['H', 'O', 'N', 'C', 'S', 'P', 'Cl', 'Br', 'I', 'F', 'Se', 'B', 'As', 'Si', 'Na', 'K', 'Li', 'Ca', 'Mg', 'Ba', 'Al', 'Fe', 'Cu', 'Pb', 'Sn', 'Zn', 'Ag', 'Hg', 'Co', 'Ni', 'Cr', 'Mn', 'Cd', 'Sr', 'Cs'];
  const CONF = { C: ['Co', 'Cl', 'Ca', 'Cr'], Co: ['C', 'Cu', 'Cr'], S: ['Sn', 'Se', 'Si'], N: ['Na', 'Ni'], Na: ['N', 'Ni'], P: ['Pb'], Pb: ['P', 'Pt'], Cl: ['C', 'Cr'], Mn: ['Mg'], Mg: ['Mn'], Fe: ['F'], F: ['Fe'], Cu: ['Co'], Sn: ['S', 'Si'], Ca: ['C', 'Cd'] };
  function formulaQ(box, answer, max, done, { hint } = {}) {
    let tries = 0, closed = false, tokens = [];
    const els = [...new Set(answer.match(/[A-Z][a-z]?/g))];
    const extra = new Set();
    els.forEach(e => (CONF[e] || []).forEach(c => POOL.includes(c) && extra.add(c)));
    shuffle(POOL).forEach(e => { if (extra.size < 5) extra.add(e); });
    els.forEach(e => extra.delete(e));
    const keys = shuffle([...els, ...[...extra].slice(0, Math.max(4, 8 - els.length))]);
    box.insertAdjacentHTML('beforeend', `<div class="kb-display empty" aria-live="polite"></div>
      <div class="kb">${keys.map(k => `<button class="el" data-t="${k}">${k}</button>`).join('')}
      ${[2, 3, 4, 5, 6, 7, 8].map(d => `<button class="num" data-t="${d}">${d}</button>`).join('')}
      <button class="num" data-t="(">(</button><button class="num" data-t=")">)</button>
      <button class="ctl" data-c="del">⌫</button><button class="ctl" data-c="clr">Borrar</button></div>
      <div class="next" style="justify-content:flex-end"><button class="b go">Comprobar fórmula</button></div><div class="fb"></div>`);
    const disp = $$('.kb-display', box).pop(), kb = $$('.kb', box).pop(), btn = $$('.next .b', box).pop(), fb = $$('.fb', box).pop();
    const paint = () => { const s = tokens.join(''); disp.innerHTML = s ? fHTML(s) : ''; disp.classList.toggle('empty', !s); disp.classList.remove('bad'); };
    kb.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || closed) return;
      if (b.dataset.t) tokens.push(b.dataset.t); else if (b.dataset.c === 'del') tokens.pop(); else tokens = [];
      paint();
    });
    const go = () => {
      if (closed || !tokens.length) return;
      const s = tokens.join('');
      if (s === answer) { closed = true; disp.classList.add('ok'); btn.disabled = true; msg(fb, 'ok', '¡Fórmula correcta!'); done(pts3(max, tries)); }
      else {
        tries++; I.errors++; disp.classList.add('bad', 'shake');
        if (tries >= 2) { closed = true; btn.disabled = true; msg(fb, 'bad', 'Fórmula correcta:', `<span class="fx">${fHTML(answer)}</span>`); done(0); }
        else msg(fb, 'bad', 'Aún no.', hint || 'Revisa el orden (catión primero), cruza las cargas, simplifica y usa paréntesis si el ion poliatómico se repite.');
      }
    };
    btn.addEventListener('click', go);
    keyHandler = e => { if (e.key === 'Backspace') { tokens.pop(); paint(); } if (e.key === 'Enter') go(); };
  }
  /* ---------- pregunta del banco ---------- */
  function renderQ(st, q) {
    st.insertAdjacentHTML('beforeend', `<div class="qtext">${q.q}</div>`);
    const box = document.createElement('div'); st.appendChild(box);
    const done = p => { add(p); finish(); };
    if (q.t === 'mcq') mcq(box, [q.ok, ...q.wrong], q.ok, 100, done, { fx: !!q.fx, hint: q.hint });
    else if (q.t === 'open') openQ(box, q.ans, 100, done, { hint: q.hint });
    else formulaQ(box, q.fans, 100, done, { hint: q.hint });
  }

  /* ---------- detective ---------- */
  function namesOf(it) { return [it.name, ...(it.alts || []), ...(it.trad || [])]; }
  function renderTree(st, it) {
    st.insertAdjacentHTML('beforeend', `<div class="big">${fHTML(it.f)}</div>
      <div class="split"><div class="pane" id="t-a"><h4><span class="step">1</span> ¿Qué familia es?</h4><div class="crumbs"></div><div class="node"></div><div class="fb"></div></div>
      <div class="pane" id="t-b" style="opacity:.4"><h4><span class="step">2</span> Escribe su nombre (cualquier sistema)</h4><div class="box"><p class="dim">Primero clasifica.</p></div></div></div>`);
    const exp = L.pathTo(it.fam), A = $('#t-a'); let node = L.TREE, errs = 0;
    const ask = () => {
      if (node.leaf) {
        $('.node', A).innerHTML = `<div class="famtag">✔ ${L.FAM[node.leaf]}</div>`; $('.fb', A).innerHTML = '';
        add(Math.max(10, 50 - 15 * errs)); keyHandler = null;
        const Bp = $('#t-b'); Bp.style.opacity = 1; const box = $('.box', Bp); box.innerHTML = '';
        return openQ(box, namesOf(it), 50, p => { add(p); finish(); }, { hint: 'Usa la plantilla de la familia (óxido de…, hidróxido de…, –uro de…, –ito/–ato de…) y la valencia.' });
      }
      const want = exp.find(([n]) => n === node)[1];
      $('.node', A).innerHTML = `<p style="font-weight:700;margin:4px 0 10px">${node.q}</p><div class="yn"><button class="b" data-a="si">Sí</button><button class="b" data-a="no">No</button></div>`;
      const ans = a => {
        if (a === want) { $('.crumbs', A).insertAdjacentHTML('beforeend', `<span>${node.s} <b>${a === 'si' ? 'Sí' : 'No'}</b></span>`); node = node[a]; $('.fb', A).innerHTML = ''; ask(); }
        else { errs++; I.errors++; msg($('.fb', A), 'bad', 'Revisa:', node.hint); }
      };
      $$('[data-a]', A).forEach(b => b.addEventListener('click', () => ans(b.dataset.a)));
      keyHandler = e => { const k = e.key.toLowerCase(); if (k === 's') ans('si'); if (k === 'n') ans('no'); };
    };
    ask();
  }

  /* ---------- ensamble ---------- */
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  function tileHTML(key, kind) {
    const d = kind === 'c' ? B.cations[key] : B.anions[key];
    const q = Math.abs(d.q), ch = (q > 1 ? q : '') + (d.q > 0 ? '+' : '−');
    return `<div class="tile ${kind === 'a' ? 'an' : ''}" data-key="${esc(key)}" data-kind="${kind}" tabindex="0" role="button"><span class="ch">${ch}</span><span class="sym">${d.s === 'O2' ? 'O<sub>2</sub>' : fHTML(d.s)}</span><span class="nm">${esc(d.n)}</span></div>`;
  }
  function formulaFrom(ck, ak, nc, na) {
    const c = B.cations[ck], a = B.anions[ak], part = (s, n, poly) => n === 1 ? s : poly ? `(${s})${n}` : `${s}${n}`;
    return part(c.s, nc, c.poly) + (a.kind === 'peroxido' ? `O${2 * na}` : part(a.s, na, a.poly));
  }
  function renderEns(st, it, mode) {
    const c = B.cations[it.ion.c], a = B.anions[it.ion.a];
    const head = mode === 'iones' ? `${ionHTML(c.s, c.q)} + ${ionHTML(a.s, a.q)}` : esc((it.trad && it.trad[0]) || it.name);
    let cats = [it.ion.c], ans = [it.ion.a];
    if (mode === 'nombre') {
      const cs = new Set([it.ion.c]); Object.keys(B.cations).filter(k => B.cations[k].s === c.s).forEach(k => cs.add(k)); shuffle(Object.keys(B.cations)).forEach(k => cs.size < 4 && cs.add(k));
      const as = new Set([it.ion.a]); shuffle(Object.keys(B.anions).filter(k => B.anions[k].grp === a.grp)).forEach(k => as.size < 3 && as.add(k)); shuffle(Object.keys(B.anions)).forEach(k => as.size < 4 && as.add(k));
      cats = shuffle([...cs].slice(0, 4)); ans = shuffle([...as].slice(0, 4));
    }
    st.insertAdjacentHTML('beforeend', `<div class="qtext">${mode === 'iones' ? 'Ensambla: ' : 'Formula con iones: '}<span class="fx">${head}</span></div>
      <div class="pane"><h4><span class="step">1</span> ${mode === 'iones' ? 'Arrastra o toca los iones y ajusta subíndices' : 'Elige el catión y el anión correctos y ajusta subíndices'}</h4>
        <div class="tiles" id="tc">${cats.map(k => tileHTML(k, 'c')).join('')}</div><div class="tiles" id="ta" style="margin-top:8px">${ans.map(k => tileHTML(k, 'a')).join('')}</div>
        <div class="reactor" id="reac"><div class="slot" id="sc"><div class="empty">catión</div><div class="cnt"><button data-d="c-">−</button><output id="nc">1</output><button data-d="c+">+</button></div></div>
        <div class="slot" id="sa"><div class="empty">anión</div><div class="cnt"><button data-d="a-">−</button><output id="na">1</output><button data-d="a+">+</button></div></div></div>
        <div class="charge"><span id="cp">+0</span><span id="cs">Σ = 0</span><span id="cn">−0</span></div><div class="preview" id="pv"></div>
        <div class="next" style="justify-content:flex-end"><button class="b go" id="chk">Verificar</button></div><div class="fb" id="fbe"></div></div>
      <div class="pane hidden" id="en" style="margin-top:12px"><h4><span class="step">2</span> Escribe su nombre (Stock o tradicional)</h4><div class="box"></div></div>`);
    const R = { c: null, a: null, nc: 1, na: 1 }; let ionErr = 0, fErr = 0, closed = false;
    const upd = () => {
      $('#nc').textContent = R.nc; $('#na').textContent = R.na;
      const qc = R.c ? B.cations[R.c].q * R.nc : 0, qa = R.a ? B.anions[R.a].q * R.na : 0, s = qc + qa;
      $('#cp').textContent = R.c ? `${R.nc} × (+${B.cations[R.c].q}) = +${qc}` : '+0';
      $('#cn').textContent = R.a ? `${R.na} × (${B.anions[R.a].q}) = ${qa}` : '−0';
      $('#cs').textContent = `Σ = ${s > 0 ? '+' : ''}${s}`; $('#cs').className = s === 0 && R.c && R.a ? 'z' : '';
      $('#pv').innerHTML = R.c && R.a ? fHTML(formulaFrom(R.c, R.a, R.nc, R.na)) : '';
    };
    const mark = () => $$('#tc .tile,#ta .tile').forEach(t => t.classList.toggle('gone', R[t.dataset.kind] === t.dataset.key));
    const place = (key, kind) => {
      if (closed) return; R[kind] = key;
      const slot = $(kind === 'c' ? '#sc' : '#sa'); slot.firstElementChild.outerHTML = tileHTML(key, kind);
      const p = slot.firstElementChild; p.addEventListener('click', () => { if (closed) return; R[kind] = null; p.outerHTML = `<div class="empty">${kind === 'c' ? 'catión' : 'anión'}</div>`; mark(); upd(); });
      mark(); upd();
    };
    $$('[data-d]', st).forEach(b => b.addEventListener('click', () => { if (closed) return; const f = b.dataset.d[0] === 'c' ? 'nc' : 'na'; R[f] = Math.min(6, Math.max(1, R[f] + (b.dataset.d[1] === '+' ? 1 : -1))); upd(); }));
    drag($$('#tc .tile,#ta .tile'), $('#reac'), place); upd();
    $('#chk').addEventListener('click', () => {
      if (closed) return; const fb = $('#fbe');
      if (!R.c || !R.a) return msg(fb, 'bad', 'Falta un ion.', 'Lleva un catión y un anión al reactor.');
      if (R.c !== it.ion.c || R.a !== it.ion.a) {
        ionErr++; I.errors++;
        if (ionErr >= 3) { place(it.ion.c, 'c'); place(it.ion.a, 'a'); }
        return msg(fb, 'bad', 'Revisa los iones.', ionErr >= 3 ? 'Te los coloqué; ahora ajusta subíndices.' : 'El nombre indica qué anión (–ito/–ato) y qué valencia del metal (–oso/–ico o romanos) debes usar.');
      }
      const s = B.cations[R.c].q * R.nc + B.anions[R.a].q * R.na;
      if (s !== 0 || gcd(R.nc, R.na) !== 1) {
        fErr++; I.errors++;
        if (fErr >= 3) { R.nc = it.ion.nc; R.na = it.ion.na; upd(); }
        else return msg(fb, 'bad', 'Aún no.', s !== 0 ? `La carga total es ${s > 0 ? '+' : ''}${s}: ajusta subíndices.` : 'Es neutra pero no está simplificada.');
      }
      closed = true; $('#chk').disabled = true;
      add((mode === 'nombre' ? (ionErr === 0 ? 40 : ionErr === 1 ? 20 : 0) : 0) + (fErr === 0 ? 60 : fErr === 1 ? 30 : fErr === 2 ? 10 : 0));
      msg(fb, fErr >= 3 ? 'bad' : 'ok', 'Fórmula:', `<span class="fx">${fHTML(it.f)}</span>`);
      if (mode === 'iones') { const en = $('#en'); en.classList.remove('hidden'); openQ($('.box', en), namesOf(it), 40, p => { add(p); finish(); }); }
      else finish();
    });
  }
  function drag(tiles, zone, place) {
    tiles.forEach(t => {
      let sx = 0, sy = 0, g = null, moved = false;
      const inside = e => { const r = zone.getBoundingClientRect(); return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; };
      t.addEventListener('pointerdown', e => { if (t.classList.contains('gone')) return; sx = e.clientX; sy = e.clientY; moved = false; t.setPointerCapture(e.pointerId); });
      t.addEventListener('pointermove', e => {
        if (!t.hasPointerCapture(e.pointerId)) return;
        if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) { moved = true; g = t.cloneNode(true); g.classList.add('ghost'); document.body.appendChild(g); }
        if (g) { g.style.left = (e.clientX - 46) + 'px'; g.style.top = (e.clientY - 46) + 'px'; zone.classList.toggle('over', inside(e)); }
      });
      t.addEventListener('pointerup', e => { if (!t.hasPointerCapture(e.pointerId)) return; t.releasePointerCapture(e.pointerId); const ins = inside(e); if (g) g.remove(); g = null; zone.classList.remove('over'); if (!moved || ins) place(t.dataset.key, t.dataset.kind); });
      t.addEventListener('pointercancel', () => { if (g) g.remove(); g = null; zone.classList.remove('over'); });
      t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(t.dataset.key, t.dataset.kind); } });
    });
  }

  /* ---------- decodificador ---------- */
  const ELN = { Cl: 'cloro', Br: 'bromo', I: 'yodo', S: 'azufre', Se: 'selenio', N: 'nitrógeno', P: 'fósforo', As: 'arsénico', C: 'carbono', B: 'boro', Cr: 'cromo', Mn: 'manganeso' };
  function numStep(box, label, expected, max, hints, done) {
    let tries = 0, closed = false;
    box.insertAdjacentHTML('beforeend', `<div><p style="margin:.3em 0">${label}</p><div class="num-in"><input type="number" inputmode="numeric" aria-label="Respuesta"><button class="b go sm">Comprobar</button></div><div class="fb"></div></div>`);
    const w = box.lastElementChild, inp = $('input', w), btn = $('button', w), fb = $('.fb', w);
    inp.focus({ preventScroll: true });
    const go = () => {
      if (closed || inp.value === '') return;
      if (+inp.value === expected) { closed = true; inp.disabled = btn.disabled = true; msg(fb, 'ok', '¡Correcto!'); done(pts3(max, tries)); }
      else { tries++; I.errors++; inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
        if (tries >= 2) { closed = true; inp.value = expected; inp.disabled = btn.disabled = true; msg(fb, 'bad', 'Era ' + expected + '.', hints[1]); done(0); }
        else msg(fb, 'bad', 'Aún no.', hints[0]); }
    };
    btn.addEventListener('click', go); inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
  function ladder(box, d, labels, names, max, done) {
    let tries = 0, closed = false;
    box.insertAdjacentHTML('beforeend', `<div><div class="ladder">${d.lad.map((v, k) => `<button class="rung" data-v="${v}" style="margin-bottom:${k * 10}px"><b>${v}</b><span>${labels[k]}</span></button>`).join('')}</div><div class="fb"></div></div>`);
    const w = box.lastElementChild, rs = $$('.rung', w), fb = $('.fb', w);
    rs.forEach(r => r.addEventListener('click', () => {
      if (closed) return; const v = +r.dataset.v;
      if (v === d.V) { closed = true; r.classList.add('ok'); rs.forEach(x => (x.disabled = true)); msg(fb, 'ok', names[d.lad.indexOf(v)]); done(pts3(max, tries)); }
      else { tries++; I.errors++; r.classList.add('bad'); r.disabled = true;
        if (tries >= 2 || rs.filter(x => !x.disabled).length === 1) { closed = true; rs[d.lad.indexOf(d.V)].classList.add('ok'); rs.forEach(x => (x.disabled = true)); msg(fb, 'bad', 'Era: ' + names[d.lad.indexOf(d.V)]); done(0); }
        else msg(fb, 'bad', 'Ese peldaño no.', 'Ordena las valencias del elemento de menor a mayor.'); }
    }));
  }
  function renderDec(st, it, mode) {
    const d = it.dec, X = d.X, h = t => `<h4 style="margin-top:14px"><span class="step">${t[0]}</span> ${t[1]}</h4>`;
    st.insertAdjacentHTML('beforeend', `<div class="big">${fHTML(it.f)}</div><div class="pane" id="dx"><div class="calc">O = <span class="o">${d.O}</span> · H = <span class="h">${d.H}</span> · nº de ${X} = <span class="x">${d.nX}</span>${mode === 'sal' ? ` · metal ${esc(B.cations[it.ion.c].s)}<sub>${it.ion.nc}</sub>` : ''}</div></div>`);
    const box = $('#dx');
    if (mode === 'acido') {
      box.insertAdjacentHTML('beforeend', h([1, `Valencia del ${ELN[X]}: V = (2·O − H) ÷ nº de ${X}`]));
      numStep(box, '¿Cuánto vale V?', d.V, 50, [`(2·${d.O} − ${d.H}) ÷ ${d.nX}`, `(2·${d.O} − ${d.H}) ÷ ${d.nX} = ${d.V}`], p => {
        add(p); box.insertAdjacentHTML('beforeend', h([2, `Escalera del ${ELN[X]}${d.pre ? ` (prefijo ${d.pre}-)` : ''}`]));
        ladder(box, d, d.labels, d.names, 50, p2 => { add(p2); finish(); });
      });
    } else {
      const c = B.cations[it.ion.c], fixed = !/\(/.test(c.n);
      const qh = d.trap ? ['Con carga 1 la valencia del no metal sale imposible: la fórmula estaba simplificada.', `La carga real es ${d.q}.`]
        : fixed ? [`El ${c.n} siempre es +${c.q}: (${c.q} × ${it.ion.nc}) ÷ ${it.ion.na}.`, `= ${d.q}`] : ['Si la fórmula no está simplificada, la carga del anión es el subíndice del metal.', `Carga = ${d.q}`];
      box.insertAdjacentHTML('beforeend', h([1, 'Carga del anión']));
      numStep(box, '¿Qué carga tiene el anión? (solo el número)', d.q, 25, qh, p => {
        add(p); box.insertAdjacentHTML('beforeend', h([2, `V del ${ELN[X]} = 2·O − H − carga`]));
        numStep(box, '¿Cuánto vale V?', d.V, 25, [`2·${d.O} − ${d.H} − ${d.q}`, `2·${d.O} − ${d.H} − ${d.q} = ${d.V}`], p2 => {
          add(p2); box.insertAdjacentHTML('beforeend', h([3, 'Escalera con –ito / –ato']));
          ladder(box, d, d.labels, d.names, 25, p3 => {
            add(p3); box.insertAdjacentHTML('beforeend', h([4, 'Nombre completo (Stock o tradicional)']) + '<div class="box"></div>');
            openQ($$('.box', box).pop(), namesOf(it), 25, p4 => { add(p4); finish(); });
          });
        });
      });
    }
  }

  /* ================= fin de mundo ================= */
  function endWorld() {
    const w = W[S.n], max = w.n_items * 100, pct = Math.round(100 * S.base / max), stars = starsOf(pct), passed = pct >= PASS;
    const prev = P.worlds[w.n], wasUnlocked = unlocked(w.n + 1);
    const pts = S.base + S.bonus;
    const better = !prev || pts > prev.pts;
    P.worlds[w.n] = {
      pts: better ? pts : prev.pts, base: better ? S.base : prev.base, pct: Math.max(pct, prev ? prev.pct : 0),
      stars: Math.max(stars, prev ? prev.stars : 0), passed: passed || !!(prev && prev.passed), attempts: (prev ? prev.attempts : 0) + 1, last: Date.now()
    };
    save();
    const newly = w.n < 6 && !wasUnlocked && unlocked(w.n + 1);
    const allDone = W.every(x => P.worlds[x.n] && P.worlds[x.n].passed);
    $('#res').innerHTML = `<div class="sub">Mundo ${w.n} · ${esc(w.name)}</div>
      <div class="huge" style="color:${passed ? 'var(--mint)' : 'var(--coral)'}">${pct}%</div>
      <div style="font-size:2rem">${starHTML(stars)}</div>
      <p class="muted">${S.base} / ${max} pts${S.bonus ? ` · racha +${S.bonus}` : ''}${better && prev ? ' · ¡nuevo récord!' : ''}</p>
      ${passed ? (newly ? `<div class="unlock">🔓 ¡Mundo ${w.n + 1} desbloqueado!</div>` : '<div class="unlock">✔ Mundo superado</div>') : `<div class="lockmsg">Necesitas ${PASS}% para avanzar. ¡Repasa e inténtalo otra vez!</div>`}
      ${S.review.length ? `<div class="card" style="text-align:left;margin-top:18px"><b>Para repasar</b><div class="muted" style="margin-top:6px">${S.review.map(reviewLine).join('')}</div></div>` : ''}
      <div class="next" style="justify-content:center;margin-top:18px">
        <button class="b line" id="rs-map">Mapa</button>
        ${passed ? '' : `<button class="b" id="rs-again">Reintentar</button>`}
        ${allDone ? `<button class="b gold" id="rs-rep">🏁 Informe final</button>` : passed && w.n < 6 ? `<button class="b go" id="rs-next">Mundo ${w.n + 1} ▶</button>` : ''}
      </div>`;
    $('#rs-map').addEventListener('click', () => { renderMap(); show('map'); });
    const ag = $('#rs-again'); if (ag) ag.addEventListener('click', () => openBrief(w.n));
    const nx = $('#rs-next'); if (nx) nx.addEventListener('click', () => openBrief(w.n + 1));
    const rp = $('#rs-rep'); if (rp) rp.addEventListener('click', renderReport);
    S = null; show('res');
  }
  function reviewLine(x) {
    if (x.kind === 'q') {
      const a = x.q.t === 'mcq' ? (x.q.fx ? fHTML(x.q.ok) : esc(x.q.ok)) : x.q.t === 'formula' ? `<span class="fx">${fHTML(x.q.fans)}</span>` : esc(x.q.ans[0]);
      return `<div style="margin:.25em 0">• ${x.q.q.replace(/<[^>]+>/g, '')} → <b style="color:var(--ink)">${a}</b></div>`;
    }
    return `<div style="margin:.25em 0">• <span class="fx">${fHTML(x.it.f)}</span> → <b style="color:var(--ink)">${esc(x.it.name)}</b>${x.it.trad && x.it.trad[0] ? ' · ' + esc(x.it.trad[0]) : ''}</div>`;
  }

  /* ================= informe ================= */
  let lastReport = null;
  async function renderReport() {
    const t = totals(), i = P.integ;
    const rows = W.map(w => { const r = P.worlds[w.n]; return `<tr><td>${w.icon} ${w.n} · ${esc(w.name)}</td><td>${r ? r.pts : '—'}</td><td>${r ? r.pct + '%' : '—'}</td><td>${starHTML(r ? r.stars : 0)}</td><td>${r ? r.attempts : 0}</td><td>${r ? (r.passed ? '✔' : '✘') : '🔒'}</td></tr>`; }).join('');
    $('#rep').innerHTML = `<div class="sub" style="margin-top:14px">Informe ${t.passed === 7 ? 'final' : 'de avance'}</div>
      <h2 style="font-size:1.8rem;margin:6px 0">${esc(P.player.nombre)}</h2>
      <p class="muted">${esc(P.player.mat)} · ${esc(P.player.grupo)} · ${new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</p>
      <div class="kpis"><div class="kpi"><small>Puntaje final</small><b>${t.score}</b></div><div class="kpi"><small>Aprovechamiento</small><b>${t.pct}%</b></div>
        <div class="kpi"><small>Mundos superados</small><b>${t.passed}/7</b></div><div class="kpi"><small>Tiempo activo</small><b>${L.fmtTime(P.active)}</b></div></div>
      <div class="card"><b>Mundos</b><table class="rep"><tr><th>Mundo</th><th>Mejor pts</th><th>%</th><th>Estrellas</th><th>Intentos</th><th></th></tr>${rows}</table></div>
      <div class="card" style="margin-top:12px"><b>Registro de integridad</b>
        <div class="kpis"><div class="kpi ${i.salidas > FREE_EVENTS ? 'warn' : ''}"><small>Salidas de ventana</small><b>${i.salidas}</b></div><div class="kpi"><small>Tiempo fuera</small><b>${L.fmtTime(i.fuera)}</b></div>
        <div class="kpi ${i.pegados > FREE_EVENTS ? 'warn' : ''}"><small>Intentos de pegar</small><b>${i.pegados}</b></div><div class="kpi"><small>Intentos de copiar</small><b>${i.copias}</b></div></div>
        <p class="muted" style="margin:0">Puntos por mundos: ${t.pts} · Penalización (más de ${FREE_EVENTS} salidas o pegados, ${EVENT_COST} c/u): <b style="color:${t.pen ? 'var(--coral)' : 'var(--ink)'}">−${t.pen}</b></p></div>
      <div class="card center" style="margin-top:12px"><b>Código de evidencia</b><br><div class="code2" id="rp-code">generando…</div>
        <p class="muted" style="font-size:.9rem">Sube a Blackboard la constancia PNG y este código. Incluye tu puntaje y tu registro de integridad, firmados con tu matrícula.</p>
        <p id="rp-rank" style="font-weight:700"></p>
        <div class="next" style="justify-content:center"><button class="b gold" id="rp-png">⬇ Constancia PNG</button><button class="b" id="rp-copy">Copiar código</button><a class="b line" href="ranking.html?grupo=${encodeURIComponent(P.player.grupo)}">🏆 Ranking</a><button class="b line" id="rp-map">Mapa</button></div></div>`;
    $('#rp-map').addEventListener('click', () => { renderMap(); show('map'); });
    show('rep');
    const code = await L.makeCode2({ score: t.score, pct: t.pct, time: P.active, worlds: t.passed, salidas: i.salidas, fuera: i.fuera, pegados: i.pegados, copias: i.copias, matricula: P.player.mat });
    lastReport = { t, i: Object.assign({}, i), code, date: new Date() };
    $('#rp-code').textContent = code;
    $('#rp-copy').addEventListener('click', async () => {
      // copiar el propio código sí se permite (botón explícito): se escribe directo al portapapeles
      try { await navigator.clipboard.writeText(code); $('#rp-copy').textContent = '¡Copiado!'; } catch (e) { $('#rp-copy').textContent = 'Selecciónalo a mano'; }
    });
    $('#rp-png').addEventListener('click', png);
    submit();
  }
  async function submit() {
    const el = $('#rp-rank'); el.textContent = 'Registrando en el ranking…'; el.style.color = '';
    try {
      const r = await fetch('/api/v2/score', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: P.player.nombre, matricula: P.player.mat, grupo: P.player.grupo, code: lastReport.code,
          mundos: Object.fromEntries(W.map(w => [w.n, P.worlds[w.n] ? { pts: P.worlds[w.n].pts, pct: P.worlds[w.n].pct, intentos: P.worlds[w.n].attempts } : null])) }) });
      const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || 'error');
      el.innerHTML = `✅ Registrado: lugar <b>#${j.posicion}</b> de ${j.participantes} en ${esc(P.player.grupo)}${j.mejorado ? '' : ` (tu mejor registro sigue siendo ${j.mejor} pts)`}.`; el.style.color = 'var(--mint)';
    } catch (e) {
      el.innerHTML = 'No se pudo registrar (¿sin conexión?). Tu código sigue siendo válido. <button class="b sm" id="rp-retry">Reintentar</button>'; el.style.color = 'var(--coral)';
      $('#rp-retry').addEventListener('click', submit);
    }
  }
  function png() {
    const { t, i, code, date } = lastReport, cv = document.createElement('canvas'); cv.width = 1400; cv.height = 980; const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, 1400, 980); g.addColorStop(0, '#1A1020'); g.addColorStop(1, '#120B16'); x.fillStyle = g; x.fillRect(0, 0, 1400, 980);
    x.fillStyle = '#C0395F'; x.fillRect(0, 0, 1400, 12);
    x.fillStyle = '#F5B83D'; x.font = '700 24px "JetBrains Mono", monospace'; x.fillText('EXPEDICIÓN NOMENCLATURA 2.0 · CEUX ENSENADA · COMPOSICIÓN DE LA MATERIA', 60, 70);
    x.fillStyle = '#F6EEF3'; x.font = '800 54px "Unbounded", sans-serif'; x.fillText(t.passed === 7 ? 'Constancia final' : 'Constancia de avance', 60, 150);
    x.font = '800 40px "Figtree", sans-serif'; x.fillText(P.player.nombre, 60, 220);
    x.fillStyle = '#C2B0C2'; x.font = '26px "Figtree", sans-serif'; x.fillText(`Matrícula ${P.player.mat} · Grupo ${P.player.grupo} · ${date.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}`, 60, 265);
    const k = [['Puntaje', t.score], ['Aprovechamiento', t.pct + '%'], ['Mundos', t.passed + '/7'], ['Tiempo activo', L.fmtTime(P.active)]];
    k.forEach(([a, b], j) => { const bx = 60 + j * 325; x.fillStyle = '#21152A'; x.beginPath(); x.roundRect(bx, 300, 300, 150, 18); x.fill();
      x.fillStyle = '#8E7A93'; x.font = '700 20px "Figtree"'; x.fillText(a.toUpperCase(), bx + 22, 340); x.fillStyle = '#F5B83D'; x.font = '800 56px "Unbounded"'; x.fillText(String(b), bx + 22, 420); });
    x.fillStyle = '#C2B0C2'; x.font = '22px "Figtree"';
    W.forEach((w, j) => { const r = P.worlds[w.n]; x.fillText(`Mundo ${w.n} ${w.name}: ${r ? r.pct + '%  ' + '★'.repeat(r.stars) : '—'}`, 60 + (j % 2) * 660, 500 + Math.floor(j / 2) * 34); });
    x.fillStyle = '#21152A'; x.beginPath(); x.roundRect(60, 650, 1280, 110, 18); x.fill();
    x.fillStyle = i.salidas > FREE_EVENTS || i.pegados > FREE_EVENTS ? '#FF7A59' : '#F6EEF3'; x.font = '700 24px "Figtree"';
    x.fillText(`Integridad · salidas de ventana: ${i.salidas} (fuera ${L.fmtTime(i.fuera)}) · intentos de pegar: ${i.pegados} · de copiar: ${i.copias} · penalización: −${t.pen}`, 86, 715);
    x.fillStyle = '#000'; x.beginPath(); x.roundRect(60, 790, 1280, 120, 18); x.fill();
    x.fillStyle = '#8E7A93'; x.font = '700 20px "JetBrains Mono"'; x.fillText('CÓDIGO DE EVIDENCIA', 90, 830);
    x.fillStyle = '#fff'; x.font = '700 46px "JetBrains Mono"'; x.fillText(code, 90, 885);
    const a = document.createElement('a'); a.download = `Constancia_Expedicion_${P.player.mat}.png`; a.href = cv.toDataURL('image/png'); a.click();
  }

  /* ================= atajos ================= */
  $('#tb-help').addEventListener('click', () => {
    if (inGame()) { P.integ.atajos++; save(); }
    const m = $('#m-help'); const C = L.CARDS;
    $('#m-tabs').innerHTML = Object.entries(C).map(([k, v], j) => `<button data-t="${k}" aria-selected="${j === 0}">${v.t}</button>`).join('');
    const tab = k => { $$('#m-tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === k))); $('#m-body').innerHTML = C[k].html(); };
    $$('#m-tabs button').forEach(b => b.addEventListener('click', () => tab(b.dataset.t)));
    tab(Object.keys(C)[0]); m.classList.add('on');
  });
  $('#m-close').addEventListener('click', () => $('#m-help').classList.remove('on'));
  $('#m-help').addEventListener('click', e => { if (e.target.id === 'm-help') $('#m-help').classList.remove('on'); });

  window.__EXP = { get P() { return P; }, get S() { return S; }, get I() { return I; }, norm, buildWorld };
})();
