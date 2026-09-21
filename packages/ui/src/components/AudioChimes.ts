/**
 * AudioChimes — Zero-dependency Web Audio API synthesizer for Dr. Debug HUD
 * Generates tactile, futuristic sci-fi sound effects for incident detection,
 * resolution, and micro-interactions without any external audio files.
 */

export type ErrorChimeProfile =
  | 'warp-drop'
  | 'sonar-pulse'
  | 'cyber-glitch'
  | 'subtle-bell'
  | 'retro-alarm'
  | 'arcade-chiptune'

export interface ErrorChimeOption {
  id: ErrorChimeProfile
  name: string
  description: string
}

export const ERROR_CHIME_OPTIONS: ErrorChimeOption[] = [
  {
    id: 'warp-drop',
    name: 'Warp Drop',
    description: 'Dr. Debug Original — Smooth dual-frequency 880Hz -> 440Hz slide'
  },
  {
    id: 'sonar-pulse',
    name: 'Sonar Pulse',
    description: 'Tactical acoustic pulse — Dual resonant medical/submarine ping'
  },
  {
    id: 'cyber-glitch',
    name: 'Cyber Glitch',
    description: 'High-speed digital strobe — Rapid tri-tone frequency-modulated chirp'
  },
  {
    id: 'subtle-bell',
    name: 'Subtle Bell',
    description: 'Glassy crystal ping — Soft 659Hz harmonic bell with ambient overtone'
  },
  {
    id: 'retro-alarm',
    name: 'Retro Synth',
    description: '8-Bit Arcade Warning — Alternating chiptune square-wave alert'
  },
  {
    id: 'arcade-chiptune',
    name: 'Arcade 8-Bit',
    description: 'Chiptune Quest Alert — 8-Bit battle warning square-wave chirp'
  }
]


export class AudioChimes {
  private ctx: AudioContext | null = null
  private isEnabled = true
  private errorChimeProfile: ErrorChimeProfile = 'warp-drop'

