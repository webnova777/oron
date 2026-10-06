/*
 * ORON 히어로 · 제품 + 과자 마스크 리빌 합성 (캔버스)
 *
 * - 색 띠 3개(비스듬한 가로 띠)가 차례로 펼쳐지고,
 * - 띠마다 "패키지"가 자기 띠의 아래쪽 경계선 밖에서 올라와 드러나며(마스크 리빌, 아래쪽은 살짝 가려진 채 멈춤),
 * - 곧이어 반대쪽에 "과자 실물"이 뿅 하고 튀어나옵니다.
 * - 글자·오버레이는 넣지 않습니다. (영상 위에 HTML 로 따로 얹음)
 *
 * 사용: ORON_COMPOSE.render(ctx, images, t)   t = 0 ~ DURATION(초)
 *  - 캔버스 크기에 맞춰 레이아웃이 자동으로 정해집니다.
 *    · 가로 화면: 1920 x 1080 기준 좌표 (더 넓은 화면은 띠만 좌우로 늘어남)
 *    · 세로 화면(모바일): 폭 700 기준 좌표, 띠와 제품이 위아래로 배치됨
 */
(function (root) {
  'use strict';

  var DURATION = 6.6;                         // 영상 길이(초)

  // ----- 색 (제품 패키지 색과 대비되게) -----
  var COLORS = {
    page:  '#FBFAF8',   // 띠가 펼쳐지기 전의 바탕
    band1: '#F9C73B',   // 위 띠: 노랑  (꿔바칩 = 빨강/노랑 봉지)
    band2: '#E8D9BA',   // 가운데 띠: 베이지 (바나나 초콜릿 = 노랑 제품)
    band3: '#D32A2B'    // 아래 띠: 빨강 (참깨 크런치볼 = 베이지 제품)
  };

  // ----- 등장 타이밍(초): [시작, 길이] -----
  var T = {
    yellowBag: [0.90, 1.30], redBag: [1.10, 1.30], chips:  [2.20, 0.65],     // 위 띠
    bananaBag: [2.60, 1.30], candy:  [3.70, 0.65],                            // 가운데 띠
    sesameBag: [4.30, 1.30], balls:  [5.40, 0.65]                             // 아래 띠
  };

  // ----- 레이아웃: 캔버스 비율에 따라 좌표계·띠 경계선·제품 위치를 정함 -----
  //  rise : 패키지. 자기 띠의 아래쪽 경계선(line) 위쪽에서만 보이며 아래에서 올라옴 (line=null 이면 화면 아래)
  //  pop  : 과자 실물. 마스크 없이 제자리에서 뿅 하고 커지며 나타남 (y = 중심 높이)
  function layout(cw, ch) {
    var L = {}, k = 0.15;                       // k: 경계선 기울기 (약 8.5°)
    if (cw / ch >= 1.15) {
      // 가로 화면: 16:9 보다 넓으면 높이 기준(1080), 좁으면 폭 기준(1920)으로 맞춤
      L.scale = (cw / ch >= 16 / 9) ? ch / 1080 : cw / 1920;
      L.vw = cw / L.scale; L.vh = ch / L.scale;
      var cx = L.vw / 2, vh = L.vh, yA = vh * 0.375, yB = vh * 0.685;
      L.slope = Math.atan(k);
      L.lineA = function (x) { return yA + k * (x - cx); };        // 위 경계: 오른쪽으로 내려감
      L.lineB = function (x) { return yB - k * (x - cx); };        // 아래 경계: 오른쪽으로 올라감
      L.items = [
        // 위 띠: 꿔바칩 봉지 2개(오른쪽) + 과자 실물(왼쪽)
        { key: 'guobaPair', kind: 'rise', t: T.yellowBag, x: cx + 470, h: 500, line: L.lineA, rot: L.slope + 0.02, hide: 0.15 },
        { key: 'chips',   kind: 'pop',  t: T.chips,     x: cx - 600, y: L.lineA(cx - 600) - 70, h: 260, rot: -0.10 },
        // 가운데 띠: 바나나 봉지(왼쪽) + 바나나 과자(오른쪽)
        { key: 'banana',  kind: 'rise', t: T.bananaBag, x: cx - 380, h: 560, line: L.lineB, rot: -L.slope - 0.02, hide: 0.15 },
        { key: 'candy',   kind: 'pop',  t: T.candy,     x: cx + 360, y: (L.lineA(cx + 360) + L.lineB(cx + 360)) / 2 - 55, h: 185, rot: 0.06 },
        // 아래 띠: 참깨 봉지(오른쪽) + 참깨 과자 실물(왼쪽)
        { key: 'sesame',  kind: 'rise', t: T.sesameBag, x: cx + 430, h: 560, line: null,    rot: 0.05,            hide: 0.16 },
        { key: 'balls',   kind: 'pop',  t: T.balls,     x: cx - 470, y: vh - 150, h: 250, rot: -0.05 }
      ];
    } else {
      // 세로 화면: 폭을 700 으로 보고, 높이는 비율대로
      L.scale = cw / 700; L.vw = 700; L.vh = ch / L.scale;
      var cx2 = 350, vh2 = L.vh;
      L.slope = Math.atan(k);
      L.lineA = function (x) { return vh2 * 0.34 + k * (x - cx2); };
      L.lineB = function (x) { return vh2 * 0.67 - k * (x - cx2); };
      L.items = [
        { key: 'guobaPair', kind: 'rise', t: T.yellowBag, x: cx2 + 100, h: vh2 * 0.2, line: L.lineA, rot: L.slope + 0.02, hide: 0.15 },
        { key: 'chips',   kind: 'pop',  t: T.chips,     x: cx2 - 200, y: L.lineA(cx2 - 200) - 6, h: vh2 * 0.095, rot: -0.10 },
        { key: 'banana',  kind: 'rise', t: T.bananaBag, x: cx2 - 70, h: vh2 * 0.25, line: L.lineB, rot: -L.slope - 0.02, hide: 0.15 },
        { key: 'candy',   kind: 'pop',  t: T.candy,     x: cx2 + 160, y: (L.lineA(cx2 + 160) + L.lineB(cx2 + 160)) / 2 + 20, h: vh2 * 0.082, rot: 0.06 },
        { key: 'sesame',  kind: 'rise', t: T.sesameBag, x: cx2 + 125, h: vh2 * 0.25, line: null,    rot: 0.05,            hide: 0.16 },
        { key: 'balls',   kind: 'pop',  t: T.balls,     x: cx2 - 200, y: vh2 - vh2 * 0.07, h: vh2 * 0.092, rot: -0.05 }
      ];
    }
    return L;
  }

  // ----- 이징 -----
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function easeOutQuart(p) { return 1 - Math.pow(1 - p, 4); }
  function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }
  function easeOutBack(p) { var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }  // 살짝 튀어 오르는 효과
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

  // ----- 패키지: 경계선 위쪽에서만 보이도록 잘라서(마스크) 아래에서 올려 줌 -----
  function drawRise(ctx, L, img, p) {
    var prog = easeOutQuart(seg(L.time, p.t[0], p.t[1]));
    if (prog <= 0) return;
    var h = p.h, w = img.width * h / img.height;
    var baseY = (p.line ? p.line(p.x) : L.vh) + p.hide * h;       // 최종 위치: 아래쪽 일부가 경계선 아래로 들어가 가려짐
    var rise = (1 - prog) * (h + 80);                              // 처음엔 경계선 아래에 완전히 숨어 있다가 올라옴
    ctx.save();
    ctx.beginPath();
    if (p.line) { ctx.moveTo(-300, -300); ctx.lineTo(L.vw + 300, -300); ctx.lineTo(L.vw + 300, p.line(L.vw + 300)); ctx.lineTo(-300, p.line(-300)); }
    else { ctx.rect(-300, -300, L.vw + 600, L.vh + 600); }
    ctx.closePath(); ctx.clip();
    ctx.translate(p.x, baseY + rise);
    ctx.rotate(p.rot);
    ctx.shadowColor = 'rgba(0,0,0,0.30)'; ctx.shadowBlur = 34 * L.scale; ctx.shadowOffsetY = 18 * L.scale;
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }

  // ----- 과자 실물: 제자리에서 뿅! (작게 → 살짝 커졌다가 → 제 크기) -----
  function drawPop(ctx, L, img, p) {
    var prog = seg(L.time, p.t[0], p.t[1]);
    if (prog <= 0) return;
    var s = Math.max(0, easeOutBack(prog));
    var h = p.h, w = img.width * h / img.height;
    ctx.save();
    ctx.globalAlpha = clamp(prog * 5, 0, 1);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot + (1 - prog) * 0.5);                          // 돌면서 튀어나옴
    ctx.scale(s, s);
    ctx.shadowColor = 'rgba(0,0,0,0.30)'; ctx.shadowBlur = 26 * L.scale; ctx.shadowOffsetY = 12 * L.scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function render(ctx, images, t) {
    var cv = ctx.canvas, L = layout(cv.width, cv.height);
    L.time = t;
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

    // 패키지와 과자: 배열 순서대로 겹쳐 그림
    L.items.forEach(function (p) {
      var img = images[p.key];
      if (!img) return;
      if (p.kind === 'rise') drawRise(ctx, L, img, p); else drawPop(ctx, L, img, p);
    });

    ctx.restore();
  }

  root.ORON_COMPOSE = { render: render, layout: layout, DURATION: DURATION, KEYS: ['guobaPair', 'chips', 'banana', 'candy', 'sesame', 'balls'] };
})(typeof window !== 'undefined' ? window : this);
