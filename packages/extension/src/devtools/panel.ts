export interface RCAReport {
  goal: string
  diagnosis: string
  rootCause: string
  fix?: string
  confidence?: number
  filesToModify?: string[]
  durationMs?: number
  timestamp?: number
  steps: Array<{
    stepNumber: number
    hypothesis: string
    toolName: string
    toolOutput?: string
  }>
}

export function generateMarkdownRCA(report: RCAReport): string {
  const dateStr = new Date(report.timestamp || Date.now()).toISOString()
  const duration = report.durationMs ? `${(report.durationMs / 1000).toFixed(2)}s` : 'N/A'
  const confidencePercent = Math.round((report.confidence ?? 0.95) * 100)

  let md = `# 🩺 Dr. Debug — Root Cause Analysis (RCA) Report\n\n`
  md += `**Date:** \`${dateStr}\`  \n`
  md += `**Duration:** \`${duration}\`  \n`
  md += `**Confidence:** \`${confidencePercent}%\`  \n\n`

  md += `## 🎯 Investigation Goal\n> ${report.goal}\n\n`

  md += `## 📋 Findings & Diagnosis\n${report.diagnosis}\n\n`

  md += `## 🔍 Verified Root Cause\n${report.rootCause}\n\n`

  if (report.filesToModify && report.filesToModify.length > 0) {
    md += `## 📁 Culprit Files to Modify\n`
    for (const f of report.filesToModify) {
      md += `- \`${f}\`\n`
    }
    md += `\n`
  }

  if (report.fix) {
    md += `## 🛠️ Prescribed Code Patch\n\`\`\`diff\n${report.fix}\n\`\`\`\n\n`
  }

  if (report.steps && report.steps.length > 0) {
    md += `## 🔬 Diagnostic Trajectory (${report.steps.length} Steps)\n`
    for (const s of report.steps) {
      md += `### Step ${s.stepNumber}: \`${s.toolName}\`\n`
      md += `* **Hypothesis:** ${s.hypothesis}\n`
      if (s.toolOutput) {
        md += `* **Output:** \`${s.toolOutput.replace(/\n/g, ' ')}\`\n`
      }
      md += `\n`
    }
  }

  md += `---\n*Generated autonomously by Dr. Debug In-Browser AI Diagnostics.*\n`
  return md
}

export function generateJsonRCA(report: RCAReport): string {
  return JSON.stringify(
    {
      version: '1.0.0',
      generator: 'dr-debug-extension',
      timestamp: report.timestamp || Date.now(),
      report
    },
    null,
    2
  )
}
