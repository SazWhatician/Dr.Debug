export interface MCPResource {
  uri: string
  name: string
  mimeType: string
  description: string
}

export interface MCPResourceContent {
  uri: string
  mimeType: string
  text?: string
  blob?: string
}

export interface MCPToolParameter {
  type: string
  description?: string
  enum?: string[]
  properties?: Record<string, any>
  required?: string[]
}

export interface MCPToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

export interface BrowserTabTelemetry {
  tabId: string
  url: string
  title: string
  lastSeen: number
  stateSnapshot: any
}
