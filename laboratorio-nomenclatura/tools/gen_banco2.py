# -*- coding: utf-8 -*-
"""Banco v2 — Expedición Nomenclatura.
Reutiliza y verifica el banco de la v1 (gen_banco.py) y añade:
nombres tradicionales (–oso/–ico de metales), anhídridos, sustancias simples, símbolos,
estados de oxidación, iones, sales volátiles, sales ácidas de hidrácidos, orto/meta.
Uso: python3 gen_banco2.py salida.js revision.json"""
import json, sys, os, re, math
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'gen_banco.py'), encoding='utf-8').read().split('fam_count=Counter')[0]
NS = {'__name__': 'banco1'}
exec(src, NS)                       # ejecuta generación y verificaciones de la v1
if NS['ERR']:
    print('ERRORES v1:', NS['ERR']); sys.exit(1)
ITEMS, CATIONS, ANIONS, MET, NM, ROM = NS['ITEMS'], NS['CATIONS'], NS['ANIONS'], NS['MET'], NS['NM'], NS['ROM']
atoms, oxide_of, ionic_formula, cap, OXO = NS['atoms'], NS['oxide_of'], NS['ionic_formula'], NS['cap'], NS['OXO']
ERR = []
def check(c, m):
    if not c: ERR.append(m)

# ---------- adjetivos tradicionales de metales ----------
TRAD = {('Fe',2):'ferroso',('Fe',3):'férrico',('Cu',1):'cuproso',('Cu',2):'cúprico',('Pb',2):'plumboso',('Pb',4):'plúmbico',
        ('Sn',2):'estannoso',('Sn',4):'estánnico',('Co',2):'cobaltoso',('Co',3):'cobáltico',('Ni',2):'niqueloso',('Ni',3):'niquélico',
        ('Cr',2):'cromoso',('Cr',3):'crómico',('Hg',1):'mercurioso',('Hg',2):'mercúrico',('Mn',2):'manganoso',('Mn',3):'mangánico',
        ('Na',1):'sódico',('K',1):'potásico',('Li',1):'lítico',('Ca',2):'cálcico',('Mg',2):'magnésico',('Ba',2):'bárico',('Al',3):'alumínico'}
# el adjetivo debe concordar con la valencia: menor → –oso, mayor → –ico (verificación)
for (s, q), adj in TRAD.items():
    vals = MET[s][1]
    if len(vals) == 2:
        check(adj.endswith('oso') == (q == min(vals)), f'sufijo tradicional incoherente {s}{q} {adj}')
    else:
        check(adj.endswith('ico'), f'valencia única debe ser –ico {s} {adj}')

def trad_names(it):
    """Nombres tradicionales aceptables para un compuesto iónico de la v1."""
    io = it['ion']
    if not io: return []
    c, a = CATIONS[io['c']], ANIONS[io['a']]
    adj = TRAD.get((c['s'], c['q']))
    out = []
    word = a['n']
    if a['kind'] == 'acida':
        d = OXO.get(io['a'])
        if d:
            X = d['X']; i = NM[X]['lad'].index(d['V']); base = NM[X]['an'][i]
            tw = f"{base} {'ácido' if d['H'] == 1 else 'diácido'}"
            cname = c['n'] if not adj else None
            out.append(f"{tw} de {MET[c['s']][0] if c['s'] in MET else c['n']}" + (f" ({ROM[c['q']]})" if c['s'] in MET and len(MET[c['s']][1]) > 1 else ''))
            if adj: out.append(f"{tw} {adj}")
            if X in ('C', 'S') and d['H'] == 1:
                bi = 'bi' + base
                out.append(f"{bi} de {c['n']}")
                if adj: out.append(f"{bi} {adj}")
    elif adj:
        out.append(f"{word} {adj}")
    return [cap(x) for x in out]

for it in ITEMS:
    it['trad'] = trad_names(it)
    # ortho como alternativa aceptada
    if it['f'] == 'H3PO4': it['alts'].append('Ácido ortofosfórico')
    if it['f'] == 'H3BO3': it['alts'].append('Ácido ortobórico')

# ---------- preguntas nuevas ----------
Q = []
def q(lv, t, prompt, **kw):
    d = {'id': f'q{len(Q)}', 'lv': lv, 't': t, 'q': prompt}; d.update(kw); Q.append(d)

