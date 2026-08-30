import { describe, expect, it, vi } from 'vitest'
import { VoiceDebugger } from '../src/components/VoiceDebugger.js'

describe('VoiceDebugger (Hands-Free Voice Query Engine)', () => {
  it('initializes VoiceDebugger gracefully when SpeechRecognition is present', () => {
    const onQuery = vi.fn()
    const onStatusChange = vi.fn()

    // Mock Web Speech API
    class MockSpeechRecognition {
      continuous = false
      interimResults = false
      lang = 'en-US'
      onstart: (() => void) | null = null
      onresult: ((evt: any) => void) | null = null
      onerror: (() => void) | null = null
      onend: (() => void) | null = null

      start() {
        this.onstart?.()
      }
      stop() {
        this.onend?.()
      }
    }

    ;(globalThis as any).window = {
      SpeechRecognition: MockSpeechRecognition,
      speechSynthesis: {
        cancel: vi.fn(),
        speak: vi.fn()
      }
    }

    const voice = new VoiceDebugger({ onQuery, onStatusChange })
    expect(voice.getIsSupported()).toBe(true)

    voice.toggle()
    expect(voice.getIsListening()).toBe(true)
    expect(onStatusChange).toHaveBeenCalledWith(true)

    voice.destroy()
  })
})
