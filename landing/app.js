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

    // Floating Liquid Glassmorphic Cards Parallax
    gsap.to('.liquid-glass-card', {
      x: normX * 10,
      y: normY * 6,
      rotationY: normX * 2.5,
      rotationX: normY * -2.0,
      duration: 1.2,
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

    gsap.to('.liquid-glass-card', {
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

    // Video scrubs smoothly across 0.0 to 0.70, then holds frame 119 for the download scene over the monitor
    const videoProgress = Math.min(1, Math.max(0, progress / 0.70))
    const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.floor(videoProgress * (TOTAL_FRAMES - 1)))
    renderCanvasFrame(frameIndex)

    // Toggle active download card at download scene (0.66 to 0.95)
    if (downloadCard) {
      if (progress >= 0.66 && progress <= 0.95) {
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
        snap: {
          snapTo: (val) => {
            // Stopper: When user reaches the download card on the monitor, magnetically lock at 0.78
            if (val >= 0.67 && val <= 0.93) {
              return 0.78
            }
            return val
          },
          duration: { min: 0.25, max: 0.6 },
          delay: 0.1,
          ease: 'power2.out'
        },
        onUpdate: (self) => {
          updateScrollScrub()
        }
      }
    })

    // Timeline Sequence:
    // 0.00 -> 0.18: Giant Bottom Title dissolves down & fades
    masterScrollTl
      .to(heroBottomLayer, {
        y: 60,
        opacity: 0,
        duration: 0.18,
        ease: 'power2.in'
      }, 0)

    // 0.20 -> 0.40: Chapter 01 (Google Antigravity & Claude Code MCP)
    // Left & Right cards glide in from respective edges, holding the empty center
    const cardAntigravity = document.getElementById('card-antigravity')
    const cardClaude = document.getElementById('card-claude')

    masterScrollTl
      .to(chapter1, { opacity: 1, duration: 0.02 }, 0.20)
      .fromTo(cardAntigravity,
        { opacity: 0, x: -90 },
        { opacity: 1, x: 0, duration: 0.10, ease: 'power3.out' },
        0.20
      )
      .fromTo(cardClaude,
        { opacity: 0, x: 90 },
        { opacity: 1, x: 0, duration: 0.10, ease: 'power3.out' },
        0.20
      )
      .to(cardAntigravity, {
        opacity: 0,
        x: -50,
        duration: 0.08,
        ease: 'power2.in'
      }, 0.36)
      .to(cardClaude, {
        opacity: 0,
        x: 50,
        duration: 0.08,
        ease: 'power2.in'
      }, 0.36)
      .to(chapter1, { opacity: 0, duration: 0.02 }, 0.41)

    // 0.43 -> 0.63: Chapter 02 (Substrate Telemetry & Auto-Patches)
    // Left & Right cards glide in from respective edges, holding the empty center
    const cardTelemetry = document.getElementById('card-telemetry')
    const cardPatches = document.getElementById('card-patches')

    masterScrollTl
      .to(chapter2, { opacity: 1, duration: 0.02 }, 0.43)
      .fromTo(cardTelemetry,
        { opacity: 0, x: -90 },
        { opacity: 1, x: 0, duration: 0.10, ease: 'power3.out' },
        0.43
      )
      .fromTo(cardPatches,
        { opacity: 0, x: 90 },
        { opacity: 1, x: 0, duration: 0.10, ease: 'power3.out' },
        0.43
      )
      .to(cardTelemetry, {
        opacity: 0,
        x: -50,
        duration: 0.08,
        ease: 'power2.in'
      }, 0.58)
      .to(cardPatches, {
        opacity: 0,
        x: 50,
        duration: 0.08,
        ease: 'power2.in'
      }, 0.58)
      .to(chapter2, { opacity: 0, duration: 0.02 }, 0.63)

    // 0.66 -> 1.00: Download Card over the Monitor Screen with Pinned Scroll Stopper
    masterScrollTl
      .fromTo(downloadCard,
        { opacity: 0, scale: 0.88, y: 35 },
        { opacity: 1, scale: 1, y: 0, duration: 0.10, ease: 'power3.out' },
        0.66
      )
      // EXTENDED STOPPER / HOLD: From 0.70 to 0.92, download card is pinned & steady over the monitor screen
      .to({}, { duration: 0.22 }, 0.70)
      // Smooth exit so user scrolls down into the full-breadth CRT terminal below
      .to(downloadCard, { opacity: 0, y: -25, duration: 0.06, ease: 'power2.in' }, 0.94)
  }

  // ========================================================
  // 5. Navigation Links (Home, Download, Terminal, FAQ)
  // ========================================================
  const navDownloadBtn = document.getElementById('nav-btn-download')
  const navHomeBtn = document.getElementById('nav-link-home')
  const navFaqBtn = document.getElementById('nav-link-faq')
  const footerHomeBtn = document.getElementById('footer-link-home')
  const footerTerminalBtn = document.getElementById('footer-link-terminal')
  const footerFaqBtn = document.getElementById('footer-link-faq')

  if (navDownloadBtn && heroSection) {
    navDownloadBtn.addEventListener('click', (e) => {
      e.preventDefault()
      const maxScroll = heroSection.offsetHeight - window.innerHeight
      const targetScroll = heroSection.offsetTop + (maxScroll * 0.78)
      lenis.scrollTo(targetScroll, {
        duration: 1.6,
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

  if (footerHomeBtn) {
    footerHomeBtn.addEventListener('click', (e) => {
      e.preventDefault()
      lenis.scrollTo(0, { duration: 1.2 })
    })
  }

  if (footerTerminalBtn) {
    footerTerminalBtn.addEventListener('click', (e) => {
      e.preventDefault()
      const termEl = document.getElementById('crt-terminal')
      if (termEl) {
        lenis.scrollTo(termEl, { duration: 1.4, offset: -20 })
      }
    })
  }

  if (navFaqBtn) {
    navFaqBtn.addEventListener('click', (e) => {
      e.preventDefault()
      const faqEl = document.getElementById('faq')
      if (faqEl) {
        lenis.scrollTo(faqEl, { duration: 1.4, offset: -20 })
      }
    })
  }

  if (footerFaqBtn) {
    footerFaqBtn.addEventListener('click', (e) => {
      e.preventDefault()
      const faqEl = document.getElementById('faq')
      if (faqEl) {
        lenis.scrollTo(faqEl, { duration: 1.4, offset: -20 })
      }
    })
  }

  // ========================================================
  // 6. Interactive Sleek Dropdown FAQs
  // ========================================================
  const faqItems = document.querySelectorAll('.faq-item')
  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger')
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open')
        faqItems.forEach(other => {
          if (other !== item) {
            other.classList.remove('is-open')
            other.querySelector('.faq-trigger')?.setAttribute('aria-expanded', 'false')
          }
        })
        item.classList.toggle('is-open', !isOpen)
        trigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false')
        setTimeout(() => {
          ScrollTrigger.refresh()
        }, 360)
      })
    }
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

  document.getElementById('btn-dl-extension')?.addEventListener('click', downloadExtensionZip)

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

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000)
    camera.position.set(0, 0, 160)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    canvasContainer.appendChild(renderer.domElement)

    // Vibrant lighting setup for 3D retro computer
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(80, 100, 120)
    scene.add(keyLight)

    const greenFillLight = new THREE.DirectionalLight(0x2BA648, 2.8)
    greenFillLight.position.set(-80, 40, 50)
    scene.add(greenFillLight)

    const cyanRimLight = new THREE.DirectionalLight(0x00f0ff, 1.8)
    cyanRimLight.position.set(0, -60, -70)
    scene.add(cyanRimLight)

    // Master Group for 3D Computer & Ambient Dust
    const reactorGroup = new THREE.Group()
    scene.add(reactorGroup)

    // Floating green atmospheric sparks around retro computer
    const sparkCount = 140
    const sparkGeo = new THREE.BufferGeometry()
    const sparkPositions = new Float32Array(sparkCount * 3)
    const sparkSpeeds = []

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = (Math.random() - 0.5) * 500
      sparkPositions[i * 3 + 1] = (Math.random() - 0.5) * 350
      sparkPositions[i * 3 + 2] = (Math.random() - 0.5) * 250
      sparkSpeeds.push(0.3 + Math.random() * 0.7)
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3))
    const sparkMat = new THREE.PointsMaterial({
      size: 3.2,
      color: 0x34d399,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const sparks = new THREE.Points(sparkGeo, sparkMat)
    scene.add(sparks)

    // Retro Computer Model Group
    const computerWrapper = new THREE.Group()
    reactorGroup.add(computerWrapper)

    function updateModelPlacement() {
      const w = canvasContainer.clientWidth || window.innerWidth
      if (w > 1000) {
        computerWrapper.position.set(28, -6, 0)
      } else {
        computerWrapper.position.set(0, -6, 0)
      }
    }
    updateModelPlacement()

    // Load retro_computer.glb
    if (typeof THREE.GLTFLoader !== 'undefined') {
      const loader = new THREE.GLTFLoader()
      loader.load(
        'assets/retro_computer.glb',
        (gltf) => {
          const model = gltf.scene
          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())

          // Center origin
          model.position.x = -center.x
          model.position.y = -center.y
          model.position.z = -center.z

          const maxDim = Math.max(size.x, size.y, size.z)
          const targetDim = 72
          const scale = targetDim / maxDim
          computerWrapper.scale.set(scale, scale, scale)
          computerWrapper.add(model)
        },
        undefined,
        (err) => {
          console.warn('Could not load retro_computer.glb:', err)
        }
      )
    }

    // Mouse tilt interaction
    let targetRotX = 0, targetRotY = 0
    window.addEventListener('mousemove', (e) => {
      const normX = (e.clientX / window.innerWidth) - 0.5
      const normY = (e.clientY / window.innerHeight) - 0.5
      targetRotX = normY * 0.5
      targetRotY = normX * 0.7
    })

    // Auto-Resize
    function onResize() {
      if (!canvasContainer) return
      width = canvasContainer.clientWidth || window.innerWidth
      height = canvasContainer.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      updateModelPlacement()
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

    function animate() {
      requestAnimationFrame(animate)
      if (!isVisible) return

      // Smooth continuous rotation + mouse parallax tilt
      computerWrapper.rotation.y += 0.006
      computerWrapper.rotation.x += (targetRotX - computerWrapper.rotation.x) * 0.04
      computerWrapper.rotation.z += (targetRotY * 0.35 - computerWrapper.rotation.z) * 0.04

      const sPos = sparkGeo.attributes.position.array
      for (let i = 0; i < sparkCount; i++) {
        sPos[i * 3 + 1] += sparkSpeeds[i]
        if (sPos[i * 3 + 1] > 200) {
          sPos[i * 3 + 1] = -200
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

  // ── ThreeUI CrtBackground (Terminal Variant) Initialization ───────────
  const initCrtTerminal = () => {
    const crtHost = document.getElementById('crt-terminal-host')
    const crtCanvas = document.getElementById('crt-terminal-canvas')

    if (!crtHost || !crtCanvas) return

    if (!window.ThreeUiCrt || !window.ThreeUiCrt.createCrtRenderer) {
      setTimeout(initCrtTerminal, 50)
      return
    }

    const options = {
      variant: 'terminal',
      speed: 1.00,
      typeSpeed: 1.00,
      motion: 1.00,
      hue: 0,
      saturation: 1.00,
      brightness: 1.00,
      opacity: 1.00
    }

    try {
      const renderer = window.ThreeUiCrt.createCrtRenderer(crtHost, crtCanvas, () => options)
      let frame = 0
      let visible = true

      const resize = () => {
        renderer.resize()
        renderer.render(performance.now())
      }

      const tick = (now) => {
        renderer.render(now)
        frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0
      }

      const resizeObserver = new ResizeObserver(resize)
      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry ? entry.isIntersecting : true
        if (visible && !frame) frame = requestAnimationFrame(tick)
        if (!visible && frame) {
          cancelAnimationFrame(frame)
          frame = 0
        }
      })

      resizeObserver.observe(crtHost)
      intersection.observe(crtHost)
      resize()
      frame = requestAnimationFrame(tick)

      window.addEventListener('beforeunload', () => {
        if (frame) cancelAnimationFrame(frame)
        resizeObserver.disconnect()
        intersection.disconnect()
        renderer.dispose()
      })
    } catch (err) {
      console.warn('ThreeUI CRT Renderer initialization warning:', err)
    }
  }

  initCrtTerminal()

  // ── Barba.js High-Fashion Transition Engine ───────────
  if (typeof barba !== 'undefined') {
    try {
      barba.init({
        prevent: ({ el }) => {
          if (!el) return false
          const hrefAttr = el.getAttribute('href') || ''
          return (
            el.classList?.contains('no-barba') ||
            hrefAttr.startsWith('#') ||
            el.hasAttribute('download') ||
            el.getAttribute('target') === '_blank'
          )
        },
        transitions: [{
          name: 'fashion-fade',
          leave(data) {
            return gsap.to(data.current.container, {
              opacity: 0,
              y: -15,
              duration: 0.35,
              ease: 'power2.inOut'
            })
          },
          enter(data) {
            window.scrollTo(0, 0)
            return gsap.from(data.next.container, {
              opacity: 0,
              y: 15,
              duration: 0.45,
              ease: 'power2.out',
              onComplete: () => {
                ScrollTrigger.refresh()
              }
            })
          }
        }]
      })
    } catch (err) {
      console.warn('Barba.js initialization notice:', err)
    }
  }
})
