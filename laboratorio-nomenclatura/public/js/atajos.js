/* Atajos (tarjetas de apoyo) y árbol de clasificación */
(function (g) {
  'use strict';
  const { fHTML } = g.LAB;

  /* ---------- Árbol de decisión (mapa de familias) ---------- */
  const TREE = {
    id: 'o', s: '¿Tiene O?', q: '¿La fórmula contiene oxígeno (O)?',
    hint: 'Busca la letra O sola (no confundas con Os). Si aparece O en cualquier parte, la respuesta es sí.',
    no: {
      id: 'h', s: '¿Tiene H?', q: '¿Contiene hidrógeno (H)?',
      hint: 'Revisa toda la fórmula: el H puede ir al inicio (HCl) o al final (NaH, NH₃).',
      no: { leaf: 'binaria', s: 'Otras binarias' },
      si: {
        id: 'hx', s: '¿H primero + F, Cl, Br, I, S, Se, Te?',
        q: '¿El H va primero y lo acompaña un no metal de los grupos 16 o 17 (F, Cl, Br, I, S, Se, Te)?',
        hint: 'Cuando el H va a la izquierda junto a un halógeno o anfígeno, el H es la parte “positiva”: es un haluro de hidrógeno (hidrácido en agua).',
        si: { leaf: 'haluro', s: 'Haluro de hidrógeno' },
        no: {
          id: 'm', s: '¿El otro es metal?', q: '¿El elemento que acompaña al H es un metal?',
          hint: 'Metales: lado izquierdo y centro de la tabla (Na, Ca, Al, Cu…). B, C, Si, N, P, As, Sb son no metales o semimetales.',
          si: { leaf: 'hidruro_met', s: 'Hidruro metálico' },
          no: { leaf: 'hidruro_vol', s: 'Hidruro volátil' }
        }
      }
    },
    si: {
      id: 'dos', s: '¿Solo 2 elementos?', q: '¿Está formada solo por dos elementos (X y O)?',
      hint: 'Cuenta símbolos distintos, no átomos: Fe₂O₃ tiene 2 elementos; NaOH tiene 3.',
      si: {
        id: 'per', s: '¿Grupo O₂²⁻?', q: '¿El oxígeno está como grupo peróxido O₂²⁻?',
        hint: 'Prueba con O = −2: si la carga del otro elemento sale imposible (Na en Na₂O₂ sería +2, Ba en BaO₂ sería +4), el oxígeno está como O₂²⁻. Ojo: PbO₂ y SnO₂ son óxidos porque Pb y Sn sí tienen valencia 4.',
        si: { leaf: 'peroxido', s: 'Peróxido' },
        no: { leaf: 'oxido', s: 'Óxido' }
      },
      no: {
        id: 'oh', s: '¿Metal + grupos OH?', q: '¿Es un metal unido a grupos OH (hidróxido), como M(OH)ₓ?',
        hint: 'Un hidróxido termina en OH: NaOH, Ca(OH)₂. En NaHCO₃ el H y el O no forman un OH final.',
        si: { leaf: 'hidroxido', s: 'Hidróxido' },
        no: {
          id: 'hi', s: '¿Empieza con H?', q: '¿La fórmula empieza con H (H + no metal + O)?',
          hint: 'Los oxoácidos se escriben H…O: HNO₃, H₂SO₄. Si empieza con un metal o con NH₄, es una sal.',
          si: { leaf: 'oxoacido', s: 'Oxoácido' },
          no: {
            id: 'ha', s: '¿Queda H en el anión?', q: '¿Queda algún H dentro del anión (HSO₄, HCO₃, H₂PO₄…)?',
            hint: 'Fíjate después del metal: si ves H antes del no metal (NaHCO₃, KH₂PO₄) es sal ácida. El H de NH₄⁺ es del catión, no cuenta.',
            si: { leaf: 'sal_acida', s: 'Sal ácida' },
            no: { leaf: 'oxisal', s: 'Oxisal' }
          }
        }
      }
    }
  };
  const FAM = {
    binaria: 'Otras combinaciones binarias', haluro: 'Haluro de hidrógeno', hidruro_met: 'Hidruro metálico',
    hidruro_vol: 'Hidruro volátil', peroxido: 'Peróxido', oxido: 'Óxido', hidroxido: 'Hidróxido',
    oxoacido: 'Oxoácido', sal_acida: 'Sal ácida', oxisal: 'Oxisal'
  };
  function pathTo(fam) {
    const out = [];
    (function walk(n, acc) {
      if (n.leaf) { if (n.leaf === fam) out.push(...acc); return; }
      walk(n.si, acc.concat([[n, 'si']])); walk(n.no, acc.concat([[n, 'no']]));
    })(TREE, []);
    return out;
  }

  /* SVG del mapa: disposición automática por hojas */
  function treeSVG(highlight) {
    const W = 92, H = 74, leaves = [];
    let maxD = 0;
    (function lay(n, d) {
      n._d = d; maxD = Math.max(maxD, d);
      if (n.leaf) { n._x = leaves.length * W + W / 2; leaves.push(n); return; }
      lay(n.si, d + 1); lay(n.no, d + 1);
      n._x = (n.si._x + n.no._x) / 2;
    })(TREE, 0);
    const width = leaves.length * W, height = (maxD + 1) * H + 10;
    const hl = new Set((highlight || []).map(([n, a]) => n.id + a));
    let edges = '', nodes = '';
    const wrap = (t, n) => {
      const w = t.split(' '), lines = []; let cur = '';
      for (const x of w) { if ((cur + ' ' + x).trim().length > n) { lines.push(cur.trim()); cur = x; } else cur += ' ' + x; }
      lines.push(cur.trim()); return lines;
    };
    (function draw(n) {
      const y = n._d * H + 26;
      if (!n.leaf) {
        for (const a of ['si', 'no']) {
          const c = n[a], cy = c._d * H + 26, on = hl.has(n.id + a);
          edges += `<path d="M${n._x} ${y + 18} C ${n._x} ${y + 40}, ${c._x} ${cy - 40}, ${c._x} ${cy - 20}" fill="none" stroke-width="${on ? 3 : 1.4}" class="svg-line" ${on ? 'style="stroke:var(--guinda)"' : ''}/>`;
          const mx = (n._x + c._x) / 2, my = (y + cy) / 2;
          edges += `<text x="${mx + (a === 'si' ? -8 : 8)}" y="${my}" font-size="10.5" text-anchor="middle" class="svg-ink" font-weight="700">${a === 'si' ? 'Sí' : 'No'}</text>`;
          draw(c);
        }
      }
      const lines = wrap(n.s, n.leaf ? 12 : 13);
      const bw = W - 8, bh = 14 * lines.length + 10;
      const cls = n.leaf ? 'svg-gs' : 'svg-card';
      nodes += `<rect x="${n._x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="8" class="${cls}" stroke-width="1.3"/>`;
      lines.forEach((l, i) => {
        nodes += `<text x="${n._x}" y="${y - bh / 2 + 16 + i * 14}" font-size="11" text-anchor="middle" class="svg-ink" ${n.leaf ? 'font-weight="700"' : ''}>${l}</text>`;
      });
    })(TREE);
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Mapa de decisión para clasificar compuestos inorgánicos">${edges}${nodes}</svg>`;
  }

  /* SVG de la escalera de sufijos */
  function ladderSVG() {
    const steps = [['1', 'hipo–…–oso', 'hipo–…–ito'], ['3', '…–oso', '…–ito'], ['5', '…–ico', '…–ato'], ['7', 'per–…–ico', 'per–…–ato']];
    let s = '';
    steps.forEach((st, i) => {
      const x = 20 + i * 165, h = 50 + i * 34, y = 210 - h;
      s += `<rect x="${x}" y="${y}" width="155" height="${h}" rx="8" class="svg-gs" stroke-width="1.4"/>`;
      s += `<text x="${x + 77}" y="${y + 24}" text-anchor="middle" font-size="20" font-weight="700" class="svg-g">${st[1]}</text>`;
      s += `<text x="${x + 77}" y="${y + 44}" text-anchor="middle" font-size="13" class="svg-ink">anión: ${st[2]}</text>`;
      s += `<text x="${x + 77}" y="232" text-anchor="middle" font-size="14" class="svg-ink">Cl con valencia ${st[0]}</text>`;
    });
    s += `<text x="20" y="18" font-size="13" class="svg-ink">menor valencia</text><text x="680" y="18" font-size="13" text-anchor="end" class="svg-ink">mayor valencia →</text>`;
    return `<svg viewBox="0 0 690 245" role="img" aria-label="Escalera de prefijos y sufijos">${s}</svg>`;
  }

  const CARDS = {
    mapa: {
      t: 'Mapa de familias', html: () => `
        <p>Antes de nombrar, <b>clasifica</b>. Responde las preguntas de arriba hacia abajo; cada camino termina en una familia.</p>
        <div class="tree-scroll">${treeSVG()}</div>
        <p class="muted" style="font-size:.9rem">Truco del peróxido: supón O = −2. Si la carga del otro elemento sale imposible (Na₂O₂ → Na sería +2), el oxígeno está como O₂²⁻.</p>`
    },
    cruce: {
      t: 'Cruce de cargas', html: () => `
        <p>Un compuesto iónico es neutro: <b>la suma de cargas debe ser cero</b>. La carga de un ion se convierte en el subíndice del otro, y luego se simplifica.</p>
        <div class="formula-box">Fe³⁺ + SO₄²⁻ → Fe<sub>2</sub>(SO<sub>4</sub>)<sub>3</sub> &nbsp; (2·(+3) + 3·(−2) = 0)</div>
        <div class="formula-box">Ca²⁺ + O²⁻ → Ca<sub>2</sub>O<sub>2</sub> → <b>CaO</b> &nbsp; (siempre simplifica)</div>
        <ul>
          <li>Si el ion poliatómico se repite, va entre <b>paréntesis</b>: Ca(NO₃)₂, (NH₄)₂SO₄. Si va una sola vez, sin paréntesis: KNO₃.</li>
          <li>El metal (o NH₄⁺) siempre se escribe <b>a la izquierda</b>.</li>
          <li><b>Peróxido:</b> el grupo O₂²⁻ es una unidad y su “2” no se toca. Cu²⁺ + O₂²⁻ → CuO₂; Na⁺ + O₂²⁻ → Na₂O₂.</li>
        </ul>`
    },
    stock: {
      t: 'Cómo se nombra', html: () => `
        <table><tr><th>Sistema</th><th>Regla</th><th>Ejemplo</th></tr>
        <tr><td><b>Números de oxidación</b> (Stock)</td><td>Número romano entre paréntesis <b>solo si el elemento tiene más de una valencia</b>.</td><td>FeCl₃ → cloruro de hierro (III)<br>NaCl → cloruro de sodio</td></tr>
        <tr><td><b>Prefijos multiplicadores</b></td><td>mono-, di-, tri-, tetra-, penta-… según el número de átomos (mono- es opcional al inicio, salvo en monóxido).</td><td>CCl₄ → tetracloruro de carbono<br>Fe₂O₃ → trióxido de dihierro</td></tr>
        <tr><td><b>Sustitución</b></td><td>Nombre del hidruro progenitor.</td><td>PH₃ → fosfano; NH₃ → azano (amoniaco)</td></tr></table>
        <p>Plantillas: <b>hidruro de</b> M · <b>óxido de</b> M · <b>peróxido de</b> M · <b>hidróxido de</b> M · no metal + <b>–uro de</b> M · <b>–uro de hidrógeno</b> (en agua: ácido …<b>hídrico</b>).</p>`
    },
    escalera: {
      t: 'Escalera de sufijos', html: () => `
        <p>Para oxoácidos y sus sales, el nombre depende de <b>qué valencia usa el no metal</b> dentro de las que tiene.</p>
        ${ladderSVG()}
        <table><tr><th>Nº de valencias</th><th>Peldaños (de menor a mayor)</th><th>Ejemplo</th></tr>
        <tr><td>1</td><td>–ico</td><td>C (4): carbónico · B (3): bórico · Cr (6): crómico</td></tr>
        <tr><td>2</td><td>–oso · –ico</td><td>P, As (3, 5)</td></tr>
        <tr><td>3</td><td>hipo–oso · –oso · –ico</td><td>S, Se (2, 4, 6) · N (1, 3, 5)</td></tr>
        <tr><td>4</td><td>hipo–oso · –oso · –ico · per–ico</td><td>Cl, Br, I (1, 3, 5, 7)</td></tr></table>
        <p><b>Excepción del manganeso:</b> 4 → –oso, 6 → –ico, 7 → per–ico (permangánico, permanganato).</p>`
    },
    atajo: {
      t: 'Regla 2·O − H', html: () => `
        <p>Para saber qué valencia usa el no metal X, multiplica por 2 los oxígenos y resta todo lo positivo que lo acompaña.</p>
        <div class="formula-box">Oxoácido: &nbsp; V = (2·O − H) ÷ nº de X</div>
        <div class="formula-box">Oxisal o sal ácida: &nbsp; V = 2·O − H − carga del anión</div>
        <ul>
          <li>HBrO₄: 2·4 − 1 = <b>7</b> → mayor valencia del Br → ácido <b>per</b>brómico.</li>
          <li>H₂S₂O₇: (2·7 − 2) ÷ 2 = <b>6</b> → ácido <b>di</b>sulfúrico.</li>
          <li>Fe₂(SO₄)₃: la carga del sulfato es 2 (el subíndice del metal). 2·4 − 2 = <b>6</b> → sulfato. El Fe: 3·2 ÷ 2 = 3 → hierro (III).</li>
          <li>NaHSO₄: carga del anión = 1 (un Na⁺). 2·4 − 1 − 1 = <b>6</b> → hidrogeno<b>sulfato</b> de sodio.</li>
        </ul>
        <p class="muted">Carga del anión = (carga del metal × nº de metales) ÷ nº de aniones.</p>`
    },
    oxagua: {
      t: 'Óxido + agua', html: () => `
        <p>Para <b>formular</b> un oxoácido: escribe el óxido del no metal con esa valencia y súmale agua; luego simplifica.</p>
        <div class="formula-box">Ácido perbrómico (Br, 7): Br<sub>2</sub>O<sub>7</sub> + H<sub>2</sub>O → H<sub>2</sub>Br<sub>2</sub>O<sub>8</sub> → <b>HBrO<sub>4</sub></b></div>
        <div class="formula-box">Ácido sulfúrico (S, 6): SO<sub>3</sub> + H<sub>2</sub>O → <b>H<sub>2</sub>SO<sub>4</sub></b></div>
        <ul>
          <li><b>meta-</b> = +1 H₂O; <b>orto-</b> = +3 H₂O.</li>
          <li>Lo “normal” es +1 H₂O, <b>excepto B, P, As y Sb</b>, que por defecto llevan +3 H₂O: P₂O₅ + 3H₂O → H₃PO₄ (fosfórico). Con +1 H₂O sale HPO₃ (meta­fosfórico).</li>
          <li><b>di-</b>: 2 moléculas de ácido − 1 H₂O. 2 H₂SO₄ − H₂O → H₂S₂O₇ (disulfúrico).</li>
        </ul>`
    },
    osito: {
      t: 'Osito y atico', html: () => `
        <p>El anión de una oxisal se nombra desde su ácido cambiando la terminación:</p>
        <div class="formula-box">–<b>oso</b> → –<b>ito</b> &nbsp;&nbsp;|&nbsp;&nbsp; –<b>ico</b> → –<b>ato</b> &nbsp; (“el <b>oso</b> come <b>ito</b>s, el <b>ico</b> es un <b>ato</b>”)</div>
        <table><tr><th>Ácido</th><th>Anión</th><th>Sal</th></tr>
        <tr><td>H₂SO₄ sulfúrico</td><td>SO₄²⁻ sulfato</td><td>Fe₂(SO₄)₃ sulfato de hierro (III)</td></tr>
        <tr><td>HNO₂ nitroso</td><td>NO₂⁻ nitrito</td><td>NaNO₂ nitrito de sodio</td></tr>
        <tr><td>HClO hipocloroso</td><td>ClO⁻ hipoclorito</td><td>NaClO hipoclorito de sodio</td></tr></table>
        <p><b>Sales ácidas:</b> si el anión conserva H, antepón <b>hidrogeno-</b> o <b>dihidrogeno-</b>: NaHCO₃ hidrogenocarbonato de sodio; KH₂PO₄ dihidrogenofosfato de potasio.</p>
        <p>La carga del anión = nº de H que perdió el ácido (H₂SO₄ → SO₄²⁻; H₃PO₄ → H₂PO₄⁻, HPO₄²⁻, PO₄³⁻).</p>`
    },
    trampa: {
      t: 'Trampa: fórmula simplificada', html: () => `
        <p>Si al aplicar la regla te sale una valencia que el elemento <b>no tiene</b>, la fórmula estaba simplificada.</p>
        <div class="formula-box">CuCrO₄: si tomas carga 1 → 2·4 − 1 = 7 ✗ (el Cr no usa 7)</div>
        <p>Venía de Cu₂(CrO₄)₂: la carga real del anión es <b>2</b> → 2·4 − 2 = 6 ✓ (cromato) y el cobre es (II): <b>cromato de cobre (II)</b>. Lo mismo pasa en CuSO₄, FeSO₄ y Pb(SO₄)₂.</p>`
    }
  };

  g.LAB.TREE = TREE; g.LAB.FAM = FAM; g.LAB.pathTo = pathTo; g.LAB.CARDS = CARDS; g.LAB.treeSVG = treeSVG;
})(window);
