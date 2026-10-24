"""Собирает data/grinders.json — справочник кофемолок Bloomline.

Источники (tools/src):
  hcg.json   — 227 моделей Honest Coffee Guide: диапазон шкалы и деления по способам заваривания
  tasty.json — 95 моделей из конвертера Tasty Coffee (https://shop.tastycoffee.ru/api/v2/grinders):
               полная таблица «деление → мкм»; шкала та же, что у HCG

Все значения в общей условной шкале HCG «мкм». Поправки согласованы 24.10.2026
(см. «Атлас помолов»): Timemore S3, KINGrinder K4/K6, K-Ultra после 1.0.0, Comandante X25.

Запуск: python3 tools/build_grinders.py
"""
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = json.load(open(f'{ROOT}/tools/src/hcg.json', encoding='utf-8'))
T = json.load(open(f'{ROOT}/tools/src/tasty.json', encoding='utf-8'))['data']

def clean(n): return n.replace('\xa0', ' ').split(' grind set')[0].strip()
def norm(s): return re.sub(r'[^a-z0-9]', '', s.lower())
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

TN = {norm(g['name']): g for g in T}
TN[norm('Timemore x Millab E01')] = TN.get(norm('Timemore Millab E01'))
# У Tasty таблицы X25 «с Red Clix» и «без» перепутаны местами
TN[norm('Comandante X25 Trailmaster')], TN[norm('Comandante X25 Trailmaster (with Red Clix)')] = \
    TN[norm('Comandante X25 Trailmaster (with Red Clix)')], TN[norm('Comandante X25 Trailmaster')]

BRANDS = ['Barista & Co', 'Barista Space', 'Breville (Sage)', 'Joy Resolve', 'Option-O', 'Orphan Espresso',
          'Weber Workshops', 'Saint Anthony Industries', 'Fiorenzato (Sanremo)', 'Goat Story', 'Fuji Royal',
          'Timemore x Millab']
def split_brand(name):
    for b in BRANDS:
        if name.startswith(b + ' '): return b.replace('Timemore x Millab', 'Timemore'), name[len(b) + 1:]
    p = name.split(' ', 1)
    return p[0], (p[1] if len(p) > 1 else name)

