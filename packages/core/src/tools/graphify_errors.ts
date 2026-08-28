import type { DiagnosticTool, ToolContext } from '../types.js'

export const graphifyErrorsTool: DiagnosticTool = {
  name: 'graphify_errors',
  description: 'Constructs and analyzes a multi-layer full-stack Causal Error Graph connecting Docker backend exceptions, HTTP network failures, and frontend console errors into a directed causal chain with identified root causes.',
  parameters: {
    type: 'object',
    properties: {
      includeDocker: {
        type: 'boolean',
        description: 'Whether to include Docker backend container logs in the graph (default: true).'
      },
      timeframeMs: {
        type: 'number',
        description: 'Correlation time window in milliseconds (default: 8000ms).'
      }
    }
  },
  async execute(
    args: { includeDocker?: boolean; timeframeMs?: number },
    context: ToolContext
  ): Promise<string> {
    const graph = context.controller.getCausalGraph({
      includeDocker: args.includeDocker !== false,
      timeframeMs: args.timeframeMs ?? 8000
    })

    if (graph.nodes.length === 0) {
      return 'No active errors or anomalies recorded across Docker, Network, or Console to build a causal graph.'
    }

    const lines: string[] = [
      `=== CAUSAL ERROR GRAPH (${graph.nodes.length} nodes, ${graph.edges.length} causal links) ===`,
      ''
    ]

    if (graph.rootCauseNodeId) {
      const rootNode = graph.nodes.find((n) => n.id === graph.rootCauseNodeId)
      if (rootNode) {
        lines.push(`🎯 PRIMARY ROOT CAUSE DETECTED: [${rootNode.layer.toUpperCase()}] ${rootNode.label}`)
        lines.push(`   Summary: ${rootNode.summary}`)
        lines.push('')
      }
    }

    lines.push('--- Causal Relationships ---')
    if (graph.edges.length === 0) {
      lines.push('(No temporal causal links detected between isolated error nodes)')
    } else {
      graph.edges.forEach((edge, idx) => {
        const src = graph.nodes.find((n) => n.id === edge.source)
        const tgt = graph.nodes.find((n) => n.id === edge.target)
        lines.push(
          `${idx + 1}. [${src?.layer || 'source'}] ${src?.label || edge.source} ──(${edge.label})──► [${tgt?.layer || 'target'}] ${tgt?.label || edge.target} (Confidence: ${Math.round(edge.confidence * 100)}%)`
        )
      })
    }
    lines.push('')
    lines.push('--- Mermaid Diagram ---')
    lines.push('```mermaid')
    lines.push(graph.mermaidDiagram)
    lines.push('```')

    return lines.join('\n')
  }
}
