"""Juega el Reto completo de forma automática (respuestas perfectas) y toma capturas.
Uso: python3 play_test.py URL OUTDIR [mock]"""
import sys, json, re
from playwright.sync_api import sync_playwright

URL, OUT = sys.argv[1], sys.argv[2]
MOCK = len(sys.argv) > 3 and sys.argv[3] == 'mock'
errors = []

def txt(s):  # normaliza texto de opción
    return re.sub(r'\s+', ' ', s).strip()

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg = b.new_page(viewport={'width': 1280, 'height': 900})
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
    if MOCK:
        pg.route('**/api/score', lambda r: r.fulfill(status=200, content_type='application/json',
                 body=json.dumps({'ok': True, 'mejorado': True, 'posicion': 1, 'participantes': 1, 'mejor': 0})))
    pg.goto(URL + '?grupo=PRUEBA-QA')
    pg.screenshot(path=f'{OUT}/00_inicio.png', full_page=True)
    pg.fill('#i-nombre', 'Prueba Automática QA'); pg.fill('#i-mat', 'QA0001')
    pg.click('#f-inicio button[type=submit]')
    shots = set()
    for lvl in (1, 2, 3):
        n = pg.evaluate('__LAB_STATE.items.length')
        for k in range(n):
            I = pg.evaluate('({it: __LAB_STATE.item.it, mode: __LAB_STATE.item.slot.mode})')
            it, mode = I['it'], I['mode']
            if lvl == 1:
                path = pg.evaluate(f'LAB.pathTo({json.dumps(it["fam"])}).map(x=>x[1])')
                for a in path:
                    pg.click(f'#l1-tree [data-a="{a}"]')
                if k == 0: pg.screenshot(path=f'{OUT}/10_l1.png', full_page=True)
                pg.locator('#l1-name .opt', has_text=it['name']).filter(has_text=re.compile('^\\d?' + re.escape(it['name']) + '$')).first.click() if False else None
                for o in pg.query_selector_all('#l1-name .opt'):
                    if txt(o.query_selector('span').inner_text()) == it['name']: o.click(); break
            elif lvl == 2:
                ion = it['ion']
                pg.click(f'#t-c .tile[data-key="{ion["c"]}"]'); pg.click(f'#t-a .tile[data-key="{ion["a"]}"]')
                for _ in range(ion['nc'] - 1): pg.click('[data-d="c+"]')
                for _ in range(ion['na'] - 1): pg.click('[data-d="a+"]')
                if mode not in shots: pg.screenshot(path=f'{OUT}/20_l2_{mode}.png', full_page=True); shots.add(mode)
                pg.click('#b-check')
                if mode == 'iones':
                    for o in pg.query_selector_all('#l2-name .opt'):
                        if txt(o.query_selector('span').inner_text()) == it['name']: o.click(); break
            else:
                d = it['dec']
                def num(v):
                    inp = pg.query_selector_all('#l3 .numstep input:not([disabled])')[-1]
                    inp.fill(str(v)); inp.press('Enter')
                def rung(v):
                    pg.query_selector_all(f'#l3 .rung[data-v="{v}"]:not([disabled])')[-1].click()
                def opt(t):
                    for o in pg.query_selector_all('#l3 .mc')[-1].query_selector_all('.opt'):
                        if txt(o.query_selector('span').inner_text()) == t: o.click(); return
                    raise Exception('opción no encontrada ' + t)
                if mode == 'acido':
                    num(d['V']); rung(d['V'])
                elif mode == 'sal':
                    num(d['q']); num(d['V']); rung(d['V']); opt(it['name'])
                else:
                    rung(d['V']); opt(d['inv']['ox'])
                    W = {1: '+ 1 H₂O', 2: '+ 2 H₂O', 3: '+ 3 H₂O (orto: B, P, As, Sb)'}
                    opt(W[d['inv']['w']]); opt(it['f'])
                if mode not in shots: pg.screenshot(path=f'{OUT}/30_l3_{mode}.png', full_page=True); shots.add(mode)
            pts = pg.evaluate('__LAB_STATE.item.earned')
            if pts != 100: errors.append(f'L{lvl} {it["f"]} ({mode}) obtuvo {pts}')
            pg.click('#b-next')
        pg.screenshot(path=f'{OUT}/4{lvl}_entre.png', full_page=True)
        pg.click('#e-go')
    pg.wait_for_function('document.querySelector("#f-code").textContent.startsWith("NOM-")')
    pg.wait_for_timeout(800)
    pg.screenshot(path=f'{OUT}/50_final.png', full_page=True)
    res = pg.evaluate('__LAB_STATE.result')
    code = res['code']
    ver = pg.evaluate(f'LAB.readCode({json.dumps(code)}, "QA0001")')
    bad = pg.evaluate(f'LAB.readCode({json.dumps(code)}, "QA0002")')
    print('RESULT', json.dumps({k: res[k] for k in ('score', 'pct', 'time', 'first', 'total', 'streak', 'code')}))
    print('VERIFY ok', ver['ok'], ver['score'], ver['pct'], ver['time'], '| otra matrícula ok?', bad['ok'])
    print('RANKMSG', pg.inner_text('#f-rank'))
    # pantalla móvil
    m = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    m.goto(URL); m.screenshot(path=f'{OUT}/60_movil_inicio.png', full_page=True)
    b.close()
print('ERRORS', len(errors)); [print(' ', e) for e in errors[:40]]
