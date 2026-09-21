/**
 * PixelEasterEgg — 8-Bit Retro Peeking Characters & Easter Egg Engine for Dr. Debug
 * 
 * Features authentic vector pixel-art sprites (Street Fighter Ryu, Spider-Man, Pixel Doctor)
 * that peek up from behind the Floating Pill HUD or Cockpit bezel, glance around, and duck
 * back down. 100% vector SVG, zero external network requests, 100% CSP safe.
 */

import {
  PIKACHU_SPRITE_DATA,
  GENGAR_SPRITE_DATA,
  CHARIZARD_SPRITE_DATA,
  BULBASAUR_SPRITE_DATA
} from './pokemonSprites.js'

export type EasterEggCharacter = 'pikachu' | 'gengar' | 'charizard' | 'bulbasaur' | 'ryu' | 'spiderman' | 'doctor'

export type PeekerCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface PixelEasterEggOptions {
  container: HTMLElement
  theme?: string
  onSound?: (sound: 'coin' | 'jump' | 'hit' | 'fanfare') => void
  customSpriteUrl?: string
}

/* ==========================================================================
   AUTHENTIC 8-BIT VECTOR PIXEL ART SPRITES (Pure SVG matrices)
   ========================================================================== */

/**
 * 8-Bit Street Fighter Ryu (Peeking pose with waving red headband and raised fist)
 */
export const RYU_SPRITE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64" shape-rendering="crispEdges">
  <!-- Hair: Dark Charcoal -->
  <rect x="10" y="3" width="12" height="3" fill="#1c1917" />
  <rect x="8" y="5" width="16" height="4" fill="#1c1917" />
  <rect x="7" y="7" width="4" height="5" fill="#1c1917" />
  <rect x="21" y="7" width="4" height="5" fill="#1c1917" />
  
  <!-- Red Headband (The iconic Ryu Bandana) -->
  <rect x="8" y="9" width="16" height="3" fill="#e11d48" />
  <rect x="6" y="10" width="3" height="3" fill="#be123c" />
  <!-- Headband tail waving to the left -->
  <rect x="3" y="11" width="4" height="2" fill="#e11d48" />
  <rect x="1" y="12" width="3" height="3" fill="#9f1239" />
  <rect x="0" y="14" width="2" height="3" fill="#be123c" />

  <!-- Face: Skin tones -->
  <rect x="10" y="12" width="12" height="6" fill="#fcd34d" />
  <rect x="11" y="13" width="10" height="5" fill="#fef3c7" />
  <!-- Intense Eyebrows & Eyes -->
  <rect x="11" y="13" width="4" height="1" fill="#1c1917" />
  <rect x="17" y="13" width="4" height="1" fill="#1c1917" />
  <rect x="12" y="14" width="2" height="2" fill="#000000" />
  <rect x="18" y="14" width="2" height="2" fill="#000000" />
  <rect x="13" y="14" width="1" height="1" fill="#ffffff" />
  <rect x="19" y="14" width="1" height="1" fill="#ffffff" />
  
  <!-- Mouth / Focused expression -->
  <rect x="14" y="17" width="4" height="1" fill="#b45309" />

  <!-- White Karate Gi & Muscular Shoulders -->
  <rect x="7" y="18" width="18" height="14" fill="#f8fafc" />
  <!-- Gi V-Neck Collar & Chest -->
  <rect x="13" y="18" width="6" height="4" fill="#fcd34d" />
  <rect x="14" y="18" width="4" height="5" fill="#e2e8f0" />
  <!-- Gi Black Trim/Folds -->
  <rect x="11" y="19" width="2" height="13" fill="#cbd5e1" />
  <rect x="19" y="19" width="2" height="13" fill="#94a3b8" />

  <!-- Raised Fist / Thumb Up (Peeking gesture) -->
  <rect x="23" y="15" width="6" height="6" fill="#fcd34d" />
  <rect x="24" y="14" width="4" height="2" fill="#f59e0b" />
  <rect x="25" y="16" width="3" height="3" fill="#ffffff" /> <!-- White wrist wrap -->
  <rect x="24" y="19" width="4" height="2" fill="#b45309" />
