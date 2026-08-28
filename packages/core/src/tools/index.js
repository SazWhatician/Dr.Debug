import { checkStorageTool } from './check_storage.js';
import { doneTool } from './done.js';
import { executeJavascriptTool } from './execute_javascript.js';
import { findCorrelationsTool } from './find_correlations.js';
import { graphifyErrorsTool } from './graphify_errors.js';
import { inspectDockerLogsTool } from './inspect_docker_logs.js';
import { inspectElementTool } from './inspect_element.js';
import { inspectErrorTool } from './inspect_error.js';
import { inspectRequestTool } from './inspect_request.js';
import { queryFrameworkStateTool } from './query_framework_state.js';
import { replayNetworkRequestTool } from './replay_network_request.js';
export function createDefaultTools() {
    return [
        inspectErrorTool,
        inspectRequestTool,
        inspectDockerLogsTool,
        graphifyErrorsTool,
        inspectElementTool,
        queryFrameworkStateTool,
        executeJavascriptTool,
        findCorrelationsTool,
        replayNetworkRequestTool,
        checkStorageTool,
        doneTool
    ];
}
export { checkStorageTool, doneTool, executeJavascriptTool, findCorrelationsTool, graphifyErrorsTool, inspectDockerLogsTool, inspectElementTool, inspectErrorTool, inspectRequestTool, queryFrameworkStateTool, replayNetworkRequestTool };
//# sourceMappingURL=index.js.map