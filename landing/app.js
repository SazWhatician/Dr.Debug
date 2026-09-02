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

  // 2. Mouse-Following Ambient Glow Orbs
  const orb1 = document.getElementById('orb-1')
  const orb2 = document.getElementById('orb-2')
  const orb3 = document.getElementById('orb-3')

  let mouseX = window.innerWidth / 2
  let mouseY = window.innerHeight / 2

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY

    gsap.to(orb1, {
      x: (mouseX - window.innerWidth / 2) * 0.15,
      y: (mouseY - window.innerHeight / 2) * 0.15,
      duration: 1.6,
      ease: 'power2.out'
    })

    gsap.to(orb2, {
      x: (mouseX - window.innerWidth / 2) * -0.1,
      y: (mouseY - window.innerHeight / 2) * -0.1,
      duration: 2.2,
      ease: 'power2.out'
    })

    gsap.to(orb3, {
      x: (mouseX - window.innerWidth / 2) * 0.05,
      y: (mouseY - window.innerHeight / 2) * 0.05,
      duration: 2.8,
      ease: 'power2.out'
    })
  })

  // 3. Hero Entrance Timeline
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  heroTl
    .from('.nav-brand', { y: -30, opacity: 0, duration: 0.8 })
    .from('.nav-links li', { y: -20, opacity: 0, stagger: 0.08, duration: 0.6 }, '-=0.5')
    .from('.nav-actions', { y: -20, opacity: 0, duration: 0.6 }, '-=0.4')
    .from('.hero-pill', { scale: 0.8, opacity: 0, duration: 0.7, ease: 'back.out(1.7)' }, '-=0.3')
    .from('.hero-title', { y: 40, opacity: 0, duration: 1 }, '-=0.4')
    .from('.hero-desc', { y: 30, opacity: 0, duration: 0.9 }, '-=0.6')
    .from('.hero-cta-group .btn-hero-primary, .hero-cta-group .btn-hero-secondary', {
      scale: 0.9,
      y: 20,
      opacity: 0,
      stagger: 0.15,
      duration: 0.7,
      ease: 'back.out(1.5)'
    }, '-=0.5')
    .from('.hero-quick-cmd', { y: 20, opacity: 0, duration: 0.6 }, '-=0.3')
    .from('#cockpit-3d', {
      y: 80,
      opacity: 0,
      scale: 0.95,
      duration: 1.2,
      ease: 'power4.out'
    }, '-=0.6')

  // Levitate Cockpit preview gently
  gsap.to('.cockpit-preview-card', {
    y: -10,
    duration: 3,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  })

  // 4. 3D Perspective Tilt on Cockpit Preview
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

  // 9. Download Feedback Toast
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

  document.getElementById('btn-dl-extension')?.addEventListener('click', () => {
    showToast('🚀 Downloading dr-debug-extension.zip! Unzip & load in chrome://extensions')
  })

  document.getElementById('btn-dl-js')?.addEventListener('click', () => {
    showToast('⚡ Downloading dr-debug.standalone.min.js for zero-build web apps!')
  })

  // 10. Interactive Diagnostic Simulator
  const triggerBtn = document.getElementById('btn-run-sim')
  const terminal = document.getElementById('sim-terminal')
  const aiPane = document.getElementById('sim-ai-pane')

  if (triggerBtn && terminal && aiPane) {
    triggerBtn.addEventListener('click', () => {
      triggerBtn.disabled = true
      triggerBtn.textContent = '⏳ Investigating Causal Chain...'
      triggerBtn.style.opacity = '0.7'

      // Add Docker panic to terminal
      const now = new Date().toTimeString().split(' ')[0]
      const panicLine = document.createElement('div')
      panicLine.className = 'log-line'
      panicLine.innerHTML = `
        <span class="log-ts">${now}</span>
        <span class="log-cont">[docker:polaris-api]</span>
        <span class="log-level-err">PANIC</span>
        <span class="log-msg">psycopg2.OperationalError: server closed connection unexpectedly</span>
      `
      terminal.appendChild(panicLine)

      setTimeout(() => {
        const netErr = document.createElement('div')
        netErr.className = 'log-line'
        netErr.innerHTML = `
          <span class="log-ts">${now}</span>
          <span class="log-cont">[network]</span>
          <span class="log-level-err">504</span>
          <span class="log-msg">GET /api/documents failed (1515ms gateway timeout)</span>
        `
        terminal.appendChild(netErr)
      }, 400)

      setTimeout(() => {
        const clientErr = document.createElement('div')
        clientErr.className = 'log-line'
        clientErr.innerHTML = `
          <span class="log-ts">${now}</span>
          <span class="log-cont">[browser]</span>
          <span class="log-level-err">CRASH</span>
          <span class="log-msg">Uncaught TypeError: Cannot read properties of undefined (reading 'map')</span>
        `
        terminal.appendChild(clientErr)
        terminal.scrollTop = terminal.scrollHeight
      }, 800)

      // Animate AI Diagnostic Reasoning
      setTimeout(() => {
        aiPane.innerHTML = `
          <div class="ai-reasoning-card" style="border-color: #f43f5e;">
            <div class="ai-step-title" style="color: #f43f5e;">
              <span>🚨 1. Causal Graph Synthesis</span>
            </div>
            <div class="ai-thought">
              Linked 3 substrate layers: Docker DB connection panic ➔ Network 504 Gateway Timeout (+77ms) ➔ React client crash at <code>UserGraph.tsx:42</code>.
            </div>
          </div>
        `
        gsap.from(aiPane.children[0], { opacity: 0, y: 20, duration: 0.5 })
      }, 1200)

      setTimeout(() => {
        const card2 = document.createElement('div')
        card2.className = 'ai-reasoning-card'
        card2.innerHTML = `
          <div class="ai-step-title">
            <span>🧠 2. Autonomous Re-Act Tool Execution</span>
          </div>
          <div class="ai-thought">
            Ran <code>inspect_docker_logs('polaris-api')</code> & <code>inspect_request('/api/documents')</code>. Diagnosed: Frontend assumes <code>data.documents</code> is an array, but 504 error response returns HTML error page.
          </div>
        `
        aiPane.appendChild(card2)
        gsap.from(card2, { opacity: 0, y: 20, duration: 0.5 })
      }, 2200)

      setTimeout(() => {
        const patchCard = document.createElement('div')
        patchCard.className = 'ai-reasoning-card'
        patchCard.style.borderColor = '#34d399'
        patchCard.innerHTML = `
          <div class="ai-step-title" style="color: #34d399;">
            <span>⚡ 3. Unified Diff Auto-Patch Generated</span>
          </div>
          <div class="diff-preview">
            <div>--- a/src/components/UserGraph.tsx</div>
            <div>+++ b/src/components/UserGraph.tsx</div>
            <div>@@ -41,3 +41,3 @@</div>
            <div class="diff-del">- const docs = data.documents.map(d => d.title);</div>
            <div class="diff-add">+ const docs = Array.isArray(data?.documents)</div>
            <div class="diff-add">+   ? data.documents.map(d => d.title)</div>
            <div class="diff-add">+   : [];</div>
          </div>
        `
        aiPane.appendChild(patchCard)
        gsap.from(patchCard, { opacity: 0, y: 20, duration: 0.5 })
        aiPane.scrollTop = aiPane.scrollHeight

        triggerBtn.disabled = false
        triggerBtn.textContent = '✅ Solved! Trigger Again'
        triggerBtn.style.opacity = '1'
        showToast('✨ Autonomous diagnosis complete! 1 causal link found & patch synthesized.')
      }, 3400)
    })
  }
})
