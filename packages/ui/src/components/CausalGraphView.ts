export interface ErrorGraphNode {
  id: string
  label: string
  layer: 'docker' | 'network' | 'console' | 'dom'
  summary: string
  timestamp: number
  metadata?: Record<string, any>
  isRootCause?: boolean
}

export interface ErrorGraphEdge {
  id: string
  source: string
  target: string
  label: string
  timeDeltaMs?: number
  confidence: number
  relationship: 'CAUSED_BY' | 'TRIGGERED_BY' | 'CORRELATED_WITH' | 'PROPAGATED_TO'
}

export interface CausalErrorGraph {
  nodes: ErrorGraphNode[]
  edges: ErrorGraphEdge[]
  rootCauseNodeId?: string
  mermaidDiagram: string
}

export class CausalGraphView {
  private element: HTMLElement
  private currentGraph: CausalErrorGraph | null = null
  private selectedNodeId: string | null = null

  constructor() {
    this.element = document.createElement('div')
    this.element.className = 'dr-debug-graph-wrapper'
    this.renderEmpty()
  }

  public getElement(): HTMLElement {
    return this.element
  }

  public updateGraph(graph: CausalErrorGraph): void {
    this.currentGraph = graph
    this.render()
  }

  private renderEmpty(): void {
    this.element.innerHTML = `
      <div class="dr-debug-graph-empty">
        <div style="font-size: 32px; margin-bottom: 8px;">🕸️</div>
        <div style="font-weight: 700; font-size: 14px; color: #38bdf8;">Autonomous Causal Topology Matrix</div>
        <div style="font-size: 12px; color: #94a3b8; max-width: 360px; margin: 6px auto 14px auto;">
          Cross-correlating Docker backend logs, network requests, and console runtime exceptions in real-time.
        </div>
        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 9999px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 12px; font-weight: 600;">
          <span>🟢</span> <span>No Root Cause Anomalies Detected</span>
        </div>
      </div>
    `
  }

