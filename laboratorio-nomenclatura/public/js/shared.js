/* Laboratorio de Nomenclatura — utilidades compartidas (juego, ranking, verificador) */
(function (g) {
  'use strict';

  /* ---------- Fórmulas: "Fe2(SO4)3" -> HTML con subíndices ---------- */
  function fHTML(f) {
    return String(f).replace(/(\d+)/g, '<sub>$1</sub>');
  }
  /* Ion con carga: ("SO4", -2) -> SO₄²⁻ en HTML */
  function ionHTML(s, q) {
    const n = Math.abs(q);
    const sign = q > 0 ? '+' : '−';
    return fHTML(s) + '<sup>' + (n > 1 ? n : '') + sign + '</sup>';
  }
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  function normMat(m) { return String(m || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function normGrupo(gr) {
    return String(gr || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'SIN-GRUPO';
  }
  function shortName(n) {
    const p = String(n || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return 'Anónimo';
    return p.length > 1 ? `${p[0]} ${p[1][0].toUpperCase()}.` : p[0];
  }
  function fmtTime(s) {
    s = Math.max(0, Math.round(s));
    const m = Math.floor(s / 60), r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  /* ---------- Código de evidencia ----------
     Carga útil (45 bits): versión(2) · puntaje(13) · aprovechamiento %(7) · tiempo s(13) · día desde 2026-01-01(10)
     Firma (20 bits): HMAC-SHA256(clave, carga|matrícula) truncado.  Total 65 bits = 13 caracteres base32 (Crockford). */
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const KEY = 'CEUX·BIO·Nomenclatura·IUPAC2005·v1·Ensenada';
  const EPOCH = Date.UTC(2026, 0, 1);

  async function hmac20(msg) {
    const enc = new TextEncoder();
    const k = await crypto.subtle.importKey('raw', enc.encode(KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
    return ((sig[0] << 12) | (sig[1] << 4) | (sig[2] >> 4)) >>> 0;
  }
  function dayIndex(date) { return Math.floor((date.getTime() - EPOCH) / 86400000) & 1023; }
  function dayToDate(d) {
    // el índice cicla cada 1024 días; se elige la fecha más reciente no futura
    const now = Date.now();
    let t = EPOCH + d * 86400000;
    while (t + 1024 * 86400000 <= now) t += 1024 * 86400000;
    return new Date(t);
  }
  async function makeCode({ score, pct, time, matricula, date }) {
    const v = 1n;
    const sc = BigInt(Math.min(8191, Math.max(0, Math.round(score))));
    const pc = BigInt(Math.min(100, Math.max(0, Math.round(pct))));
    const tm = BigInt(Math.min(8191, Math.max(0, Math.round(time))));
    const dy = BigInt(dayIndex(date || new Date()));
    const payload = (v << 43n) | (sc << 30n) | (pc << 23n) | (tm << 10n) | dy;
    const sig = BigInt(await hmac20(payload.toString(36) + '|' + normMat(matricula)));
    let all = (payload << 20n) | sig;
    let out = '';
    for (let i = 0; i < 13; i++) { out = B32[Number(all & 31n)] + out; all >>= 5n; }
    return `NOM-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8)}`;
  }
  async function readCode(code, matricula) {
    const raw = String(code || '').toUpperCase().replace(/^NOM/, '').replace(/[^0-9A-Z]/g, '')
      .replace(/O/g, '0').replace(/[IL]/g, '1');
    if (raw.length !== 13) return { ok: false, motivo: 'Formato incorrecto (deben ser 13 caracteres después de NOM-)' };
    let all = 0n;
    for (const ch of raw) {
      const i = B32.indexOf(ch);
      if (i < 0) return { ok: false, motivo: `Carácter no válido: ${ch}` };
      all = (all << 5n) | BigInt(i);
    }
    const sig = Number(all & 0xFFFFFn);
    const payload = all >> 20n;
    const v = Number(payload >> 43n);
    const score = Number((payload >> 30n) & 8191n);
    const pct = Number((payload >> 23n) & 127n);
    const time = Number((payload >> 10n) & 8191n);
    const day = Number(payload & 1023n);
    const expected = await hmac20(payload.toString(36) + '|' + normMat(matricula));
    const ok = v === 1 && expected === sig && pct <= 100;
    return { ok, motivo: ok ? '' : 'La firma no corresponde a esa matrícula (código alterado o matrícula distinta)',
      score, pct, time, date: dayToDate(day) };
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  g.LAB = { fHTML, ionHTML, ROMAN, normMat, normGrupo, shortName, fmtTime, makeCode, readCode, shuffle, esc };
})(window);

/* ---------- Código v2 (Expedición) ----------
   Carga (81 bits): ver(2)=2 · puntaje(14) · aprov%(7) · tiempo activo s(14) · mundos superados(3) ·
   salidas(7) · tiempo fuera s(12) · pegados(6) · copias(6) · día(10).  Firma 20 bits → 101 bits ≈ 21 caracteres. */
(function (g) {
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const KEY = 'CEUX·BIO·Expedicion·Nomenclatura·v2·Ensenada';
  const EPOCH = Date.UTC(2026, 0, 1);
  const F = [['ver', 2], ['score', 14], ['pct', 7], ['time', 14], ['worlds', 3], ['salidas', 7], ['fuera', 12], ['pegados', 6], ['copias', 6], ['day', 10]];
  async function hmac20(msg) {
    const enc = new TextEncoder();
    const k = await crypto.subtle.importKey('raw', enc.encode(KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const s = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
    return ((s[0] << 12) | (s[1] << 4) | (s[2] >> 4)) >>> 0;
  }
  async function makeCode2(o) {
    const v = Object.assign({ ver: 2, day: Math.floor((Date.now() - EPOCH) / 86400000) & 1023 }, o);
    let p = 0n;
    for (const [k, b] of F) { const max = (1 << b) - 1; p = (p << BigInt(b)) | BigInt(Math.min(max, Math.max(0, Math.round(v[k] || 0)))); }
    const sig = BigInt(await hmac20(p.toString(36) + '|' + g.LAB.normMat(o.matricula)));
    let all = (p << 20n) | sig, out = '';
    for (let i = 0; i < 21; i++) { out = B32[Number(all & 31n)] + out; all >>= 5n; }
    return `N2-${out.slice(0, 5)}-${out.slice(5, 10)}-${out.slice(10, 15)}-${out.slice(15)}`;
  }
  async function readCode2(code, matricula) {
    const raw = String(code || '').toUpperCase().replace(/^N2/, '').replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
    if (raw.length !== 21) return { ok: false, motivo: 'Formato incorrecto (N2- y 21 caracteres)' };
    let all = 0n;
    for (const ch of raw) { const i = B32.indexOf(ch); if (i < 0) return { ok: false, motivo: 'Carácter no válido: ' + ch }; all = (all << 5n) | BigInt(i); }
    const sig = Number(all & 0xFFFFFn); let p = all >> 20n; const ps = p;
    const v = {};
    for (const [k, b] of F.slice().reverse()) { v[k] = Number(p & ((1n << BigInt(b)) - 1n)); p >>= BigInt(b); }
    const ok = v.ver === 2 && v.pct <= 100 && (await hmac20(ps.toString(36) + '|' + g.LAB.normMat(matricula))) === sig;
    let t = EPOCH + v.day * 86400000; while (t + 1024 * 86400000 <= Date.now()) t += 1024 * 86400000;
    return Object.assign(v, { ok, date: new Date(t), motivo: ok ? '' : 'La firma no corresponde a esa matrícula (código alterado o matrícula distinta)' });
  }
  g.LAB.makeCode2 = makeCode2; g.LAB.readCode2 = readCode2;
})(window);

/* Servidor de ranking disponible solo fuera de GitHub Pages (GitHub sirve páginas estáticas) */
window.LAB.SERVER = !/\.github\.io$/i.test(location.hostname);
if (!window.LAB.SERVER) document.documentElement.classList.add('static');
