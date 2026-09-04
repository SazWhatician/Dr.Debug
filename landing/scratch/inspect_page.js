import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:8899/index.html...');
  await page.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle' });

  // Wait for preloader to finish
  await page.waitForTimeout(2500);

  const artifactDir = 'C:\\Users\\saswa\\.gemini\\antigravity-ide\\brain\\69097ca8-8770-4484-b8f4-2d86a52d1fbf';

  // Screenshot 1: Hero
  await page.screenshot({ path: path.join(artifactDir, 'snap_01_hero.png') });
  console.log('Saved snap_01_hero.png');

  // Scroll to Chapter 1
  await page.evaluate(() => window.scrollTo(0, 950));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, 'snap_02_ch1.png') });
  console.log('Saved snap_02_ch1.png');

  // Scroll to Chapter 2
  await page.evaluate(() => window.scrollTo(0, 1950));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, 'snap_03_ch2.png') });
  console.log('Saved snap_03_ch2.png');

  // Scroll to Centered Operating Room Download Card
  await page.evaluate(() => window.scrollTo(0, 2400));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, 'snap_04_download.png') });
  console.log('Saved snap_04_download.png');

  // Scroll to Docker Cockpit Section
  const dockerSection = page.locator('#docker');
  if (await dockerSection.count() > 0) {
    await dockerSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'snap_05_docker.png') });
    console.log('Saved snap_05_docker.png');
  }

  // Scroll to Simulator Section
  const simSection = page.locator('#simulator');
  if (await simSection.count() > 0) {
    await simSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'snap_06_simulator.png') });
    console.log('Saved snap_06_simulator.png');
  }

  // Scroll to Features Section
  const featSection = page.locator('#features');
  if (await featSection.count() > 0) {
    await featSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'snap_07_features.png') });
    console.log('Saved snap_07_features.png');
  }

  // Scroll to Install / Steps Section
  const installSection = page.locator('#install');
  if (await installSection.count() > 0) {
    await installSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'snap_08_install.png') });
    console.log('Saved snap_08_install.png');
  }

  // Scroll to Author Section
  const authorSection = page.locator('#author');
  if (await authorSection.count() > 0) {
    await authorSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'snap_09_author.png') });
    console.log('Saved snap_09_author.png');
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
})();
