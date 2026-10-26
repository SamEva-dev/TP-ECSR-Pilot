#!/usr/bin/env python3
"""Non-destructive S01-bis i18n merge. Run from anywhere: python merge_i18n.py <angular-repo-root>."""
from pathlib import Path
import json,sys
if len(sys.argv) != 2:
    raise SystemExit("Usage: python merge_i18n.py <angular-repo-root>")
base=Path(sys.argv[1]).resolve()
delta=Path(__file__).resolve().parent/'i18n-delta'
for lang in ('fr','en'):
    target=base/'public'/'i18n'/f'{lang}.json'
    if not target.is_file(): raise SystemExit(f'Missing {target}')
    existing=json.loads(target.read_text(encoding='utf-8-sig'))
    incoming=json.loads((delta/f'{lang}.json').read_text(encoding='utf-8'))
    if not isinstance(existing,dict) or not isinstance(incoming,dict): raise SystemExit('JSON root must be an object')
    def merge(left,right):
        for k,v in right.items():
            if isinstance(v,dict) and isinstance(left.get(k),dict): merge(left[k],v)
            else: left[k]=v
    merge(existing,incoming)
    target.write_text(json.dumps(existing,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Merged:',target)
