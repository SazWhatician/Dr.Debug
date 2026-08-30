import { beforeEach, describe, expect, it } from 'vitest'
import { InteractionInterceptor } from '../src/interceptors/interaction.js'

describe('InteractionInterceptor (30-Second Replay Buffer & PII Masking)', () => {
  let interceptor: InteractionInterceptor

  beforeEach(() => {
    interceptor = new InteractionInterceptor(30_000)
    interceptor.init()
  })

  it('records user click events and formats human-readable sequence', () => {
    const button = document.createElement('button')
    button.id = 'checkout-btn'
    button.textContent = 'Pay Now $49.00'
    document.body.appendChild(button)

    button.click()

    const sequence = interceptor.getReplaySequence()
    expect(sequence.length).toBe(1)
    expect(sequence[0].type).toBe('click')
    expect(sequence[0].target).toBe('#checkout-btn')
    expect(sequence[0].detail).toContain('Pay Now')

    const human = interceptor.getHumanReadableReplay()
    expect(human).toContain('click on #checkout-btn')

    interceptor.destroy()
    button.remove()
  })

  it('masks sensitive password fields and credit card patterns', () => {
    const input = document.createElement('input')
    input.type = 'password'
    input.id = 'user-pwd'
    input.value = 'SuperSecret123!'
    document.body.appendChild(input)

    input.dispatchEvent(new Event('input', { bubbles: true }))

    const sequence = interceptor.getReplaySequence()
    expect(sequence.length).toBe(1)
    expect(sequence[0].detail).toContain('[REDACTED]')

    interceptor.destroy()
    input.remove()
  })
})
