import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

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
  await page.waitForTimeout(2500);

  const artifactDir = 'C:\\Users\\saswa\\.gemini\\antigravity-ide\\brain\\69097ca8-8770-4484-b8f4-2d86a52d1fbf';

  // 1. Verify removals
  const removalChecks = await page.evaluate(() => {
    const pageText = document.body.innerText;
    return {
      hasCam01: pageText.includes('CAM 01') || pageText.includes('SURGICAL GIMBAL'),
      hasV010: pageText.includes('v0.1.0'),
      hasScrollToOperate: pageText.includes('SCROLL TO OPERATE') || !!document.getElementById('hero-scroll-cue'),
      hasRuntimeBiopsy: pageText.includes('INTERACTIVE RUNTIME BIOPSY') || !!document.getElementById('simulator'),
      gimbalHudElem: !!document.querySelector('.camera-gimbal-hud')
    };
  });

  console.log('REMOVAL CHECKS RESULT:', JSON.stringify(removalChecks, null, 2));

  // 2. Verify Footer elements
  const footerChecks = await page.evaluate(() => {
    const footer = document.querySelector('footer.reactor-zone');
    const footerCanvas = document.getElementById('footer-canvas');
    const threeCanvas = footerCanvas ? footerCanvas.querySelector('canvas') : null;
    const connectHeading = document.querySelector('.reactor-zone .glow-text')?.textContent?.trim();
    const socials = Array.from(document.querySelectorAll('.footer-sub-col a')).map(a => a.textContent.trim());
    const bottomBar = document.querySelector('.footer-bottom-bar')?.textContent?.trim();

    return {
      hasFooter: !!footer,
      hasFooterCanvas: !!footerCanvas,
      hasThreeCanvas: !!threeCanvas,
      connectHeading,
      socials,
      bottomBar
    };
  });

  console.log('FOOTER CHECKS RESULT:', JSON.stringify(footerChecks, null, 2));

  // 3. Take screenshot of Hero (showing clean interface without CAM 01, v0.1.0, scroll to operate)
  await page.screenshot({ path: path.join(artifactDir, 'snap_hero_cleaned.png') });
  console.log('Hero screenshot captured: snap_hero_cleaned.png');

  // 4. Scroll towards the bottom to capture footer reveal
  console.log('Scrolling down towards footer...');
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  console.log('Max scroll height:', maxScroll);

  // Scroll to 85% of page (transition before footer)
  await page.evaluate((scrollVal) => window.scrollTo(0, scrollVal * 0.88), maxScroll);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'snap_pre_footer_reveal.png') });
  console.log('Pre-footer reveal screenshot captured: snap_pre_footer_reveal.png');

  // Scroll to 100% of page (full footer reveal)
  await page.evaluate((scrollVal) => window.scrollTo(0, scrollVal), maxScroll);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, 'snap_footer_revealed.png') });
  console.log('Footer revealed screenshot captured: snap_footer_revealed.png');

  console.log('Total Page Errors:', pageErrors.length);
  await browser.close();
})();
