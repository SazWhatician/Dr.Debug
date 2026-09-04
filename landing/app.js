// 🩺 Dr. Debug — Landing & Download Engine with GSAP, Lenis & ScrollTrigger
// Architected by Saswat Mohanty (@SazWhatician)

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lenis Smooth Scroll
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false
  })

  // Synchronize Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  // 2. Interactive Cinematic Camera Gimbal & Cursor Tracking Engine
  const canvas = document.getElementById('cinematic-canvas')
  const ctx = canvas ? canvas.getContext('2d') : null
  const orb1 = document.getElementById('orb-1')
  const orb2 = document.getElementById('orb-2')
  const orb3 = document.getElementById('orb-3')
  const vignetteEl = document.querySelector('.cinematic-vignette')

  let mouseX = window.innerWidth / 2
  let mouseY = window.innerHeight / 2

  // Initialize camera canvas scale buffer to eliminate edge clipping during 3D yaw/pitch
  if (canvas) {
    gsap.set(canvas, { scale: 1.08, transformOrigin: 'center center' })
  }

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY

    // Normalized screen coordinates: -1.0 (left/top) to +1.0 (right/bottom)
    const normX = (mouseX - window.innerWidth / 2) / (window.innerWidth / 2)
    const normY = (mouseY - window.innerHeight / 2) / (window.innerHeight / 2)

    // Ambient floating glow orbs parallax
    gsap.to(orb1, {
      x: (mouseX - window.innerWidth / 2) * 0.15,
      y: (mouseY - window.innerHeight / 2) * 0.15,
      duration: 1.6,
      ease: 'power2.out',
      overwrite: 'auto'
    })

    gsap.to(orb2, {
      x: (mouseX - window.innerWidth / 2) * -0.1,
      y: (mouseY - window.innerHeight / 2) * -0.1,
      duration: 2.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })

    gsap.to(orb3, {
      x: (mouseX - window.innerWidth / 2) * 0.05,
      y: (mouseY - window.innerHeight / 2) * 0.05,
      duration: 2.8,
      ease: 'power2.out',
      overwrite: 'auto'
    })

    // Cinematic Camera Movement (Pan & 3D Tilt Orbit)
    if (canvas) {
      const cameraPanX = normX * -28 // Pan camera viewport opposite to cursor gaze
      const cameraPanY = normY * -18
      const cameraRotY = normX * 3.2 // Orbit yaw
      const cameraRotX = normY * -2.6 // Pitch tilt

      gsap.to(canvas, {
        x: cameraPanX,
        y: cameraPanY,
        rotationY: cameraRotY,
        rotationX: cameraRotX,
        scale: 1.08,
        duration: 1.2,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    }

    // Floating Holographic Surgical HUD Cards Counter-Parallax
    gsap.to('.hud-surgical-card', {
      x: normX * 14,
      y: normY * 9,
      rotationY: normX * 3.8,
      rotationX: normY * -3.2,
      duration: 1.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })

    // Centered Download Console 3D Tilt Rig
    gsap.to('.surgical-tilt-rig', {
      x: normX * 10,
      y: normY * 7,
      rotationY: normX * 2.8,
      rotationX: normY * -2.4,
      duration: 1.3,
      ease: 'power2.out',
      overwrite: 'auto'
    })

    // Hero title subtle parallax
    gsap.to('.hero-top-eyebrow', {
      x: normX * 8,
      y: normY * 4,
      duration: 1.4,
      ease: 'power2.out',
      overwrite: 'auto'
    })

    // Dynamic Camera Vignette Lens Shift
    if (vignetteEl) {
      const vigX = (50 + normX * 5).toFixed(1)
      const vigY = (50 + normY * 5).toFixed(1)
      vignetteEl.style.background = `radial-gradient(circle at ${vigX}% ${vigY}%, transparent 32%, rgba(2, 4, 10, 0.45) 70%, rgba(2, 4, 10, 0.95) 100%), linear-gradient(180deg, rgba(2, 4, 10, 0.75) 0%, transparent 20%, transparent 70%, rgba(2, 4, 10, 0.9) 100%)`
    }
  }, { passive: true })

  // Gracefully return camera and holographic cards to dead center on mouseleave
  document.addEventListener('mouseleave', () => {
    if (canvas) {
      gsap.to(canvas, {
        x: 0,
        y: 0,
        rotationY: 0,
        rotationX: 0,
        scale: 1.08,
        duration: 1.5,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    }

    gsap.to('.hud-surgical-card', {
      x: 0,
      y: 0,
      rotationY: 0,
      rotationX: 0,
      duration: 1.5,
      ease: 'power2.out',
      overwrite: 'auto'
    })

    gsap.to('.surgical-tilt-rig', {
      x: 0,
      y: 0,
      rotationY: 0,
      rotationX: 0,
      duration: 1.5,
      ease: 'power2.out',
      overwrite: 'auto'
    })

    gsap.to('.hero-top-eyebrow', {
      x: 0,
      y: 0,
      duration: 1.5,
      ease: 'power2.out',
      overwrite: 'auto'
    })

    if (vignetteEl) {
      vignetteEl.style.background = `radial-gradient(circle at 50% 50%, transparent 32%, rgba(2, 4, 10, 0.45) 70%, rgba(2, 4, 10, 0.95) 100%), linear-gradient(180deg, rgba(2, 4, 10, 0.75) 0%, transparent 20%, transparent 70%, rgba(2, 4, 10, 0.9) 100%)`
    }
  })

  // 3. Corner Preloader (0-100 Loader & 1-0-0 Slide-In Reveal)
  const preloader = document.getElementById('corner-preloader')
  const counterNum = document.getElementById('loader-counter')
  const counterBar = document.getElementById('loader-bar')
  const loaderStatus = document.getElementById('loader-status')
  const giantTitle = document.getElementById('giant-title')
  const heroEyebrow = document.querySelector('.hero-top-eyebrow')
  const mainNav = document.getElementById('main-nav')

  const statusMessages = [
    'CONNECTING DEVTOOLS HOOKS...',
    'INTERCEPTING CHROMIUM SUBSTRATES...',
    'STREAMING DOCKER SSE DAEMON...',
    'COMPILING CAUSAL GRAPH TOPOLOGY...',
    'READY // SYSTEM SYNCHRONIZED'
  ]

  let loaderObj = { val: 0 }
  let hasRevealedHero = false

  // ========================================================
  // 3a. Frame Preloading Engine (120 Ultra-Smooth Frames)
  // ========================================================
  const TOTAL_FRAMES = 120
  const frameImages = new Array(TOTAL_FRAMES)
  let loadedFramesCount = 0
  let currentRenderedFrame = 0

  function getFrameSrc(index) {
    const padded = String(index).padStart(3, '0')
    return `assets/frames/frame_${padded}.jpg`
  }

  function resizeCanvas() {
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    renderCanvasFrame(currentRenderedFrame)
  }

  window.addEventListener('resize', resizeCanvas)

  function renderCanvasFrame(index) {
    if (!ctx || !canvas) return
    const safeIdx = Math.min(TOTAL_FRAMES - 1, Math.max(0, index))
    currentRenderedFrame = safeIdx

    // Find the closest loaded image if exact frame is buffering
    let img = frameImages[safeIdx]
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const left = safeIdx - offset
        if (left >= 0 && frameImages[left]?.complete && frameImages[left].naturalWidth > 0) {
          img = frameImages[left]
          break
        }
        const right = safeIdx + offset
        if (right < TOTAL_FRAMES && frameImages[right]?.complete && frameImages[right].naturalWidth > 0) {
          img = frameImages[right]
          break
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return

    const cw = canvas.width
    const ch = canvas.height
    const iw = img.naturalWidth
    const ih = img.naturalHeight

    // Cover-fit math
    const scale = Math.max(cw / iw, ch / ih)
    const nw = iw * scale
    const nh = ih * scale
    const nx = (cw - nw) / 2
    const ny = (ch - nh) / 2

    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(img, nx, ny, nw, nh)
  }

  // Preload first frame immediately for instant first paint
  const firstImg = new Image()
  firstImg.src = getFrameSrc(0)
  firstImg.onload = () => {
    frameImages[0] = firstImg
    loadedFramesCount++
    resizeCanvas()
    renderCanvasFrame(0)
  }

  // Preload all remaining frames in parallel
  for (let i = 1; i < TOTAL_FRAMES; i++) {
    const img = new Image()
    img.src = getFrameSrc(i)
    img.onload = () => {
      frameImages[i] = img
      loadedFramesCount++
    }
    img.onerror = () => {
      loadedFramesCount++
    }
  }

  // Preloader Count Animation
  gsap.to(loaderObj, {
    val: 100,
    duration: 0.9,
    ease: 'power1.inOut',
    onUpdate: () => {
      const current = Math.floor(loaderObj.val)
      if (counterNum) {
        counterNum.textContent = current < 10 ? `0${current}` : `${current}`
      }
      if (counterBar) {
        counterBar.style.width = `${current}%`
      }
      if (loaderStatus) {
        const msgIdx = Math.min(Math.floor((current / 100) * statusMessages.length), statusMessages.length - 1)
        loaderStatus.textContent = statusMessages[msgIdx]
      }
    },
    onComplete: () => {
      revealEntrance()
    }
  })

  // 1-0-0 Slide-In & Curtain Split Reveal
  function revealEntrance() {
    if (hasRevealedHero) return
    hasRevealedHero = true

    const revealDigits = gsap.utils.toArray('.reveal-digit')
    const revealSub = document.querySelector('.reveal-sub-status')
    const cornerBox = document.querySelector('.corner-loader-box')

    const entranceTl = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        if (preloader) {
          preloader.remove()
        }
        resizeCanvas()
        renderCanvasFrame(0)
        ScrollTrigger.refresh()
      }
    })

    entranceTl
      // Fade corner box slightly
      .to(cornerBox, { opacity: 0, y: 15, duration: 0.25 })
      // Slide in 1-0-0 digits with dramatic stagger
      .to(revealDigits, {
        y: '0%',
        duration: 0.5,
        stagger: 0.08,
        ease: 'power4.out'
      })
      .to(revealSub, { opacity: 1, y: 0, duration: 0.25 }, '-=0.2')
      // Hold for dramatic impact then open curtains
      .to({}, { duration: 0.2 })
      .add(() => {
        // Unlock body scroll immediately so user can scroll without delay
        document.body.classList.remove('is-loading')
        if (preloader) {
          preloader.classList.add('curtains-open')
          preloader.style.pointerEvents = 'none'
        }
      })
      .to('.slide-reveal-wrap', { scale: 1.08, opacity: 0, duration: 0.4, ease: 'power3.in' }, '-=0.1')
      // Hero Bottom Title & Eyebrow Entrance
      .to(mainNav, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
      .to(heroEyebrow, { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
      .to(giantTitle, {
        y: '0%',
        duration: 1.0,
        ease: 'power4.out'
      }, '-=0.5')
  }

  // Initial nav and eyebrow state
  gsap.set(mainNav, { opacity: 0, y: -20 })

  // ========================================================
  // 4. GSAP ScrollTrigger: Cinematic Video Scrubbing & Chapters
  // ========================================================
  const heroSection = document.getElementById('hero')
  const heroBottomLayer = document.getElementById('hero-bottom-layer')
  const chapter1 = document.getElementById('chapter-01')
  const chapter2 = document.getElementById('chapter-02')
  const downloadCard = document.getElementById('center-download-card')

  // Direct synchronous frame-scrubbing listener
  function updateScrollScrub() {
    if (!heroSection) return
    const rect = heroSection.getBoundingClientRect()
    const scrollableDistance = heroSection.offsetHeight - window.innerHeight
    if (scrollableDistance <= 0) return

    const scrolled = -rect.top
    const progress = Math.min(1, Math.max(0, scrolled / scrollableDistance))

    // Calculate exact frame 0 to 119
    const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * (TOTAL_FRAMES - 1)))
    renderCanvasFrame(frameIndex)

    // Toggle active download card at final scene
    if (downloadCard) {
      if (progress >= 0.78) {
        downloadCard.classList.add('is-active')
      } else {
        downloadCard.classList.remove('is-active')
      }
    }
  }

  // Bind directly to window scroll & Lenis for ZERO-LATENCY frame updates
  window.addEventListener('scroll', updateScrollScrub, { passive: true })
  lenis.on('scroll', updateScrollScrub)

  // Cinematic Master Scroll Timeline with GSAP
  if (heroSection) {
    const masterScrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: heroSection,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.2,
        onUpdate: (self) => {
          updateScrollScrub()
        }
      }
    })

    // Timeline Sequence:
    // 0.00 -> 0.22: Giant Bottom Title dissolves down & fades
    masterScrollTl
      .to(heroBottomLayer, {
        y: 60,
        opacity: 0,
        duration: 0.22,
        ease: 'power2.in'
      }, 0)

    // 0.22 -> 0.48: Chapter 01 (Substrate Interception) reveals and exits
    masterScrollTl
      .fromTo(chapter1,
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out' },
        0.24
      )
      .to(chapter1, {
        opacity: 0,
        y: -50,
        duration: 0.12,
        ease: 'power2.in'
      }, 0.42)

    // 0.48 -> 0.74: Chapter 02 (Causal Correlation) reveals and exits
    masterScrollTl
      .fromTo(chapter2,
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out' },
        0.50
      )
      .to(chapter2, {
        opacity: 0,
        y: -50,
        duration: 0.12,
        ease: 'power2.in'
      }, 0.68)

    // 0.75 -> 1.00: Final Scene! Centered Download Card emerges in the Operating Room
    masterScrollTl
      .fromTo(downloadCard,
        { opacity: 0, scale: 0.82 },
        { opacity: 1, scale: 1, duration: 0.22, ease: 'power3.out' },
        0.76
      )
  }

  // ========================================================
  // 5. Navigation Links & Download Shimmer Direct Scroll
  // ========================================================
  const navDownloadBtn = document.getElementById('nav-btn-download')
  const navHomeBtn = document.getElementById('nav-link-home')
  const navAboutBtn = document.getElementById('nav-link-about')

  // Clicking "Download" in navbar scrolls smoothly to the final scene download card
  if (navDownloadBtn && heroSection) {
    navDownloadBtn.addEventListener('click', (e) => {
      e.preventDefault()
      // The final scene card is fully centered at ~88% of the scrollable distance
      const maxScroll = heroSection.offsetHeight - window.innerHeight
      const targetScroll = heroSection.offsetTop + (maxScroll * 0.88)
      lenis.scrollTo(targetScroll, {
        duration: 1.8,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      })
    })
  }

  if (navHomeBtn) {
    navHomeBtn.addEventListener('click', (e) => {
      e.preventDefault()
      lenis.scrollTo(0, { duration: 1.2 })
    })
  }

  if (navAboutBtn) {
    navAboutBtn.addEventListener('click', (e) => {
      e.preventDefault()
      const authorSec = document.getElementById('author')
      if (authorSec) {
        lenis.scrollTo(authorSec, { duration: 1.4 })
      }
    })
  }

  // 3D Perspective Tilt on Cockpit Preview
  const cockpitCard = document.querySelector('.cockpit-preview-card')
  const cockpitWrap = document.getElementById('cockpit-3d')

  if (cockpitWrap && cockpitCard) {
    cockpitWrap.addEventListener('mousemove', (e) => {
      const rect = cockpitWrap.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2

      const rotateX = (-y / rect.height) * 14
      const rotateY = (x / rect.width) * 14

      gsap.to(cockpitCard, {
        rotateX: rotateX,
        rotateY: rotateY,
        transformPerspective: 1200,
        duration: 0.5,
        ease: 'power1.out'
      })
    })

    cockpitWrap.addEventListener('mouseleave', () => {
      gsap.to(cockpitCard, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.8,
        ease: 'power2.out'
      })
    })
  }


  // 5. ScrollTrigger: Features Stagger
  gsap.utils.toArray('.feature-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 60,
      opacity: 0,
      duration: 0.8,
      delay: i * 0.12,
      ease: 'power3.out'
    })
  })

  // 6. ScrollTrigger: Installation Steps
  gsap.utils.toArray('.step-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      scale: 0.9,
      y: 40,
      opacity: 0,
      duration: 0.7,
      delay: i * 0.15,
      ease: 'back.out(1.4)'
    })
  })

  // 7. ScrollTrigger: Author Card Glow Reveal
  gsap.from('.author-card', {
    scrollTrigger: {
      trigger: '.author-card',
      start: 'top 80%',
      toggleActions: 'play none none none'
    },
    scale: 0.92,
    y: 50,
    opacity: 0,
    duration: 1,
    ease: 'power3.out'
  })

  // 8. 1-Click Terminal Copy Button
  const copyBtn = document.getElementById('btn-copy-hero-cmd')
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('npx @dr-debug/mcp').then(() => {
        const orig = copyBtn.textContent
        copyBtn.textContent = 'Copied!'
        copyBtn.style.background = '#10b981'
        copyBtn.style.color = '#fff'
        showToast('📋 Copied `npx @dr-debug/mcp` to clipboard!')
        setTimeout(() => {
          copyBtn.textContent = orig
          copyBtn.style.background = ''
          copyBtn.style.color = ''
        }, 2000)
      })
    })
  }

  // 9. Download Feedback Toast & Instant Client-Side Blob Downloader
  function showToast(msg) {
    const toast = document.getElementById('toast')
    const toastText = document.getElementById('toast-text')
    if (toast && toastText) {
      toastText.textContent = msg
      toast.classList.add('show')
      setTimeout(() => {
        toast.classList.remove('show')
      }, 5000)
    }
  }

  function downloadExtensionZip(e) {
    if (e) e.preventDefault()
    showToast('🚀 Downloading dr-debug-extension.zip! Extract & load into chrome://extensions')

    // 1. Try embedded base64 payload (works 100% offline, on file://, or any host)
    if (window.DR_DEBUG_EXTENSION_BASE64) {
      try {
        const bin = atob(window.DR_DEBUG_EXTENSION_BASE64)
        const len = bin.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          bytes[i] = bin.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'dr-debug-extension.zip'
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 1500)
        return
      } catch (err) {
        console.warn('Base64 decode fallback:', err)
      }
    }

    // 2. Direct URL fallback
    const a = document.createElement('a')
    a.href = 'dr-debug-extension.zip'
    a.download = 'dr-debug-extension.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function downloadStandaloneJs(e) {
    if (e) e.preventDefault()
    showToast('⚡ Downloading dr-debug.standalone.min.js for zero-build web apps!')

    // 1. Try embedded payload
    if (window.DR_DEBUG_STANDALONE_CODE) {
      try {
        const blob = new Blob([window.DR_DEBUG_STANDALONE_CODE], { type: 'application/javascript' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'dr-debug.standalone.min.js'
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 1500)
        return
      } catch (err) {
        console.warn('Payload fallback:', err)
      }
    }

    // 2. Direct URL fallback
    const a = document.createElement('a')
    a.href = 'dr-debug.standalone.min.js'
    a.download = 'dr-debug.standalone.min.js'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  document.getElementById('btn-dl-extension')?.addEventListener('click', downloadExtensionZip)
  document.getElementById('btn-dl-js')?.addEventListener('click', downloadStandaloneJs)
  document.querySelector('.btn-nav-download')?.addEventListener('click', (e) => {
    e.preventDefault()
    downloadExtensionZip(e)
  })

  // CLI Command Copy Button
  const copyHeroCmdBtn = document.getElementById('btn-copy-hero-cmd')
  if (copyHeroCmdBtn) {
    copyHeroCmdBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('npx @dr-debug/mcp').then(() => {
        showToast('📋 Copied: npx @dr-debug/mcp')
        const span = copyHeroCmdBtn.querySelector('span')
        if (span) {
          const origText = span.textContent
          span.textContent = 'Copied!'
          setTimeout(() => { span.textContent = origText }, 2000)
        }
      }).catch(() => {
        showToast('📋 Command: npx @dr-debug/mcp')
      })
    })
  }

  // ========================================================
  // 10. Reactor Zone Three.js Canvas Engine & Footer Reveal
  // ========================================================
  function initFooterReactor() {
    const canvasContainer = document.getElementById('footer-canvas')
    if (!canvasContainer || typeof THREE === 'undefined') return

    const scene = new THREE.Scene()
    let width = canvasContainer.clientWidth || window.innerWidth
    let height = canvasContainer.clientHeight || window.innerHeight

    const camera = new THREE.PerspectiveCamera(55, width / height, 1, 2000)
    camera.position.z = 450

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    canvasContainer.appendChild(renderer.domElement)

    // Group for rotation
    const reactorGroup = new THREE.Group()
    scene.add(reactorGroup)

    // 1. Particle Cloud (Orbital Rings & Core)
    const particleCount = 2000
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const colorOrbitGreen = new THREE.Color(0x2BA648)
    const colorBrightGreen = new THREE.Color(0x48e86c)
    const colorDeepGreen = new THREE.Color(0x0F3918)

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 120 + Math.random() * 180

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = (radius * Math.sin(phi) * Math.sin(theta)) * 0.65
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const mixedColor = colorOrbitGreen.clone()
      if (Math.random() > 0.6) {
        mixedColor.lerp(colorBrightGreen, Math.random() * 0.8)
      } else {
        mixedColor.lerp(colorDeepGreen, Math.random() * 0.5)
      }

      colors[i * 3] = mixedColor.r
      colors[i * 3 + 1] = mixedColor.g
      colors[i * 3 + 2] = mixedColor.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // Canvas texture for glowing round points
    const spriteCanvas = document.createElement('canvas')
    spriteCanvas.width = 64
    spriteCanvas.height = 64
    const sCtx = spriteCanvas.getContext('2d')
    const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 30)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    grad.addColorStop(0.3, 'rgba(43, 166, 72, 0.9)')
    grad.addColorStop(0.7, 'rgba(15, 57, 24, 0.4)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    sCtx.fillStyle = grad
    sCtx.fillRect(0, 0, 64, 64)
    const pointTexture = new THREE.CanvasTexture(spriteCanvas)

    const particleMaterial = new THREE.PointsMaterial({
      size: 5.5,
      map: pointTexture,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const particles = new THREE.Points(geometry, particleMaterial)
    reactorGroup.add(particles)

    // 2. Wireframe Energy Core (Inner Torus & Icosahedron)
    const torusGeo = new THREE.TorusGeometry(95, 22, 16, 80)
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x2BA648,
      wireframe: true,
      transparent: true,
      opacity: 0.18
    })
    const torusMesh = new THREE.Mesh(torusGeo, torusMat)
    torusMesh.rotation.x = Math.PI / 2.5
    reactorGroup.add(torusMesh)

    const innerGeo = new THREE.IcosahedronGeometry(70, 1)
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x38d960,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    })
    const innerMesh = new THREE.Mesh(innerGeo, innerMat)
    reactorGroup.add(innerMesh)

    // 3. Floating Spark Embers
    const sparkCount = 180
    const sparkGeo = new THREE.BufferGeometry()
    const sparkPositions = new Float32Array(sparkCount * 3)
    const sparkSpeeds = []

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = (Math.random() - 0.5) * 600
      sparkPositions[i * 3 + 1] = (Math.random() - 0.5) * 400
      sparkPositions[i * 3 + 2] = (Math.random() - 0.5) * 300
      sparkSpeeds.push(0.5 + Math.random() * 0.9)
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3))
    const sparkMat = new THREE.PointsMaterial({
      size: 3.5,
      color: 0x48e86c,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const sparks = new THREE.Points(sparkGeo, sparkMat)
    scene.add(sparks)

    // Mouse parallax tilt
    let targetRotX = 0, targetRotY = 0
    window.addEventListener('mousemove', (e) => {
      const normX = (e.clientX / window.innerWidth) - 0.5
      const normY = (e.clientY / window.innerHeight) - 0.5
      targetRotX = normY * 0.6
      targetRotY = normX * 0.8
    })

    // Auto-Resize
    function onResize() {
      if (!canvasContainer) return
      width = canvasContainer.clientWidth || window.innerWidth
      height = canvasContainer.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', onResize)

    // Render loop with IntersectionObserver optimization
    let isVisible = true
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting
      })
    }, { threshold: 0.05 })
    observer.observe(document.querySelector('.reactor-zone') || canvasContainer)

    let clock = new THREE.Clock()
    function animate() {
      requestAnimationFrame(animate)
      if (!isVisible) return

      const elapsedTime = clock.getElapsedTime()

      reactorGroup.rotation.y += 0.005
      reactorGroup.rotation.x += (targetRotX - reactorGroup.rotation.x) * 0.05
      reactorGroup.rotation.z += (targetRotY * 0.5 - reactorGroup.rotation.z) * 0.05

      torusMesh.rotation.z = elapsedTime * 0.2
      innerMesh.rotation.y = -elapsedTime * 0.3
      innerMesh.rotation.x = elapsedTime * 0.15
      const pulse = 1 + Math.sin(elapsedTime * 2.5) * 0.06
      innerMesh.scale.set(pulse, pulse, pulse)

      const sPos = sparkGeo.attributes.position.array
      for (let i = 0; i < sparkCount; i++) {
        sPos[i * 3 + 1] += sparkSpeeds[i]
        if (sPos[i * 3 + 1] > 250) {
          sPos[i * 3 + 1] = -250
        }
      }
      sparkGeo.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
    }
    animate()
  }

  initFooterReactor()

  // Footer Reveal Parallax
  const reactorZone = document.querySelector('.reactor-zone')
  if (reactorZone) {
    gsap.fromTo('.reactor-zone .footer-content', 
      { y: -80, opacity: 0.5 },
      {
        y: 0,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '.reactor-zone',
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: true
        }
      }
    )
  }
})
