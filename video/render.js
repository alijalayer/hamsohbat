// Renders scene.html frame by frame and encodes it with the score into an MP4.
// Usage: node render.js            -> hamsohbat-promo.mp4
//        node render.js preview    -> a few stills in frames/ for checking
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FPS = 30, DUR = 32;
const preview = process.argv[2] === 'preview';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.goto('file:///' + path.join(__dirname, 'scene.html').replace(/\\/g, '/'));
  await page.evaluate(() => window.ready);
  const frame = t => page.evaluate(t => { render(t); return document.getElementById('c').toDataURL('image/jpeg', 0.94).split(',')[1]; }, t);

  if (preview) {
    fs.mkdirSync(path.join(__dirname, 'frames'), { recursive: true });
    for (const t of [1.5, 3.6, 6, 8.2, 10.5, 12.5, 16.5, 20.5, 25, 30]) {
      fs.writeFileSync(path.join(__dirname, 'frames', `t${t}.jpg`), Buffer.from(await frame(t), 'base64'));
    }
    await browser.close(); console.log('preview frames written'); return;
  }

  const out = path.join(__dirname, 'hamsohbat-promo.mp4');
  const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', path.join(__dirname, 'music.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
    '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; ff.stderr.on('data', d => { err = (err + d).slice(-2000); });
  const total = FPS * DUR;
  for (let i = 0; i < total; i++) {
    const buf = Buffer.from(await frame(i / FPS), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  await browser.close();
  if (code !== 0) { console.error(err); process.exit(1); }
  console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(1) + ' MB');
})();
