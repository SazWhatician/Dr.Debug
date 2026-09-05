const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(__dirname, '..', 'landing', reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

server.listen(3456, async () => {
  console.log('Local server running on port 3456');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  try {
    await page.goto('http://localhost:3456', { waitUntil: 'domcontentloaded' });
    console.log('Page loaded, waiting for preloader...');
    await page.waitForSelector('#barba-preloader', { state: 'detached', timeout: 8000 });
    console.log('Preloader dismissed successfully!');

    await page.waitForTimeout(600);

    console.log('Clicking nav Download button...');
    await page.click('#nav-btn-download');

    await page.waitForTimeout(2200);

    const cardState = await page.evaluate(() => {
      const card = document.getElementById('center-download-card');
      const star = document.getElementById('dl-github-star-wrap');
      const count = document.getElementById('github-star-count');
      return {
        cardActive: card ? card.classList.contains('is-active') : false,
        cardOpacity: card ? window.getComputedStyle(card).opacity : null,
        starOpacity: star ? window.getComputedStyle(star).opacity : null,
        starText: count ? count.textContent : null,
        scrollY: window.scrollY
      };
    });
    console.log('Download scene state:', cardState);

    await page.screenshot({ path: path.join(__dirname, 'star-button-normal.png'), fullPage: false });
    console.log('Saved star-button-normal.png');

    const starBtn = await page.$('#btn-github-star');
    if (starBtn) {
      await starBtn.hover();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(__dirname, 'star-button-hover.png'), fullPage: false });
      console.log('Saved star-button-hover.png');
    }
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
    server.close();
    process.exit(0);
  }
});