# Популярные модели (основной список «Атласа»): имя HCG → (подпись в приложении, тип)
POPULAR = {
 'Comandante C40 MK4': ('Comandante C40 MK4', 'hand'),
 'Comandante C40 MK4 (with Red Clix)': ('Comandante C40 MK4 + Red Clix', 'hand'),
 'Comandante X25 Trailmaster': ('Comandante X25 Trailmaster', 'hand'),
 '1Zpresso K-Ultra': ('1Zpresso K-Ultra', 'hand'), '1Zpresso K-Max': ('1Zpresso K-Max', 'hand'),
 '1Zpresso K-Plus': ('1Zpresso K-Plus', 'hand'), '1Zpresso ZP6 Special': ('1Zpresso ZP6 Special', 'hand'),
 '1Zpresso J-Ultra': ('1Zpresso J-Ultra', 'hand'), '1Zpresso J-Max': ('1Zpresso J-Max', 'hand'),
 '1Zpresso JX-Pro': ('1Zpresso JX-Pro', 'hand'), '1Zpresso X-Ultra': ('1Zpresso X-Ultra', 'hand'),
 '1Zpresso Q2 (Heptagonal burrs)': ('1Zpresso Q2 / Q Air', 'hand'),
 'Timemore C2': ('Timemore C2 / C2 Max / Fold', 'hand'), 'Timemore C3': ('Timemore C3 / C3S / C3 Pro / Max', 'hand'),
 'Timemore C3 ESP Pro': ('Timemore C3 ESP / ESP Pro', 'hand'), 'Timemore C5 Pro': ('Timemore C5 Pro', 'hand'),
 'Timemore S3': ('Timemore Chestnut S3', 'hand'), 'Timemore Chestnut X': ('Timemore Chestnut X', 'hand'),
 'Timemore Nano': ('Timemore Nano', 'hand'), 'KINGrinder K6': ('KINGrinder K6', 'hand'),
 'KINGrinder K4': ('KINGrinder K4', 'hand'), 'KINGrinder K2': ('KINGrinder K2', 'hand'),
 'KINGrinder P2': ('KINGrinder P2', 'hand'), 'Kinu M47 Classic': ('Kinu M47', 'hand'),
 'Mavo Phantox Pro': ('Mavo Phantox Pro', 'hand'), 'Varia Hand grinder': ('Varia Hand Grinder', 'hand'),
 'MHW-3BOMBER Blade R3': ('MHW-3BOMBER Blade R3', 'hand'), 'Wacaco Exagrind': ('Wacaco Exagrind', 'hand'),
 'Hario Skerton PRO': ('Hario Skerton Pro / Plus', 'hand'), 'Hario Mini Mill Slim PRO': ('Hario Mini Mill Slim / Plus', 'hand'),
 'Porlex Mini II': ('Porlex Mini II / Tall II', 'hand'),
 'Fellow Ode Brew Grinder Gen 2': ('Fellow Ode Gen 2', 'electric'), 'Fellow Ode Brew Grinder Gen 1': ('Fellow Ode Gen 1', 'electric'),
 'Fellow Opus': ('Fellow Opus', 'electric'), 'Baratza Encore': ('Baratza Encore', 'electric'),
 'Baratza Encore ESP': ('Baratza Encore ESP', 'electric'), 'Baratza Virtuoso+': ('Baratza Virtuoso+', 'electric'),
 'Baratza Sette 30': ('Baratza Sette 270 / 30', 'electric'), 'Baratza Vario': ('Baratza Vario / Vario W', 'electric'),
 'Timemore Sculptor 064S': ('Timemore Sculptor 064S', 'electric'), 'Timemore Sculptor 078S': ('Timemore Sculptor 078S', 'electric'),
 'Timemore Sculptor 064': ('Timemore Sculptor 064', 'electric'), 'Timemore Sculptor 078': ('Timemore Sculptor 078', 'electric'),
 'Turin DF64 (Gen 2)': ('Turin DF64 Gen 2', 'electric'), 'Turin DF64V': ('Turin DF64V', 'electric'),
 'Turin DF54': ('Turin DF54', 'electric'), 'Turin DF83V': ('Turin DF83V', 'electric'), 'Turin SD40 V2': ('Turin SD40', 'electric'),
 'Varia VS3 (Gen 2)': ('Varia VS3', 'electric'), 'Varia VS6': ('Varia VS6', 'electric'), 'Niche Zero': ('Niche Zero', 'electric'),
 'Eureka Mignon Oro': ('Eureka Mignon Oro', 'electric'), 'Option-O Lagom Mini (Moonshine burrs)': ('Lagom Mini (Moonshine)', 'electric'),
 'Mahlkönig EK43 (0-16)': ('Mahlkönig EK43 (шкала 0–16)', 'electric'), 'Mahlkönig X54': ('Mahlkönig X54', 'electric'),
 'Wilfa Svart': ('Wilfa Svart / Svart Aroma', 'electric'), 'Wilfa Uniform': ('Wilfa Uniform', 'electric'),
 'Wilfa Balance': ('Wilfa Balance', 'electric'), 'MiiCoffee D40+': ('MiiCoffee D40+', 'electric'),
 'xBloom Studio': ('xBloom Studio', 'electric'), 'Zerno Z1': ('Zerno Z1 (шкала в мкм)', 'electric'),
 'Zwilling Enfinigy Coffee Grinder': ('Zwilling Enfinigy', 'electric'),
 "De'Longhi KG79": ("De'Longhi KG79 / KG89", 'budget'), 'Smeg CGF01': ('Smeg CGF01 / CGF11', 'budget'),
 'Melitta Calibra': ('Melitta Calibra', 'budget'), 'Melitta Molino': ('Melitta Molino', 'budget'),
 'Bodum Bistro 10903': ('Bodum Bistro', 'budget'), 'Krups GX5000': ('Krups GX5000', 'budget'),
 'Breville (Sage) The Smart Grinder Pro': ('Sage / Breville Smart Grinder Pro', 'budget'), 'Vevok Chef 06': ('Vevok Chef 06', 'budget'),
}

