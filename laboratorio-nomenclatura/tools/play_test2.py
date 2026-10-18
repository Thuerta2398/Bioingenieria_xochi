"""Recorre los 7 mundos de la Expedición con respuestas correctas, prueba integridad y toma capturas.
Uso: python3 play_test2.py URL OUTDIR [mock]"""
import sys, json, re
from playwright.sync_api import sync_playwright
URL, OUT = sys.argv[1], sys.argv[2]; MOCK = len(sys.argv) > 3 and sys.argv[3] == 'mock'
errs = []
def tx(s): return re.sub(r'\s+', ' ', s).strip()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ctx = b.new_context(viewport={'width': 1280, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    if MOCK:
        pg.route('**/api/v2/score', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'mejorado': True, 'posicion': 1, 'participantes': 3, 'mejor': 0})))
    pg.goto(URL + '?grupo=PRUEBA-QA'); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{OUT}/v2_00_portada.png')
    pg.fill('#r-nombre', 'Prueba Expedición QA'); pg.fill('#r-mat', 'QA2001'); pg.click('#r-go')
    pg.wait_for_timeout(500); pg.screenshot(path=f'{OUT}/v2_01_mapa.png')
    norm_tests = pg.evaluate('''(()=>{const n=__EXP.norm;return [n("Cloruro de Hierro(III)")===n("cloruro de hierro (3)"), n("ÓXIDO FÉRRICO")===n("oxido ferrico"), n("el ion férrico")===n("ion ferrico"), n("Estaño")===n("estano")]})()''')
    if not all(norm_tests): errs.append('normalización falló ' + str(norm_tests))
    pg.click('#w-go'); pg.wait_for_timeout(300); pg.screenshot(path=f'{OUT}/v2_02_repaso0.png', full_page=True)
    # prueba de integridad: pegar y salir de ventana durante el repaso
    pg.evaluate('''document.dispatchEvent(new Event('paste',{bubbles:true,cancelable:true}))''')
    pg.evaluate('''window.dispatchEvent(new Event('blur'))'''); pg.wait_for_timeout(1000); pg.evaluate('''window.dispatchEvent(new Event('focus'))''')
    integ = pg.evaluate('__EXP.P.integ')
    if integ['pegados'] != 1 or integ['salidas'] != 1: errs.append('integridad no registró ' + str(integ))
    pg.click('#br-go')
    shots = set()
    for w in range(7):
        n = pg.evaluate('__EXP.S.items.length')
        for k in range(n):
            it = pg.evaluate('__EXP.S.items[__EXP.S.idx]')
            kind = it['kind']; tag = kind + (it['q']['t'] if kind == 'q' else it.get('mode', ''))
            def opn(sel_scope, ans):
                inp = pg.query_selector_all(f'{sel_scope} .answer input:not([disabled])')[-1]; inp.fill(ans); inp.press('Enter')
            if kind == 'q':
                q = it['q']
                if q['t'] == 'mcq':
                    for o in pg.query_selector_all('#stage .opt'):
                        if tx(o.query_selector('span').inner_text()) == q['ok']: o.click(); break
                    else: errs.append('mcq sin opción ' + q['ok'])
                elif q['t'] == 'open': opn('#stage', q['ans'][0])
                else:
                    for t in re.findall(r'[A-Z][a-z]?|\d|\(|\)', q['fans']): pg.click(f'#stage .kb button[data-t="{t}"]')
                    pg.click('#stage .next .b.go')
            elif kind == 'tree':
                for a in pg.evaluate(f'LAB.pathTo({json.dumps(it["it"]["fam"])}).map(x=>x[1])'): pg.click(f'#t-a [data-a="{a}"]')
                opn('#t-b', it['it']['trad'][0] if it['it']['trad'] else it['it']['name'])
            elif kind == 'ens':
                io = it['it']['ion']
                pg.click(f'#tc .tile[data-key="{io["c"]}"]'); pg.click(f'#ta .tile[data-key="{io["a"]}"]')
                for _ in range(io['nc'] - 1): pg.click('[data-d="c+"]')
                for _ in range(io['na'] - 1): pg.click('[data-d="a+"]')
                pg.click('#chk')
                if it['mode'] == 'iones': opn('#en', it['it']['trad'][0] if it['it']['trad'] else it['it']['name'])
            else:
                d = it['it']['dec']
                def num(v):
                    i = pg.query_selector_all('#dx .num-in input:not([disabled])')[-1]; i.fill(str(v)); i.press('Enter')
                def rung(v): pg.query_selector_all(f'#dx .rung[data-v="{v}"]:not([disabled])')[-1].click()
                if it['mode'] == 'acido': num(d['V']); rung(d['V'])
                else: num(d['q']); num(d['V']); rung(d['V']); opn('#dx', it['it']['name'])
            if tag not in shots: pg.screenshot(path=f'{OUT}/v2_w{w}_{tag}.png', full_page=True); shots.add(tag)
            e = pg.evaluate('__EXP.I.earned')
            if e != 100: errs.append(f'M{w} {tag} obtuvo {e}: ' + json.dumps(it)[:200])
            pg.wait_for_timeout(380)
            try: pg.click('#b-next', timeout=4000)
            except Exception:
                print('ATASCADO en', json.dumps(it, ensure_ascii=False)[:600]); print(pg.inner_text('#stage')[-600:]); print(errs); sys.exit(1)
        pg.wait_for_timeout(200)
        if w == 0: pg.screenshot(path=f'{OUT}/v2_res0.png', full_page=True)
        if w < 6: pg.click('#rs-next'); pg.click('#br-go')
        else: pg.click('#rs-rep')
    pg.wait_for_function('document.querySelector("#rp-code").textContent.startsWith("N2-")'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/v2_informe.png', full_page=True)
    code = pg.inner_text('#rp-code'); P = pg.evaluate('__EXP.P')
    r = pg.evaluate(f'LAB.readCode2({json.dumps(code)},"QA2001")'); r2 = pg.evaluate(f'LAB.readCode2({json.dumps(code)},"QA2002")')
    print('CODE', code, {k: r[k] for k in ('ok', 'score', 'pct', 'worlds', 'salidas', 'pegados', 'copias', 'fuera', 'time')}, 'otra mat ok?', r2['ok'])
    print('RANK', pg.inner_text('#rp-rank'))
    pg.goto(URL); pg.wait_for_timeout(300); pg.click('#r-go'); pg.wait_for_timeout(400); pg.screenshot(path=f'{OUT}/v2_mapa_final.png')
    m = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2); m.on('pageerror', lambda e: errs.append('m:' + str(e)))
    m.goto(URL); m.fill('#r-nombre', 'Movil Prueba'); m.fill('#r-mat', 'QA2003'); m.fill('#r-grupo', 'X'); m.click('#r-go'); m.wait_for_timeout(400)
    m.screenshot(path=f'{OUT}/v2_movil_mapa.png', full_page=True)
    b.close()
print('ERRORS', len(errs)); [print(' ', e) for e in errs[:30]]
