/**
 * AudioChimes — Zero-dependency Web Audio API synthesizer for Dr. Debug HUD
 * Generates tactile, futuristic sci-fi sound effects for incident detection,
 * resolution, and micro-interactions without any external audio files.
 */
export class AudioChimes {
  private ctx: AudioContext | null = null
  private isEnabled = true

  constructor(enabled = true) {
    this.isEnabled = enabled
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('dr_debug_sound_enabled')
        if (stored !== null) {
          this.isEnabled = stored === 'true'
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
   * Subtle sci-fi alert chime triggered on red incident detection
   * Smooth dual-frequency frequency slide (880Hz -> 440Hz) with exponential gain decay
   */
  public playIncidentAlert(): void {
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
