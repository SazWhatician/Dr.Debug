import esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const extDir = path.resolve(root, 'packages/extension')
const publicDir = path.resolve(extDir, 'public')
const distDir = path.resolve(extDir, 'dist')

async function buildExtension() {
  console.log('📦 Building Dr. Debug Chrome Extension...')

  fs.mkdirSync(distDir, { recursive: true })

  // 1. Bundle Background Worker
  await esbuild.build({
    entryPoints: [path.resolve(extDir, 'src/background.ts')],
    bundle: true,
    format: 'esm',
    target: ['chrome100'],
    outfile: path.resolve(distDir, 'background.js')
  })

  // 2. Bundle Content Script with embedded DrDebug runtime
  await esbuild.build({
    entryPoints: [path.resolve(extDir, 'src/content.ts')],
    bundle: true,
    format: 'iife',
    target: ['chrome100'],
    alias: {
      '@dr-debug/controller': path.resolve(root, 'packages/controller/src/index.ts'),
      '@dr-debug/llms': path.resolve(root, 'packages/llms/src/index.ts'),
      '@dr-debug/core': path.resolve(root, 'packages/core/src/index.ts'),
      '@dr-debug/ui': path.resolve(root, 'packages/ui/src/index.ts'),
      '@dr-debug/extension': path.resolve(root, 'packages/extension/src/index.ts'),
      'dr-debug': path.resolve(root, 'packages/dr-debug/src/index.ts')
    },
    outfile: path.resolve(distDir, 'content.js')
  })

  // 3. Copy public assets to dist
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

  copyRecursive(publicDir, distDir)

  // 4. Also copy manifest & dist files to extDir root for maximum convenience
  fs.copyFileSync(path.resolve(publicDir, 'manifest.json'), path.resolve(extDir, 'manifest.json'))
  fs.copyFileSync(path.resolve(distDir, 'background.js'), path.resolve(extDir, 'background.js'))
  fs.copyFileSync(path.resolve(distDir, 'content.js'), path.resolve(extDir, 'content.js'))
  fs.copyFileSync(path.resolve(publicDir, 'devtools.html'), path.resolve(extDir, 'devtools.html'))
  fs.copyFileSync(path.resolve(publicDir, 'devtools.js'), path.resolve(extDir, 'devtools.js'))
  fs.copyFileSync(path.resolve(publicDir, 'panel.html'), path.resolve(extDir, 'panel.html'))
  fs.copyFileSync(path.resolve(publicDir, 'panel.js'), path.resolve(extDir, 'panel.js'))
  fs.copyFileSync(path.resolve(publicDir, 'popup.html'), path.resolve(extDir, 'popup.html'))
  fs.copyFileSync(path.resolve(publicDir, 'popup.js'), path.resolve(extDir, 'popup.js'))
  copyRecursive(path.resolve(publicDir, 'icons'), path.resolve(extDir, 'icons'))

  console.log('✅ Chrome Extension successfully built!')
  console.log(`📁 Load unpacked target: ${extDir} or ${distDir}`)
}

buildExtension().catch((err) => {
  console.error('❌ Extension build failed:', err)
  process.exit(1)
})
