#!/usr/bin/env python3
"""꿔바칩 접시 사진에서 과자 3개만 골라 누끼(GrabCut)로 따서 assets/chips.png 로 만든다."""
import numpy as np, cv2, os
from PIL import Image, ImageFilter
H=os.path.join(os.path.dirname(__file__),'..')
src=Image.open(H+'/src/rm-chips23.png').convert('RGB'); S=3
src=src.resize((src.width*S,src.height*S),Image.LANCZOS).filter(ImageFilter.UnsharpMask(2,50,2))
src=cv2.cvtColor(np.array(src),cv2.COLOR_RGB2BGR)
polys={'A':[(582,350),(650,342),(738,358),(738,440),(690,478),(588,466)],
 'B':[(572,292),(650,205),(705,195),(762,268),(705,340),(625,366),(552,312)],
 'C':[(908,350),(960,314),(1052,350),(1048,445),(990,488),(934,462)]}
pieces={}
for k,p in polys.items():
    pm=np.zeros(src.shape[:2],np.uint8); cv2.fillPoly(pm,[np.array(p,np.int32)],255)
    x,y,w,h=cv2.boundingRect(np.array(p,np.int32)); pad=20
    x0,y0=max(x-pad,0),max(y-pad,0); x1,y1=x+w+pad,y+h+pad
    gm=np.full(src.shape[:2],cv2.GC_BGD,np.uint8)
    gm[cv2.dilate(pm,np.ones((15,15),np.uint8))>0]=cv2.GC_PR_BGD
    gm[pm>0]=cv2.GC_PR_FGD
    gm[cv2.erode(pm,np.ones((41,41),np.uint8))>0]=cv2.GC_FGD
    bgm=np.zeros((1,65)); fgm=np.zeros((1,65))
    sub=src[y0:y1,x0:x1].copy(); sg=gm[y0:y1,x0:x1].copy()
    cv2.grabCut(sub,sg,None,bgm,fgm,6,cv2.GC_INIT_WITH_MASK)
    m=((sg==cv2.GC_FGD)|(sg==cv2.GC_PR_FGD)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m); m=((lab==1+np.argmax(st[1:,4]))*255).astype(np.uint8)
    m=cv2.erode(m,np.ones((3,3),np.uint8)); m=cv2.GaussianBlur(m,(0,0),1.5)
    ys,xs=np.where(m>8); pieces[k]=(sub[ys.min():ys.max()+1,xs.min():xs.max()+1],m[ys.min():ys.max()+1,xs.min():xs.max()+1])
canvas=np.zeros((800,1000,4),np.float32)
def put(k,ox,oy,rot=0):
    img,m=pieces[k]; h,w=m.shape; big=np.zeros((h+160,w+160,4),np.uint8); big[80:80+h,80:80+w]=np.dstack([img,m])
    M=cv2.getRotationMatrix2D(((w+160)/2,(h+160)/2),rot,1); big=cv2.warpAffine(big,M,(w+160,h+160),flags=cv2.INTER_CUBIC)
    hh,ww=big.shape[:2]; reg=canvas[oy:oy+hh,ox:ox+ww]; a=big[...,3:4]/255.0; ra=reg[...,3:4]/255.0
    oa=a+ra*(1-a); reg[...,:3]=(big[...,:3]*a+reg[...,:3]*ra*(1-a))/np.maximum(oa,1e-6); reg[...,3:4]=oa*255
put('B',60,40,-6); put('C',290,150,5); put('A',140,170,3)
c=canvas.astype(np.uint8); ys,xs=np.where(c[...,3]>8); c=c[ys.min():ys.max()+1,xs.min():xs.max()+1]
cv2.imwrite(H+'/assets/chips.png',c); print(c.shape)