# Свои шкалы вместо HCG/Tasty (согласовано)
OVERRIDE = {
 # 5.75 ↔ 543 мкм (ваш оптимум на K-Ultra и S3), 5.7 мкм на щелчок → 57 мкм на цифру диска
 'Timemore S3': dict(type='linear', fmt='num', step=0.1, um0=216, umPerUnit=57, min=0, max=9, unit='click'),
 # 60 щелчков на оборот, ≈6.5 мкм/щелчок; значение — число щелчков, подпись «оборот.щелчки»
 'KINGrinder K6': dict(type='linear', fmt='rc', base=60, step=1, um0=0, umPerUnit=6.5, min=0, max=240, unit='click'),
 'KINGrinder K4': dict(type='linear', fmt='rc', base=60, step=1, um0=0, umPerUnit=6.5, min=0, max=240, unit='click'),
 # таблица HCG/Tasty кончается на 1.0.0 — продлеваем тем же шагом до 2.0.0
 '1Zpresso K-Ultra': dict(type='linear', fmt='rnt', base=100, step=1, um0=0, umPerUnit=7.6, min=0, max=200, unit='click'),
}

def decimals(s):
    m = re.findall(r'\d+\.(\d+)', s)
    return max((len(x) for x in m), default=0)

def numeric_scale(o):
    """Линейная шкала из диапазона V60 (400–700 мкм у HCG) для простых числовых записей."""
    v = o['methods'].get('V60', '')
    parts = [x.strip() for x in v.split('–')]
    if len(parts) != 2: return None
    try: a, b = float(parts[0]), float(parts[1])
    except ValueError: return None
    lo, hi = max(400.0, float(o['min'])), min(700.0, float(o['max']))
    if b == a or hi <= lo: return None
    upu = (hi - lo) / (b - a)                    # мкм на единицу шкалы
    um0 = lo - a * upu                           # мкм при значении 0
    allv = ' '.join(o['methods'].values())
    dec = decimals(allv)
    step = {0: 1, 1: 0.1, 2: 0.01}.get(dec, 0.01)
    vmin = max(0.0, (float(o['min']) - um0) / upu)
    vmax = (float(o['max']) - um0) / upu
    return dict(type='linear', fmt='num', step=step, um0=round(um0, 2), umPerUnit=round(upu, 4),
                min=round(vmin, 2), max=round(vmax, 2), unit='step')

out, skipped = [], []
for o in sorted(H, key=lambda o: clean(o['name']).lower()):
    name = clean(o['name'])
    brand, model = split_brand(name)
    pop = POPULAR.get(name)
    g = TN.get(norm(name))
    if name in OVERRIDE:
        scale = OVERRIDE[name]
    elif g:
        pts = [[str(m['grinder_setting']), m['micron_value']] for m in g['microns']]
        unit = 'click' if any('щелч' in p[0] for p in pts) else 'step'
        scale = dict(type='table', points=pts, unit=unit)
    else:
        scale = numeric_scale(o)
        if scale is None:
            skipped.append(name); continue
    out.append(dict(
        id=slug(name), name=pop[0] if pop else name, brand=brand,
        kind=pop[1] if pop else None, popular=bool(pop),
        range=[int(float(o['min'])), int(float(o['max']))],
        v60=o['methods'].get('V60'), pourOver=o['methods'].get('Pour Over'),
        source='bloomline' if name in OVERRIDE else ('tasty' if g else 'hcg'),
        scale=scale))

data = dict(version='2026-10-24',
            note='Условная шкала HCG «мкм». Источники: honestcoffeeguide.com, shop.tastycoffee.ru/grind-converter. '
                 'Поправки Bloomline: Timemore S3, KINGrinder K4/K6, 1Zpresso K-Ultra, Comandante X25.',
            grinders=out)
os.makedirs(f'{ROOT}/data', exist_ok=True)
with open(f'{ROOT}/data/grinders.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
print(f'{len(out)} моделей, популярных {sum(x["popular"] for x in out)}; пропущено {len(skipped)} (сложная запись шкалы):')
print('  ' + '; '.join(skipped))
missing = [k for k in POPULAR if k not in {clean(o["name"]) for o in H}]
if missing: print('НЕ НАЙДЕНЫ популярные:', missing)