  private render(): void {
    if (!this.currentGraph || this.currentGraph.nodes.length === 0) {
      this.renderEmpty()
      return
    }

    const { nodes, edges, rootCauseNodeId, mermaidDiagram } = this.currentGraph

    // Group nodes by layer for hierarchical layout
    const layers = {
      docker: nodes.filter((n) => n.layer === 'docker'),
      network: nodes.filter((n) => n.layer === 'network'),
      console: nodes.filter((n) => n.layer === 'console'),
      dom: nodes.filter((n) => n.layer === 'dom')
    }

    const activeLayers = (['docker', 'network', 'console', 'dom'] as const).filter(
      (l) => layers[l].length > 0
    )

    // Calculate layout positions
    const nodePositions: Map<string, { x: number; y: number; width: number; height: number }> = new Map()
    const colWidth = 240
    const colGap = 80
    const rowGap = 30
    const cardWidth = 220
    const cardHeight = 76

    const totalCols = Math.max(activeLayers.length, 1)
    const svgWidth = Math.max(760, totalCols * (colWidth + colGap))

    let maxLayerCount = 0
    activeLayers.forEach((l) => {
      maxLayerCount = Math.max(maxLayerCount, layers[l].length)
    })
    const svgHeight = Math.max(340, maxLayerCount * (cardHeight + rowGap) + 80)

    activeLayers.forEach((layerKey, colIndex) => {
      const layerNodes = layers[layerKey]
      const colX = 40 + colIndex * (cardWidth + colGap)
      const startY = 50

      layerNodes.forEach((node, rowIndex) => {
        const rowY = startY + rowIndex * (cardHeight + rowGap)
        nodePositions.set(node.id, {
          x: colX,
          y: rowY,
          width: cardWidth,
          height: cardHeight
        })
      })
    })

    // Generate SVG Content
    let svgPaths = ''
    edges.forEach((edge) => {
      const srcPos = nodePositions.get(edge.source)
      const tgtPos = nodePositions.get(edge.target)
      if (srcPos && tgtPos) {
        const startX = srcPos.x + srcPos.width
        const startY = srcPos.y + srcPos.height / 2
        const endX = tgtPos.x
        const endY = tgtPos.y + tgtPos.height / 2

        const c1X = startX + (endX - startX) * 0.5
        const c1Y = startY
        const c2X = startX + (endX - startX) * 0.5
        const c2Y = endY

        svgPaths += `
          <path d="M ${startX} ${startY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${endX} ${endY}"
                class="dr-debug-causal-link"
                marker-end="url(#arrowhead)" />
          <path d="M ${startX} ${startY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${endX} ${endY}"
                class="dr-debug-causal-pulse" />
        `
      }
    })

    let nodesHtml = ''
    nodes.forEach((node) => {
      const pos = nodePositions.get(node.id) || { x: 0, y: 0, width: cardWidth, height: cardHeight }
      const isRoot = node.id === rootCauseNodeId || node.isRootCause
      const isSelected = node.id === this.selectedNodeId
      const layerClass = `node-${node.layer}`

      const rootBadge = isRoot
        ? `<div class="dr-debug-node-root-badge">🎯 ROOT CAUSE</div>`
        : ''

      nodesHtml += `
        <div class="dr-debug-graph-node ${layerClass} ${isRoot ? 'is-root' : ''} ${isSelected ? 'selected' : ''}"
             data-node-id="${node.id}"
             style="position: absolute; left: ${pos.x}px; top: ${pos.y}px; width: ${pos.width}px; height: ${pos.height}px;">
          ${rootBadge}
          <div class="dr-debug-node-header">
            <span class="dr-debug-node-title">${this.escapeHtml(node.label)}</span>
            <span class="dr-debug-node-layer">${node.layer.toUpperCase()}</span>
          </div>
          <div class="dr-debug-node-summary">${this.escapeHtml(node.summary)}</div>
        </div>
      `
    })

    this.element.innerHTML = `
      <div class="dr-debug-graph-toolbar">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: 700; font-size: 13px; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
            <span>🕸️</span> <span>Causal Dependency Graph</span>
          </span>
          <span class="dr-debug-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">
            ${nodes.length} Nodes / ${edges.length} Causal Links
          </span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="dr-debug-btn-copy-mermaid" class="dr-debug-btn-secondary" title="Copy Mermaid DAG markdown to clipboard">
            <span>📋</span> <span>Copy Mermaid</span>
          </button>
        </div>
      </div>

      <div class="dr-debug-graph-canvas-container">
        <div class="dr-debug-graph-canvas" style="position: relative; width: ${svgWidth}px; height: ${svgHeight}px;">
          <svg class="dr-debug-graph-svg" width="${svgWidth}" height="${svgHeight}">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#00f0ff" />
              </marker>
            </defs>
            ${svgPaths}
          </svg>
          ${nodesHtml}
        </div>
      </div>

      <div id="dr-debug-node-detail-box" class="dr-debug-node-detail-box" style="display: none;">
        <div class="dr-debug-detail-header">
          <span id="dr-debug-detail-title" style="font-weight: 700; color: #00f0ff;">Node Details</span>
          <button id="dr-debug-detail-close" class="dr-debug-close-btn" style="padding: 2px 6px;">✕</button>
        </div>
        <pre id="dr-debug-detail-content" class="dr-debug-detail-pre"></pre>
      </div>
    `

    // Bind event listeners
    const copyBtn = this.element.querySelector('#dr-debug-btn-copy-mermaid')
    copyBtn?.addEventListener('click', () => {
      navigator.clipboard?.writeText(mermaidDiagram)
      if (copyBtn) {
        const originalText = copyBtn.innerHTML
        copyBtn.innerHTML = '<span>✅</span> <span>Copied!</span>'
        setTimeout(() => {
          copyBtn.innerHTML = originalText
        }, 1500)
      }
    })

    const nodeEls = this.element.querySelectorAll('.dr-debug-graph-node')
    nodeEls.forEach((el) => {
      el.addEventListener('click', () => {
        const nodeId = el.getAttribute('data-node-id')
        if (nodeId) {
          this.showNodeDetails(nodeId)
        }
      })
    })

    const closeDetail = this.element.querySelector('#dr-debug-detail-close')
    closeDetail?.addEventListener('click', () => {
      const box = this.element.querySelector('#dr-debug-node-detail-box') as HTMLElement
      if (box) box.style.display = 'none'
      this.selectedNodeId = null
      this.element.querySelectorAll('.dr-debug-graph-node').forEach((n) => n.classList.remove('selected'))
    })
  }

  private showNodeDetails(nodeId: string): void {
    if (!this.currentGraph) return
    const node = this.currentGraph.nodes.find((n) => n.id === nodeId)
    if (!node) return

    this.selectedNodeId = nodeId
    this.element.querySelectorAll('.dr-debug-graph-node').forEach((n) => {
      n.classList.toggle('selected', n.getAttribute('data-node-id') === nodeId)
    })

    const box = this.element.querySelector('#dr-debug-node-detail-box') as HTMLElement
    const title = this.element.querySelector('#dr-debug-detail-title') as HTMLElement
    const content = this.element.querySelector('#dr-debug-detail-content') as HTMLElement

    if (box && title && content) {
      box.style.display = 'block'
      title.textContent = `[${node.layer.toUpperCase()}] ${node.label} ${node.isRootCause ? '🎯 (ROOT CAUSE)' : ''}`
      content.textContent = JSON.stringify(
        {
          id: node.id,
          layer: node.layer,
          timestamp: new Date(node.timestamp).toISOString(),
          summary: node.summary,
          metadata: node.metadata
        },
        null,
        2
      )
    }
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