  constructor(enabled = true, errorChime: ErrorChimeProfile = 'warp-drop') {
    this.isEnabled = enabled
    this.errorChimeProfile = errorChime
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('dr_debug_sound_enabled')
        if (stored !== null) {
          this.isEnabled = stored === 'true'
        }
        const storedChime = localStorage.getItem('dr_debug_error_chime') as ErrorChimeProfile
        if (storedChime && ERROR_CHIME_OPTIONS.some((o) => o.id === storedChime)) {
          this.errorChimeProfile = storedChime
        }
      }
    } catch {}
  }

  private initContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          this.ctx = new AudioCtx()
        }
      }
    } catch {}
    return this.ctx
  }

  /**
   * Master error chime router — plays the configured or requested error chime on incident detection
   */
  public playIncidentAlert(profile?: ErrorChimeProfile): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const target = profile || this.errorChimeProfile || 'warp-drop'
    switch (target) {
      case 'sonar-pulse':
        this.playSonarPulseChime()
        break
      case 'cyber-glitch':
        this.playCyberGlitchChime()
        break
      case 'subtle-bell':
        this.playSubtleBellChime()
        break
      case 'retro-alarm':
        this.playRetroAlarmChime()
        break
      case 'arcade-chiptune':
        this.playArcadeChiptuneChime()
        break
      case 'warp-drop':
      default:
        this.playWarpDropChime()
        break
    }
  }

  /**
   * Error Chime 1: Warp Drop (Original Dr. Debug alert)
   * Smooth dual-frequency frequency slide (880Hz -> 440Hz) with exponential gain decay
   */
  public playWarpDropChime(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now) // A5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.09) // drop to A4

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.12)
    } catch {}
  }

  /**
   * Error Chime 2: Sonar Pulse
   * Dual acoustic sonar ping (370Hz -> 220Hz double blip) simulating deep diagnostic telemetry
   */
  public playSonarPulseChime(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const pings = [
        { time: now, freqStart: 370, freqEnd: 220, gainVal: 0.08, duration: 0.07 },
        { time: now + 0.085, freqStart: 370, freqEnd: 220, gainVal: 0.06, duration: 0.08 }
      ]

      pings.forEach((p) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(p.freqStart, p.time)
        osc.frequency.exponentialRampToValueAtTime(p.freqEnd, p.time + p.duration)

        gain.gain.setValueAtTime(p.gainVal, p.time)
        gain.gain.exponentialRampToValueAtTime(0.0001, p.time + p.duration)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(p.time)
        osc.stop(p.time + p.duration)
      })
    } catch {}
  }

  /**
   * Error Chime 3: Cyber Glitch
   * Rapid tri-tone frequency-modulated digital glitch blip (1046Hz -> 784Hz -> 440Hz)
   */
  public playCyberGlitchChime(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const burst = [
        { freq: 1046.5, delay: 0 },
        { freq: 783.99, delay: 0.03 },
        { freq: 440.0, delay: 0.06 }
      ]

      burst.forEach((b) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const startTime = now + b.delay
        const stopTime = startTime + 0.04

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(b.freq, startTime)
        osc.frequency.exponentialRampToValueAtTime(b.freq * 0.7, stopTime)

        gain.gain.setValueAtTime(0.06, startTime)
        gain.gain.exponentialRampToValueAtTime(0.0001, stopTime)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(startTime)
        osc.stop(stopTime)
      })
    } catch {}
  }

  /**
   * Error Chime 4: Subtle Bell
   * Soft glassy crystal harmonic ping (659Hz E5 + 1318Hz E6 overtone) with gentle long decay
   */
  public playSubtleBellChime(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime

      // Fundamental E5
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(659.25, now)
      gain1.gain.setValueAtTime(0.06, now)
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.28)

      // Harmonic overtone E6
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1318.5, now)
      gain2.gain.setValueAtTime(0.025, now)
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now)
      osc2.stop(now + 0.22)
    } catch {}
  }

  /**
   * Error Chime 5: Retro Synth
   * 8-bit arcade warning chirp (587Hz D5 -> 880Hz A5 dual square wave pulse)
   */
  public playRetroAlarmChime(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const pulses = [
        { freq: 587.33, start: now, dur: 0.045 },
        { freq: 880.0, start: now + 0.05, dur: 0.055 }
      ]

      pulses.forEach((p) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'square'
        osc.frequency.setValueAtTime(p.freq, p.start)

        gain.gain.setValueAtTime(0.035, p.start)
        gain.gain.exponentialRampToValueAtTime(0.0001, p.start + p.dur)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(p.start)
        osc.stop(p.start + p.dur)
      })
    } catch {}
  }

  /**
   * Error Chime 6: Arcade Chiptune Alert
   * Authentic 8-bit square-wave dual chirp (440Hz -> 880Hz -> 220Hz)
   */
  public playArcadeChiptuneChime(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const notes = [
        { freq: 440, start: now, dur: 0.06 },
        { freq: 880, start: now + 0.06, dur: 0.06 },
        { freq: 330, start: now + 0.12, dur: 0.14 }
      ]

      notes.forEach((n) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(n.freq, n.start)
        gain.gain.setValueAtTime(0.045, n.start)
        gain.gain.exponentialRampToValueAtTime(0.0001, n.start + n.dur)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(n.start)
        osc.stop(n.start + n.dur)
      })
    } catch {}
  }

  /**
   * 8-Bit Coin Insert Sound (Classic Mario/Arcade coin pickup: B5 -> E6)
   */
  public playCoinSound(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(987.77, now) // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.07) // E6
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.35)
    } catch {}
  }

  /**
   * 8-Bit Jump / Peek Sound (Rising square wave)
   */
  public playJumpSound(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(150, now)
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.12)
      gain.gain.setValueAtTime(0.04, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.14)
    } catch {}
  }

  /**
   * 8-Bit Hit / Damage Sound
   */
  public playHitSound(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.15)
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.18)
    } catch {}
  }

  /**
   * 8-Bit Victory / Level Up Fanfare
   */
  public playFanfareSound(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const melody = [
        { freq: 523.25, start: now, dur: 0.08 },        // C5
        { freq: 659.25, start: now + 0.09, dur: 0.08 }, // E5
        { freq: 783.99, start: now + 0.18, dur: 0.08 }, // G5
        { freq: 1046.5, start: now + 0.27, dur: 0.25 }  // C6
      ]
      melody.forEach((m) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(m.freq, m.start)
        gain.gain.setValueAtTime(0.05, m.start)
        gain.gain.exponentialRampToValueAtTime(0.0001, m.start + m.dur)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(m.start)
        osc.stop(m.start + m.dur)
      })
    } catch {}
  }

  public setErrorChimeProfile(profile: ErrorChimeProfile): void {
    this.errorChimeProfile = profile
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dr_debug_error_chime', profile)
      }
    } catch {}
  }

  public getErrorChimeProfile(): ErrorChimeProfile {
    return this.errorChimeProfile
  }

  /**
   * Ascending gentle harmonic chime when issues resolve or healthy state restored
   */
  public playResolveChime(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1) // E5

      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.16)
    } catch {}
  }

  /**
   * Delicate tactile micro-tick for HUD toggles and button presses
   */
  public playClickSound(): void {
    if (!this.isEnabled || typeof window === 'undefined') return
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1200, now)
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.02)

      gain.gain.setValueAtTime(0.04, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.035)
    } catch {}
  }

  public toggleSound(): boolean {
    this.isEnabled = !this.isEnabled
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dr_debug_sound_enabled', String(this.isEnabled))
      }
    } catch {}
    if (this.isEnabled) {
      this.playClickSound()
    }
    return this.isEnabled
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dr_debug_sound_enabled', String(this.isEnabled))
      }
    } catch {}
  }

  public getIsEnabled(): boolean {
    return this.isEnabled
  }

  public destroy(): void {
    if (this.ctx) {
      try {
        this.ctx.close().catch(() => {})
      } catch {}
      this.ctx = null
    }
  }
}
