export interface VoiceDebuggerOptions {
  onQuery: (query: string) => void
  onStatusChange?: (isListening: boolean, transcript?: string) => void
}

export class VoiceDebugger {
  private recognition: any = null
  private isListening = false
  private options: VoiceDebuggerOptions
  private isSupported = false

  constructor(options: VoiceDebuggerOptions) {
    this.options = options
    this.initRecognition()
  }

  private initRecognition(): void {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      this.isSupported = false
      return
    }

    this.isSupported = true
    try {
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = false
      this.recognition.interimResults = true
      this.recognition.lang = 'en-US'

      this.recognition.onstart = () => {
        this.isListening = true
        this.options.onStatusChange?.(true)
      }

      this.recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        this.options.onStatusChange?.(true, transcript)

        if (event.results[0].isFinal) {
          const finalQuery = transcript.trim()
          if (finalQuery) {
            this.options.onQuery(finalQuery)
            this.speak(`Investigating: ${finalQuery.slice(0, 40)}`)
          }
        }
      }

      this.recognition.onerror = () => {
        this.isListening = false
        this.options.onStatusChange?.(false)
      }

      this.recognition.onend = () => {
        this.isListening = false
        this.options.onStatusChange?.(false)
      }
    } catch {
      this.isSupported = false
    }
  }

  public toggle(): boolean {
    if (!this.isSupported || !this.recognition) return false

    if (this.isListening) {
      this.recognition.stop()
      this.isListening = false
      this.options.onStatusChange?.(false)
      return false
    } else {
      try {
        this.recognition.start()
        this.isListening = true
        return true
      } catch {
        return false
      }
    }
  }

  public speak(text: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.05
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    } catch {
      // Speech synthesis fallback
    }
  }

  public getIsSupported(): boolean {
    return this.isSupported
  }

  public getIsListening(): boolean {
    return this.isListening
  }

  public destroy(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop()
      } catch {}
    }
    this.recognition = null
    this.isListening = false
  }
}
