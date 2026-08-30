import { PatchEngine } from '../patch/PatchEngine.js'
import type { DiagnosticTool, ToolContext } from '../types.js'

export const generatePatchTool: DiagnosticTool = {
  name: 'generate_patch',
  description: 'Generates a git-compatible unified diff patch and GitHub PR body for the prescribed fix.',
  parameters: {
    type: 'object',
    properties: {
      diagnosis: {
        type: 'string',
        description: 'Short explanation of what was fixed.'
      },
      rootCause: {
        type: 'string',
        description: 'The root cause file and bug mechanism.'
      },
      diff: {
        type: 'string',
        description: 'The raw code replacement or unified diff patch.'
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of filepaths modified by the patch.'
      },
      confidence: {
        type: 'number',
        description: 'Confidence level between 0 and 1.'
      }
    },
    required: ['diagnosis', 'rootCause', 'diff']
  },
  async execute(
    args: { diagnosis: string; rootCause: string; diff: string; files?: string[]; confidence?: number },
    context: ToolContext
  ): Promise<string> {
    const mockResult = {
      goal: 'Auto-Fix generation',
      status: 'resolved' as const,
      diagnosis: args.diagnosis,
      rootCause: args.rootCause,
      fix: args.diff,
      confidence: args.confidence ?? 0.95,
      filesToModify: args.files || ['src/patch.ts'],
      steps: [],
      durationMs: 0,
      finalMemory: ''
    }

    const unifiedDiff = PatchEngine.toUnifiedDiff(mockResult)
    const patchFile = PatchEngine.toPatchFile(mockResult)
    const prBody = PatchEngine.toGitHubPRBody(
      mockResult,
      context.controller.getInteractionReplayHuman?.() || undefined
    )
    const validation = PatchEngine.validatePatch(unifiedDiff)

    return JSON.stringify(
      {
        valid: validation.valid,
        validationErrors: validation.errors,
        unifiedDiff,
        patchFile,
        prBody
      },
      null,
      2
    )
  }
}
