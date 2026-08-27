import { MockLLMClient } from '@dr-debug/llms'
import { beforeEach, describe, expect, it } from 'vitest'
import { DrDebug } from '../src/index.js'

describe('DrDebug (Master Integration Suite)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('runs an end-to-end investigation and renders the timeline + prescription in Shadow DOM HUD', async () => {
    const mockResponses = [
      // Step 1: LLM decides to inspect error #0
      {
        content: null,
        toolCalls: [
          {
            id: 'call_1',
            type: 'function' as const,
            function: {
              name: 'inspect_error',
              arguments: JSON.stringify({
                evaluation_previous_goal: 'Starting investigation.',
                working_hypothesis: 'Uncaught TypeError in UserProfile component due to missing props.',
                memory: 'Observed 1 uncaught error.',
                next_goal: 'Inspect error #0 stack trace.',
                action: {
                  name: 'inspect_error',
                  arguments: { errorIndex: 0 }
                }
              })
            }
          }
        ]
      },
      // Step 2: LLM concludes with done
      {
        content: null,
        toolCalls: [
          {
            id: 'call_2',
            type: 'function' as const,
            function: {
              name: 'done',
              arguments: JSON.stringify({
                evaluation_previous_goal: 'Error inspection confirmed TypeError on line 42.',
                working_hypothesis: 'User data array is undefined on initial mount.',
                memory: 'Verified stack trace in UserProfile.tsx:42',
                next_goal: 'Provide defensive null check patch.',
                action: {
                  name: 'done',
                  arguments: {
                    diagnosis: 'UserProfile crashes when user list is undefined.',
                    rootCause: 'Component attempts to .map() over uninitialized state.',
                    fix: '--- a/UserProfile.tsx\n+++ b/UserProfile.tsx\n- users.map(u => u.name)\n+ (users || []).map(u => u.name)',
                    confidence: 0.99,
                    filesToModify: ['src/UserProfile.tsx']
                  }
                }
              })
            }
          }
        ]
      }
    ]

    const mockLLM = new MockLLMClient(mockResponses)
    const doctor = new DrDebug({
      llmClient: mockLLM,
      enableUI: true
    })

    // Simulate an uncaught error in page
    console.error('TypeError: Cannot read properties of undefined (reading "map") at UserProfile.tsx:42:15')

    // Run investigation
    const diagnosis = await doctor.investigate('Why is UserProfile crashing?')

    // Verify Diagnosis Result
    expect(diagnosis.status).toBe('resolved')
    expect(diagnosis.diagnosis).toContain('UserProfile crashes')
    expect(diagnosis.rootCause).toContain('uninitialized state')
    expect(diagnosis.fix).toContain('(users || []).map')

    // Verify Shadow DOM HUD updates
    const ui = doctor.getUI()
    expect(ui).toBeDefined()

    const shadow = ui?.getShadowRoot()
    const stepCards = shadow?.querySelectorAll('.dr-debug-step-card')
    expect(stepCards?.length).toBe(2)

    const prescriptionCard = shadow?.querySelector('.dr-debug-prescription-card')
    expect(prescriptionCard).toBeDefined()
    expect(prescriptionCard?.textContent).toContain('UserProfile crashes')
    expect(prescriptionCard?.textContent).toContain('src/UserProfile.tsx')

    doctor.destroy()
    expect(document.getElementById('dr-debug-root')).toBeNull()
  })

  it('supports on-device LiteRTClient instantiation by default', () => {
    const doctor = new DrDebug({
      liteRT: {
        modelName: 'gemma-2b-it',
        device: 'webgpu'
      },
      enableUI: false
    })

    expect(doctor.getController()).toBeDefined()
    expect(doctor.getCore()).toBeDefined()

    doctor.destroy()
  })
})
