// Rasterizes the SVG favicon + OG image into the PNG sizes the site needs.
// Run from /promo (where playwright is installed):  node render-icons.js
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'site');

const targets = [
    // favicon family
    { svg: 'favicon.svg',                            out: 'favicon-32.png',         w: 32,   h: 32   },
    { svg: 'favicon.svg',                            out: 'favicon-16.png',         w: 16,   h: 16   },
    { svg: 'favicon.svg',                            out: 'apple-touch-icon.png',   w: 180,  h: 180  },
    { svg: 'favicon.svg',                            out: 'icon-192.png',           w: 192,  h: 192  },
    { svg: 'favicon.svg',                            out: 'icon-512.png',           w: 512,  h: 512  },
    // OG share card
    { svg: 'css/js/assets/images/og-logo.svg',       out: 'css/js/assets/images/og-logo.png', w: 1200, h: 630 },
];

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM
            || require('playwright-core').chromium.executablePath()
    });
    const ctx = await browser.newContext({ deviceScaleFactor: 2 });

    for (const t of targets) {
        const svgAbs = path.join(ROOT, t.svg);
        const outAbs = path.join(ROOT, t.out);
        const svg = fs.readFileSync(svgAbs, 'utf8');

        const page = await ctx.newPage();
        await page.setViewportSize({ width: t.w, height: t.h });
        await page.setContent(
            `<!doctype html><html><head><meta charset="utf-8">
             <style>
                html,body{margin:0;padding:0;background:transparent}
                svg{display:block;width:${t.w}px;height:${t.h}px}
             </style>
             </head><body>${svg.replace(/width="\d+"/, `width="${t.w}"`).replace(/height="\d+"/, `height="${t.h}"`)}</body></html>`
        );
        // Give web fonts a moment (we use system serif fallback anyway)
        await page.waitForTimeout(150);
        const el = await page.$('svg');
        await el.screenshot({ path: outAbs, omitBackground: true });
        await page.close();
        const kb = (fs.statSync(outAbs).size / 1024).toFixed(1);
        console.log(`  ✓ ${t.out.padEnd(48)} ${t.w}×${t.h}  (${kb} KB)`);
    }

    await browser.close();
    console.log('Done.');
})();
