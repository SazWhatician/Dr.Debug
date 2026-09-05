import esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const root = process.cwd()
const releaseDir = path.resolve(root, 'release')
const extDistDir = path.resolve(root, 'packages/extension/dist')

async function packageRelease() {
  console.log('🚀 Packaging Dr. Debug for Distribution & Download...')
  console.log('👨‍💻 Author: Saswat Mohanty (@SazWhatician)')
  console.log('🔗 GitHub: https://github.com/SazWhatician')
  console.log('🔗 LinkedIn: https://www.linkedin.com/in/saswat-mohanty-0a4549331/\n')

  // 1. Prepare release directory
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true, force: true })
  }
  fs.mkdirSync(releaseDir, { recursive: true })

  // 2. Build TypeScript packages
  console.log('📦 Step 1/5: Compiling TypeScript packages...')
  execSync('npx tsc -b tsconfig.build.json', { stdio: 'inherit', cwd: root })

  // 3. Build Chrome Extension
  console.log('\n🧩 Step 2/5: Building Chrome Extension...')
  execSync('node scripts/build-extension.js', { stdio: 'inherit', cwd: root })

  // Copy extension to release/chrome-extension
  const releaseExtDir = path.resolve(releaseDir, 'chrome-extension')
  function copyRecursive(src, dest) {
    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dest, { recursive: true })
      for (const file of fs.readdirSync(src)) {
        copyRecursive(path.join(src, file), path.join(dest, file))
      }
    } else {
      fs.copyFileSync(src, dest)
    }
  }
  copyRecursive(extDistDir, releaseExtDir)
  console.log(`✅ Unpacked extension copied to: ${releaseExtDir}`)

  // Clean compiler artifacts from releaseExtDir so user gets only production runtime files
  function cleanExtensionDir(dir) {
    for (const item of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, item)
      if (!fs.existsSync(fullPath)) continue
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        if (item === 'devtools' || item === 'sourcemaps') {
          fs.rmSync(fullPath, { recursive: true, force: true })
        } else if (item === 'icons') {
          const drdebugIcon = path.join(fullPath, 'drdebug.png')
          if (fs.existsSync(drdebugIcon)) fs.unlinkSync(drdebugIcon)
        } else {
          cleanExtensionDir(fullPath)
        }
      } else {
        if (
          item.endsWith('.d.ts') ||
          item.endsWith('.d.ts.map') ||
          item.endsWith('.js.map') ||
          item === 'index.js' ||
          item === 'bridgeProtocol.js' ||
          item === 'BridgeLLMClient.js'
        ) {
          fs.unlinkSync(fullPath)
        }
      }
    }
  }
  cleanExtensionDir(releaseExtDir)

  // 3b. Create 1-click launcher scripts for Docker bridge
  const batContent = `@echo off
echo ===================================================
echo 🩺 Starting Dr. Debug Host Docker Bridge...
echo 👨‍💻 Created by Saswat Mohanty (@SazWhatician)
echo 🔗 https://github.com/SazWhatician
echo ===================================================
echo.
npx -y @dr-debug/mcp
pause
`
  const shContent = `#!/usr/bin/env bash
echo "==================================================="
echo "🩺 Starting Dr. Debug Host Docker Bridge..."
echo "👨‍💻 Created by Saswat Mohanty (@SazWhatician)"
echo "🔗 https://github.com/SazWhatician"
echo "==================================================="
echo ""
npx -y @dr-debug/mcp
`
  fs.writeFileSync(path.resolve(releaseDir, 'start-docker-bridge.bat'), batContent, 'utf-8')
  fs.writeFileSync(path.resolve(releaseDir, 'start-docker-bridge.sh'), shContent, 'utf-8')
  fs.writeFileSync(path.resolve(releaseExtDir, 'start-docker-bridge.bat'), batContent, 'utf-8')
  fs.writeFileSync(path.resolve(releaseExtDir, 'start-docker-bridge.sh'), shContent, 'utf-8')

  // 4. Create ZIP archive of Chrome Extension
  console.log('\n🗜️ Step 3/5: Compressing Chrome Extension into downloadable ZIP...')
  const zipPath = path.resolve(releaseDir, 'dr-debug-extension.zip')
  try {
    // Use PowerShell Compress-Archive on Windows
    execSync(
      `powershell -Command "Compress-Archive -Path '${releaseExtDir}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'inherit' }
    )
    console.log(`✅ Extension ZIP archive created: ${zipPath}`)
  } catch (err) {
    console.warn('⚠️ Could not run Compress-Archive; continuing with unpacked folder.', err)
  }

  // 5. Build Standalone In-Browser JS Bundles
  console.log('\n🌐 Step 4/5: Bundling Standalone In-Browser Script (UMD/IIFE)...')
  const standaloneEntry = path.resolve(root, 'packages/dr-debug/src/standalone.ts')

  // Unminified standalone bundle
  await esbuild.build({
    entryPoints: [standaloneEntry],
    bundle: true,
    format: 'iife',
    globalName: 'DrDebugBundle',
    target: ['chrome90', 'firefox90', 'safari14', 'edge90'],
    alias: {
      '@dr-debug/controller': path.resolve(root, 'packages/controller/src/index.ts'),
      '@dr-debug/llms': path.resolve(root, 'packages/llms/src/index.ts'),
      '@dr-debug/core': path.resolve(root, 'packages/core/src/index.ts'),
      '@dr-debug/ui': path.resolve(root, 'packages/ui/src/index.ts')
    },
    banner: {
      js: `/**
 * 🩺 Dr. Debug — Autonomous In-Browser AI Debugging & Observability Agent
 * Created by Saswat Mohanty (@SazWhatician)
 * GitHub: https://github.com/SazWhatician
 * LinkedIn: https://www.linkedin.com/in/saswat-mohanty-0a4549331/
 */`
    },
    outfile: path.resolve(releaseDir, 'dr-debug.standalone.js')
  })
  console.log(`✅ Standalone script: ${path.resolve(releaseDir, 'dr-debug.standalone.js')}`)

  // Minified standalone bundle
  await esbuild.build({
    entryPoints: [standaloneEntry],
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'DrDebugBundle',
    target: ['chrome90', 'firefox90', 'safari14', 'edge90'],
    alias: {
      '@dr-debug/controller': path.resolve(root, 'packages/controller/src/index.ts'),
      '@dr-debug/llms': path.resolve(root, 'packages/llms/src/index.ts'),
      '@dr-debug/core': path.resolve(root, 'packages/core/src/index.ts'),
      '@dr-debug/ui': path.resolve(root, 'packages/ui/src/index.ts')
    },
    banner: {
      js: `/*! Dr. Debug | (c) Saswat Mohanty (@SazWhatician) | https://github.com/SazWhatician | LinkedIn: https://www.linkedin.com/in/saswat-mohanty-0a4549331/ */`
    },
    outfile: path.resolve(releaseDir, 'dr-debug.standalone.min.js')
  })
  console.log(`✅ Minified script: ${path.resolve(releaseDir, 'dr-debug.standalone.min.js')}`)

  // 6. Build NPM tarball
  console.log('\n📦 Step 5/5: Generating NPM package tarball...')
  try {
    const drDebugPkgDir = path.resolve(root, 'packages/dr-debug')
    const packOutput = execSync('npm pack', { cwd: drDebugPkgDir, encoding: 'utf-8' }).trim()
    const generatedTgz = path.resolve(drDebugPkgDir, packOutput)
    if (fs.existsSync(generatedTgz)) {
      const destTgz = path.resolve(releaseDir, packOutput)
      fs.renameSync(generatedTgz, destTgz)
      console.log(`✅ NPM Tarball: ${destTgz}`)
    }
  } catch (err) {
    console.warn('⚠️ npm pack skipped:', err.message)
  }

  // 7. Write DOWNLOAD_GUIDE.md
  const downloadGuide = `# 🩺 Dr. Debug — Downloadable Distribution Assets

> **Created by Saswat Mohanty ([@SazWhatician](https://github.com/SazWhatician))**  
> 🔗 **GitHub:** [https://github.com/SazWhatician](https://github.com/SazWhatician)  
> 💼 **LinkedIn:** [https://www.linkedin.com/in/saswat-mohanty-0a4549331/](https://www.linkedin.com/in/saswat-mohanty-0a4549331/)

All pre-built, ready-to-run release assets for **Dr. Debug** are compiled in this directory.

---

## 📁 Available Downloadable Artifacts

| Asset | Description | Quick Start |
|:---|:---|:---|
| **[\`dr-debug-extension.zip\`](./dr-debug-extension.zip)** | Pre-packaged Chrome DevTools Extension (ZIP) | Extract and load in \`chrome://extensions\` (Developer Mode) |
| **[\`chrome-extension/\`](./chrome-extension/)** | Unpacked Chrome Extension Folder | Point Chrome directly to this folder via "Load unpacked" |
| **[\`dr-debug.standalone.min.js\`](./dr-debug.standalone.min.js)** | Single-file zero-dependency in-browser bundle (minified) | Drop into any HTML with \`<script src="dr-debug.standalone.min.js"></script>\` |
| **[\`dr-debug.standalone.js\`](./dr-debug.standalone.js)** | Development readable bundle with source maps & comments | For local debugging or embedding |
| **\`dr-debug-*.tgz\`** | Standard NPM Package Tarball | Install with \`npm install ./dr-debug-0.1.0.tgz\` |

---

## 🚀 1-Click Installation Guides

### Method 1: Chrome DevTools Extension (Recommended for zero code changes)
1. Download **\`dr-debug-extension.zip\`** and unzip it (or use the **\`chrome-extension/\`** folder directly).
2. Open Google Chrome, navigate to \`chrome://extensions\`.
3. Toggle on **"Developer mode"** (top right corner).
4. Click **"Load unpacked"** and select the \`chrome-extension/\` directory.
5. Open Chrome DevTools (\`F12\`) on any tab — you will see the dedicated **"🩺 Dr. Debug"** panel!

---

### Method 2: Single-Line HTML \`<script>\` Tag (Any website / web app)
Drop **\`dr-debug.standalone.min.js\`** into your project's public directory, and include it in your \`index.html\`:

\`\`\`html
<!-- Add to <head> or bottom of <body> -->
<script src="/dr-debug.standalone.min.js"></script>
\`\`\`

Or configure your AI provider directly via attributes:
\`\`\`html
<script src="/dr-debug.standalone.min.js" 
        data-model="openai/gpt-oss-120b" 
        data-api-key="gsk_..."></script>
\`\`\`

The Dr. Debug floating pill HUD will instantly appear in the bottom-right corner!

---

### Method 3: NPM Package (React / Next.js / Vue / Svelte)
\`\`\`bash
npm install dr-debug
\`\`\`

\`\`\`typescript
import { DrDebug } from 'dr-debug'

if (process.env.NODE_ENV === 'development') {
  new DrDebug({
    model: 'openai/gpt-oss-120b',
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
    enableUI: true,
    enableDocker: true
  })
}
\`\`\`

---

## 👨‍💻 Credits & Contact
- **Saswat Mohanty** — AI/ML Engineer & Creator of Dr. Debug
- **GitHub:** [https://github.com/SazWhatician](https://github.com/SazWhatician)
- **LinkedIn:** [https://www.linkedin.com/in/saswat-mohanty-0a4549331/](https://www.linkedin.com/in/saswat-mohanty-0a4549331/)
`

  fs.writeFileSync(path.resolve(releaseDir, 'DOWNLOAD_GUIDE.md'), downloadGuide, 'utf-8')



  console.log(`\n🎉 All release assets successfully packaged in: ${releaseDir}`)
}

packageRelease().catch((err) => {
  console.error('❌ Packaging failed:', err)
  process.exit(1)
})
