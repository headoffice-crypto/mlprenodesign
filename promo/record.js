// MLP — Record the HTML promo preview to a video file.
//
// Loads http://127.0.0.1:8765/promo/ in a headless Chromium at 1920×1080,
// clicks "Démarrer la vidéo", records 111 s of playback, saves to promo/tmp/raw.webm.
//
// Run: node promo/record.js
// Then build.sh mixes audio and outputs promo/promo-final.mp4.

const { chromium } = require('playwright');
const path = require('path');

const URL       = process.env.PROMO_URL  || 'http://127.0.0.1:8765/promo/';
const OUT_DIR   = path.join(__dirname, 'tmp');
const DURATION  = 112_000;   // ms — playback is 110s plus a little buffer
const VIDEO_FPS = 30;

(async () => {
  console.log('==> Launching Chromium at 1920×1080');

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: OUT_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  console.log('==> Loading', URL);
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Wait briefly so all fonts + images settle
  await page.waitForTimeout(800);

  // Mute the audio element — Playwright doesn't capture audio anyway, and we mix
  // music in via FFmpeg later. Muting just keeps things tidy. Also flip the page
  // into recording mode so the HUD (progress bar, scene counter, controls) is
  // hidden in the captured frames.
  await page.evaluate(() => {
    const a = document.querySelector('#music');
    if (a) a.muted = true;
    document.body.classList.add('recording');
  });

  console.log('==> Clicking play button');
  await page.click('#play-btn');

  console.log(`==> Recording ${DURATION / 1000}s of playback`);
  await page.waitForTimeout(DURATION);

  console.log('==> Closing context (this writes the webm)');
  await context.close();
  await browser.close();

  // The video file is named randomly by Playwright; find the newest webm
  const fs = require('fs');
  const files = fs.readdirSync(OUT_DIR)
    .filter(f => f.endsWith('.webm'))
    .map(f => ({ name: f, time: fs.statSync(path.join(OUT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (!files.length) throw new Error('No webm produced');

  const src = path.join(OUT_DIR, files[0].name);
  const dst = path.join(OUT_DIR, 'raw.webm');
  fs.renameSync(src, dst);
  console.log('==> Saved', dst);
})().catch(err => { console.error(err); process.exit(1); });