# Nivel 0 · símbolos (nombre → símbolo con opción múltiple; símbolo → nombre abierto)
SYM = [('Sodio','Na',['S','So','Sd']),('Potasio','K',['P','Po','Pt']),('Hierro','Fe',['H','Hi','Fr']),('Cobre','Cu',['Co','C','Cb']),
       ('Plata','Ag',['Pl','Pt','Ar']),('Oro','Au',['Or','O','Ag']),('Plomo','Pb',['Pl','Po','P']),('Estaño','Sn',['Es','Et','St']),
       ('Mercurio','Hg',['Me','Mr','M']),('Antimonio','Sb',['An','At','Sn']),('Azufre','S',['Az','Su','Sf']),('Fósforo','P',['F','Fo','Ph']),
       ('Manganeso','Mn',['Mg','Ma','Mo']),('Magnesio','Mg',['Mn','Ma','M']),('Cobalto','Co',['Cb','C','Cu']),('Cromo','Cr',['Co','Cm','Ro']),
       ('Bismuto','Bi',['B','Bs','Be']),('Estroncio','Sr',['Es','St','So']),('Molibdeno','Mo',['Mb','M','Ml']),('Cesio','Cs',['Ce','Se','C']),
       ('Platino','Pt',['Pl','Pa','P']),('Níquel','Ni',['N','Nq','Nk']),('Yodo','I',['Y','Yo','Io']),('Bromo','Br',['B','Bo','Bm'])]
for nm, s, w in SYM:
    q(0, 'mcq', f'¿Cuál es el símbolo del <b>{nm.lower()}</b>?', ok=s, wrong=w, sub='Símbolos')
    q(0, 'open', f'¿Qué elemento representa el símbolo <b class="fx">{s}</b>?', ans=[nm], sub='Símbolos')

# Nivel 0 · estados de oxidación
EO = [('hierro','2 y 3',['1 y 2','2 y 4','3 y 5']),('cobre','1 y 2',['2 y 3','1 y 3','2 y 4']),('plomo','2 y 4',['1 y 2','2 y 3','3 y 4']),
      ('estaño','2 y 4',['1 y 3','2 y 3','4 y 6']),('cloro (no metal, en oxoácidos)','1, 3, 5 y 7',['1, 2, 3 y 4','2, 4 y 6','3 y 5']),
      ('azufre (en oxoácidos)','2, 4 y 6',['1, 3 y 5','2 y 4','4 y 6']),('nitrógeno (en oxoácidos)','1, 3 y 5',['2, 4 y 6','3 y 5','1 y 3']),
      ('fósforo (en oxoácidos)','3 y 5',['1 y 3','2 y 4','5 y 7']),('manganeso (en oxoácidos)','4, 6 y 7',['2, 4 y 6','3 y 7','5 y 7']),
      ('sodio','1',['2','1 y 2','3']),('aluminio','3',['2','1 y 3','2 y 3']),('calcio','2',['1','2 y 3','1 y 2'])]
for el, ok, w in EO:
    # verificación contra las tablas del banco
    q(0, 'mcq', f'¿Con qué valencia(s) trabaja el <b>{el}</b>?', ok=ok, wrong=w, sub='Estados de oxidación')
check(MET['Fe'][1] == [2, 3] and MET['Cu'][1] == [1, 2] and MET['Pb'][1] == [2, 4] and MET['Sn'][1] == [2, 4], 'valencias metálicas')
check(NM['Cl']['lad'] == [1, 3, 5, 7] and NM['S']['lad'] == [2, 4, 6] and NM['N']['lad'] == [1, 3, 5] and NM['P']['lad'] == [3, 5] and NM['Mn']['lad'] == [4, 6, 7], 'valencias no metálicas')

# Nivel 0 · iones
for key in ['Fe3+', 'Fe2+', 'Cu2+', 'Cu+', 'Pb4+', 'Sn2+', 'Na+', 'Ca2+', 'Al3+', 'NH4+', 'Ag+', 'Hg2+']:
    c = CATIONS[key]; adj = TRAD.get((c['s'], c['q']))
    ans = [f'catión {c["n"]}', f'ion {c["n"]}', c['n']]
    if adj: ans += [f'ion {adj}', f'catión {adj}']
    q(0, 'open', f'Nombra el ion <b class="fx">{c["s"]}<sup>{(str(c["q"]) if c["q"] > 1 else "")}+</sup></b>', ans=ans, sub='Iones',
      hint='Cationes: “catión” + nombre del metal + valencia en romanos si tiene más de una (o el nombre tradicional: ion férrico).')
