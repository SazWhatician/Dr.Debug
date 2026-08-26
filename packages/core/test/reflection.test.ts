import { describe, expect, it } from 'vitest'
import { DebugReflectionSchema } from '../src/types.js'

describe('DebugReflectionSchema', () => {
  it('validates a complete, well-formed reflection object', () => {
    const valid = {
      evaluation_previous_goal: 'Previous inspection confirmed 401 Unauthorized status on /api/user.',
      working_hypothesis: 'Expired JWT token in localStorage cascades into unhandled rejection.',
      memory: 'Discovered token was issued at 09:00:00 and expired at 10:00:00.',
      next_goal: 'Inspect localStorage for auth_token.',
      action: {
        name: 'check_storage',
        arguments: { type: 'local', key: 'auth_token' }
      }
    }

    const result = DebugReflectionSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.action.name).toBe('check_storage')
      expect(result.data.action.arguments['key']).toBe('auth_token')
    }
  })

  it('rejects reflection missing mandatory fields', () => {
    const missing = {
      working_hypothesis: 'Some bug',
      action: { name: 'done', arguments: {} }
    }

    const result = DebugReflectionSchema.safeParse(missing)
    expect(result.success).toBe(false)
  })
})
