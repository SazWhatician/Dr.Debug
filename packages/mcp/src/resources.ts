import type { BrowserTabTelemetry, MCPResource, MCPResourceContent } from './types.js'

export class MCPResourceManager {
  public static listResources(sessions: Map<string, BrowserTabTelemetry>): MCPResource[] {
    const resources: MCPResource[] = [
      {
        uri: 'drdebug://state/live',
        name: 'Live Debug State Snapshot',
        mimeType: 'application/xml',
        description: 'Real-time <debug_state> XML token snapshot across console, network, docker, memory, and causal graphs.'
      },
      {
        uri: 'drdebug://console/errors',
        name: 'Console Runtime Error Stream',
        mimeType: 'application/json',
        description: 'Active uncaught runtime errors, unhandled rejections, and demangled stack frames.'
      },
      {
        uri: 'drdebug://network/failures',
        name: 'Network HTTP Failures & 4xx/5xx',
        mimeType: 'application/json',
        description: 'Failed HTTP requests, status codes, request/response headers, and payloads.'
      },
      {
        uri: 'drdebug://interactions/replay',
        name: 'User Interaction Replay Sequence',
        mimeType: 'text/plain',
        description: 'Chronological list of user clicks, inputs, scrolls, and DOM mutations in the 30 seconds leading up to bugs.'
      },
      {
        uri: 'drdebug://matrix/diagnostics',
        name: '2D Substrate Diagnostics Matrix',
        mimeType: 'application/json',
        description: '2D grid aggregating error severity across Network, Console, Docker, and System substrates.'
      }
    ]

    // Multi-tab dynamic resources
    for (const [tabId, tab] of sessions.entries()) {
      resources.push({
        uri: `drdebug://tab/${tabId}/state`,
        name: `Live State for [${tab.title || tab.url}]`,
        mimeType: 'application/json',
        description: `Browser tab ${tabId}: ${tab.url}`
      })
    }

    return resources
  }

  public static readResource(uri: string, sessions: Map<string, BrowserTabTelemetry>): MCPResourceContent {
    const defaultSession = Array.from(sessions.values())[0]
    const state = defaultSession?.stateSnapshot || {}

    if (uri === 'drdebug://state/live') {
      return {
        uri,
        mimeType: 'application/xml',
        text: state.serializedXml || '<debug_state><note>No active browser session connected.</note></debug_state>'
      }
    }

    if (uri === 'drdebug://console/errors') {
      const errors = (state.console?.entries || []).filter((e: any) => e.level === 'error')
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(errors, null, 2)
      }
    }

    if (uri === 'drdebug://network/failures') {
      const failed = (state.network?.records || []).filter((r: any) => r.isFailed || (r.status && r.status >= 400))
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(failed, null, 2)
      }
    }

    if (uri === 'drdebug://interactions/replay') {
      const replay = state.interactionsHuman || 'No interactions recorded.'
      return {
        uri,
        mimeType: 'text/plain',
        text: replay
      }
    }

    if (uri === 'drdebug://matrix/diagnostics') {
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(state.diagnosticMatrix || {}, null, 2)
      }
    }

    return {
      uri,
      mimeType: 'text/plain',
      text: `Resource "${uri}" not found.`
    }
  }
}
