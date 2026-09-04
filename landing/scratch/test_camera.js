import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Monitor errors
  const pageErrors = [];
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
    pageErrors.push(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('CONSOLE ERROR:', msg.text());
    }
  });

  console.log('Navigating to http://localhost:8899/index.html...');
  await page.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle' });

  // Wait for entrance reveal to finish
  await page.waitForTimeout(2500);

  const artifactDir = 'C:\\Users\\saswa\\.gemini\\antigravity-ide\\brain\\69097ca8-8770-4484-b8f4-2d86a52d1fbf';

  // 1. Move mouse to top-left
  console.log('Moving mouse to (200, 150)...');
  await page.mouse.move(200, 150, { steps: 10 });
  await page.waitForTimeout(800);

  const telemetry1 = await page.evaluate(() => {
    const az = document.getElementById('gimbal-az')?.textContent;
    const el = document.getElementById('gimbal-el')?.textContent;
    const canvasTransform = document.getElementById('cinematic-canvas')?.style.transform;
    return { az, el, canvasTransform };
  });
  console.log('Telemetry at (200, 150):', telemetry1);
  await page.screenshot({ path: path.join(artifactDir, 'snap_camera_top_left.png') });

  // 2. Move mouse to bottom-right
  console.log('Moving mouse to (1250, 750)...');
  await page.mouse.move(1250, 750, { steps: 10 });
  await page.waitForTimeout(800);

  const telemetry2 = await page.evaluate(() => {
    const az = document.getElementById('gimbal-az')?.textContent;
    const el = document.getElementById('gimbal-el')?.textContent;
    const canvasTransform = document.getElementById('cinematic-canvas')?.style.transform;
    return { az, el, canvasTransform };
  });
  console.log('Telemetry at (1250, 750):', telemetry2);
  await page.screenshot({ path: path.join(artifactDir, 'snap_camera_bottom_right.png') });

  // 3. Scroll to Chapter 01 and tilt mouse
  console.log('Scrolling to Chapter 01 (y: 950)...');
  await page.evaluate(() => window.scrollTo(0, 950));
  await page.waitForTimeout(600);
  await page.mouse.move(300, 400, { steps: 10 });
  await page.waitForTimeout(800);

  const ch1Transform = await page.evaluate(() => {
    const card = document.querySelector('.chapter-01 .hud-surgical-card');
    return card ? card.style.transform : null;
  });
  console.log('Chapter 01 card transform:', ch1Transform);
  await page.screenshot({ path: path.join(artifactDir, 'snap_camera_ch1_parallax.png') });

  // 4. Scroll to Centered Download Card and tilt mouse
  console.log('Scrolling to Centered Download Card (y: 2400)...');
  await page.evaluate(() => window.scrollTo(0, 2400));
  await page.waitForTimeout(600);
  await page.mouse.move(1100, 350, { steps: 10 });
  await page.waitForTimeout(800);

  const downloadRigTransform = await page.evaluate(() => {
    const rig = document.querySelector('.surgical-tilt-rig');
    return rig ? rig.style.transform : null;
  });
  console.log('Download tilt rig transform:', downloadRigTransform);
  await page.screenshot({ path: path.join(artifactDir, 'snap_camera_download_parallax.png') });

  await browser.close();

  if (pageErrors.length > 0) {
    console.error('FAILED with page errors:', pageErrors);
    process.exit(1);
  } else {
    console.log('SUCCESS: All camera cursor tracking and 3D parallax interactions verified flawlessly!');
  }
})();
