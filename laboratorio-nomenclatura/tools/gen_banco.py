# -*- coding: utf-8 -*-
"""Generador y verificador del banco de reactivos — Laboratorio de Nomenclatura.
Cada compuesto se declara con su fórmula ESPERADA (escrita a mano, tomada de la
clave del manual / IUPAC 2005) y la fórmula se RECALCULA a partir de las cargas.
Si no coinciden, el script falla (verificación doble)."""
import json, re, math, sys, random
from collections import Counter

random.seed(7)
ROM = {1:'I',2:'II',3:'III',4:'IV',5:'V',6:'VI',7:'VII'}
PRE = {1:'',2:'di',3:'tri',4:'tetra',5:'penta',6:'hexa',7:'hepta'}

# ---------------- cationes ----------------
# clave: (símbolo, carga, nombre del elemento, multivalente?, valencias metálicas)
MET = {
 'Na':('sodio',[1]),'K':('potasio',[1]),'Li':('litio',[1]),'Cs':('cesio',[1]),'Ag':('plata',[1]),
 'Mg':('magnesio',[2]),'Ca':('calcio',[2]),'Ba':('bario',[2]),'Sr':('estroncio',[2]),'Be':('berilio',[2]),
 'Zn':('cinc',[2]),'Cd':('cadmio',[2]),'Al':('aluminio',[3]),
 'Fe':('hierro',[2,3]),'Cu':('cobre',[1,2]),'Pb':('plomo',[2,4]),'Sn':('estaño',[2,4]),
 'Co':('cobalto',[2,3]),'Ni':('níquel',[2,3]),'Cr':('cromo',[2,3]),'Hg':('mercurio',[1,2]),
 'Mn':('manganeso',[2,3]),
}
def cat_key(s,q): return f"{s}{q if q>1 else ''}+"
def cat_name(s,q):
    if s=='NH4': return 'amonio'
    n,vals = MET[s]
    return f"{n} ({ROM[q]})" if len(vals)>1 else n

CATIONS = {}
for s,(n,vals) in MET.items():
    for q in vals:
        CATIONS[cat_key(s,q)] = {'s':s,'q':q,'n':cat_name(s,q),'poly':False,'el':s}
CATIONS['NH4+'] = {'s':'NH4','q':1,'n':'amonio','poly':True,'el':'NH4'}

# ---------------- aniones ----------------
ANIONS = {}
def an(key,s,q,n,kind,grp,poly=False):
    ANIONS[key] = {'s':s,'q':q,'n':n,'kind':kind,'grp':grp,'poly':poly}
an('H-','H',-1,'hidruro','hidruro','H')
an('O2-','O',-2,'óxido','oxido','O')
an('O22-','O2',-2,'peróxido','peroxido','O')
an('OH-','OH',-1,'hidróxido','hidroxido','O',True)
for s,n in [('F','fluoruro'),('Cl','cloruro'),('Br','bromuro'),('I','yoduro')]:
    an(f'{s}-',s,-1,n,'binaria',s)
for s,n in [('S','sulfuro'),('Se','seleniuro'),('Te','telururo')]:
    an(f'{s}2-',s,-2,n,'binaria',s)

# ---------------- no metales que forman oxoácidos ----------------
# ladder: valencias no metálicas en orden; nombres de ácido y de anión por peldaño
NM = {
 'Cl':{'lad':[1,3,5,7],'ac':['hipocloroso','cloroso','clórico','perclórico'],'an':['hipoclorito','clorito','clorato','perclorato'],'n':'cloro'},
 'Br':{'lad':[1,3,5,7],'ac':['hipobromoso','bromoso','brómico','perbrómico'],'an':['hipobromito','bromito','bromato','perbromato'],'n':'bromo'},
 'I': {'lad':[1,3,5,7],'ac':['hipoyodoso','yodoso','yódico','peryódico'],'an':['hipoyodito','yodito','yodato','peryodato'],'n':'yodo'},
 'S': {'lad':[2,4,6],'ac':['hiposulfuroso','sulfuroso','sulfúrico'],'an':['hiposulfito','sulfito','sulfato'],'n':'azufre'},
 'Se':{'lad':[2,4,6],'ac':['hiposelenioso','selenioso','selénico'],'an':['hiposelenito','selenito','seleniato'],'n':'selenio'},
 'N': {'lad':[1,3,5],'ac':['hiponitroso','nitroso','nítrico'],'an':['hiponitrito','nitrito','nitrato'],'n':'nitrógeno'},
 'P': {'lad':[3,5],'ac':['fosforoso','fosfórico'],'an':['fosfito','fosfato'],'n':'fósforo','orto':True},
 'As':{'lad':[3,5],'ac':['arsenioso','arsénico'],'an':['arsenito','arseniato'],'n':'arsénico','orto':True},
 'C': {'lad':[4],'ac':['carbónico'],'an':['carbonato'],'n':'carbono'},
 'B': {'lad':[3],'ac':['bórico'],'an':['borato'],'n':'boro','orto':True},
 'Cr':{'lad':[6],'ac':['crómico'],'an':['cromato'],'n':'cromo'},
 'Mn':{'lad':[4,6,7],'ac':['manganoso','mangánico','permangánico'],'an':['manganito','manganato','permanganato'],'n':'manganeso','mn':True},
}
SUF_LABEL = {1:['–ico'],2:['–oso','–ico'],3:['hipo–oso','–oso','–ico'],4:['hipo–oso','–oso','–ico','per–ico']}
def ladder_labels(X):
    if NM[X].get('mn'): return ['–oso','–ico','per–ico']
    return SUF_LABEL[len(NM[X]['lad'])]

