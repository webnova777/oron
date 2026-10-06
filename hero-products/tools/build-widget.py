#!/usr/bin/env python3
"""
아임웹 코드 위젯용 파일 만들기
  - hero-products-scroll.template.html 의 /*__COMPOSE__*/ 자리에 compose.js 를 넣고,
    __ASSET_BASE__ 자리에 제품 이미지 폴더 주소를 넣어 hero-products-scroll.html 을 만듭니다.
사용: python3 tools/build-widget.py <제품 이미지 폴더 주소(끝에 / 포함)>
"""
import os, sys
here = os.path.join(os.path.dirname(__file__), '..')
base = sys.argv[1] if len(sys.argv) > 1 else '../assets/'
tpl = open(os.path.join(here, 'hero-products-scroll.template.html'), encoding='utf-8').read()
js = open(os.path.join(here, 'compose.js'), encoding='utf-8').read()
js = '\n'.join(('  ' + l if l.strip() else l) for l in js.splitlines())   # 들여쓰기만 맞춤
glow = len(sys.argv) > 2 and sys.argv[2] == 'glow'
if glow: js = '  window.ORON_GLOW = true;   // 은은한 빛 번짐 버전\n' + js
out = tpl.replace('/*__COMPOSE__*/', js).replace('__ASSET_BASE__', base)
open(os.path.join(here, 'hero-products-scroll-glow.html' if glow else 'hero-products-scroll.html'), 'w', encoding='utf-8').write(out)
print('만듦: hero-products-scroll.html', len(out), 'bytes, base =', base)
