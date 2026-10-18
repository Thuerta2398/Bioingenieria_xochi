/* Mundos de la Expedición: metadatos y repasos */
window.MUNDOS = [
  {
    n: 0, name: 'Taller de símbolos', icon: '⚗️', n_items: 8, color: '#59C3E8',
    temas: ['Símbolos de los elementos', 'Estados de oxidación', 'Cationes y aniones', 'Sustancias simples'],
    brief: `
      <p>Todo nombre químico se arma con piezas pequeñas: <b>símbolos</b>, <b>estados de oxidación</b> e <b>iones</b>.</p>
      <div class="rule"><b>Cuidado con los símbolos latinos:</b> Na (sodio, <i>natrium</i>), K (potasio, <i>kalium</i>), Fe (hierro, <i>ferrum</i>), Cu (cobre, <i>cuprum</i>), Ag (plata, <i>argentum</i>), Au (oro, <i>aurum</i>), Pb (plomo, <i>plumbum</i>), Sn (estaño, <i>stannum</i>), Hg (mercurio), Sb (antimonio, <i>stibium</i>).</div>
      <div class="rule"><b>Iones.</b> Catión: “catión” + metal + romano si tiene varias valencias (Fe³⁺ = catión hierro (III), o ion férrico). Anión monoatómico: raíz + <b>–uro</b> (Cl⁻ cloruro, S²⁻ sulfuro). Oxoaniones: del ácido <b>–oso → –ito</b> y <b>–ico → –ato</b> (SO₄²⁻ sulfato).</div>
      <div class="rule"><b>Sustancias simples</b> (un solo elemento): gases nobles monoatómicos (He, Ne…); diatómicos H₂, N₂, O₂, F₂, Cl₂, Br₂, I₂; alótropos O₃ (ozono, trioxígeno), S₈ (octaazufre), P₄ (tetrafósforo, fósforo blanco).</div>
      <table><tr><th>Elemento</th><th>Valencias que usaremos</th></tr>
      <tr><td>Na, K, Li, Ag · Ca, Mg, Ba, Zn · Al</td><td>1 · 2 · 3 (una sola)</td></tr>
      <tr><td>Fe · Cu · Pb, Sn</td><td>2 y 3 · 1 y 2 · 2 y 4</td></tr>
      <tr><td>Cl, Br, I (en oxoácidos) · S, Se · N · P, As · Mn</td><td>1, 3, 5, 7 · 2, 4, 6 · 1, 3, 5 · 3, 5 · 4, 6, 7</td></tr></table>`
  },
  {
    n: 1, name: 'Torre de los tres sistemas', icon: '🏛️', n_items: 8, color: '#F5B83D',
    temas: ['Sistemática (prefijos)', 'Stock (romanos)', 'Tradicional (–oso / –ico)'],
    brief: `
      <p>Un mismo compuesto puede nombrarse de tres maneras. Fe₂O₃:</p>
      <div class="ex"><b>Sistemática</b><span>prefijos por número de átomos → trióxido de dihierro</span>
      <b>Stock</b><span>valencia en romanos (solo si tiene más de una) → óxido de hierro (III)</span>
      <b>Tradicional</b><span>sufijo según la valencia → óxido férrico</span></div>
      <div class="rule"><b>Tradicional con metales de dos valencias:</b> la menor termina en <b>–oso</b> y la mayor en <b>–ico</b>, usando la raíz latina cuando existe.</div>
      <table><tr><th>Metal</th><th>Menor (–oso)</th><th>Mayor (–ico)</th></tr>
      <tr><td>Hierro (2, 3)</td><td>ferroso</td><td>férrico</td></tr>
      <tr><td>Cobre (1, 2)</td><td>cuproso</td><td>cúprico</td></tr>
      <tr><td>Plomo (2, 4)</td><td>plumboso</td><td>plúmbico</td></tr>
      <tr><td>Estaño (2, 4)</td><td>estannoso</td><td>estánnico</td></tr>
      <tr><td>Níquel / Cobalto (2, 3)</td><td>niqueloso / cobaltoso</td><td>niquélico / cobáltico</td></tr>
      <tr><td>Mercurio (1, 2) · Oro (1, 3)</td><td>mercurioso · auroso</td><td>mercúrico · áurico</td></tr></table>
      <div class="rule">Con una sola valencia se usa –ico o simplemente “de”: cloruro sódico = cloruro de sodio.</div>`
  },
  {
    n: 2, name: 'Islas binarias', icon: '🏝️', n_items: 10, color: '#3DDC97',
    temas: ['Óxidos básicos y ácidos (anhídridos)', 'Peróxidos', 'Hidruros e hidrácidos', 'Sales neutras y volátiles'],
    brief: `
      <p>Los binarios tienen dos elementos: se escribe primero el <b>menos electronegativo</b>, se cruzan las valencias y se simplifica.</p>
      <div class="rule"><b>Óxidos de no metal (óxidos ácidos).</b> IUPAC recomienda la sistemática; el nombre tradicional es <b>anhídrido</b> con el mismo sufijo que su ácido: SO₂ anhídrido sulfuroso, SO₃ anhídrido sulfúrico, CO₂ anhídrido carbónico, N₂O₅ anhídrido nítrico.</div>
      <div class="rule"><b>Hidruros volátiles</b> (grupos 13–15) tienen nombres comunes aceptados: NH₃ amoniaco, PH₃ fosfina (fosfano), AsH₃ arsina, SbH₃ estibina, CH₄ metano, SiH₄ silano.</div>
      <div class="rule"><b>Sales volátiles</b> (no metal + no metal): va primero el que aparece antes en<br><span class="mono">B &lt; Si &lt; C &lt; Sb &lt; As &lt; P &lt; N &lt; Te &lt; Se &lt; S &lt; I &lt; Br &lt; Cl &lt; O &lt; F</span><br>Por eso se escribe PCl₃ (no Cl₃P) y BrF₃.</div>
      <div class="ex"><b>FeCl₃</b><span>cloruro de hierro (III) · cloruro férrico · tricloruro de hierro</span>
      <b>N₂O₃</b><span>trióxido de dinitrógeno · óxido de nitrógeno (III) · anhídrido nitroso</span></div>`
  },
  {
    n: 3, name: 'Cuartel del detective', icon: '🕵️', n_items: 6, color: '#E25A82',
    temas: ['Clasificar con el mapa de familias', 'Nombrar con el sistema que prefieras'],
    brief: `
      <p>Antes de nombrar, <b>clasifica</b>. Recorre el mapa de preguntas (¿tiene O?, ¿tiene H?, ¿hay metal?…) hasta llegar a la familia, y luego escribe el nombre.</p>
      <div class="rule">Ahora el nombre es <b>abierto</b>: se acepta Stock, sistemática o tradicional, sin importar mayúsculas ni acentos.</div>
      <div class="rule"><b>Truco del peróxido:</b> supón O = −2. Si la carga del otro elemento sale imposible (Na₂O₂ → Na sería +2), el oxígeno está como O₂²⁻.</div>
      <div class="tree-scroll" id="brief-tree"></div>`
  },
  {
    n: 4, name: 'Volcán de los oxoácidos', icon: '🌋', n_items: 7, color: '#FF7A59',
    temas: ['Hidróxidos', 'Regla 2·O − H', 'Escalera hipo–oso … per–ico', 'Prefijos meta, orto y di'],
    brief: `
      <div class="rule"><b>Valencia del no metal en un oxoácido:</b> V = (2·O − H) ÷ nº de átomos del no metal. HClO₄: 2·4 − 1 = 7 → ácido <b>per</b>clórico.</div>
      <table><tr><th>Nº de valencias</th><th>Peldaños</th></tr>
      <tr><td>1</td><td>–ico (C 4, B 3, Cr 6)</td></tr><tr><td>2</td><td>–oso · –ico (P, As: 3 y 5)</td></tr>
      <tr><td>3</td><td>hipo–oso · –oso · –ico (S 2,4,6 · N 1,3,5)</td></tr><tr><td>4</td><td>hipo–oso · –oso · –ico · per–ico (Cl, Br, I)</td></tr></table>
      <div class="rule"><b>Formular:</b> óxido + agua. <b>meta</b> = +1 H₂O; <b>orto</b> = +3 H₂O (lo normal en B, P, As). HPO₃ metafosfórico · H₃PO₄ (orto)fosfórico · HBO₂ metabórico · H₃BO₃ (orto)bórico. <b>di</b> = 2 ácidos − 1 H₂O: H₂S₂O₇ disulfúrico.</div>
      <div class="rule"><b>Manganeso:</b> 4 → manganoso (H₂MnO₃), 6 → mangánico (H₂MnO₄), 7 → permangánico (HMnO₄).</div>`
  },
  {
    n: 5, name: 'Fábrica de sales', icon: '🏭', n_items: 7, color: '#59C3E8',
    temas: ['Ensamble de iones', 'Oxisales en Stock y tradicional', 'Fórmula simplificada (trampa)'],
    brief: `
      <p>Una oxisal = catión + oxoanión. La carga total debe ser <b>cero</b>.</p>
      <div class="ex"><b>Fe³⁺ + SO₄²⁻</b><span>Fe₂(SO₄)₃ · sulfato de hierro (III) · <b>sulfato férrico</b></span>
      <b>Cu²⁺ + PO₄³⁻</b><span>Cu₃(PO₄)₂ · fosfato de cobre (II) · <b>fosfato cúprico</b></span>
      <b>Sn⁴⁺ + NO₂⁻</b><span>Sn(NO₂)₄ · nitrito de estaño (IV) · <b>nitrito estánnico</b></span></div>
      <div class="rule"><b>Valencia del no metal en la sal:</b> V = 2·O − H − carga del anión. Si sale una valencia imposible (CuCrO₄ → 7), la fórmula estaba simplificada: la carga real es 2.</div>`
  },
  {
    n: 6, name: 'Fortaleza ácida', icon: '🏰', n_items: 8, color: '#F5B83D', boss: true,
    temas: ['Oxisales ácidas (hidrogeno- / ácido / diácido / bi-)', 'Sales ácidas de hidrácidos (HS⁻)', 'Jefe final: mezcla de todo'],
    brief: `
      <p>Las <b>sales ácidas</b> aún conservan hidrógeno del ácido.</p>
      <table><tr><th>Fórmula</th><th>Stock</th><th>Tradicional</th></tr>
      <tr><td>NaHCO₃</td><td>hidrogenocarbonato de sodio</td><td>carbonato ácido de sodio · bicarbonato de sodio</td></tr>
      <tr><td>Na₂HPO₄</td><td>hidrogenofosfato de sodio</td><td>fosfato ácido de sodio</td></tr>
      <tr><td>NaH₂PO₄</td><td>dihidrogenofosfato de sodio</td><td>fosfato diácido de sodio</td></tr>
      <tr><td>NaHS</td><td>hidrogenosulfuro de sodio</td><td>sulfuro ácido sódico</td></tr>
      <tr><td>Cu(HS)₂</td><td>hidrogenosulfuro de cobre (II)</td><td>sulfuro ácido cúprico</td></tr></table>
      <div class="rule"><b>Sales ácidas de hidrácidos:</b> se sustituye solo uno de los dos H del H₂S → queda el anión HS⁻.</div>
      <div class="rule">Los últimos reactivos son el <b>jefe final</b>: mezclan todo lo de la expedición.</div>`
  }
];