def acid_formula(X,V,mode='normal'):
    """Óxido + agua. mode: normal (1 H2O salvo B,P,As → 3), meta (1), orto (3)."""
    w = 1
    if NM[X].get('orto') and mode=='normal': w = 3
    if mode=='orto': w=3
    if mode=='meta': w=1
    # óxido X2O_V (simplificado primero, como en el manual)
    nX, nO = 2, V
    g0 = math.gcd(nX,nO); nX//=g0; nO//=g0
    H = 2*w; nO += w
    g = math.gcd(math.gcd(H,nX),nO)
    return H//g, nX//g, nO//g, w

def fmt(H,X,nX,O):
    return f"{'H'+(str(H) if H>1 else '') if H else ''}{X}{nX if nX>1 else ''}O{O if O>1 else ''}"

def oxide_of(X,V):
    nX,nO=2,V
    g=math.gcd(nX,nO); nX//=g; nO//=g
    return f"{X}{nX if nX>1 else ''}O{nO if nO>1 else ''}"

# ---------------- oxoaniones (derivados del ácido) ----------------
OXO = {}  # clave anión -> datos de decodificación
def add_oxo(X,V,mode='normal',di=False,Hleft=0,prefix=None):
    H,nX,nO,w = acid_formula(X,V,mode)
    if di:  # 2 ácido − H2O
        H,nX,nO = 2*H-2, 2*nX, 2*nO-1
    q = H - Hleft
    i = NM[X]['lad'].index(V)
    base = NM[X]['an'][i]
    if di: base = 'di'+base
    if mode=='meta': base='meta'+base
    if Hleft:
        pre = {1:'hidrogeno',2:'dihidrogeno'}[Hleft]
        name = pre+base
        s = f"H{Hleft if Hleft>1 else ''}{X}{nX if nX>1 else ''}O{nO if nO>1 else ''}"
    else:
        name = base
        s = f"{X}{nX if nX>1 else ''}O{nO if nO>1 else ''}"
    key = f"{s}{q if q>1 else ''}-"
    ANIONS[key] = {'s':s,'q':-q,'n':name,'kind':'acida' if Hleft else 'oxo','grp':X,'poly':True}
    OXO[key] = {'X':X,'nX':nX,'O':nO,'H':Hleft,'q':q,'V':V}
    return key

for X,V in [('Cl',1),('Cl',3),('Cl',5),('Cl',7),('Br',1),('Br',5),('I',1),('I',5),('I',7),
            ('S',4),('S',6),('Se',4),('Se',6),('N',3),('N',5),('C',4),('P',5),('As',5),('As',3),('B',3),('Cr',6),('Mn',7),('Mn',6)]:
    add_oxo(X,V)
add_oxo('Cr',6,di=True)
for X,V,h in [('S',6,1),('S',4,1),('C',4,1),('P',5,2),('P',5,1),('Se',6,1),('Se',4,1)]:
    add_oxo(X,V,Hleft=h)

# ---------------- utilidades de fórmula ----------------
def ionic_formula(ck,ak):
    c,a = CATIONS[ck],ANIONS[ak]
    q1,q2 = c['q'],-a['q']
    l = q1*q2//math.gcd(q1,q2)
    nc,na = l//q1, l//q2
    if a['kind']=='peroxido' or True:
        g = math.gcd(nc,na); nc//=g; na//=g
    def part(s,n,poly):
        if n==1: return s
        return f"({s}){n}" if poly else f"{s}{n}"
    if a['kind']=='peroxido':
        an_s = f"O{2*na}"
    else:
        an_s = part(a['s'],na,a['poly'])
    return part(c['s'],nc,c['poly'])+an_s, nc, na

def atoms(f):
    """Cuenta átomos de una fórmula simple (paréntesis de un nivel)."""
    def parse(s):
        c=Counter()
        for el,n in re.findall(r'([A-Z][a-z]?)(\d*)',s): c[el]+=int(n or 1)
        return c
    tot=Counter()
    for grp,n in re.findall(r'\(([^)]+)\)(\d+)',f):
        for k,v in parse(grp).items(): tot[k]+=v*int(n)
    rest = re.sub(r'\(([^)]+)\)(\d+)','',f)
    tot.update(parse(rest))
    return tot

ITEMS=[]; ERR=[]
def check(cond,msg):
    if not cond: ERR.append(msg)

