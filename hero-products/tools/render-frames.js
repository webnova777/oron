// 합성 장면을 프레임 이미지(PNG)로 한 장씩 뽑습니다. (그다음 ffmpeg 가 mp4 / webp 로 변환)
// 사용: node tools/render-frames.js [출력폴더] [fps]      기본: out/png, 30fps
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'out', 'png'));
const FPS = Number(process.argv[3] || 30);
fs.mkdirSync(OUT, { recursive: true });

// 로컬 파일을 잠깐 서버로 열어 줌 (이미지 로딩용)
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end(); }
    const ext = path.extname(f);
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' }[ext] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://127.0.0.1:${port}/preview.html${process.env.GLOW ? '?glow=1' : ''}`);
  await page.waitForFunction('window.READY === true');
  const duration = await page.evaluate('ORON_COMPOSE.DURATION');
  const total = Math.round(duration * FPS) + 1;
  for (let i = 0; i < total; i++) {
    const data = await page.evaluate((t) => { window.drawAt(t); return document.getElementById('cv').toDataURL('image/png'); }, i / FPS);
    fs.writeFileSync(path.join(OUT, String(i + 1).padStart(4, '0') + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    if (i % 30 === 0) console.log('프레임', i + 1, '/', total);
  }
  await browser.close(); server.close();
  console.log('완료:', total, '장 →', OUT);
});
