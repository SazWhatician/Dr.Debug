---
name: LiveUpdate
description: >-
  Synchronizes and updates the Dr. Debug version across all monorepo artifacts (Chrome extension manifests, Cockpit UI, GitHub README, NPM docs, release tarballs, and package.json files) whenever an update or release is initiated to Dr. Debug, while strictly excluding download landing page presentation updates.
---

# 🩺 LiveUpdate Skill (Dr. Debug Universal Version Synchronizer)

This skill governs version integrity across the entire **Dr. Debug** ecosystem. Whenever an update, patch, minor/major version bump, or code modification is initiated on Dr. Debug, this skill ensures that the version number and associated documentation remain **100% unified in lockstep across all components**.

---

## ⛔ Strict Exclusion Rule: Landing Page Protection

> **CRITICAL RULE**: The download landing page presentation files (`landing/*.html`, `landing/*.css`, `landing/js/*`, CRT styling, and liquid glassmorphism layout) are **STRICTLY EXCLUDED** from automated cosmetic modifications during updates.
> - Do **NOT** rewrite, redesign, or touch the HTML/CSS of the landing page during a version or package update.
> - Only the pre-compiled distribution bundles placed in `landing/` by `scripts/package-release.js` (`dr-debug-extension.zip` and `dr-debug.standalone.min.js`) are synced as binary/minified assets.

---

## 🎯 Target Components Synchronized in Lockstep

Whenever an update or release is performed, the following files and modules **MUST** be verified and synchronized to the exact same version string (`X.Y.Z`):

### 1. Monorepo Package Manifests
- Root [`package.json`](file:///c:/Users/saswa/Desktop/DebugCopilot/package.json)
- [`packages/controller/package.json`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/controller/package.json)
- [`packages/core/package.json`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/core/package.json)
- [`packages/dr-debug/package.json`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/dr-debug/package.json)
- [`packages/extension/package.json`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/extension/package.json)
- [`packages/llms/package.json`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/llms/package.json)
- [`packages/mcp/package.json`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/mcp/package.json)
- [`packages/ui/package.json`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/ui/package.json)

### 2. Chrome DevTools Extension
- [`packages/extension/manifest.json`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/extension/manifest.json)
- [`packages/extension/public/manifest.json`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/extension/public/manifest.json)
- Rebuilt distribution manifests in `packages/extension/dist/manifest.json` and `release/chrome-extension/manifest.json`

### 3. In-Browser Cockpit & Shadow DOM HUD
- [`packages/ui/src/components/SettingsModal.ts`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/ui/src/components/SettingsModal.ts):
  Update `<span class="dr-debug-update-version">Dr. Debug vX.Y.Z</span>` to the active target version.

### 4. GitHub & Project Documentation
- Root [`README.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/README.md):
  - Distribution table tarball link: `release/dr-debug-X.Y.Z.tgz`
  - NPM installation snippet: `npm install ./dr-debug-X.Y.Z.tgz`
  - Unit & integration test counter (keep verified count accurate, e.g. 118 passing)
- [`release/DOWNLOAD_GUIDE.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/release/DOWNLOAD_GUIDE.md)

### 5. NPM Documentation & Standalone Guides
- [`packages/dr-debug/README.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/dr-debug/README.md):
  Package docs and shields badges.
- [`scripts/package-release.js`](file:///c:/Users/saswa/Desktop/DebugCopilot/scripts/package-release.js):
  Ensures the generated tarball and guides use the dynamic `package.json` version.

---

## 🔄 Standard Execution Workflow

Whenever a version bump or update is initiated:

### Step 1: Run the Automated Synchronizer
Use the built-in `version:sync` script:
```bash
# To sync to a specific version:
node scripts/sync-version.js 0.1.5

# Or increment automatically (patch, minor, major):
node scripts/sync-version.js patch

# Or run via npm script:
npm run version:sync patch
```

### Step 2: Build All Subpackages & Chrome Extension
```bash
npm run build
```
This compiles TypeScript packages into `dist/` and runs `scripts/build-extension.js` to ensure the unpacked Chrome extension in `packages/extension/` and `packages/extension/dist/` is refreshed.

### Step 3: Run the Verification Test Suite
```bash
npm test
```
Ensure all 30 test files and 118+ tests pass cleanly (100% pass rate).

### Step 4: Package Official Release Assets
```bash
npm run package:release
```
This produces:
- `release/dr-debug-extension.zip`
- `release/chrome-extension/` (unpacked extension folder)
- `release/dr-debug.standalone.min.js`
- `release/dr-debug.standalone.js`
- `release/dr-debug-X.Y.Z.tgz` (official NPM tarball)
- `release/DOWNLOAD_GUIDE.md`

### Step 5: Verify Landing Page Invariance
Verify with `git status` that no files under `landing/` were modified other than the generated release assets (`landing/dr-debug-extension.zip` and `landing/dr-debug.standalone.min.js`).

---

## ⚡ Quick Reference Checklist
When completing any update:
- [ ] Root `package.json` updated.
- [ ] All 7 `packages/*/package.json` updated.
- [ ] Both `packages/extension/manifest.json` and `packages/extension/public/manifest.json` updated.
- [ ] Cockpit UI `SettingsModal.ts` displays new version string.
- [ ] Root `README.md` tarball reference matches new version.
- [ ] `npm test` passes 100%.
- [ ] `npm run package:release` finished successfully.
- [ ] Landing page presentation code remains completely untouched.