def cap(s): return s[0].upper()+s[1:]

def add(fam,f,name,alts=(),wrong=(),ion=None,dec=None,lvl=(1,)):
    names=[name,*alts]
    w=[x for x in dict.fromkeys(wrong) if x not in names]
    check(len(w)>=3,f"{f}: distractores insuficientes {w}")
    ITEMS.append({'id':f"{fam}-{f}",'fam':fam,'f':f,'name':name,'alts':list(alts),'wrong':w[:3],'ion':ion,'dec':dec,'lvl':list(lvl)})

def prefix_bin(word,nA,el_name,nC,oxide=False):
    pa = 'mon' if (nA==1 and oxide) else PRE[nA]
    if oxide and pa in ('tetra','penta','hexa','hepta'): pa=pa  # IUPAC 2005: sin elisión
    return cap(f"{pa}{word} de {PRE[nC]}{el_name}")

def other_vals(s,q):
    if s not in MET: return []
    return [v for v in MET[s][1] if v!=q]

def wrong_stock(word,s,q):
    """Distractores típicos para nombre de stock."""
    n,vals=MET[s]
    out=[]
    if len(vals)>1:
        order=[v for v in vals if v!=q]+[x for x in range(1,5) if x!=q and x not in vals]
        for v in order[:3]: out.append(cap(f"{word} de {n} ({ROM[v]})"))
        out.insert(1,cap(f"{word} de {n}"))
    else:
        out += [cap(f"{word} de {n} ({ROM[q+1]})")]
    return out

# =============== 1. Hidruros metálicos ===============
for s,q,exp in [('Na',1,'NaH'),('Li',1,'LiH'),('K',1,'KH'),('Ca',2,'CaH2'),('Mg',2,'MgH2'),('Ba',2,'BaH2'),
                ('Be',2,'BeH2'),('Zn',2,'ZnH2'),('Cu',1,'CuH'),('Sr',2,'SrH2')]:
    ck=cat_key(s,q); f,nc,na=ionic_formula(ck,'H-')
    check(f==exp,f"hidruro {f}!={exp}")
    n=MET[s][0]
    name=cap(f"hidruro de {cat_name(s,q)}")
    alt=[prefix_bin('hidruro',na,n,nc)] if na>1 else []
    wr=[cap(f"hidróxido de {cat_name(s,q)}")]+wrong_stock('hidruro',s,q)+[cap(f"óxido de {cat_name(s,q)}"),cap(f"peróxido de {cat_name(s,q)}")]
    add('hidruro_met',f,name,alt,wr,{'c':ck,'a':'H-','nc':nc,'na':na},lvl=(1,2))

# =============== 2. Hidruros volátiles ===============
for f,name,alts,wr in [
 ('NH3','Amoniaco (azano)',['Azano','Amoniaco','Trihidruro de nitrógeno'],['Hidruro de nitrógeno (V)','Nitruro de hidrógeno','Ácido nítrico']),
 ('PH3','Fosfano',['Trihidruro de fósforo'],['Fosfuro de hidrógeno (V)','Ácido fosfórico','Hidróxido de fósforo']),
 ('AsH3','Arsano',['Trihidruro de arsénico'],['Arseniuro de hidrógeno (V)','Ácido arsénico','Hidróxido de arsénico']),
 ('SbH3','Estibano',['Trihidruro de antimonio'],['Antimoniuro de hidrógeno (V)','Hidróxido de antimonio','Ácido antimónico']),
 ('CH4','Metano',['Tetrahidruro de carbono'],['Carburo de hidrógeno (II)','Ácido carbónico','Hidróxido de carbono']),
 ('SiH4','Silano',['Tetrahidruro de silicio'],['Siliciuro de hidrógeno (II)','Ácido silícico','Hidróxido de silicio']),
 ('BH3','Borano',['Trihidruro de boro'],['Boruro de hidrógeno (V)','Ácido bórico','Hidróxido de boro']),
 ('N2H4','Hidrazina (diazano)',['Diazano','Hidrazina','Tetrahidruro de dinitrógeno'],['Amoniaco','Dinitruro de tetrahidrógeno','Ácido hiponitroso']),
 ('B2H6','Diborano',['Hexahidruro de diboro'],['Borano','Hexaboruro de dihidrógeno','Ácido bórico']),
]:
    add('hidruro_vol',f,name,alts,wr)