for key, nm in [('F-','fluoruro'),('Cl-','cloruro'),('S2-','sulfuro'),('Br-','bromuro'),('I-','yoduro'),('Se2-','seleniuro'),('OH-','hidróxido'),('O22-','peróxido')]:
    a = ANIONS[key]; qq = -a['q']
    q(0, 'open', f'Nombra el ion <b class="fx">{"O<sub>2</sub>" if a["s"]=="O2" else a["s"]}<sup>{(str(qq) if qq > 1 else "")}−</sup></b>', ans=[nm, f'anión {nm}', f'ion {nm}'], sub='Iones',
      hint='Aniones monoatómicos: raíz del no metal + –uro (cloruro, sulfuro).')
for key in ['SO42-', 'SO32-', 'NO3-', 'NO2-', 'ClO-', 'ClO4-', 'CO32-', 'PO43-', 'MnO4-']:
    a = ANIONS[key]; qq = -a['q']
    q(0, 'open', f'Nombra el ion <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", a["s"])}<sup>{(str(qq) if qq > 1 else "")}−</sup></b>', ans=[a['n'], f'anión {a["n"]}', f'ion {a["n"]}'], sub='Iones',
      hint='Oxoaniones: del ácido –oso → –ito; –ico → –ato.')
# añadir HS- (sales ácidas de hidrácidos)
ANIONS['HS-'] = {'s': 'HS', 'q': -1, 'n': 'hidrogenosulfuro', 'kind': 'acida', 'grp': 'S', 'poly': True}
q(0, 'open', 'Nombra el ion <b class="fx">HS<sup>−</sup></b>', ans=['hidrogenosulfuro', 'anión hidrogenosulfuro', 'ion hidrogenosulfuro', 'bisulfuro'], sub='Iones')

# Nivel 0 · sustancias simples
SIMP = [('O3', ['Ozono', 'Trioxígeno']), ('O2', ['Oxígeno', 'Dioxígeno']), ('N2', ['Nitrógeno', 'Dinitrógeno']), ('H2', ['Hidrógeno', 'Dihidrógeno']),
        ('Cl2', ['Cloro', 'Dicloro']), ('S8', ['Azufre', 'Octaazufre']), ('P4', ['Fósforo blanco', 'Tetrafósforo', 'Fósforo']), ('Br2', ['Bromo', 'Dibromo'])]
for f, ans in SIMP:
    q(0, 'open', f'Nombra la sustancia simple <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", f)}</b>', ans=ans, sub='Sustancias simples',
      hint='Sistemática: prefijo según nº de átomos (dioxígeno, trioxígeno); tradicional: nombre del elemento u ozono.')
q(0, 'mcq', '¿Cuál de estos elementos es <b>monoatómico</b> en condiciones normales?', ok='Ne', wrong=['N₂', 'O₂', 'Cl₂'], sub='Sustancias simples')
q(0, 'mcq', 'El ozono y el oxígeno son…', ok='formas alotrópicas del mismo elemento', wrong=['isótopos del oxígeno', 'compuestos binarios', 'iones del oxígeno'], sub='Sustancias simples')

# Nivel 1 · los tres sistemas
ionic = [it for it in ITEMS if it['ion'] and it['trad'] and it['fam'] in ('oxido', 'hidroxido', 'binaria', 'hidruro_met', 'peroxido')]
for it in ionic:
    c = CATIONS[it['ion']['c']]
    if c['s'] not in MET or len(MET[c['s']][1]) < 2: continue
    trad = it['trad'][0]
    q(1, 'open', f'Escribe el nombre <b>tradicional</b> de: <i>{it["name"]}</i>', ans=[trad], sub='Stock → tradicional', ref=it['id'],
      hint='Valencia menor → –oso; mayor → –ico (hierro: ferroso/férrico; cobre: cuproso/cúprico; plomo: plumboso/plúmbico).')
    q(1, 'open', f'Escribe el nombre en <b>Stock</b> (con romanos) de: <i>{trad}</i>', ans=[it['name']], sub='Tradicional → Stock', ref=it['id'],
      hint='Stock: número de oxidación en romanos entre paréntesis.')
