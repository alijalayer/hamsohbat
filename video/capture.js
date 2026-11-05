// Captures real screens of the app to use inside the promo video.
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP = 'file:///' + path.resolve(__dirname, '../web/index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, 'shots');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  const shot = name => page.screenshot({ path: path.join(OUT, name + '.png') });

  await page.goto(APP);
  await page.evaluate(() => { localStorage.setItem('onboarded', 'true'); });
  await page.goto(APP);
  await page.evaluate(() => document.getElementById('splash').remove());
  await wait(900);
  await page.evaluate(() => document.querySelectorAll('#mood button')[1].click());
  await wait(700);
  await page.evaluate(() => document.getElementById('toast').remove());
  await shot('home');

  await page.evaluate(() => { startFlow(); document.querySelectorAll('.scene')[2].click(); });
  await wait(900); await shot('test');

  await page.evaluate(() => { document.querySelectorAll('.sw')[1].click(); document.querySelectorAll('#ages button')[1].click(); state.img = 'sea'; analyze(); });
  await wait(2400); await shot('analyzing');
  await wait(2400 + 3500); await shot('matching');

  // Example conversation showing live translation.
  await page.evaluate(() => {
    const p = { ...PEERS[0], s: 92 };
    state.peer = p; go('chat');
    document.getElementById('peerAv').style.background = p.c;
    document.getElementById('peerMeta').textContent = 'آنلاین · Deutsch · تطابق ۹۲٪';
    document.getElementById('quick').innerHTML = QUICK.map(q => `<button class="chip">${q}</button>`).join('');
    const m = document.getElementById('msgs'); m.innerHTML = '';
    const add = (cls, html) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html; m.append(d); };
    add('peer', 'سلام… خوشحالم که اینجایی. امشب چطور گذشت؟<small>Hallo… schön, dass du da bist. Wie war dein Abend?</small>');
    add('me', 'خیلی خسته‌ام. حس می‌کنم هیچ‌کس نمی‌فهمد.<small>→ Ich bin so müde. Ich habe das Gefühl, niemand versteht mich.</small>');
    add('peer', 'می‌فهمم، من هم آن شب‌ها را گذرانده‌ام. می‌خواهی بگویی امروز چه شد؟<small>Ich verstehe das, ich kenne solche Nächte. Magst du erzählen, was heute passiert ist?</small>');
  });
  await wait(900); await shot('chat');

  await page.evaluate(() => openSOS());
  await wait(1000); await shot('sos');

  await page.evaluate(() => { closeSheet(); go('breath'); startBreath(); });
  await wait(2600); await shot('breath');

  await browser.close();
  console.log('saved', fs.readdirSync(OUT).join(', '));
})();