# =============== 3. Haluros de hidrógeno ===============
for f,el,root,ac in [('HF','F','fluor','fluorhídrico'),('HCl','Cl','clor','clorhídrico'),('HBr','Br','brom','bromhídrico'),
                     ('HI','I','yod','yodhídrico'),('H2S','S','sulf','sulfhídrico'),('H2Se','Se','selen','selenhídrico'),('H2Te','Te','telur','telurhídrico')]:
    q = 1 if el in ('F','Cl','Br','I') else 2
    exp = f"H{q if q>1 else ''}{el}"
    check(f==exp,f"haluro {f}")
    an_name = ANIONS[f"{el}{q if q>1 else ''}-"]['n']
    name=cap(f"{an_name} de hidrógeno")
    ELN={'F':'flúor','Cl':'cloro','Br':'bromo','I':'yodo','S':'azufre','Se':'selenio','Te':'telurio'}
    ICO={'F':'fluórico','Cl':'clórico','Br':'brómico','I':'yódico','S':'sulfúrico','Se':'selénico','Te':'telúrico'}
    wr=[cap(f"hidruro de {ELN[el]}"), cap(f"ácido {ICO[el]}"), cap(f"{an_name.replace('uro','ato')} de hidrógeno")]
    add('haluro',f,name,[f"Ácido {ac} (en disolución)",f"Ácido {ac}"],wr)

# =============== 4. Óxidos ===============
for s,q,exp in [('Na',1,'Na2O'),('K',1,'K2O'),('Li',1,'Li2O'),('Ca',2,'CaO'),('Mg',2,'MgO'),('Ba',2,'BaO'),('Al',3,'Al2O3'),
                ('Zn',2,'ZnO'),('Ag',1,'Ag2O'),('Fe',2,'FeO'),('Fe',3,'Fe2O3'),('Cu',2,'CuO'),('Cu',1,'Cu2O'),('Pb',2,'PbO'),
                ('Pb',4,'PbO2'),('Sn',4,'SnO2'),('Cr',3,'Cr2O3'),('Ni',2,'NiO'),('Ni',3,'Ni2O3'),('Co',3,'Co2O3')]:
    if s=='Pb' and q==4 and cat_key(s,q) not in CATIONS: pass
    ck=cat_key(s,q); f,nc,na=ionic_formula(ck,'O2-')
    check(f==exp,f"óxido {f}!={exp}")
    n=MET[s][0]
    name=cap(f"óxido de {cat_name(s,q)}")
    alt=[prefix_bin('óxido',na,n,nc,oxide=True)]
    wr=wrong_stock('óxido',s,q)+[cap(f"peróxido de {cat_name(s,q)}"),cap(f"hidróxido de {cat_name(s,q)}")]
    add('oxido',f,name,alt,wr,{'c':ck,'a':'O2-','nc':nc,'na':na},lvl=(1,2))

for f,name,alts,wr in [
 ('CO','Monóxido de carbono',['Óxido de carbono (II)'],['Dióxido de carbono','Carburo de oxígeno','Óxido de carbono (IV)']),
 ('CO2','Dióxido de carbono',['Óxido de carbono (IV)'],['Monóxido de carbono','Óxido de carbono (II)','Carbonato de oxígeno']),
 ('SO2','Dióxido de azufre',['Óxido de azufre (IV)'],['Trióxido de azufre','Óxido de azufre (VI)','Sulfito de oxígeno']),
 ('SO3','Trióxido de azufre',['Óxido de azufre (VI)'],['Dióxido de azufre','Óxido de azufre (IV)','Sulfato de oxígeno']),
 ('N2O5','Pentaóxido de dinitrógeno',['Óxido de nitrógeno (V)'],['Óxido de nitrógeno (III)','Trióxido de dinitrógeno','Dinitrato de oxígeno']),
 ('N2O3','Trióxido de dinitrógeno',['Óxido de nitrógeno (III)'],['Óxido de nitrógeno (V)','Pentaóxido de dinitrógeno','Dinitrito de oxígeno']),
 ('P2O5','Pentaóxido de difósforo',['Óxido de fósforo (V)'],['Óxido de fósforo (III)','Trióxido de difósforo','Difosfato de oxígeno']),
 ('N2O','Monóxido de dinitrógeno',['Óxido de dinitrógeno','Óxido de nitrógeno (I)'],['Dióxido de nitrógeno','Óxido de nitrógeno (II)','Nitrito de oxígeno']),
]:
    add('oxido',f,name,alts,wr)

# =============== 5. Peróxidos ===============
for s,q,exp in [('Na',1,'Na2O2'),('K',1,'K2O2'),('Li',1,'Li2O2'),('Ba',2,'BaO2'),('Ca',2,'CaO2'),('Mg',2,'MgO2'),
                ('Sr',2,'SrO2'),('Zn',2,'ZnO2'),('Cu',2,'CuO2'),('Cu',1,'Cu2O2')]:
    ck=cat_key(s,q); f,nc,na=ionic_formula(ck,'O22-')
    check(f==exp,f"peróxido {f}!={exp}")
    n=MET[s][0]
    name=cap(f"peróxido de {cat_name(s,q)}")
    oxa = prefix_bin('óxido',2*na,n,nc,oxide=True)
    wr=[cap(f"óxido de {cat_name(s,q)}"),cap(f"hidróxido de {cat_name(s,q)}")]
    if len(MET[s][1])>1: wr.append(cap(f"peróxido de {n} ({ROM[other_vals(s,q)[0]]})"))
    else: wr.append(cap(f"óxido de {n} ({ROM[2*q]})"))
    add('peroxido',f,name,[oxa],wr,{'c':ck,'a':'O22-','nc':nc,'na':na},lvl=(1,2))
