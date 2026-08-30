import type { DiagnosticTool } from '../types.js'
import { checkStorageTool } from './check_storage.js'
import { doneTool } from './done.js'
import { executeJavascriptTool } from './execute_javascript.js'
import { findCorrelationsTool } from './find_correlations.js'
import { generatePatchTool } from './generate_patch.js'
import { graphifyErrorsTool } from './graphify_errors.js'
import { inspectDockerLogsTool } from './inspect_docker_logs.js'
import { inspectElementTool } from './inspect_element.js'
import { inspectErrorTool } from './inspect_error.js'
import { inspectLayoutTool } from './inspect_layout.js'
import { inspectRequestTool } from './inspect_request.js'
import { mockResponseTool } from './mock_response.js'
import { queryFrameworkStateTool } from './query_framework_state.js'
import { replayNetworkRequestTool } from './replay_network_request.js'
import { synthesizeTestTool } from './synthesize_test.js'

export function createDefaultTools(): DiagnosticTool[] {
  return [
    inspectErrorTool,
    inspectRequestTool,
    inspectDockerLogsTool,
    graphifyErrorsTool,
    inspectElementTool,
    inspectLayoutTool,
    queryFrameworkStateTool,
    executeJavascriptTool,
    findCorrelationsTool,
    replayNetworkRequestTool,
    mockResponseTool,
    synthesizeTestTool,
    generatePatchTool,
    checkStorageTool,
    doneTool
  ]
}

export {
  checkStorageTool,
  doneTool,
  executeJavascriptTool,
  findCorrelationsTool,
  generatePatchTool,
  graphifyErrorsTool,
  inspectDockerLogsTool,
  inspectElementTool,
  inspectErrorTool,
  inspectLayoutTool,
  inspectRequestTool,
  mockResponseTool,
  queryFrameworkStateTool,
  replayNetworkRequestTool,
  synthesizeTestTool
}

