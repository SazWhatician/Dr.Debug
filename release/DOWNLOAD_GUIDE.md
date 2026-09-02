# 🩺 Dr. Debug — Downloadable Distribution Assets

> **Created by Saswat Mohanty ([@SazWhatician](https://github.com/SazWhatician))**  
> 🔗 **GitHub:** [https://github.com/SazWhatician](https://github.com/SazWhatician)  
> 💼 **LinkedIn:** [https://www.linkedin.com/in/saswat-mohanty-0a4549331/](https://www.linkedin.com/in/saswat-mohanty-0a4549331/)

All pre-built, ready-to-run release assets for **Dr. Debug** are compiled in this directory.

---

## 📁 Available Downloadable Artifacts

| Asset | Description | Quick Start |
|:---|:---|:---|
| **[`dr-debug-extension.zip`](./dr-debug-extension.zip)** | Pre-packaged Chrome DevTools Extension (ZIP) | Extract and load in `chrome://extensions` (Developer Mode) |
| **[`chrome-extension/`](./chrome-extension/)** | Unpacked Chrome Extension Folder | Point Chrome directly to this folder via "Load unpacked" |
| **[`dr-debug.standalone.min.js`](./dr-debug.standalone.min.js)** | Single-file zero-dependency in-browser bundle (minified) | Drop into any HTML with `<script src="dr-debug.standalone.min.js"></script>` |
| **[`dr-debug.standalone.js`](./dr-debug.standalone.js)** | Development readable bundle with source maps & comments | For local debugging or embedding |
| **`dr-debug-*.tgz`** | Standard NPM Package Tarball | Install with `npm install ./dr-debug-0.1.0.tgz` |

---

## 🚀 1-Click Installation Guides

### Method 1: Chrome DevTools Extension (Recommended for zero code changes)
1. Download **`dr-debug-extension.zip`** and unzip it (or use the **`chrome-extension/`** folder directly).
2. Open Google Chrome, navigate to `chrome://extensions`.
3. Toggle on **"Developer mode"** (top right corner).
4. Click **"Load unpacked"** and select the `chrome-extension/` directory.
5. Open Chrome DevTools (`F12`) on any tab — you will see the dedicated **"🩺 Dr. Debug"** panel!

---

### Method 2: Single-Line HTML `<script>` Tag (Any website / web app)
Drop **`dr-debug.standalone.min.js`** into your project's public directory, and include it in your `index.html`:

```html
<!-- Add to <head> or bottom of <body> -->
<script src="/dr-debug.standalone.min.js"></script>
```

Or configure your AI provider directly via attributes:
```html
<script src="/dr-debug.standalone.min.js" 
        data-model="openai/gpt-oss-120b" 
        data-api-key="gsk_..."></script>
```

The Dr. Debug floating pill HUD will instantly appear in the bottom-right corner!

---

### Method 3: NPM Package (React / Next.js / Vue / Svelte)
```bash
npm install dr-debug
```

```typescript
import { DrDebug } from 'dr-debug'

if (process.env.NODE_ENV === 'development') {
  new DrDebug({
    model: 'openai/gpt-oss-120b',
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
    enableUI: true,
    enableDocker: true
  })
}
```

---

## 👨‍💻 Credits & Contact
- **Saswat Mohanty** — AI/ML Engineer & Creator of Dr. Debug
- **GitHub:** [https://github.com/SazWhatician](https://github.com/SazWhatician)
- **LinkedIn:** [https://www.linkedin.com/in/saswat-mohanty-0a4549331/](https://www.linkedin.com/in/saswat-mohanty-0a4549331/)