add('peroxido','H2O2','Peróxido de hidrógeno',['Agua oxigenada','Dióxido de dihidrógeno'],['Óxido de hidrógeno','Hidróxido de hidrógeno','Ácido hidroxílico'])

# =============== 6. Otras combinaciones binarias ===============
for s,q,ak,exp in [('Na',1,'Cl-','NaCl'),('K',1,'I-','KI'),('Li',1,'F-','LiF'),('Ca',2,'F-','CaF2'),('Al',3,'Cl-','AlCl3'),
                   ('Cu',2,'Br-','CuBr2'),('Cu',1,'Br-','CuBr'),('Fe',2,'Cl-','FeCl2'),('Fe',3,'Cl-','FeCl3'),('K',1,'S2-','K2S'),
                   ('Ag',1,'S2-','Ag2S'),('Pb',2,'I-','PbI2'),('Zn',2,'S2-','ZnS'),('Mg',2,'Br-','MgBr2'),('Ni',2,'S2-','NiS'),
                   ('Ca',2,'Te2-','CaTe'),('Cd',2,'S2-','CdS'),('Sn',4,'Cl-','SnCl4')]:
    ck=cat_key(s,q); f,nc,na=ionic_formula(ck,ak)
    check(f==exp,f"binaria {f}!={exp}")
    n=MET[s][0]; w=ANIONS[ak]['n']
    name=cap(f"{w} de {cat_name(s,q)}")
    alt=[prefix_bin(w,na,n,nc)] if (na>1 or nc>1) else []
    wr=wrong_stock(w,s,q)+[cap(f"{w.replace('uro','ato')} de {cat_name(s,q)}"),cap(f"{w.replace('uro','ito')} de {cat_name(s,q)}"),cap(f"hidruro de {cat_name(s,q)}")]
    add('binaria',f,name,alt,wr,{'c':ck,'a':ak,'nc':nc,'na':na},lvl=(1,2))

for f,name,alts,wr in [
 ('CCl4','Tetracloruro de carbono',['Cloruro de carbono (IV)'],['Dicloruro de carbono','Clorato de carbono','Carburo de tetracloro']),
 ('CS2','Disulfuro de carbono',['Sulfuro de carbono (IV)'],['Sulfuro de carbono (II)','Sulfato de carbono','Dicarburo de azufre']),
 ('SF6','Hexafluoruro de azufre',['Fluoruro de azufre (VI)'],['Fluoruro de azufre (IV)','Tetrafluoruro de azufre','Sulfuro de flúor']),
 ('PCl3','Tricloruro de fósforo',['Cloruro de fósforo (III)'],['Pentacloruro de fósforo','Cloruro de fósforo (V)','Fosfuro de cloro']),
 ('PCl5','Pentacloruro de fósforo',['Cloruro de fósforo (V)'],['Tricloruro de fósforo','Cloruro de fósforo (III)','Clorato de fósforo']),
 ('BrF3','Trifluoruro de bromo',['Fluoruro de bromo (III)'],['Pentafluoruro de bromo','Fluoruro de bromo (V)','Bromuro de flúor']),
 ('SiF4','Tetrafluoruro de silicio',['Fluoruro de silicio (IV)'],['Difluoruro de silicio','Fluoruro de silicio (II)','Siliciuro de flúor']),
]:
    add('binaria',f,name,alts,wr)

# =============== 7. Hidróxidos ===============
for s,q,exp in [('Na',1,'NaOH'),('K',1,'KOH'),('Li',1,'LiOH'),('Ca',2,'Ca(OH)2'),('Mg',2,'Mg(OH)2'),('Ba',2,'Ba(OH)2'),
                ('Al',3,'Al(OH)3'),('Zn',2,'Zn(OH)2'),('Fe',2,'Fe(OH)2'),('Fe',3,'Fe(OH)3'),('Cu',2,'Cu(OH)2'),('Cu',1,'CuOH'),
                ('Pb',2,'Pb(OH)2'),('Pb',4,'Pb(OH)4'),('Sn',4,'Sn(OH)4'),('Ni',2,'Ni(OH)2'),('Cr',3,'Cr(OH)3'),('Ag',1,'AgOH'),('Co',3,'Co(OH)3')]:
    ck=cat_key(s,q); f,nc,na=ionic_formula(ck,'OH-')
    check(f==exp,f"hidróxido {f}!={exp}")
    n=MET[s][0]
    name=cap(f"hidróxido de {cat_name(s,q)}")
    alt=[prefix_bin('hidróxido',na,n,nc)] if na>1 else []
    wr=wrong_stock('hidróxido',s,q)+[cap(f"óxido de {cat_name(s,q)}"),cap(f"hidruro de {cat_name(s,q)}")]
    add('hidroxido',f,name,alt,wr,{'c':ck,'a':'OH-','nc':nc,'na':na},lvl=(1,2))

