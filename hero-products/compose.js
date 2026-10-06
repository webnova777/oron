/*
 * ORON 히어로 · 제품 3개 마스크 리빌 합성 (캔버스)
 *
 * - 색 띠 3개(비스듬한 가로 띠)가 차례로 펼쳐지고,
 * - 제품이 하나씩 "자기 띠의 아래쪽 경계선 밖에서 올라와" 경계선 안으로 드러납니다. (마스크 리빌)
 * - 글자·오버레이는 넣지 않습니다. (영상 위에 HTML 로 따로 얹음)
 *
 * 사용: ORON_COMPOSE.render(ctx, images, t)   t = 0 ~ DURATION(초)
 *  - 캔버스 크기에 맞춰 레이아웃이 자동으로 정해집니다.
 *    · 가로 화면: 높이 1080 기준 좌표, 폭이 넓어지면 띠만 좌우로 늘어남
 *    · 세로 화면(모바일): 폭 700 기준 좌표, 띠와 제품이 위아래로 배치됨
 */
(function (root) {
  'use strict';

  var DURATION = 6.0;                         // 영상 길이(초)

  // ----- 색 (제품 패키지 색과 대비되게) -----
  var COLORS = {
    page:  '#FBFAF8',   // 띠가 펼쳐지기 전의 바탕
    band1: '#F9C73B',   // 위 띠: 노랑  (꿔바칩 = 빨강 제품)
    band2: '#E8D9BA',   // 가운데 띠: 베이지 (바나나 초콜릿 = 노랑 제품)
    band3: '#D32A2B'    // 아래 띠: 빨강 (참깨 크런치볼 = 베이지 제품)
  };

  // ----- 등장 타이밍(초): 제품이 하나씩 -----
  var TIMING = [
    { start: 1.0, dur: 1.6 },   // 꿔바칩
    { start: 2.3, dur: 1.6 },   // 바나나 초콜릿
    { start: 3.6, dur: 1.6 }    // 참깨 크런치볼
  ];

  // ----- 레이아웃: 캔버스 비율에 따라 좌표계·띠 경계선·제품 위치를 정함 -----
  function layout(cw, ch) {
    var L = {};
    if (cw / ch >= 1.15) {
      // 가로 화면: 높이를 1080 으로 보고, 폭은 비율대로 (넓은 화면은 띠가 좌우로 길어짐)
      L.scale = ch / 1080; L.vh = 1080; L.vw = cw / L.scale;
      var cx = L.vw / 2, k = 0.085;
      L.slope = Math.atan(k);
      L.lineA = function (x) { return 530 + k * (x - cx); };     // 위 경계: 오른쪽으로 내려감
      L.lineB = function (x) { return 760 - k * (x - cx); };     // 아래 경계: 오른쪽으로 올라감
      L.products = [
        { key: 'guoba',  x: cx + 440, h: 450, line: L.lineA, rot:  L.slope + 0.02, margin: 14 },
        { key: 'banana', x: cx - 440, h: 440, line: L.lineB, rot: -L.slope - 0.02, margin: 14 },
        { key: 'sesame', x: cx + 420, h: 455, line: null,    rot:  0.05,            margin: 52 }
      ];
    } else {
      // 세로 화면: 폭을 700 으로 보고, 높이는 비율대로
      L.scale = cw / 700; L.vw = 700; L.vh = ch / L.scale;
      var cx2 = 350, k2 = 0.12, vh = L.vh;
      L.slope = Math.atan(k2);
      L.lineA = function (x) { return vh * 0.36 + k2 * (x - cx2); };
      L.lineB = function (x) { return vh * 0.66 - k2 * (x - cx2); };
      L.products = [
        { key: 'guoba',  x: cx2 + 120, h: vh * 0.20, line: L.lineA, rot:  L.slope + 0.02, margin: 12 },
        { key: 'banana', x: cx2 - 120, h: vh * 0.21, line: L.lineB, rot: -L.slope - 0.02, margin: 12 },
        { key: 'sesame', x: cx2 + 100, h: vh * 0.22, line: null,    rot:  0.05,            margin: 36 }
      ];
    }
    return L;
  }

  // ----- 이징 -----
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function easeOutQuart(p) { return 1 - Math.pow(1 - p, 4); }
  function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }
  function seg(t, start, dur) { return clamp((t - start) / dur, 0, 1); }

  // ----- 종이 질감(고정 노이즈): 한 번만 만들어 재사용 -----
  var grain = null;
  function makeGrain() {
    var c = document.createElement('canvas'); c.width = 256; c.height = 256;
    var g = c.getContext('2d'), d = g.createImageData(256, 256), seed = 1234567;
    for (var i = 0; i < d.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;          // 항상 같은 결과가 나오는 난수
      var v = (seed >>> 24);
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    return c;
  }

  // ----- 띠 하나 그리기: 폴리곤 + 아래로 떨어지는 부드러운 그림자 -----
  function drawBand(g, L, color, top, bottom, reveal, fromRight) {
    if (reveal <= 0) return;
    var x0 = -300, x1 = L.vw + 300;
    g.save();
    // 좌→우(또는 우→좌)로 펼쳐지는 마스크
    var w = (L.vw + 600) * easeOutCubic(reveal);
    g.beginPath();
    if (fromRight) g.rect(x1 - w, -300, w + 1, L.vh + 600); else g.rect(x0, -300, w + 1, L.vh + 600);
    g.clip();
    g.beginPath();
    g.moveTo(x0, top(x0)); g.lineTo(x1, top(x1)); g.lineTo(x1, bottom(x1)); g.lineTo(x0, bottom(x0)); g.closePath();
    g.shadowColor = 'rgba(0,0,0,0.22)'; g.shadowBlur = 28 * L.scale; g.shadowOffsetY = 10 * L.scale;
    g.fillStyle = color; g.fill();
    g.restore();
  }

  function render(ctx, images, t) {
    var cv = ctx.canvas, L = layout(cv.width, cv.height);
    if (!grain) grain = makeGrain();
    ctx.save();
    ctx.setTransform(L.scale, 0, 0, L.scale, 0, 0);
    ctx.shadowColor = 'transparent';

    // 바탕
    ctx.fillStyle = COLORS.page; ctx.fillRect(-300, -300, L.vw + 600, L.vh + 600);

    // 색 띠: 아래 띠부터 깔고, 위 띠가 위에 겹침 (경계마다 그림자)
    var r1 = seg(t, 0.00, 0.9), r2 = seg(t, 0.18, 0.9), r3 = seg(t, 0.36, 0.9);
    drawBand(ctx, L, COLORS.band3, L.lineB, function () { return L.vh + 300; }, r3, true);
    drawBand(ctx, L, COLORS.band2, L.lineA, L.lineB, r2, false);
    drawBand(ctx, L, COLORS.band1, function () { return -300; }, L.lineA, r1, true);

    // 종이 질감 (화면 픽셀 기준으로 곱하기)
    if (r1 > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.restore();
    }

    // 제품: 자기 띠의 아래 경계선 위쪽에서만 보이도록 잘라서(마스크) 아래에서 올려 줌
    L.products.forEach(function (p, i) {
      var img = images[p.key];
      if (!img) return;
      var prog = easeOutQuart(seg(t, TIMING[i].start, TIMING[i].dur));
      if (prog <= 0) return;

      var h = p.h, w = img.width * h / img.height;
      var baseY = (p.line ? p.line(p.x) : L.vh) - p.margin;        // 최종 위치: 경계선 바로 위
      var rise = (1 - prog) * (h + 120);                             // 처음엔 경계선 아래에 숨어 있다가 올라옴

      ctx.save();
      // 마스크: 경계선 위쪽 영역만 보이게
      ctx.beginPath();
      if (p.line) { ctx.moveTo(-300, -300); ctx.lineTo(L.vw + 300, -300); ctx.lineTo(L.vw + 300, p.line(L.vw + 300)); ctx.lineTo(-300, p.line(-300)); }
      else { ctx.rect(-300, -300, L.vw + 600, L.vh + 300 + 300); }
      ctx.closePath(); ctx.clip();

      ctx.translate(p.x, baseY + rise);
      ctx.rotate(p.rot);
      ctx.shadowColor = 'rgba(0,0,0,0.30)'; ctx.shadowBlur = 34 * L.scale; ctx.shadowOffsetY = 18 * L.scale;
      ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.restore();
    });

    ctx.restore();
  }

  root.ORON_COMPOSE = { render: render, layout: layout, DURATION: DURATION };
})(typeof window !== 'undefined' ? window : this);
