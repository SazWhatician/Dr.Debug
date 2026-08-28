export function computeCorrelations(state) {
    const correlations = [];
    const failedRequests = state.network.records.filter((r) => r.isFailed);
    const errorEntries = state.console.entries.filter((e) => e.level === 'error');
    const dockerErrors = (state.docker?.logs || []).filter((l) => l.level === 'error');
    // 1. Docker Backend Error -> Network Failure Correlations
    for (const doc of dockerErrors) {
        for (const req of failedRequests) {
            const timeDelta = req.startTime - doc.timestamp;
            // If docker error occurred within -1000ms to 3000ms of request
            if (timeDelta >= -1000 && timeDelta <= 3500) {
                const docSummary = `🐳 [${doc.containerName}] ${doc.message.slice(0, 70)}`;
                const reqSummary = `🌐 ${req.method} ${req.url} [${req.status || 0}]`;
                correlations.push({
                    id: `corr_${doc.id}_${req.id}`,
                    description: `Backend container [${doc.containerName}] panic at ${formatTime(doc.timestamp)} correlated with network failure [${req.method} ${req.url}] at ${formatTime(req.startTime)} (Δt: ${Math.abs(timeDelta)}ms)`,
                    likelihood: Math.abs(timeDelta) <= 1500 ? 'high' : 'medium',
                    sourceEvent: {
                        type: 'docker',
                        id: doc.id,
                        summary: docSummary,
                        timestamp: doc.timestamp
                    },
                    targetEvent: {
                        type: 'network',
                        id: req.id,
                        summary: reqSummary,
                        timestamp: req.startTime
                    },
                    timeDeltaMs: Math.abs(timeDelta)
                });
            }
        }
    }
    // 2. Network Failure -> Frontend Console Error Correlations
    for (const req of failedRequests) {
        for (const err of errorEntries) {
            const timeDelta = err.timestamp - req.startTime;
            // If error occurred within 0ms to 4000ms after a network failure
            if (timeDelta >= 0 && timeDelta <= 4000) {
                const reqSummary = `${req.method} ${req.url} (Status: ${req.status || 0}${req.isCORS ? ' - CORS' : ''})`;
                const errSummary = `${err.type}: ${err.message.slice(0, 80)}`;
                correlations.push({
                    id: `corr_${req.id}_${err.id}`,
                    description: `Network failure [${req.method} ${req.url}] at ${formatTime(req.startTime)} preceded error [${err.message.slice(0, 60)}] at ${formatTime(err.timestamp)} (+${(timeDelta / 1000).toFixed(1)}s)`,
                    likelihood: timeDelta <= 2000 ? 'high' : 'medium',
                    sourceEvent: {
                        type: 'network',
                        id: req.id,
                        summary: reqSummary,
                        timestamp: req.startTime
                    },
                    targetEvent: {
                        type: 'console',
                        id: err.id,
                        summary: errSummary,
                        timestamp: err.timestamp
                    },
                    timeDeltaMs: timeDelta
                });
            }
        }
    }
    return correlations;
}
export function buildCausalErrorGraph(state, options = {}) {
    const nodes = [];
    const edges = [];
    const timeframe = options.timeframeMs ?? 8000;
    const dockerErrors = (options.includeDocker !== false ? state.docker?.logs || [] : []).filter((l) => l.level === 'error');
    const failedRequests = state.network.records.filter((r) => r.isFailed || r.isSlow);
    const consoleErrors = state.console.entries.filter((e) => e.level === 'error' || e.level === 'warn');
    // 1. Create Docker Nodes
    dockerErrors.forEach((doc) => {
        nodes.push({
            id: doc.id,
            label: `🐳 ${doc.containerName}`,
            layer: 'docker',
            summary: doc.message.slice(0, 120),
            timestamp: doc.timestamp,
            metadata: { container: doc.containerName, stream: doc.stream, raw: doc.message }
        });
    });
    // 2. Create Network Nodes
    failedRequests.forEach((req) => {
        nodes.push({
            id: req.id,
            label: `🌐 ${req.method} ${req.url}`,
            layer: 'network',
            summary: `Status: ${req.status || 'FAILED'}${req.isCORS ? ' (CORS)' : ''} (${Math.round(req.duration || 0)}ms)`,
            timestamp: req.startTime,
            metadata: { url: req.url, status: req.status, isCORS: req.isCORS, duration: req.duration }
        });
    });
    // 3. Create Console Nodes
    consoleErrors.forEach((err) => {
        nodes.push({
            id: err.id,
            label: `🔴 ${err.type}`,
            layer: 'console',
            summary: err.message.slice(0, 120),
            timestamp: err.timestamp,
            metadata: { message: err.message, stack: err.stack, count: err.count }
        });
    });
    // 4. Build Causal Edges
    // A. Docker -> Network
    dockerErrors.forEach((doc) => {
        failedRequests.forEach((req) => {
            const delta = req.startTime - doc.timestamp;
            if (delta >= -1000 && delta <= timeframe) {
                edges.push({
                    id: `edge_${doc.id}_${req.id}`,
                    source: doc.id,
                    target: req.id,
                    label: `CAUSED_HTTP_FAILURE (+${Math.abs(delta)}ms)`,
                    timeDeltaMs: delta,
                    confidence: delta >= 0 && delta <= 1500 ? 0.95 : 0.8,
                    relationship: 'CAUSED_BY'
                });
            }
        });
    });
    // B. Network -> Console
    failedRequests.forEach((req) => {
        consoleErrors.forEach((err) => {
            const delta = err.timestamp - req.startTime;
            if (delta >= 0 && delta <= timeframe) {
                edges.push({
                    id: `edge_${req.id}_${err.id}`,
                    source: req.id,
                    target: err.id,
                    label: `TRIGGERED_CLIENT_ERROR (+${delta}ms)`,
                    timeDeltaMs: delta,
                    confidence: delta <= 2000 ? 0.92 : 0.75,
                    relationship: 'TRIGGERED_BY'
                });
            }
        });
    });
    // 5. Determine Root Cause Node
    // The root cause is the earliest node in an active causal edge sequence (prioritizing Docker > Network > Console)
    let rootCauseNodeId = undefined;
    if (edges.length > 0) {
        const targetSet = new Set(edges.map((e) => e.target));
        const sourceCandidates = nodes.filter((n) => edges.some((e) => e.source === n.id) && !targetSet.has(n.id));
        if (sourceCandidates.length > 0) {
            sourceCandidates.sort((a, b) => a.timestamp - b.timestamp);
            rootCauseNodeId = sourceCandidates[0].id;
            sourceCandidates[0].isRootCause = true;
        }
        else {
            rootCauseNodeId = edges[0].source;
            const found = nodes.find((n) => n.id === rootCauseNodeId);
            if (found)
                found.isRootCause = true;
        }
    }
    else if (nodes.length > 0) {
        // If no edges, fallback to oldest error node
        const sorted = [...nodes].sort((a, b) => a.timestamp - b.timestamp);
        rootCauseNodeId = sorted[0].id;
        sorted[0].isRootCause = true;
    }
    // 6. Generate Mermaid Diagram
    const mermaidLines = ['graph TD'];
    nodes.forEach((n) => {
        const cleanLabel = n.label.replace(/"/g, "'");
        const cleanSummary = n.summary.replace(/"/g, "'").replace(/\n/g, ' ');
        const rootTag = n.isRootCause ? ' [ROOT CAUSE]' : '';
        mermaidLines.push(`  ${n.id}["${cleanLabel}<br/>${cleanSummary}${rootTag}"]`);
    });
    edges.forEach((e) => {
        mermaidLines.push(`  ${e.source} -->|"${e.label}"| ${e.target}`);
    });
    // Class styling for mermaid
    mermaidLines.push('  classDef dockerNode fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff;');
    mermaidLines.push('  classDef netNode fill:#082f49,stroke:#00f0ff,stroke-width:2px,color:#e0f2fe;');
    mermaidLines.push('  classDef clientNode fill:#4c0519,stroke:#f43f5e,stroke-width:2px,color:#ffe4e6;');
    nodes.forEach((n) => {
        if (n.layer === 'docker')
            mermaidLines.push(`  class ${n.id} dockerNode;`);
        else if (n.layer === 'network')
            mermaidLines.push(`  class ${n.id} netNode;`);
        else if (n.layer === 'console')
            mermaidLines.push(`  class ${n.id} clientNode;`);
    });
    return {
        nodes,
        edges,
        rootCauseNodeId,
        mermaidDiagram: mermaidLines.join('\n')
    };
}
function formatTime(timestamp) {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}
function formatMB(bytes) {
    if (!bytes)
        return '0MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
export function debugStateToString(state, options = {}) {
    const maxConsole = options.maxConsoleEntries ?? 15;
    const maxNetwork = options.maxNetworkEntries ?? 12;
    const maxDocker = options.maxDockerEntries ?? 10;
    const lines = [];
    lines.push('<debug_state>');
    lines.push('');
    // 1. Page Context
    lines.push('<page_context>');
    lines.push(`  URL: ${state.pageContext.url || 'http://localhost'}`);
    lines.push(`  Title: "${state.pageContext.title || 'Web Application'}"`);
    lines.push(`  Uptime: ${state.pageContext.uptimeSeconds.toFixed(1)}s`);
    const statusEmoji = state.console.errorCount > 0 || state.network.failedCount > 0 ? '⚠️' : '✅';
    const dockerInfo = state.docker?.isAvailable
        ? ` | 🐳 Docker: ${state.docker.containers.length} active (${state.docker.errorCount} errors)`
        : '';
    lines.push(`  Status: ${statusEmoji} ${state.console.errorCount} Errors | ${state.network.failedCount} Failed Requests | ${state.network.slowCount} Slow Calls${dockerInfo}`);
    lines.push('</page_context>');
    lines.push('');
    // 2. Docker Telemetry Stream (if available or logs present)
    if (state.docker && (state.docker.logs.length > 0 || state.docker.containers.length > 0)) {
        lines.push(`<docker_stream containers="${state.docker.containers.length}" total_logs="${state.docker.logs.length}" errors="${state.docker.errorCount}">`);
        if (state.docker.containers.length > 0) {
            lines.push('  Active Containers:');
            state.docker.containers.forEach((c) => {
                lines.push(`    - [${c.name}] (${c.image}) State: ${c.state}`);
            });
        }
        const sortedDockerLogs = [...state.docker.logs].sort((a, b) => {
            const priority = (level) => (level === 'error' ? 3 : level === 'warn' ? 2 : 1);
            return priority(b.level) - priority(a.level) || b.timestamp - a.timestamp;
        });
        const dockerToRender = sortedDockerLogs.slice(0, maxDocker);
        if (dockerToRender.length > 0) {
            lines.push('  Recent Container Logs:');
            dockerToRender.forEach((log, idx) => {
                const lvl = log.level.toUpperCase().padEnd(5, ' ');
                const time = formatTime(log.timestamp);
                lines.push(`    [${idx}] ${lvl} ${time} [${log.containerName}] (${log.stream}): ${log.message.slice(0, 160)}`);
            });
            if (state.docker.logs.length > maxDocker) {
                lines.push(`    ... (${state.docker.logs.length - maxDocker} older container logs omitted)`);
            }
        }
        lines.push('</docker_stream>');
        lines.push('');
    }
    // 3. Console Stream (Priority sorted: errors first, then warnings, then logs)
    const sortedConsole = [...state.console.entries].sort((a, b) => {
        const priority = (level) => (level === 'error' ? 3 : level === 'warn' ? 2 : 1);
        return priority(b.level) - priority(a.level) || b.timestamp - a.timestamp;
    });
    const consoleToRender = sortedConsole.slice(0, maxConsole);
    lines.push(`<console_stream total="${state.console.total}" errors="${state.console.errorCount}" warnings="${state.console.warnCount}">`);
    if (consoleToRender.length === 0) {
        lines.push('  (No console entries recorded)');
    }
    else {
        consoleToRender.forEach((entry, idx) => {
            const levelTag = entry.level.toUpperCase().padEnd(5, ' ');
            const timeStr = formatTime(entry.timestamp);
            const countTag = entry.count > 1 ? ` (Occurred ${entry.count}x)` : '';
            lines.push(`  [${idx}] ${levelTag} ${timeStr} [${entry.type}] ${entry.message.slice(0, 180)}${countTag}`);
            if (entry.parsedStack && entry.parsedStack.length > 0) {
                const topFrames = entry.parsedStack.slice(0, 2);
                topFrames.forEach((frame) => {
                    lines.push(`      at ${frame.functionName || '<anonymous>'} (${frame.filename}:${frame.lineno}:${frame.colno})`);
                });
            }
        });
        if (state.console.total > maxConsole) {
            lines.push(`  ... (${state.console.total - maxConsole} older console messages omitted)`);
        }
    }
    lines.push('</console_stream>');
    lines.push('');
    // 4. Network Stream (Priority sorted: failed first, then slow, then OK)
    const sortedNetwork = [...state.network.records].sort((a, b) => {
        const priority = (r) => (r.isFailed ? 3 : r.isSlow ? 2 : 1);
        return priority(b) - priority(a) || b.startTime - a.startTime;
    });
    const networkToRender = sortedNetwork.slice(0, maxNetwork);
    lines.push(`<network_stream total="${state.network.total}" failed="${state.network.failedCount}" slow="${state.network.slowCount}">`);
    if (networkToRender.length === 0) {
        lines.push('  (No network calls recorded)');
    }
    else {
        networkToRender.forEach((req, idx) => {
            let statusTag = 'OK';
            if (req.isFailed) {
                statusTag = req.isCORS ? 'CORS_FAIL' : `FAIL(${req.status || 0})`;
            }
            else if (req.isSlow) {
                statusTag = `SLOW(${req.duration}ms)`;
            }
            const durStr = req.duration !== undefined ? `${req.duration}ms` : 'pending';
            lines.push(`  [${idx}] ${statusTag} [${req.method}] ${req.url} (${durStr})`);
            if (req.isFailed && req.error) {
                lines.push(`      Error: ${req.error}`);
            }
            if (req.responseBodyPreview) {
                const snippet = req.responseBodyPreview.replace(/\s+/g, ' ').slice(0, 100);
                lines.push(`      Response Preview: ${snippet}`);
            }
        });
        if (state.network.total > maxNetwork) {
            lines.push(`  ... (${state.network.total - maxNetwork} successful requests omitted)`);
        }
    }
    lines.push('</network_stream>');
    lines.push('');
    // 5. Performance & Web Vitals
    lines.push('<performance_vitals>');
    const vitals = state.performance.vitals;
    const lcp = vitals['LCP'] ? `${(vitals['LCP'].value / 1000).toFixed(2)}s (${vitals['LCP'].rating})` : 'N/A';
    const cls = vitals['CLS'] ? `${vitals['CLS'].value} (${vitals['CLS'].rating})` : 'N/A';
    const inp = vitals['INP'] ? `${vitals['INP'].value}ms (${vitals['INP'].rating})` : 'N/A';
    lines.push(`  LCP: ${lcp}`);
    lines.push(`  CLS: ${cls}`);
    lines.push(`  INP: ${inp}`);
    if (state.performance.longTasks.length > 0) {
        const topTask = state.performance.longTasks[state.performance.longTasks.length - 1];
        lines.push(`  Long Tasks: ${state.performance.longTasks.length} detected (Latest: ${topTask.duration}ms)`);
    }
    else {
        lines.push('  Long Tasks: 0 detected (<50ms)');
    }
    lines.push('</performance_vitals>');
    lines.push('');
    // 6. Memory Health
    if (state.memory) {
        lines.push('<memory_health>');
        const used = formatMB(state.memory.usedJSHeapSize);
        const total = formatMB(state.memory.totalJSHeapSize);
        const pct = state.memory.heapUsagePercent !== undefined ? `${state.memory.heapUsagePercent}%` : 'N/A';
        lines.push(`  Used Heap: ${used} / ${total} (${pct})`);
        if (state.memory.trendMBPerMin !== undefined) {
            const trendTag = state.memory.trendMBPerMin > 1.0 ? '⚠️ (Elevated Heap Growth)' : '✅ (Stable)';
            lines.push(`  Heap Trend: ${state.memory.trendMBPerMin > 0 ? '+' : ''}${state.memory.trendMBPerMin}MB/min ${trendTag}`);
        }
        if (state.memory.detachedNodesCount !== undefined) {
            lines.push(`  DOM Node Count: ${state.memory.detachedNodesCount} nodes`);
        }
        lines.push('</memory_health>');
        lines.push('');
    }
    // 7. Automated Heuristic Correlations (reuse pre-computed if available)
    const correlations = state.correlations.length > 0 ? state.correlations : computeCorrelations(state);
    if (correlations.length > 0) {
        lines.push('<heuristic_correlations>');
        lines.push('  💡 Automated Correlation Insights:');
        correlations.forEach((corr, idx) => {
            lines.push(`  ${idx + 1}. [${corr.likelihood.toUpperCase()} LIKELIHOOD] ${corr.description}`);
        });
        lines.push('</heuristic_correlations>');
        lines.push('');
    }
    // 8. Causal Error Graph (if requested)
    if (options.includeGraph && state.causalGraph && state.causalGraph.nodes.length > 0) {
        lines.push('<causal_error_graph>');
        lines.push(`  Nodes: ${state.causalGraph.nodes.length} | Edges: ${state.causalGraph.edges.length}`);
        if (state.causalGraph.rootCauseNodeId) {
            lines.push(`  Identified Root Cause Node: ${state.causalGraph.rootCauseNodeId}`);
        }
        lines.push('</causal_error_graph>');
        lines.push('');
    }
    lines.push('</debug_state>');
    return lines.join('\n');
}
//# sourceMappingURL=serializer.js.map