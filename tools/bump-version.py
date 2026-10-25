#!/usr/bin/env python3
"""Regenera el import map de index.html con una versión nueva.

GitHub Pages (y los navegadores) guardan en caché cada archivo por separado.
Si después de una actualización el navegador mezcla archivos viejos y nuevos,
el juego no arranca. Agregando ?v=<versión> a cada módulo, todos se descargan
de nuevo juntos. Correr esto antes de cada push que cambie archivos de src/:

    python3 tools/bump-version.py
"""
import json
import pathlib
import re
import time

root = pathlib.Path(__file__).resolve().parent.parent
version = time.strftime('%Y%m%d%H%M')

imports = {'three': f'./vendor/three.module.min.js?v={version}'}
for f in sorted((root / 'vendor' / 'addons').rglob('*.js')):
    rel = f.relative_to(root / 'vendor' / 'addons').as_posix()
    imports[f'three/addons/{rel}'] = f'./vendor/addons/{rel}?v={version}'
    imports[f'./vendor/addons/{rel}'] = f'./vendor/addons/{rel}?v={version}'
for f in sorted((root / 'src').glob('*.js')):
    rel = f'./src/{f.name}'
    imports[rel] = f'{rel}?v={version}'
importmap = json.dumps({'imports': imports}, indent=2, ensure_ascii=False)

for page in ['index.html', 'sandbox.html']:
    path = root / page
    html = path.read_text(encoding='utf-8')
    html = re.sub(r'<script type="importmap">.*?</script>',
                  '<script type="importmap">\n' + importmap + '\n  </script>', html, flags=re.S)
    html = re.sub(r'src="src/(\w+)\.js(\?v=\w+)?"', lambda m: f'src="src/{m.group(1)}.js?v={version}"', html)
    html = re.sub(r'href="css/style\.css(\?v=\w+)?"', f'href="css/style.css?v={version}"', html)
    path.write_text(html, encoding='utf-8')
print('versión', version)
