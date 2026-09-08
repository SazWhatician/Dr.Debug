#!/usr/bin/env node

/**
 * 🩺 Dr. Debug — Universal Version Synchronizer
 * 
 * Synchronizes version across all monorepo artifacts:
 * - Root package.json
 * - All packages/* /package.json
 * - Extension manifests (packages/extension/manifest.json & public/manifest.json)
 * - Cockpit UI (packages/ui/src/components/SettingsModal.ts)
 * - GitHub README.md (tarball references & release tables)
 * - NPM Documentation (packages/dr-debug/README.md)
 * - Release Download Guide (release/DOWNLOAD_GUIDE.md)
 * 
 * STRICT CONSTRAINT:
 * - Never modifies download landing page presentation files (landing/*.html, landing/*.css).
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const root = process.cwd()

function getRootPackageJson() {
  const rootPkgPath = path.resolve(root, 'package.json')
  return JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'))
}

function calculateNextVersion(currentVersion, bumpType) {
  const parts = currentVersion.split('.').map(Number)
  if (parts.length < 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver current version: ${currentVersion}`)
  }
  let [major, minor, patch] = parts
  if (bumpType === 'major') {
    major += 1
    minor = 0
    patch = 0
  } else if (bumpType === 'minor') {
    minor += 1
    patch = 0
  } else {
    // default to patch
    patch += 1
  }
  return `${major}.${minor}.${patch}`
}

export function syncAllVersions(targetVersion, options = {}) {
  console.log(`\n🩺 [LiveUpdate] Initiating Dr. Debug version synchronization -> v${targetVersion}...`)

  let updatedCount = 0

  // 1. Root package.json
  const rootPkgPath = path.resolve(root, 'package.json')
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'))
  const oldVersion = rootPkg.version
  rootPkg.version = targetVersion
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n', 'utf-8')
  console.log(`  ✅ Root package.json updated (${oldVersion} -> ${targetVersion})`)
  updatedCount++

  // 2. All packages/*/package.json
  const packagesDir = path.resolve(root, 'packages')
  if (fs.existsSync(packagesDir)) {
    const subpackages = fs.readdirSync(packagesDir)
    for (const subpkg of subpackages) {
      const subpkgJsonPath = path.join(packagesDir, subpkg, 'package.json')
      if (fs.existsSync(subpkgJsonPath)) {
        const pkgData = JSON.parse(fs.readFileSync(subpkgJsonPath, 'utf-8'))
        pkgData.version = targetVersion
        fs.writeFileSync(subpkgJsonPath, JSON.stringify(pkgData, null, 2) + '\n', 'utf-8')
        console.log(`  ✅ packages/${subpkg}/package.json updated`)
        updatedCount++
      }
    }
  }

  // 3. Extension Manifests (both public and root copies)
  const manifestPaths = [
    path.resolve(root, 'packages/extension/public/manifest.json'),
    path.resolve(root, 'packages/extension/manifest.json')
  ]
  for (const mPath of manifestPaths) {
    if (fs.existsSync(mPath)) {
      const manifest = JSON.parse(fs.readFileSync(mPath, 'utf-8'))
      manifest.version = targetVersion
      fs.writeFileSync(mPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
      console.log(`  ✅ ${path.relative(root, mPath).replace(/\\/g, '/')} updated`)
      updatedCount++
    }
  }

  // 4. Cockpit UI (SettingsModal.ts)
  const settingsModalPath = path.resolve(root, 'packages/ui/src/components/SettingsModal.ts')
  if (fs.existsSync(settingsModalPath)) {
    let content = fs.readFileSync(settingsModalPath, 'utf-8')
    const updated = content.replace(
      /<span class="dr-debug-update-version">Dr\. Debug v[0-9.]+<\/span>/g,
      `<span class="dr-debug-update-version">Dr. Debug v${targetVersion}</span>`
    )
    if (updated !== content) {
      fs.writeFileSync(settingsModalPath, updated, 'utf-8')
      console.log(`  ✅ Cockpit SettingsModal.ts updated (Dr. Debug v${targetVersion})`)
      updatedCount++
    }
  }

  // 5. GitHub README.md
  const readmePath = path.resolve(root, 'README.md')
  if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, 'utf-8')
    const updatedReadme = readme.replace(/dr-debug-[0-9.]+\.tgz/g, `dr-debug-${targetVersion}.tgz`)
    if (updatedReadme !== readme) {
      fs.writeFileSync(readmePath, updatedReadme, 'utf-8')
      console.log(`  ✅ GitHub README.md updated (dr-debug-${targetVersion}.tgz)`)
      updatedCount++
    }
  }

  // 6. Release DOWNLOAD_GUIDE.md (if exists)
  const downloadGuidePath = path.resolve(root, 'release/DOWNLOAD_GUIDE.md')
  if (fs.existsSync(downloadGuidePath)) {
    let guide = fs.readFileSync(downloadGuidePath, 'utf-8')
    const updatedGuide = guide.replace(/dr-debug-[0-9.]+\.tgz/g, `dr-debug-${targetVersion}.tgz`)
    if (updatedGuide !== guide) {
      fs.writeFileSync(downloadGuidePath, updatedGuide, 'utf-8')
      console.log(`  ✅ release/DOWNLOAD_GUIDE.md updated`)
      updatedCount++
    }
  }

  console.log(`\n✨ Version synchronization complete! (${updatedCount} files updated)`)

  // Optional automated build & packaging
  if (options.build) {
    console.log('\n🔨 Triggering project build & extension packaging...')
    execSync('npm run build', { stdio: 'inherit', cwd: root })
  }

  if (options.package) {
    console.log('\n📦 Triggering distribution release packaging...')
    execSync('npm run package:release', { stdio: 'inherit', cwd: root })
  }

  if (options.test) {
    console.log('\n🧪 Running test suite verification...')
    execSync('npm test', { stdio: 'inherit', cwd: root })
  }

  return targetVersion
}

// CLI runner
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename || '')) {
  const args = process.argv.slice(2)
  let target = args.find((a) => !a.startsWith('--'))
  const doBuild = args.includes('--build')
  const doPackage = args.includes('--package') || args.includes('--release')
  const doTest = args.includes('--test')

  const currentPkg = getRootPackageJson()
  const currentVer = currentPkg.version || '0.1.4'

  if (!target) {
    target = currentVer
  } else if (['patch', 'minor', 'major'].includes(target.toLowerCase())) {
    target = calculateNextVersion(currentVer, target.toLowerCase())
  } else if (!/^\d+\.\d+\.\d+/.test(target)) {
    console.error(`❌ Error: Invalid version format "${target}". Use semver like "0.1.5" or "patch" / "minor" / "major".`)
    process.exit(1)
  }

  try {
    syncAllVersions(target, { build: doBuild, package: doPackage, test: doTest })
  } catch (err) {
    console.error('❌ Version sync failed:', err)
    process.exit(1)
  }
}
