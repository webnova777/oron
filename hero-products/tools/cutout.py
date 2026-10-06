#!/usr/bin/env python3
"""
제품 사진 누끼(배경 제거) 스크립트
 - banana.jpg  : 순백 배경 → 가장자리에서 흰색을 따라 지우기
 - sesame-src.png : 연한 스튜디오 배경 → 채도/밝기 차이로 제품(파우치+낱개)만 남기기
결과는 hero-products/assets/*.png (투명 배경)
"""
import sys, os
import numpy as np, cv2

SRC = os.path.join(os.path.dirname(__file__), '..', 'src')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(OUT, exist_ok=True)


def soften(mask, blur=1.2, erode=1):
    """0/255 마스크를 살짝 줄이고(흰 테두리 방지) 부드럽게 만든다."""
    m = mask.copy()
    if erode:
        m = cv2.erode(m, np.ones((3, 3), np.uint8), iterations=erode)
    m = cv2.GaussianBlur(m, (0, 0), blur)
    return m


def save_rgba(bgr, alpha, name, pad=6):
    ys, xs = np.where(alpha > 8)
    y0, y1, x0, x1 = max(ys.min() - pad, 0), ys.max() + pad, max(xs.min() - pad, 0), xs.max() + pad
    rgba = np.dstack([bgr, alpha])[y0:y1, x0:x1]
    cv2.imwrite(os.path.join(OUT, name), rgba)
    print(name, rgba.shape[1], 'x', rgba.shape[0])


def banana():
    bgr = cv2.imread(os.path.join(SRC, 'banana.jpg'))
    h, w = bgr.shape[:2]
    # 흰색에 가까운 픽셀 = 배경 후보, 가장자리와 이어진 것만 진짜 배경
    near_white = (bgr.min(axis=2) > 244).astype(np.uint8)
    n, lab = cv2.connectedComponents(near_white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border)).astype(np.uint8) * 255
    fg = 255 - bg
    save_rgba(bgr, soften(fg), 'banana.png')


def sesame():
    bgr = cv2.imread(os.path.join(SRC, 'sesame-src.png'))
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    s, v = hsv[..., 1] / 255, hsv[..., 2] / 255
    # 배경은 채도가 낮고 매우 밝음. 제품은 베이지/갈색/붉은색이라 채도나 어둡기로 구분됨
    fg = ((s > 0.13) | (v < 0.80)).astype(np.uint8) * 255
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    # 큰 덩어리(파우치, 낱개)만 남기기
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
    keep = np.zeros_like(fg)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 4000:
            keep[lab == i] = 255
    # 구멍 메우기(내부 흰 글자 라벨 등)
    inv = 255 - keep
    n2, lab2 = cv2.connectedComponents((inv > 0).astype(np.uint8))
    border = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]]))) - {0}
    holes = ~np.isin(lab2, list(border)) & (inv > 0)
    keep[holes] = 255
    save_rgba(bgr, soften(keep, blur=1.5, erode=2), 'sesame.png')


if __name__ == '__main__':
    which = sys.argv[1:] or ['banana', 'sesame']
    for k in which:
        globals()[k]()
    # 꿔바칩은 이미 투명 배경이라 그대로 복사
    import shutil
    shutil.copy(os.path.join(SRC, 'guoba-red.png'), os.path.join(OUT, 'guoba-red.png'))