# =============== 8. Oxoácidos ===============
def acid_dec(X,V,H,nX,O,pre=''):
    lad=NM[X]['lad']
    return {'t':'acido','X':X,'nX':nX,'H':H,'O':O,'q':0,'V':V,'lad':lad,'labels':ladder_labels(X),
            'names':[cap(f"ácido {pre}{a}") for a in NM[X]['ac']],'pre':pre}
ACIDS=[]
FAKE={'C':['carbonoso','percarbónico','hipocarbonoso'],'B':['boroso','perbórico','metabórico'],'Cr':['cromoso','percrómico','dicrómico'],
      'P':['hipofosforoso','perfosfórico'],'As':['perarsénico','hipoarsenioso'],'N':['pernítrico'],'S':['persulfúrico'],
      'Se':['perselénico'],'Mn':['hipomanganoso']}
for X,V,exp,mode in [('Cl',1,'HClO','normal'),('Cl',3,'HClO2','normal'),('Cl',5,'HClO3','normal'),('Cl',7,'HClO4','normal'),
                     ('Br',1,'HBrO','normal'),('Br',5,'HBrO3','normal'),('Br',7,'HBrO4','normal'),('I',1,'HIO','normal'),
                     ('I',5,'HIO3','normal'),('I',7,'HIO4','normal'),('N',3,'HNO2','normal'),('N',5,'HNO3','normal'),
                     ('S',2,'H2SO2','normal'),('S',4,'H2SO3','normal'),('S',6,'H2SO4','normal'),('Se',4,'H2SeO3','normal'),
                     ('Se',6,'H2SeO4','normal'),('C',4,'H2CO3','normal'),('P',3,'H3PO3','normal'),('P',5,'H3PO4','normal'),
                     ('P',5,'HPO3','meta'),('B',3,'H3BO3','normal'),('As',5,'H3AsO4','normal'),('As',3,'H3AsO3','normal'),
                     ('Cr',6,'H2CrO4','normal'),('Mn',7,'HMnO4','normal'),('Mn',6,'H2MnO4','normal')]:
    H,nX,O,w=acid_formula(X,V,mode)
    f=fmt(H,X,nX,O)
    check(f==exp,f"ácido {f}!={exp}")
    check((2*O-H)//nX==V and (2*O-H)%nX==0,f"atajo 2O-H falla {f}")
    i=NM[X]['lad'].index(V)
    pre='meta' if mode=='meta' else ''
    name=cap(f"ácido {pre}{NM[X]['ac'][i]}")
    wr=[]
    if mode=='meta': wr.append(cap(f"ácido {NM[X]['ac'][i]}"))
    if X=='P' and mode=='normal' and V==5: wr.append('Ácido metafosfórico')
    wr+=[cap(f"ácido {pre}{a}") for j,a in enumerate(NM[X]['ac']) if j!=i]
    wr+=[cap(f"ácido {a}") for a in FAKE.get(X,[])]
    # inverso: nombre -> óxido + agua -> fórmula
    ox=oxide_of(X,V)
    oxw=[oxide_of(X,v) for v in NM[X]['lad'] if v!=V]+[oxide_of(X,V+1) if V<7 else oxide_of(X,V-2), f"{X}O{V}"]
    oxw=[o for o in dict.fromkeys(oxw) if o!=ox][:3]
    fw=[]
    for m in ('meta','orto'):
        if m!=mode and not (mode=='normal' and ((m=='orto')==bool(NM[X].get('orto')))):
            h2,n2,o2,_=acid_formula(X,V,m); fw.append(fmt(h2,X,n2,o2))
    for v in NM[X]['lad']:
        if v!=V: h2,n2,o2,_=acid_formula(X,v,mode); fw.append(fmt(h2,X,n2,o2))
    fw += [fmt(H+1,X,nX,O+1), fmt(H,X,nX,O+1), fmt(H*2 if H>1 else 2,X,nX,O)]
    fw=[x for x in dict.fromkeys(fw) if x!=f][:3]
    dec=acid_dec(X,V,H,nX,O,pre)
    dec['inv']={'ox':ox,'oxw':oxw,'w':w,'fw':fw}
    add('oxoacido',f,name,[],wr,None,dec,lvl=(1,3))
for X,V,exp in [('S',6,'H2S2O7'),('Cr',6,'H2Cr2O7'),('P',5,'H4P2O7')]:
    H,nX,O,w=acid_formula(X,V)
    H,nX,O=2*H-2,2*nX,2*O-1
    f=fmt(H,X,nX,O); check(f==exp,f"di-ácido {f}!={exp}")
    check((2*O-H)//nX==V,f"atajo di {f}")
    i=NM[X]['lad'].index(V)
    name=cap(f"ácido di{NM[X]['ac'][i]}")
    wr=[cap(f"ácido {NM[X]['ac'][i]}"),cap(f"ácido tri{NM[X]['ac'][i]}")]+[cap(f"ácido di{a}") for j,a in enumerate(NM[X]['ac']) if j!=i]+[cap(f"ácido di{a}") for a in FAKE.get(X,[]) if not a.startswith('di')]
    add('oxoacido',f,name,[],wr,None,acid_dec(X,V,H,nX,O,'di'),lvl=(1,3))

# =============== 9 y 10. Oxisales y sales ácidas ===============
def salt_dec(ak,trap=False):
    d=OXO[ak]; X=d['X']; lad=NM[X]['lad']
    base=[a for a in NM[X]['an']]
    pre=''
    if d['H']: pre={1:'hidrogeno',2:'dihidrogeno'}[d['H']]
    di = ANIONS[ak]['n'].startswith('di') and not d['H']
    if di: pre='di'
    out={'t':'salacida' if d['H'] else 'oxisal','X':X,'nX':d['nX'],'H':d['H'],'O':d['O'],'q':d['q'],'V':d['V'],
         'lad':lad,'labels':[l.replace('–oso','–ito').replace('–ico','–ato') for l in ladder_labels(X)],
         'names':[pre+b for b in base],'trap':trap}
    return out

BIN={'S':'sulfuro','Se':'seleniuro','N':'nitruro','P':'fosfuro','C':'carburo','Cl':'cloruro','Br':'bromuro','I':'yoduro',
     'As':'arseniuro','B':'boruro'}
FAKE_AN={'C':['carbonito','percarbonato'],'B':['borito','perborato'],'Cr':['cromito','percromato'],'P':['hipofosfito','perfosfato'],
         'As':['perarseniato'],'N':['pernitrato'],'S':['persulfato'],'Se':['perseleniato'],'Mn':['hipomanganito']}
def salt_wrong(ck,ak):
    c=CATIONS[ck]; a=ANIONS[ak]; d=OXO[ak]; X=d['X']; i=NM[X]['lad'].index(d['V'])
    cn=c['n']
    pre=''
    if d['H']: pre={1:'hidrogeno',2:'dihidrogeno'}[d['H']]
    if a['n'].startswith('di') and not d['H']: pre='di'
    G1=[]  # número de oxidación del metal
    if c['s'] in MET and len(MET[c['s']][1])>1:
        n=MET[c['s']][0]
        order=other_vals(c['s'],c['q'])+[x for x in (1,2,3,4) if x!=c['q'] and x not in MET[c['s']][1]]
        G1=[cap(f"{a['n']} de {n} ({ROM[v]})") for v in order]
    G2=[cap(f"{pre}{b} de {cn}") for j,b in enumerate(NM[X]['an']) if j!=i]+[cap(f"{pre}{b} de {cn}") for b in FAKE_AN.get(X,[]) if not (pre=='di' and b.startswith('per'))]
    G3=[]
    if d['H']:
        base=NM[X]['an'][i]
        G3=[cap(f"{base} de {cn}"), cap(f"{'hidrogeno' if d['H']==2 else 'dihidrogeno'}{base} de {cn}")]
    elif pre=='di':
        G3=[cap(f"{NM[X]['an'][i]} de {cn}"),cap(f"tri{NM[X]['an'][i]} de {cn}")]
    elif X=='Cr':
        G3=[cap(f"dicromato de {cn}")]
    elif X in BIN:
        G3=[cap(f"{BIN[X]} de {cn}")]
    out=[]
    for grp in (G3,G2,G1,G2[1:],G1[1:],G3[1:],G2[2:]):
        for x in grp:
            if x not in out: out.append(x); break
    for x in G1+G2+G3:
        if x not in out: out.append(x)
    return out

def k(s): return [x for x in ANIONS if ANIONS[x]['s']==s][0]
SALTS=[
 ('K+','CO3','K2CO3'),('Na+','NO2','NaNO2'),('Ca2+','NO3','Ca(NO3)2'),('Na+','SO3','Na2SO3'),('Fe3+','SO4','Fe2(SO4)3'),
 ('Na+','ClO','NaClO'),('Ca2+','ClO2','Ca(ClO2)2'),('Ba2+','IO3','Ba(IO3)2'),('K+','IO4','KIO4'),('K+','Cr2O7','K2Cr2O7'),
 ('Ca2+','MnO4','Ca(MnO4)2'),('Al3+','PO4','AlPO4'),('Co2+','PO4','Co3(PO4)2'),('Fe2+','NO3','Fe(NO3)2'),('K+','CrO4','K2CrO4'),
 ('Na+','ClO4','NaClO4'),('K+','MnO4','KMnO4'),('Ca2+','CO3','CaCO3'),('Al3+','CO3','Al2(CO3)3'),('Cu2+','NO3','Cu(NO3)2'),
 ('Na+','SO4','Na2SO4'),('Ag+','CrO4','Ag2CrO4'),('NH4+','NO3','NH4NO3'),('NH4+','SO4','(NH4)2SO4'),('Li+','AsO4','Li3AsO4'),
 ('Ni2+','PO4','Ni3(PO4)2'),('Pb2+','NO3','Pb(NO3)2'),('Cu2+','SO4','CuSO4'),('Fe2+','SO4','FeSO4'),('Mg2+','ClO3','Mg(ClO3)2'),
 ('Na+','SeO4','Na2SeO4'),('Co3+','ClO3','Co(ClO3)3'),('Hg2+','BrO3','Hg(BrO3)2'),('Na+','BO3','Na3BO3'),('Cu2+','CrO4','CuCrO4'),
 ('Al3+','BrO3','Al(BrO3)3'),('Ca2+','IO','Ca(IO)2'),('K+','SO3','K2SO3'),('Pb4+','SO4','Pb(SO4)2'),('Sn2+','IO3','Sn(IO3)2'),
 ('K+','MnO4','KMnO4'),
]
ACID_SALTS=[
 ('Na+','HSO4','NaHSO4'),('K+','HCO3','KHCO3'),('Na+','HCO3','NaHCO3'),('Ba2+','H2PO4','Ba(H2PO4)2'),('Na+','HPO4','Na2HPO4'),
 ('K+','H2PO4','KH2PO4'),('Fe3+','HSO3','Fe(HSO3)3'),('Ca2+','HCO3','Ca(HCO3)2'),('Mg2+','HSO4','Mg(HSO4)2'),('Cs+','HSO4','CsHSO4'),
 ('Ca2+','HSeO3','Ca(HSeO3)2'),('Fe2+','HSeO4','Fe(HSeO4)2'),('Al3+','HSO4','Al(HSO4)3'),('Cr3+','HSO3','Cr(HSO3)3'),
 ('Zn2+','HSO3','Zn(HSO3)2'),('Ca2+','HPO4','CaHPO4'),('Cd2+','HCO3','Cd(HCO3)2'),('Cu2+','HSO3','Cu(HSO3)2'),
]
seen=set()
for lst,fam in [(SALTS,'oxisal'),(ACID_SALTS,'sal_acida')]:
    for ck,s,exp in lst:
        if exp in seen: continue
        seen.add(exp)
        ak=k(s); f,nc,na=ionic_formula(ck,ak)
        check(f==exp,f"{fam} {f}!={exp}")
        name=cap(f"{ANIONS[ak]['n']} de {CATIONS[ck]['n']}")
        cc=CATIONS[ck]
        simp = math.gcd(cc['q'],OXO[ak]['q'])>1
        multi = cc['s'] in MET and len(MET[cc['s']][1])>1
        dec=salt_dec(ak, trap=bool(simp and multi))
        dec['simp']=simp
        # atajo: V = (2·O − H − carga)/nX
        d=OXO[ak]
        check((2*d['O']-d['H']-d['q'])==d['V']*d['nX'],f"atajo sal {exp}")
        add(fam,f,name,[],salt_wrong(ck,ak),{'c':ck,'a':ak,'nc':nc,'na':na},dec,lvl=(1,2,3))

# ---------------- verificación independiente: neutralidad por conteo de átomos ----------------
OXST={'H':1,'O':-2,'F':-1}
for it in ITEMS:
    io=it['ion']
    if io:
        c=CATIONS[io['c']]; a=ANIONS[io['a']]
        check(io['nc']*c['q']+io['na']*a['q']==0,f"carga ≠ 0 en {it['f']}")
        # recomponer átomos y comparar con la fórmula escrita
        tot=Counter()
        for el,n in atoms(c['s']).items(): tot[el]+=n*io['nc']
        an_s = 'O2' if a['kind']=='peroxido' else a['s']
        for el,n in atoms(an_s).items(): tot[el]+=n*io['na']
        check(tot==atoms(it['f']),f"átomos no cuadran {it['f']} {tot} {atoms(it['f'])}")
    d=it['dec']
    if d:
        at=atoms(it['f'])
        if d['t']=='acido':
            check(at['H']==d['H'] and at[d['X']]==d['nX'] and at['O']==d['O'],f"dec ácido {it['f']}")
        check(d['V'] in d['lad'],f"V fuera de escalera {it['f']}")
        check(len(d['names'])==len(d['lad'])==len(d['labels']),f"escalera incompleta {it['f']}")

if ERR:
    print("ERRORES:"); [print(' -',e) for e in ERR]; sys.exit(1)

fam_count=Counter(i['fam'] for i in ITEMS)
print("TOTAL",len(ITEMS),dict(fam_count))
print("L2:",sum(2 in i['lvl'] for i in ITEMS),"L3:",sum(3 in i['lvl'] for i in ITEMS))
data={'items':ITEMS,'cations':CATIONS,'anions':ANIONS}
open(sys.argv[1],'w',encoding='utf-8').write("/* Banco generado y verificado por tools/gen_banco.py — no editar a mano */\nwindow.BANCO="+json.dumps(data,ensure_ascii=False)+";\n")
json.dump(ITEMS,open(sys.argv[2],'w',encoding='utf-8'),ensure_ascii=False,indent=1)