</svg>
`

/**
 * 8-Bit Spider-Man (Masked face with expressive white eye lenses and web grid)
 */
export const SPIDERMAN_SPRITE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64" shape-rendering="crispEdges">
  <!-- Mask Outline / Red Hood -->
  <rect x="10" y="4" width="12" height="2" fill="#dc2626" />
  <rect x="8" y="6" width="16" height="2" fill="#dc2626" />
  <rect x="7" y="8" width="18" height="12" fill="#ef4444" />
  <rect x="8" y="20" width="16" height="3" fill="#dc2626" />
  <rect x="10" y="23" width="12" height="2" fill="#b91c1c" />
  
  <!-- Web Lines (Black grid on mask) -->
  <rect x="15" y="4" width="2" height="21" fill="#18181b" />
  <rect x="7" y="13" width="18" height="1" fill="#18181b" />
  <rect x="8" y="9" width="16" height="1" fill="#18181b" />
  <rect x="8" y="18" width="16" height="1" fill="#18181b" />
  <!-- Diagonal web segments -->
  <rect x="11" y="7" width="1" height="3" fill="#18181b" />
  <rect x="20" y="7" width="1" height="3" fill="#18181b" />
  <rect x="10" y="14" width="1" height="4" fill="#18181b" />
  <rect x="21" y="14" width="1" height="4" fill="#18181b" />

  <!-- Iconic Large Slanted White Eyes with Black Borders -->
  <!-- Left Eye -->
  <polygon points="9,11 15,11 13,16 9,14" fill="#000000" />
  <polygon points="10,12 14,12 12,15 10,13" fill="#ffffff" />
  <!-- Right Eye -->
  <polygon points="17,11 23,11 23,14 19,16" fill="#000000" />
  <polygon points="18,12 22,12 22,13 20,15" fill="#ffffff" />

  <!-- Blue & Red Shoulders / Peeking Hands -->
  <rect x="5" y="24" width="22" height="8" fill="#1d4ed8" />
  <rect x="11" y="24" width="10" height="8" fill="#ef4444" />
  <rect x="14" y="24" width="4" height="8" fill="#18181b" /> <!-- Spider chest logo stem -->

  <!-- Left Peeking Hand clutching bezel -->
  <rect x="4" y="19" width="4" height="5" fill="#ef4444" />
  <rect x="4" y="18" width="3" height="2" fill="#18181b" />
  <!-- Right Peeking Hand clutching bezel -->
  <rect x="24" y="19" width="4" height="5" fill="#ef4444" />
  <rect x="25" y="18" width="3" height="2" fill="#18181b" />
</svg>
`

/**
 * 8-Bit Dr. Debug Pixel Doctor Mascot
 */
export const DOCTOR_SPRITE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64" shape-rendering="crispEdges">
  <!-- Hair: Mad Scientist / Doctor -->
  <rect x="9" y="3" width="14" height="3" fill="#64748b" />
  <rect x="7" y="5" width="18" height="4" fill="#64748b" />
  <rect x="6" y="8" width="4" height="5" fill="#94a3b8" />
  <rect x="22" y="8" width="4" height="5" fill="#94a3b8" />

  <!-- Silver Head Mirror / Reflector -->
  <circle cx="12" cy="7" r="3" fill="#0ea5e9" />
  <circle cx="12" cy="7" r="2" fill="#ffffff" />
  <rect x="12" y="7" width="1" height="1" fill="#0284c7" />

  <!-- Face -->
  <rect x="9" y="8" width="14" height="10" fill="#fed7aa" />
  <!-- Big Friendly Pixel Glasses -->
  <rect x="9" y="10" width="6" height="4" fill="#0284c7" />
  <rect x="10" y="11" width="4" height="2" fill="#e0f2fe" />
  <rect x="17" y="10" width="6" height="4" fill="#0284c7" />
  <rect x="18" y="11" width="4" height="2" fill="#e0f2fe" />
  <rect x="15" y="11" width="2" height="1" fill="#0369a1" /> <!-- Bridge -->
  <!-- Smile -->
  <rect x="13" y="15" width="6" height="2" fill="#be123c" />
  <rect x="14" y="15" width="4" height="1" fill="#ffffff" />

  <!-- White Doctor Coat & Blue Stethoscope -->
  <rect x="6" y="18" width="20" height="14" fill="#ffffff" />
  <!-- Stethoscope around neck -->
  <rect x="10" y="18" width="2" height="7" fill="#0284c7" />
  <rect x="20" y="18" width="2" height="7" fill="#0284c7" />
  <rect x="11" y="24" width="10" height="2" fill="#0284c7" />
  <rect x="15" y="25" width="2" height="3" fill="#0284c7" />
  <circle cx="16" cy="28" r="2" fill="#94a3b8" />

  <!-- Peeking Hands holding Stethoscope chest piece -->
  <rect x="4" y="17" width="4" height="4" fill="#fed7aa" />
  <rect x="24" y="17" width="4" height="4" fill="#fed7aa" />
