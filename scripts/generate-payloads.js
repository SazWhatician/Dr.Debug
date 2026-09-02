import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const releaseDir = path.resolve(root, 'release');
const landingAssetsDir = path.resolve(root, 'landing/assets');
const releaseAssetsDir = path.resolve(root, 'release/assets');

fs.mkdirSync(landingAssetsDir, { recursive: true });
fs.mkdirSync(releaseAssetsDir, { recursive: true });

// 1. Extension Zip as Base64 payload
const zipPath = path.resolve(releaseDir, 'dr-debug-extension.zip');
if (fs.existsSync(zipPath)) {
  const zipBuf = fs.readFileSync(zipPath);
  const zipB64 = zipBuf.toString('base64');
  const payloadJs = `window.DR_DEBUG_EXTENSION_BASE64 = "${zipB64}";\n`;
  fs.writeFileSync(path.resolve(landingAssetsDir, 'extension-payload.js'), payloadJs, 'utf-8');
  fs.writeFileSync(path.resolve(releaseAssetsDir, 'extension-payload.js'), payloadJs, 'utf-8');
  console.log('✅ Generated landing/assets/extension-payload.js (' + (zipB64.length / 1024 / 1024).toFixed(2) + ' MB)');
}

// 2. Standalone Minified JS payload
const jsPath = path.resolve(releaseDir, 'dr-debug.standalone.min.js');
if (fs.existsSync(jsPath)) {
  const jsContent = fs.readFileSync(jsPath, 'utf-8');
  const payloadJs = `window.DR_DEBUG_STANDALONE_CODE = ${JSON.stringify(jsContent)};\n`;
  fs.writeFileSync(path.resolve(landingAssetsDir, 'standalone-payload.js'), payloadJs, 'utf-8');
  fs.writeFileSync(path.resolve(releaseAssetsDir, 'standalone-payload.js'), payloadJs, 'utf-8');
  console.log('✅ Generated landing/assets/standalone-payload.js (' + (jsContent.length / 1024).toFixed(2) + ' KB)');
}
