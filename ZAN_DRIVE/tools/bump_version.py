#!/usr/bin/env python3
"""Sube la versión de JER_DRIVE en un solo paso.
Uso:  python3 tools/bump_version.py 1.1 "Qué cambió"
Actualiza: js/version.js, el ?v= de css/js en los HTML (evita caché) y el historial del README."""
import re, sys, glob, datetime, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
if len(sys.argv) < 3:
    sys.exit(__doc__)
ver, nota = sys.argv[1].lstrip('v'), sys.argv[2]
hoy = datetime.date.today().isoformat()

vf = root/'js/version.js'; s = vf.read_text(encoding='utf-8')
s = re.sub(r"version: '[^']*'", f"version: '{ver}'", s)
s = re.sub(r"build: '[^']*'", f"build: '{hoy}'", s)
s = re.sub(r"year: \d+", f"year: {datetime.date.today().year}", s)
vf.write_text(s, encoding='utf-8')

for h in glob.glob(str(root/'*.html')):
    p = pathlib.Path(h); t = p.read_text(encoding='utf-8')
    t2 = re.sub(r'((?:css|js)/[\w.-]+\.(?:css|js))\?v=[\w.]+', rf'\1?v={ver}', t)
    if t2 != t: p.write_text(t2, encoding='utf-8')

rd = root/'README.md'; r = rd.read_text(encoding='utf-8')
marca = '## Historial de versiones\n'
entrada = f'- **v{ver}** ({hoy}): {nota}\n'
r = r.replace(marca, marca + entrada, 1) if marca in r else r + f'\n{marca}{entrada}'
rd.write_text(r, encoding='utf-8')
print(f'JER_DRIVE {datetime.date.today().year} v{ver} listo.')
