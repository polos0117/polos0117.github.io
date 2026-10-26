# 허브 아이콘 — 지붕을 걷어낸 건물 블록, 방 여섯(지도와 같은 위 셋·아래 셋)에 공방 빛.
# 512 정사각, 바깥 꼭짓점이 maskable 안전 원(반지름 40%) 안에 든다.
import math
C=[('#7fb3ff'),('#e39b6b'),('#c9a227'),('#f4c542'),('#ff6ad5'),('#e0703a')]
cx,cy,a,bb,h=256,186,30,17.5,50
U,V=6,4.4
def P(u,v,z=0): return (cx+(u-v)*a, cy+(u+v)*bb - z)
def pts(l): return ' '.join(f'{x:.1f},{y:.1f}' for x,y in l)
def poly(l,**k): return '<polygon points="%s" %s/>'%(pts(l),' '.join(f'{kk.replace("_","-")}="{vv}"' for kk,vv in k.items()))
rooms=[(0,0,2,2.2),(2,0,4,2.2),(4,0,6,2.2),(0,2.2,2,4.4),(2,2.2,4,4.4),(4,2.2,6,4.4)]
defs=['<radialGradient id="bg" cx="50%" cy="48%" r="62%"><stop offset="0" stop-color="#2a221c"/><stop offset=".55" stop-color="#16141a"/><stop offset="1" stop-color="#0f0e12"/></radialGradient>',
 '<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>',
 '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>',
 '<linearGradient id="wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3542"/><stop offset="1" stop-color="#25212b"/></linearGradient>',
 '<linearGradient id="wr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2731"/><stop offset="1" stop-color="#1a171f"/></linearGradient>']
for i,c in enumerate(C):
    defs.append(f'<radialGradient id="r{i}" cx="55%" cy="58%" r="70%"><stop offset="0" stop-color="#fff6dc"/><stop offset=".28" stop-color="{c}"/><stop offset="1" stop-color="{c}" stop-opacity=".55"/></radialGradient>')
b=[]
# 바닥 빛 웅덩이
b.append(f'<ellipse cx="256" cy="{cy+10.4*bb*0.62:.0f}" rx="200" ry="70" fill="#d9b45a" opacity=".16" filter="url(#blur)"/>')
# 바깥 벽 두 면
b.append(poly([P(-.3,V+.3,h),P(U+.3,V+.3,h),P(U+.3,V+.3,0),P(-.3,V+.3,0)],fill='url(#wl)'))
b.append(poly([P(U+.3,-.3,h),P(U+.3,V+.3,h),P(U+.3,V+.3,0),P(U+.3,-.3,0)],fill='url(#wr)'))
# 돌 줄눈 — 앞 왼쪽 면에 가로 두 줄
for z in (h*.36,h*.7):
    b.append(f'<polyline points="{pts([P(-.3,V+.3,z),P(U+.3,V+.3,z)])}" stroke="#00000055" stroke-width="2" fill="none"/>')
    b.append(f'<polyline points="{pts([P(U+.3,V+.3,z),P(U+.3,-.3,z)])}" stroke="#00000055" stroke-width="2" fill="none"/>')
# 입구 — 앞면 가운데 아치(지도의 계단 입구)
ux=3.0; dw=.42
bl,br=P(ux-dw,V+.3,0),P(ux+dw,V+.3,0); tl,tr=P(ux-dw,V+.3,h*.55),P(ux+dw,V+.3,h*.55)
b.append(f'<path d="M{bl[0]:.1f} {bl[1]:.1f} L{tl[0]:.1f} {tl[1]:.1f} Q{(tl[0]+tr[0])/2:.1f} {(tl[1]+tr[1])/2-16:.1f} {tr[0]:.1f} {tr[1]:.1f} L{br[0]:.1f} {br[1]:.1f} Z" fill="#f4c25a"/>')
b.append(f'<path d="M{bl[0]:.1f} {bl[1]:.1f} L{tl[0]:.1f} {tl[1]:.1f} Q{(tl[0]+tr[0])/2:.1f} {(tl[1]+tr[1])/2-16:.1f} {tr[0]:.1f} {tr[1]:.1f} L{br[0]:.1f} {br[1]:.1f} Z" fill="#f4c25a" filter="url(#blur)" opacity=".7"/>')
# 벽 윗면(지붕 없는 테두리) — 방 사이는 이 면이 칸막이로 보인다
b.append(poly([P(-.3,-.3,h),P(U+.3,-.3,h),P(U+.3,V+.3,h),P(-.3,V+.3,h)],fill='#57505e'))
b.append(f'<polyline points="{pts([P(-.3,V+.3,h),P(-.3,-.3,h),P(U+.3,-.3,h)])}" stroke="#7a7282" stroke-width="2" fill="none"/>')
# 방 — 빛 번짐 + 바닥 + 안쪽 벽 그늘
g=.17
for i,(u0,v0,u1,v1) in enumerate(rooms):
    q=[P(u0+g,v0+g,h),P(u1-g,v0+g,h),P(u1-g,v1-g,h),P(u0+g,v1-g,h)]
    b.append(poly(q,fill=C[i],opacity='.55',filter='url(#blur)'))
for i,(u0,v0,u1,v1) in enumerate(rooms):
    q=[P(u0+g,v0+g,h),P(u1-g,v0+g,h),P(u1-g,v1-g,h),P(u0+g,v1-g,h)]
    b.append(poly(q,fill=f'url(#r{i})'))
    d=.42   # 뒤쪽 두 벽의 안쪽 면 — 방이 움푹 들어가 보이게
    b.append(poly([P(u0+g,v0+g,h),P(u1-g,v0+g,h),P(u1-g,v0+g+d,h),P(u0+g+d*.7,v0+g+d,h)],fill='#120f16',opacity='.55'))
    b.append(poly([P(u0+g,v0+g,h),P(u0+g+d*.7,v0+g+d,h),P(u0+g+d*.7,v1-g,h),P(u0+g,v1-g,h)],fill='#120f16',opacity='.4'))
    # 방 가운데 작은 불씨
    m=P((u0+u1)/2+.15,(v0+v1)/2+.15,h)
    b.append(f'<circle cx="{m[0]:.1f}" cy="{m[1]:.1f}" r="5" fill="#fff8e6" opacity=".85" filter="url(#soft)"/>')
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs>{"".join(defs)}</defs><rect width="512" height="512" fill="url(#bg)"/>{"".join(b)}</svg>'
open('icon.svg','w').write(svg)   # 브라우저로 512·192·180 PNG 를 찍는다(png 로 굽는 도구는 저장소에 두지 않는다)
# 안전 원 확인
corners=[P(-.3,-.3,h),P(U+.3,-.3,h),P(U+.3,V+.3,0),P(-.3,V+.3,0),P(-.3,V+.3,h),P(U+.3,-.3,0)]
print('최대 거리', max(math.hypot(x-256,y-256) for x,y in corners), '/ 안전 204.8')