for (s, qv), adj in TRAD.items():
    if len(MET[s][1]) < 2: continue
    other = TRAD[(s, [v for v in MET[s][1] if v != qv][0])]
    q(1, 'mcq', f'En nomenclatura tradicional, el <b>{MET[s][0]}</b> con valencia <b>{qv}</b> se nombra…', ok=adj, wrong=[other, 'hipo' + (adj if adj.endswith('oso') else other), 'per' + (adj if adj.endswith('ico') else other)], sub='Sufijos –oso/–ico')
SYSQ = [('Trióxido de dihierro', 'Sistemática (prefijos)'), ('Óxido de hierro (III)', 'Stock'), ('Óxido férrico', 'Tradicional'),
        ('Tetracloruro de carbono', 'Sistemática (prefijos)'), ('Cloruro cúprico', 'Tradicional'), ('Hidróxido de plomo (IV)', 'Stock'),
        ('Dihidróxido de calcio', 'Sistemática (prefijos)'), ('Sulfato ferroso', 'Tradicional'), ('Bromuro de oro (III)', 'Stock'), ('Anhídrido sulfúrico', 'Tradicional')]
for nm, sysn in SYSQ:
    q(1, 'mcq', f'¿Qué sistema de nomenclatura usa el nombre <i>{nm}</i>?', ok=sysn, wrong=[x for x in ['Sistemática (prefijos)', 'Stock', 'Tradicional', 'Sustitución'] if x != sysn], sub='¿Qué sistema es?')

