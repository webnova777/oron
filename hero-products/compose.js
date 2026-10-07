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

  // ----- 색: 띠마다 [밝은 쪽, 진한 쪽] 두 톤으로 은은한 그라데이션 + 같은 계열의 한 톤 진한 글자색 -----
  var COLORS = {
    page: '#FBFAF8',                                   // 띠가 펼쳐지기 전의 바탕
    band1: { from: '#F9DAE4', to: '#F0BFD0', text: '#E9B1C4' },   // 위 띠: 핑크   (참깨 크런치볼 = 크래프트 봉지)
    band2: { from: '#DAF1E6', to: '#C2E5D4', text: '#B1D9C4' },   // 가운데 띠: 민트 (꿔바칩 = 노랑/빨강 봉지)
    band3: { from: '#CCE2F0', to: '#B1CFE4', text: '#9EC2DA' }    // 아래 띠: 하늘 (바나나 초콜릿 = 노랑 봉지)
  };
  if (root.ORON_COLORS) for (var ck in root.ORON_COLORS) COLORS[ck] = root.ORON_COLORS[ck];   // 미리보기용: 띠 색 덮어쓰기

  // ----- 띠 위에 들어가는 영어 제품명 (위 띠부터) -----
  var NAMES = [['SESAME CRUNCH BALLS'], ['GUOBA CHIPS'], ['BANANA CHOCOLATE']];

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
      L.names = [   // 제품명 글자: x,y=중심, rot=기울기, w=가장 긴 줄의 폭(px), lines=줄바꿈
        { x: cx - 20, y: 245, rot: L.slope, w: 680, lines: ['SESAME', 'CRUNCH BALLS'] },
        { x: cx + 135, y: 565, rot: 0, w: 470 },
        { x: cx - 48, y: 890, rot: -L.slope, w: 420, lines: ['BANANA', 'CHOCOLATE'] }
      ];
      L.items = [
        // 위 띠: 참깨 크런치볼 봉지(오른쪽) + 과자 실물(왼쪽)
        { key: 'sesame',  kind: 'rise', t: T.yellowBag, x: cx + 430, h: 410, line: L.lineA, rot: L.slope + 0.02, hide: 0.16 },
        { key: 'balls',   kind: 'pop',  t: T.chips,     x: cx - 560, y: L.lineA(cx - 560) - 85, h: 215, rot: -0.05 },
        // 가운데 띠: 꿔바칩 봉지 2개(왼쪽) + 과자 실물(오른쪽)
        { key: 'guobaPair', kind: 'rise', t: T.bananaBag, x: cx - 390, h: 440, line: L.lineB, rot: -L.slope - 0.02, hide: 0.15 },
        { key: 'chips',   kind: 'pop',  t: T.candy,     x: cx + 565, y: L.lineB(cx + 565) - 55, h: 175, rot: 0.06 },
        // 아래 띠: 바나나 초콜릿 봉지(오른쪽) + 바나나 과자(왼쪽)
        { key: 'banana',  kind: 'rise', t: T.sesameBag, x: cx + 410, h: 430, line: null,    rot: 0.05,            hide: 0.16 },
        { key: 'candy',   kind: 'pop',  t: T.balls,     x: cx - 440, y: vh - 130, h: 160, rot: -0.06 }
      ];
    } else {
      // 세로 화면: 폭을 700 으로 보고, 높이는 비율대로
      L.scale = cw / 700; L.vw = 700; L.vh = ch / L.scale;
      var cx2 = 350, vh2 = L.vh;
      L.slope = Math.atan(k);
      L.lineA = function (x) { return vh2 * 0.34 + k * (x - cx2); };
      L.lineB = function (x) { return vh2 * 0.67 - k * (x - cx2); };
      L.names = [
        { x: cx2 - 50, y: vh2 * 0.075, rot: L.slope * 0.4, w: 500, lines: ['SESAME', 'CRUNCH BALLS'] },
        { x: cx2 - 85, y: vh2 * 0.385, rot: 0, w: 430 },
        { x: cx2, y: L.lineB(cx2) + vh2 * 0.05, rot: -L.slope, w: 560 }
      ];
      L.items = [
      { key: 'sesame',  kind: 'rise', t: T.yellowBag, x: cx2 + 48, h: Math.min(vh2 * 0.29, 400), line: L.lineA, rot: L.slope + 0.02, hide: 0.16 },
      { key: 'balls',   kind: 'pop',  t: T.chips,     x: cx2 - 235, y: L.lineA(cx2 - 235) - vh2 * 0.045, h: vh2 * 0.085, rot: -0.05 },
      { key: 'guobaPair', kind: 'rise', t: T.bananaBag, x: cx2 - 6, h: Math.min(vh2 * 0.27, 372), line: L.lineB, rot: -L.slope - 0.02, hide: 0.14 },
      { key: 'chips',   kind: 'pop',  t: T.candy,     x: cx2 + 200, y: L.lineA(cx2 + 200) + vh2 * 0.055, h: vh2 * 0.07, rot: 0.06 },
      { key: 'banana',  kind: 'rise', t: T.sesameBag, x: cx2 + 50, h: Math.min(vh2 * 0.26, 400), line: null,    rot: 0.05,            hide: 0.16 },
      { key: 'candy',   kind: 'pop',  t: T.balls,     x: cx2 - 215, y: vh2 - vh2 * 0.09, h: vh2 * 0.07, rot: -0.06 }
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

  // ----- 띠 하나 그리기: 폴리곤 + 두 톤 그라데이션 + 부드러운 세로 빛줄기 + 아래로 떨어지는 그림자 -----
  function drawBand(g, L, band, top, bottom, reveal, fromRight) {
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
    var cxm = L.vw / 2, yt = Math.max(top(cxm), 0), yb = Math.min(bottom(cxm), L.vh);
    var gr = g.createLinearGradient(0, yt, L.vw, yb);               // 왼쪽 위(밝음) → 오른쪽 아래(조금 진함)
    gr.addColorStop(0, band.from); gr.addColorStop(1, band.to);
    g.shadowColor = 'rgba(0,0,0,0.16)'; g.shadowBlur = 28 * L.scale; g.shadowOffsetY = 10 * L.scale;
    g.fillStyle = gr; g.fill();
    g.shadowColor = 'transparent'; g.clip();
    // 커튼처럼 은은하게 이어지는 세로 빛줄기
    var st = g.createLinearGradient(0, 0, L.vw, 0), pos = [0, 0.07, 0.15, 0.27, 0.36, 0.5, 0.61, 0.74, 0.85, 0.94, 1];
    for (var i = 0; i < pos.length; i++) st.addColorStop(pos[i], i % 2 ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,0.20)');
    g.fillStyle = st; g.fillRect(x0, -300, x1 - x0, L.vh + 600);
    g.restore();
  }

  // ----- 영어 제품명: 띠 색보다 아주 살짝 진한 색, 띠의 기울기에 맞춰 크게 (제품 뒤에 깔림) -----
  function drawName(g, L, band, top, bottom, lines, cx, cy, rot, width, reveal) {
    if (reveal <= 0) return;
    var fam = 'sans-serif';
    try { fam = getComputedStyle(g.canvas).fontFamily || fam; } catch (e) {}
    g.save();
    var x0 = -300, x1 = L.vw + 300;                                   // 자기 띠 안쪽에서만 보이도록 자름
    g.beginPath(); g.moveTo(x0, top(x0)); g.lineTo(x1, top(x1)); g.lineTo(x1, bottom(x1)); g.lineTo(x0, bottom(x0)); g.closePath(); g.clip();
    g.globalAlpha = clamp((reveal - 0.3) / 0.7, 0, 1);
    g.translate(cx, cy); g.rotate(rot);
    var size = 100, widest = 0;
    g.font = '800 ' + size + 'px ' + fam;
    lines.forEach(function (t) { widest = Math.max(widest, g.measureText(t).width); });
    size = size * width / widest;                                     // 가장 긴 줄의 폭이 width 가 되도록
    g.font = '800 ' + size + 'px ' + fam;
    g.fillStyle = band.text; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(function (t, i) { g.fillText(t, 0, (i - (lines.length - 1) / 2) * size * 1.02); });
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

    // 영어 제품명 (띠 위, 제품 뒤)
    var N = L.names, up = function () { return -300; }, down = function () { return L.vh + 300; };
    drawName(ctx, L, COLORS.band1, up, L.lineA, N[0].lines || NAMES[0], N[0].x, N[0].y, N[0].rot, N[0].w, r1);
    drawName(ctx, L, COLORS.band2, L.lineA, L.lineB, N[1].lines || NAMES[1], N[1].x, N[1].y, N[1].rot, N[1].w, r2);
    drawName(ctx, L, COLORS.band3, L.lineB, down, N[2].lines || NAMES[2], N[2].x, N[2].y, N[2].rot, N[2].w, r3);

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
