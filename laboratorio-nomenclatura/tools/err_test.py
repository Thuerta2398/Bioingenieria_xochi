import sys, json
from playwright.sync_api import sync_playwright
URL, OUT = sys.argv[1], sys.argv[2]; errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg=b.new_page(viewport={'width':1280,'height':900}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); pg.fill('#i-nombre','Ana López'); pg.fill('#i-mat','A1234'); pg.fill('#i-grupo','bio 101')
    pg.click('#f-inicio button[type=submit]')
    it=pg.evaluate('__LAB_STATE.item.it'); path=pg.evaluate(f'LAB.pathTo({json.dumps(it["fam"])}).map(x=>x[1])')
    pg.click('#l1-tree [data-a="%s"]' % ('no' if path[0]=='si' else 'si'))
    pg.screenshot(path=f'{OUT}/e1_hint.png')
    pg.click('#b-atajo'); pg.wait_for_timeout(300); pg.screenshot(path=f'{OUT}/e2_modal_mapa.png')
    for t in ['escalera','atajo']:
        pg.click(f'#m-tabs [data-t="{t}"]'); pg.wait_for_timeout(200); pg.screenshot(path=f'{OUT}/e3_modal_{t}.png')
    pg.click('#m-close')
    for a in path: pg.click(f'#l1-tree [data-a="{a}"]')
    wrong=[o for o in pg.query_selector_all('#l1-name .opt') if o.query_selector('span').inner_text()!=it['name']]
    wrong[0].click(); wrong[1].click(); pg.screenshot(path=f'{OUT}/e4_reveal.png', full_page=True)
    print('item earned', pg.evaluate('__LAB_STATE.item.earned'), 'score', pg.evaluate('__LAB_STATE.score'))
    pg.click('#b-next')
    # práctica nivel 2 con subíndices erróneos
    pg.goto(URL); pg.click('[data-mode="practica"]'); pg.click('#f-inicio button[type=submit]'); pg.click('[data-prac="2"]')
    for k in range(8):
        it=pg.evaluate('__LAB_STATE.item.it'); ion=it['ion']
        pg.click(f'#t-c .tile[data-key="{ion["c"]}"]'); pg.click(f'#t-a .tile[data-key="{ion["a"]}"]')
        if ion['nc']==1 and ion['na']==1:
            pg.click('[data-d="c+"]'); pg.click('[data-d="a+"]')  # neutra pero sin simplificar
        pg.click('#b-check'); 
        if k==0: pg.screenshot(path=f'{OUT}/e5_l2_err.png', full_page=True)
        pg.click('#b-check'); pg.click('#b-check')
        if pg.is_visible('#l2-name'):
            pg.query_selector_all('#l2-name .opt')[0].click()
            if not pg.is_visible('#b-next'): pg.query_selector_all('#l2-name .opt:not([disabled])')[0].click()
        pg.click('#b-next')
    pg.screenshot(path=f'{OUT}/e6_prac_end.png', full_page=True)
    m=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2); m.on('pageerror',lambda e:errs.append(str(e)))
    m.goto(URL); m.fill('#i-nombre','Ana López'); m.fill('#i-mat','A1234'); m.fill('#i-grupo','x'); m.click('[data-mode="practica"]'); m.click('#f-inicio button[type=submit]'); m.click('[data-prac="2"]')
    m.screenshot(path=f'{OUT}/e7_movil_l2.png', full_page=True)
    m.goto(URL+'ranking.html'); m.wait_for_timeout(500); m.screenshot(path=f'{OUT}/e8_rank_local.png')
    b.close()
print('ERRS',errs)