# Nivel 2 · binarios: anhídridos y óxidos de nitrógeno
ANH = [('C', 4, 'CO2'), ('S', 4, 'SO2'), ('S', 6, 'SO3'), ('S', 2, 'SO'), ('N', 3, 'N2O3'), ('N', 5, 'N2O5'), ('P', 3, 'P2O3'), ('P', 5, 'P2O5'), ('Se', 4, 'SeO2'), ('B', 3, 'B2O3')]
PREF = {1: 'mon', 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta', 6: 'hexa', 7: 'hepta'}
ELN = {'C': 'carbono', 'S': 'azufre', 'N': 'nitrógeno', 'P': 'fósforo', 'Se': 'selenio', 'B': 'boro'}
for X, V, exp in ANH:
    f = oxide_of(X, V); check(f == exp, f'anhídrido {f}!={exp}')
    at = atoms(f); nX, nO = at[X], at['O']
    i = NM[X]['lad'].index(V) if V in NM[X]['lad'] else None
    adj = NM[X]['ac'][i] if i is not None else None
    sysn = cap(f"{PREF[nO] if nO > 1 else 'mon'}óxido de {PREF[nX] if nX > 1 else ''}{ELN[X]}")
    stock = cap(f"óxido de {ELN[X]} ({ROM[V]})")
    ans = [sysn, stock] + ([f'Anhídrido {adj}'] if adj else [])
    if adj:
        q(2, 'open', f'Nombre <b>tradicional</b> (anhídrido) de <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", f)}</b>', ans=[f'Anhídrido {adj}'], sub='Anhídridos',
          hint=f'El anhídrido lleva el mismo sufijo que su ácido: el {ELN[X]} con valencia {V} da ácido {adj}.')
    q(2, 'formula', f'Escribe la fórmula de: <i>{ans[-1] if adj else sysn}</i>', fans=f, sub='Óxidos ácidos')
    q(2, 'open', f'Nombra (cualquier sistema) <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", f)}</b>', ans=ans, sub='Óxidos ácidos')
for f, ans in [('N2O', ['Óxido nitroso', 'Monóxido de dinitrógeno', 'Óxido de dinitrógeno', 'Óxido de nitrógeno (I)']),
               ('NO', ['Óxido nítrico', 'Monóxido de nitrógeno', 'Óxido de nitrógeno', 'Óxido de nitrógeno (II)']),
               ('NO2', ['Dióxido de nitrógeno']), ('N2O4', ['Tetraóxido de dinitrógeno', 'Tetróxido de dinitrógeno'])]:
    q(2, 'open', f'Nombra <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", f)}</b>', ans=ans, sub='Óxidos de nitrógeno')
# hidruros con nombre común
for f, ans in [('PH3', ['Fosfina', 'Fosfano', 'Trihidruro de fósforo']), ('AsH3', ['Arsina', 'Arsano', 'Trihidruro de arsénico']),
               ('SbH3', ['Estibina', 'Estibano', 'Trihidruro de antimonio']), ('NH3', ['Amoniaco', 'Amoníaco', 'Azano', 'Trihidruro de nitrógeno']),
               ('CH4', ['Metano', 'Tetrahidruro de carbono']), ('SiH4', ['Silano', 'Tetrahidruro de silicio'])]:
    q(2, 'open', f'Nombra el hidruro volátil <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", f)}</b>', ans=ans, sub='Hidruros volátiles',
      hint='Nombres comunes aceptados por la IUPAC: amoniaco, fosfina (fosfano), arsina (arsano), estibina (estibano), metano, silano.')
# sales volátiles: orden de escritura
ORD = 'B Si C Sb As P N Te Se S I Br Cl O F'.split()
VOL = [('P', 'Cl', 3, 1, 'PCl3'), ('B', 'F', 3, 1, 'BF3'), ('N', 'Cl', 3, 1, 'NCl3'), ('S', 'F', 6, 1, 'SF6'), ('Br', 'F', 3, 1, 'BrF3'),
       ('I', 'Cl', 1, 1, 'ICl'), ('Si', 'Cl', 4, 1, 'SiCl4'), ('As', 'Se', 3, 2, 'As2Se3'), ('C', 'S', 2, 1, 'CS2'), ('Br', 'Cl', 1, 1, 'BrCl')]
for A, Bx, nB, nA, exp in VOL:
    check(ORD.index(A) < ORD.index(Bx), f'orden volátil {A}{Bx}')
    f = f"{A}{nA if nA > 1 else ''}{Bx}{nB if nB > 1 else ''}"; check(f == exp, f'volátil {f}')
    rev = f"{Bx}{nB if nB > 1 else ''}{A}{nA if nA > 1 else ''}"
    q(2, 'mcq', f'Sal volátil entre <b>{A}</b> y <b>{Bx}</b>: ¿cuál fórmula está escrita en el orden correcto?', ok=f, wrong=list(dict.fromkeys([rev, f"{A}{Bx}" if f != f"{A}{Bx}" else f"{A}{Bx}2", f"{Bx}{A}", f"{Bx}{nA+1}{A}", f"{A}{Bx}{nB+2}"]))[:3], fx=True, sub='Sales volátiles',
      hint='Se escribe primero el que aparece antes en: B < Si < C < Sb < As < P < N < Te < Se < S < I < Br < Cl < O < F.')
# fórmulas de binarios iónicos con teclado (desde nombre tradicional o Stock)
for it in ITEMS:
    if it['fam'] in ('oxido', 'hidruro_met', 'binaria', 'peroxido') and it['ion']:
        nm = it['trad'][0] if it['trad'] else it['name']
        q(2, 'formula', f'Escribe la fórmula de: <i>{nm}</i>', fans=it['f'], sub='Binarios iónicos', ref=it['id'])

# Nivel 4 · oxoácidos orto/meta y manganoso
for f, ans in [('HBO2', ['Ácido metabórico']), ('H3BO3', ['Ácido bórico', 'Ácido ortobórico']), ('H3PO4', ['Ácido fosfórico', 'Ácido ortofosfórico']),
               ('HPO3', ['Ácido metafosfórico']), ('H4P2O7', ['Ácido difosfórico', 'Ácido pirofosfórico']), ('H2MnO3', ['Ácido manganoso']),
               ('H2Cr2O7', ['Ácido dicrómico']), ('H2S2O7', ['Ácido disulfúrico', 'Ácido pirosulfúrico'])]:
    at = atoms(f)
    X = [k for k in at if k not in ('H', 'O')][0]
    V = (2 * at['O'] - at['H']) // at[X]
    check(V in NM[X]['lad'], f'valencia {f}={V}')
    q(4, 'open', f'Nombra el oxoácido <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", f)}</b>', ans=ans, sub='Orto, meta y di',
      hint='meta = óxido + 1 H₂O; orto = óxido + 3 H₂O (lo normal en B, P, As); di = 2 ácidos − 1 H₂O.')
for it in ITEMS:
    if it['fam'] == 'oxoacido' and not it['dec'].get('pre'):
        q(4, 'formula', f'Escribe la fórmula del <i>{it["name"].lower()}</i>', fans=it['f'], sub='Formula el oxoácido', ref=it['id'])
    if it['fam'] == 'hidroxido':
        q(4, 'open', f'Nombra (Stock o tradicional) <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", it["f"])}</b>', ans=[it['name']] + it['alts'] + it['trad'], sub='Hidróxidos', ref=it['id'])

# Nivel 5 · oxisales (abiertas, cualquier sistema) y fórmula desde tradicional
for it in ITEMS:
    if it['fam'] == 'oxisal':
        q(5, 'open', f'Nombra la oxisal <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", it["f"])}</b> (Stock o tradicional)', ans=[it['name']] + it['trad'], sub='Oxisales', ref=it['id'])
        if it['trad']:
            q(5, 'formula', f'Escribe la fórmula de: <i>{it["trad"][0]}</i>', fans=it['f'], sub='Oxisales: formular', ref=it['id'])

# Nivel 6 · sales ácidas y de hidrácidos
for it in ITEMS:
    if it['fam'] == 'sal_acida':
        q(6, 'open', f'Nombra la sal ácida <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", it["f"])}</b>', ans=[it['name']] + it['trad'], sub='Oxisales ácidas', ref=it['id'],
          hint='Stock: hidrogeno-/dihidrogeno- + anión; tradicional: anión + “ácido”/“diácido” (fosfato diácido de potasio); HCO₃⁻: bicarbonato.')
        q(6, 'formula', f'Escribe la fórmula de: <i>{(it["trad"] or [it["name"]])[-1]}</i>', fans=it['f'], sub='Sales ácidas: formular', ref=it['id'])
HSALT = []
for key, exp in [('Na+', 'NaHS'), ('K+', 'KHS'), ('Cu2+', 'Cu(HS)2'), ('Fe2+', 'Fe(HS)2'), ('Ca2+', 'Ca(HS)2'), ('Fe3+', 'Fe(HS)3')]:
    f, nc, na = ionic_formula(key, 'HS-'); check(f == exp, f'hidrácido-sal {f}!={exp}')
    c = CATIONS[key]; adj = TRAD.get((c['s'], c['q']))
    stock = cap(f'hidrogenosulfuro de {c["n"]}')
    ans = [stock, cap(f'sulfuro ácido de {c["n"]}')] + ([cap(f'sulfuro ácido {adj}')] if adj else [])
    q(6, 'open', f'Nombra la sal ácida de hidrácido <b class="fx">{re.sub(r"(\d+)", r"<sub>\1</sub>", f)}</b>', ans=ans, sub='Sales ácidas de hidrácidos',
      hint='Se sustituye parcialmente el H del H₂S: queda HS⁻ (hidrogenosulfuro). Tradicional: sulfuro ácido + metal.')
    q(6, 'formula', f'Escribe la fórmula de: <i>{ans[-1]}</i>', fans=f, sub='Sales ácidas de hidrácidos')
    HSALT.append(f)

# ---------- verificaciones de las preguntas nuevas ----------
for d in Q:
    if d['t'] == 'formula':
        check(bool(re.fullmatch(r'(\(?[A-Z][a-z]?\d*\)?\d*)+', d['fans'])), f'fórmula mal formada {d["fans"]}')
    if d['t'] == 'open': check(len(d['ans']) >= 1, f'sin respuestas {d["q"]}')
    if d['t'] == 'mcq':
        check(d['ok'] not in d['wrong'] and len(set(d['wrong'])) == 3, f'mcq inválida {d["q"]} {d["wrong"]}')
for it in ITEMS:
    for t in it['trad']:
        check(t not in it['wrong'], f'tradicional coincide con distractor {it["f"]} {t}')
if ERR:
    print('ERRORES:'); [print(' -', e) for e in ERR]; sys.exit(1)

print('ITEMS v1', len(ITEMS), '· con tradicional', sum(1 for i in ITEMS if i['trad']), '· preguntas nuevas', len(Q))
print('por nivel', dict(Counter(d['lv'] for d in Q)), 'por tipo', dict(Counter(d['t'] for d in Q)))
data = {'items': ITEMS, 'cations': CATIONS, 'anions': ANIONS, 'q': Q}
open(sys.argv[1], 'w', encoding='utf-8').write('/* Banco v2 generado y verificado por tools/gen_banco2.py — no editar a mano */\nwindow.BANCO=' + json.dumps(data, ensure_ascii=False) + ';\n')
json.dump({'items': ITEMS, 'q': Q}, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
