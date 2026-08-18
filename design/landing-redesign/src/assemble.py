#!/usr/bin/env python3
"""Splice the generated fragments into the page shell."""
import io
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'index.html')

body = io.open(os.path.join(HERE, 'index.body.html'), encoding='utf-8').read()
shell = io.open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()

parts = {}
for chunk in re.split(r'<!-- (\w+) -->\n', body)[1:]:
    if chunk.isupper() and '\n' not in chunk:
        key = chunk
    else:
        parts[key] = chunk.strip()

missing = [k for k in ('HERO_ROW', 'POPUP', 'CHARTS', 'SETTINGS_LIST', 'SETTINGS_PANEL', 'LEAGUES')
           if k not in parts]
if missing:
    raise SystemExit('missing fragments: %s' % missing)

for key, value in parts.items():
    token = '{{%s}}' % key
    if token not in shell:
        raise SystemExit('shell has no slot for %s' % key)
    shell = shell.replace(token, value)

left = re.findall(r'\{\{\w+\}\}', shell)
if left:
    raise SystemExit('unfilled slots: %s' % left)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
io.open(OUT, 'w', encoding='utf-8').write(shell)
print('wrote %s (%d KB)' % (OUT, len(shell.encode('utf-8')) // 1024))
