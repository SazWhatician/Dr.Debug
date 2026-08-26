export const shadowStyles = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: #e6edf3;
  z-index: 2147483647;
  position: fixed;
  pointer-events: none;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.dr-debug-pill {
  pointer-events: auto;
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(13, 17, 23, 0.92);
  border: 1px solid rgba(48, 54, 61, 0.8);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(12px);
  padding: 8px 14px;
  border-radius: 9999px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-pill:hover {
  background: rgba(22, 27, 34, 0.98);
  border-color: #58a6ff;
  transform: translateY(-2px);
}

.dr-debug-pill-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
}

.dr-debug-pill-badge {
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.2px;
  color: #f0f6fc;
}

.dr-debug-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3fb950;
}

.dr-debug-pulse.error {
  background: #f85149;
  box-shadow: 0 0 0 0 rgba(248, 81, 73, 0.7);
  animation: pulse-red 1.6s infinite;
}

.dr-debug-pulse.running {
  background: #a371f7;
  box-shadow: 0 0 0 0 rgba(163, 113, 247, 0.7);
  animation: pulse-purple 1.2s infinite;
}

@keyframes pulse-red {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(248, 81, 73, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(248, 81, 73, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(248, 81, 73, 0); }
}

@keyframes pulse-purple {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(163, 113, 247, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(163, 113, 247, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(163, 113, 247, 0); }
}

/* Main Cockpit Drawer */
.dr-debug-modal {
  pointer-events: auto;
  position: fixed;
  bottom: 80px;
  right: 24px;
  width: 480px;
  max-width: calc(100vw - 48px);
  max-height: 680px;
  height: 600px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 12px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-modal.hidden {
  display: none;
}

@keyframes modal-fade-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Header */
.dr-debug-header {
  padding: 12px 16px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dr-debug-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
  color: #58a6ff;
}

.dr-debug-close-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s;
}

.dr-debug-close-btn:hover {
  color: #f0f6fc;
  background: #21262d;
}

/* Navigation Tabs */
.dr-debug-tabs {
  display: flex;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 0 8px;
}

.dr-debug-tab {
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.dr-debug-tab.active {
  color: #58a6ff;
  border-bottom-color: #58a6ff;
}

.dr-debug-tab:hover:not(.active) {
  color: #c9d1d9;
}

/* Body Content */
.dr-debug-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Search / Prompt Query Bar */
.dr-debug-query-box {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #161b22;
  border-top: 1px solid #30363d;
}

.dr-debug-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f0f6fc;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.dr-debug-input:focus {
  border-color: #58a6ff;
}

.dr-debug-btn {
  background: #238636;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 14px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.dr-debug-btn:hover {
  background: #2ea043;
}

.dr-debug-btn:disabled {
  background: #21262d;
  color: #6e7681;
  cursor: not-allowed;
}

/* Step Card & Timeline */
.dr-debug-step-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.dr-debug-step-num {
  font-weight: 700;
  color: #a371f7;
}

.dr-debug-step-tool {
  background: #21262d;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #58a6ff;
}

.dr-debug-step-thought {
  color: #8b949e;
  font-style: italic;
  font-size: 12px;
}

.dr-debug-step-output {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  color: #c9d1d9;
}

/* Final Diagnosis / Prescription Card */
.dr-debug-prescription-card {
  background: #1c2128;
  border: 1px solid #3fb950;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dr-debug-prescription-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: #3fb950;
  font-size: 13px;
}

.dr-debug-prescription-diff {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  overflow-x: auto;
  white-space: pre;
}

.dr-debug-diff-add {
  color: #3fb950;
  background: rgba(63, 185, 80, 0.15);
}

.dr-debug-diff-del {
  color: #f85149;
  background: rgba(248, 81, 73, 0.15);
}

.dr-debug-copy-btn {
  align-self: flex-end;
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.dr-debug-copy-btn:hover {
  background: #30363d;
  color: #f0f6fc;
}

/* Telemetry Items */
.dr-debug-telemetry-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 6px;
  font-size: 12px;
}

.dr-debug-telemetry-item.error {
  border-left: 3px solid #f85149;
}

.dr-debug-telemetry-item.warn {
  border-left: 3px solid #d29922;
}

.dr-debug-telemetry-item.ok {
  border-left: 3px solid #3fb950;
}
`