</svg>
`

export class PixelEasterEgg {
  private container: HTMLElement
  private element: HTMLElement | null = null
  private onSound?: (sound: 'coin' | 'jump' | 'hit' | 'fanfare') => void
  private customSpriteUrl?: string
  private isPeeking = false
  private idleInterval: number | null = null
  private currentTheme: string = 'dr-debug'
  private currentCorner: PeekerCorner = 'bottom-right'
  private characters: EasterEggCharacter[] = [
    'pikachu',
    'gengar',
    'charizard',
    'bulbasaur',
    'ryu',
    'spiderman',
    'doctor'
  ]
  private currentCharacter: EasterEggCharacter = 'pikachu'

  constructor(options: PixelEasterEggOptions) {
    this.container = options.container
    this.onSound = options.onSound
    this.customSpriteUrl = options.customSpriteUrl
    this.currentTheme = options.theme || 'dr-debug'
    this.init()
  }

  private init(): void {
    // Create peeker host element
    this.element = document.createElement('div')
    this.element.className = `dr-debug-pixel-peeker corner-${this.currentCorner}`
    this.element.setAttribute('title', '8-Bit Easter Egg: Click to interact!')
    this.element.innerHTML = `
      <div class="dr-debug-peeker-speech" style="display: none;">1P READY!</div>
      <div class="dr-debug-peeker-art"></div>
    `

    // Click on the peeking character triggers an 8-bit sound + speech bubble
    this.element.addEventListener('click', (e) => {
      e.stopPropagation()
      this.celebrate()
    })

    this.container.appendChild(this.element)

    // Only start ambient timer if 8-bit theme is active
    if (this.currentTheme === 'arcade-8bit') {
      this.startIdleTimer()
    }
  }

  /**
   * Set active UI theme. Only 'arcade-8bit' enables Easter egg triggers & peeker timer.
   */
  public setTheme(theme: string): void {
    this.currentTheme = theme
    if (theme !== 'arcade-8bit') {
      this.retreat()
      this.stopIdleTimer()
    } else {
      this.startIdleTimer()
    }
  }

  public getTheme(): string {
    return this.currentTheme
  }

  public getCurrentCorner(): PeekerCorner {
    return this.currentCorner
  }

  public getElement(): HTMLElement | null {
    return this.element
  }

  public setContainer(newContainer: HTMLElement): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element)
    }
    this.container = newContainer
    if (this.element) {
      this.container.appendChild(this.element)
    }
  }

  /**
   * Set custom sprite image URL (e.g. from spriters-resource or local assets)
   */
  public setCustomSprite(url: string | undefined): void {
    this.customSpriteUrl = url
  }

  /**
   * Triggers a peek animation for a specific character or random in a random corner inside Dr. Debug.
   */
  public peek(character?: EasterEggCharacter, force = false, corner?: PeekerCorner): void {
    // Strictly isolate Easter eggs to the 8-bit arcade theme
    if (this.currentTheme !== 'arcade-8bit') {
      return
    }

    if ((this.isPeeking && !force && !character) || !this.element) return

    // If Dr. Debug window is hidden and not a forced peek, wait for user to open it
    if (!force && this.element.parentElement?.classList.contains('hidden')) {
      return
    }

    this.isPeeking = true
    this.currentCharacter = character || this.getRandomCharacter()

    // Randomize corner inside Dr. Debug box
    this.currentCorner = corner || this.getRandomCorner()
    this.element.classList.remove(
      'corner-bottom-right',
      'corner-bottom-left',
      'corner-top-right',
      'corner-top-left'
    )
    this.element.classList.add(`corner-${this.currentCorner}`)

    const artContainer = this.element.querySelector('.dr-debug-peeker-art') as HTMLElement
    const speech = this.element.querySelector('.dr-debug-peeker-speech') as HTMLElement
    if (!artContainer) return

    // Inject character sprite
    if (this.customSpriteUrl) {
      artContainer.innerHTML = `<img src="${this.customSpriteUrl}" alt="Custom Sprite" style="width: 56px; height: 56px; image-rendering: pixelated;" />`
    } else {
      switch (this.currentCharacter) {
        case 'pikachu':
          artContainer.innerHTML = `<img src="${PIKACHU_SPRITE_DATA}" alt="Pikachu" class="dr-debug-sprite-img" style="width: 52px; height: 52px; image-rendering: pixelated;" />`
          if (speech) speech.textContent = 'PIKA-PIKA!'
          break
        case 'gengar':
          artContainer.innerHTML = `<img src="${GENGAR_SPRITE_DATA}" alt="Gengar" class="dr-debug-sprite-img" style="width: 56px; height: 60px; image-rendering: pixelated;" />`
          if (speech) speech.textContent = 'GENGAR HEHE!'
          break
        case 'charizard':
          artContainer.innerHTML = `<img src="${CHARIZARD_SPRITE_DATA}" alt="Charizard" class="dr-debug-sprite-img" style="width: 60px; height: 66px; image-rendering: pixelated;" />`
          if (speech) speech.textContent = 'CHARIZARD ROAR!'
          break
        case 'bulbasaur':
          artContainer.innerHTML = `<img src="${BULBASAUR_SPRITE_DATA}" alt="Bulbasaur" class="dr-debug-sprite-img" style="width: 48px; height: 54px; image-rendering: pixelated;" />`
          if (speech) speech.textContent = 'BULBA-SAUR!'
          break
        case 'spiderman':
          artContainer.innerHTML = SPIDERMAN_SPRITE_SVG
          if (speech) speech.textContent = 'SPIDEY-SENSE!'
          break
        case 'doctor':
          artContainer.innerHTML = DOCTOR_SPRITE_SVG
          if (speech) speech.textContent = 'PATCH TIME!'
          break
        case 'ryu':
        default:
          artContainer.innerHTML = RYU_SPRITE_SVG
          if (speech) speech.textContent = 'HADOUKEN!'
          break
      }
    }

    // Play subtle 8-bit audio cue
    if (this.onSound) {
      this.onSound('jump')
    }

    // Add active peeking class
    this.element.classList.remove('peek-active', 'peek-retreat')
    // Force reflow
    void this.element.offsetWidth
    this.element.classList.add('peek-active')

    // Show speech bubble briefly halfway through peek
    setTimeout(() => {
      if (speech && this.isPeeking) {
        speech.style.display = 'block'
      }
    }, 450)

    // Retreat after 2.6s
    setTimeout(() => {
      this.retreat()
    }, 2600)
  }

  /**
   * Retreat back behind the Dr. Debug bezel
   */
  public retreat(): void {
    if (!this.element) return
    const speech = this.element.querySelector('.dr-debug-peeker-speech') as HTMLElement
    if (speech) speech.style.display = 'none'

    this.element.classList.remove('peek-active')
    this.element.classList.add('peek-retreat')
    this.isPeeking = false

    setTimeout(() => {
      if (this.element) {
        this.element.classList.remove('peek-retreat')
      }
    }, 380)
  }

  /**
   * Celebrate interaction (plays victory fanfare or coin and shakes)
   */
  public celebrate(): void {
    if (this.currentTheme !== 'arcade-8bit') return

    if (this.onSound) {
      this.onSound('coin')
    }
    const speech = this.element?.querySelector('.dr-debug-peeker-speech') as HTMLElement
    if (speech) {
      switch (this.currentCharacter) {
        case 'pikachu':
          speech.textContent = 'THUNDERBOLT! +100 PTS'
          break
        case 'gengar':
          speech.textContent = 'SHADOW BALL! +100 PTS'
          break
        case 'charizard':
          speech.textContent = 'FLAMETHROWER! +100 PTS'
          break
        case 'bulbasaur':
          speech.textContent = 'SOLAR BEAM! +100 PTS'
          break
        case 'spiderman':
          speech.textContent = 'THWIP! +100 PTS'
          break
        case 'doctor':
          speech.textContent = 'DEBUGGED! +100 PTS'
          break
        case 'ryu':
        default:
          speech.textContent = 'K.O.! +100 PTS'
          break
      }
      speech.style.display = 'block'
      setTimeout(() => {
        speech.style.display = 'none'
        this.retreat()
      }, 1000)
    }
  }

  /**
   * Get random character from roster
   */
  private getRandomCharacter(): EasterEggCharacter {
    const idx = Math.floor(Math.random() * this.characters.length)
    return this.characters[idx]
  }

  /**
   * Get random corner inside Dr. Debug box
   */
  private getRandomCorner(): PeekerCorner {
    const corners: PeekerCorner[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
    return corners[Math.floor(Math.random() * corners.length)]
  }

  /**
   * Periodic ambient timer: peeks inside Dr. Debug on random corners every 7-15s (short period)
   */
  private startIdleTimer(): void {
    this.stopIdleTimer()
    if (this.currentTheme !== 'arcade-8bit') return

    const nextInterval = 7000 + Math.random() * 8000 // 7s - 15s (short period)
    this.idleInterval = window.setTimeout(() => {
      if (this.currentTheme === 'arcade-8bit') {
        this.peek()
      }
      this.startIdleTimer()
    }, nextInterval)
  }

  private stopIdleTimer(): void {
    if (this.idleInterval !== null) {
      clearTimeout(this.idleInterval)
      this.idleInterval = null
    }
  }

  public destroy(): void {
    this.stopIdleTimer()
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element)
    }
    this.element = null
  }
}
