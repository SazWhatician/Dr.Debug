export const shadowStyles = `
:host {
  all: initial;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: #f1f5f9;
  z-index: 2147483647;
  position: fixed;
  pointer-events: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ==========================================================================
   1. FLOATING PILL HUD (Holographic Capsule with Rotating Border Aura)
   ========================================================================== */

.dr-debug-pill {
  pointer-events: auto;
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(10, 14, 23, 0.88);
  border: 1px solid rgba(56, 189, 248, 0.28);
  box-shadow: 
    0 12px 32px -4px rgba(0, 0, 0, 0.7),
    0 4px 12px rgba(6, 182, 212, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(190%);
  -webkit-backdrop-filter: blur(20px) saturate(190%);
  padding: 7px 16px 7px 12px;
  border-radius: 9999px;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, box-shadow;
}

.dr-debug-pill:hover {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(56, 189, 248, 0.6);
  box-shadow: 
    0 16px 40px -4px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(6, 182, 212, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.25);
  transform: translateY(-3px) scale(1.03);
}

.dr-debug-pill:active {
  transform: translateY(-1px) scale(0.98);
}

/* Live Equalizer Activity Waves */
.dr-debug-equalizer {
  display: flex;
  align-items: flex-end;
  gap: 2.5px;
  height: 14px;
  width: 14px;
}

.dr-debug-eq-bar {
  flex: 1;
  background: #00f0ff;
  border-radius: 2px;
  height: 4px;
  transition: height 0.2s ease;
  animation: eq-pulse 1.4s ease-in-out infinite alternate;
}

.dr-debug-eq-bar:nth-child(1) { animation-delay: 0s; }
.dr-debug-eq-bar:nth-child(2) { animation-delay: 0.25s; }
.dr-debug-eq-bar:nth-child(3) { animation-delay: 0.5s; }

@keyframes eq-pulse {
  0% { height: 3px; opacity: 0.6; }
  50% { height: 13px; opacity: 1; }
  100% { height: 6px; opacity: 0.8; }
}

.dr-debug-pill-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
  filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.6));
}

.dr-debug-pill-badge {
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.3px;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dr-debug-chip {
  padding: 2px 7px;
  border-radius: 9999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.dr-debug-chip.err {
  background: rgba(244, 63, 94, 0.2);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.4);
  box-shadow: 0 0 8px rgba(244, 63, 94, 0.3);
}

.dr-debug-chip.net {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.dr-debug-chip.ok {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.dr-debug-chip.run {
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.4);
  animation: chip-glow 1.2s infinite alternate;
}

@keyframes chip-glow {
  from { box-shadow: 0 0 4px rgba(168, 85, 247, 0.3); }
  to { box-shadow: 0 0 12px rgba(168, 85, 247, 0.8); }
}

/* ==========================================================================
   2. MAIN COCKPIT DRAWER (Obsidian Glass Floating Terminal)
   ========================================================================== */

.dr-debug-modal {
  pointer-events: auto;
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 520px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 100px);
  height: 620px;
  background: rgba(8, 12, 22, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  box-shadow:
    0 24px 60px -8px rgba(0, 0, 0, 0.85),
    0 0 32px rgba(6, 182, 212, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(32px) saturate(220%);
  -webkit-backdrop-filter: blur(32px) saturate(220%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-spring-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 2147483647;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-modal.hidden {
  display: none;
}

.dr-debug-modal.maximized {
  inset: 10px;
  width: calc(100vw - 20px) !important;
  height: calc(100vh - 20px) !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 16px;
  bottom: auto;
  right: auto;
}

@keyframes modal-spring-in {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes slide-in-card {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes thinking-pulse {
  0%, 100% { transform: scale(1);   opacity: 0.5; box-shadow: 0 0 0 0 rgba(192,132,252,0.4); }
  50%       { transform: scale(1.4); opacity: 1;   box-shadow: 0 0 0 8px rgba(192,132,252,0); }
}

@keyframes causal-flow {
  from { stroke-dashoffset: 24; }
  to   { stroke-dashoffset: 0; }
}

/* Header (Draggable Handle) */
.dr-debug-header {
  padding: 10px 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.01) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
}

.dr-debug-header:active {
  cursor: grabbing;
}

.dr-debug-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dr-debug-brand-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
  filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.7));
}

.dr-debug-title-text {
  font-weight: 700;
  font-size: 12.5px;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, #ffffff 0%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dr-debug-header-metrics {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  color: #94a3b8;
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
}

.dr-debug-metric-badge {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dr-debug-close-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.dr-debug-close-btn:hover {
  color: #fff;
  background: rgba(244, 63, 94, 0.4);
  border-color: rgba(244, 63, 94, 0.7);
  transform: scale(1.05);
}

/* Tabs */
.dr-debug-tabs {
  display: flex;
  background: rgba(6, 9, 16, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 3px 6px;
  gap: 3px;
}

.dr-debug-tab {
  flex: 1;
  padding: 6px 8px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.2s ease;
}

.dr-debug-tab:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.dr-debug-tab.active {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.35);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15);
}

/* Body Content */
.dr-debug-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-body::-webkit-scrollbar {
  width: 6px;
}

.dr-debug-body::-webkit-scrollbar-track {
  background: rgba(10, 14, 23, 0.4);
}

.dr-debug-body::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.3);
  border-radius: 9999px;
}

.dr-debug-body::-webkit-scrollbar-thumb:hover {
  background: rgba(56, 189, 248, 0.6);
}

/* ==========================================================================
   3. DIAGNOSTIC TIMELINE & RE-ACT STEP CARDS
   ========================================================================== */

.dr-debug-timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  gap: 12px;
}

.dr-debug-radar-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px dashed rgba(56, 189, 248, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  animation: spin-slow 8s linear infinite;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%);
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.dr-debug-step-card {
  position: relative;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.2s, background 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: slide-in-card 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-step-card:hover {
  border-color: rgba(56, 189, 248, 0.3);
  background: rgba(20, 30, 50, 0.8);
}

.dr-debug-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dr-debug-step-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dr-debug-step-pill {
  background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
  color: #fff;
  font-weight: 700;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 0 6px rgba(168, 85, 247, 0.4);
}

.dr-debug-step-tool {
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
  font-size: 10.5px;
  font-weight: 600;
}

.dr-debug-step-reasoning-label {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #a855f7;
  margin-bottom: 2px;
}

.dr-debug-step-thought {
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.45;
  padding: 6px 10px;
  background: rgba(168, 85, 247, 0.07);
  border-left: 2px solid rgba(168, 85, 247, 0.6);
  border-radius: 0 5px 5px 0;
}

.dr-debug-step-output-label {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #38bdf8;
  margin-bottom: 2px;
  margin-top: 2px;
}

.dr-debug-step-output {
  background: rgba(6, 9, 16, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 5px;
  padding: 6px 8px;
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
  font-size: 10.5px;
  max-height: 130px;
  overflow-y: auto;
  white-space: pre-wrap;
  color: #94a3b8;
  line-height: 1.4;
}

/* ── AI Thinking / Reasoning Card ── */
.dr-debug-thinking-card {
  background: rgba(168, 85, 247, 0.06);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  animation: slide-in-card 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-thinking-pulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #c084fc;
  flex-shrink: 0;
  margin-top: 3px;
  animation: thinking-pulse 1.1s ease-in-out infinite;
}

.dr-debug-thinking-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dr-debug-thinking-label {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #c084fc;
}

.dr-debug-thinking-text {
  font-size: 12px;
  color: #e2e8f0;
  line-height: 1.4;
}

/* ==========================================================================
   4. PRESCRIPTION CARD & UNIFIED DIFF
   ========================================================================== */

.dr-debug-prescription-card {
  background: linear-gradient(145deg, rgba(16, 35, 28, 0.85) 0%, rgba(8, 20, 16, 0.95) 100%);
  border: 1px solid rgba(16, 185, 129, 0.4);
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.15);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-presc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dr-debug-presc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: #34d399;
  font-size: 12.5px;
}

.dr-debug-confidence-chip {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  font-weight: 700;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 9999px;
}

.dr-debug-presc-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dr-debug-presc-label {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #6ee7b7;
}

.dr-debug-presc-text {
  font-size: 11.5px;
  color: #f1f5f9;
  line-height: 1.4;
}

.dr-debug-prescription-diff {
  background: rgba(3, 7, 18, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px;
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
  font-size: 11px;
  overflow-x: auto;
  white-space: pre;
  color: #e2e8f0;
  line-height: 1.45;
}

.dr-debug-diff-add {
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  display: block;
  padding: 0 3px;
  border-radius: 2px;
}

.dr-debug-diff-del {
  color: #fb7185;
  background: rgba(244, 63, 94, 0.15);
  display: block;
  padding: 0 3px;
  border-radius: 2px;
}

.dr-debug-copy-btn {
  align-self: flex-end;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}

.dr-debug-copy-btn:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.5);
  color: #34d399;
}

.dr-debug-copy-inline {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #475569;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.4;
  flex-shrink: 0;
}

.dr-debug-copy-inline:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

.dr-debug-step-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

/* ==========================================================================
   5. TELEMETRY MATRIX & WATERFALL LATENCY CARDS
   ========================================================================== */

.dr-debug-telemetry-item {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11.5px;
  transition: all 0.2s;
}

.dr-debug-telemetry-item:hover {
  background: rgba(20, 30, 50, 0.8);
  border-color: rgba(56, 189, 248, 0.3);
}

.dr-debug-telemetry-item.error {
  border-left: 3px solid #f43f5e;
  background: rgba(244, 63, 94, 0.06);
}

.dr-debug-telemetry-item.net-fail {
  border-left: 3px solid #f59e0b;
  background: rgba(245, 158, 11, 0.06);
}

.dr-debug-telemetry-item.ok {
  border-left: 3px solid #10b981;
}

.dr-debug-telemetry-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: #94a3b8;
}

/* ==========================================================================
   6. QUICK PROMPTS & INTERACTIVE QUERY BAR
   ========================================================================== */

.dr-debug-query-wrapper {
  background: rgba(8, 12, 22, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
}

.dr-debug-chips-row {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.dr-debug-chips-row::-webkit-scrollbar {
  display: none;
}

.dr-debug-quick-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 10.5px;
  padding: 3px 8px;
  border-radius: 9999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.dr-debug-quick-chip:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  transform: translateY(-1px);
}

.dr-debug-query-box {
  display: flex;
  gap: 6px;
}

.dr-debug-input {
  flex: 1;
  background: rgba(6, 9, 16, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 7px 10px;
  color: #f8fafc;
  font-size: 11.5px;
  outline: none;
  transition: all 0.2s;
}

.dr-debug-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
  background: rgba(10, 15, 28, 0.95);
}

.dr-debug-btn {
  background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 7px 12px;
  font-weight: 700;
  font-size: 11.5px;
  letter-spacing: 0.2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 3px 10px rgba(6, 182, 212, 0.3);
}

.dr-debug-btn:hover {
  background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%);
  box-shadow: 0 4px 14px rgba(6, 182, 212, 0.45);
  transform: translateY(-1px);
}

.dr-debug-btn:disabled {
  background: rgba(255, 255, 255, 0.08);
  color: #64748b;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

/* ==========================================================================
   7. BRAND LOGO & RESPONSIVE ADAPTATION
   ========================================================================== */

.dr-debug-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.7));
  border-radius: 4px;
  display: block;
}

.dr-debug-logo.pill-logo {
  width: 18px;
  height: 18px;
}

.dr-debug-logo.header-logo {
  width: 22px;
  height: 22px;
}

.dr-debug-logo.radar-logo {
  width: 32px;
  height: 32px;
}

/* ==========================================================================
   8. CAUSAL GRAPH (Holographic Topology & Animated DAG)
   ========================================================================== */

.dr-debug-graph-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 280px;
}

.dr-debug-graph-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  background: rgba(6, 9, 16, 0.6);
  border: 1px dashed rgba(56, 189, 248, 0.2);
  border-radius: 12px;
}

.dr-debug-graph-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.15);
  border-radius: 8px;
  margin-bottom: 10px;
}

.dr-debug-graph-canvas-container {
  flex: 1;
  overflow: auto;
  background: radial-gradient(circle at center, rgba(15, 23, 42, 0.8) 0%, rgba(6, 9, 16, 0.95) 100%);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 10px;
  padding: 10px;
  min-height: 240px;
}

.dr-debug-graph-canvas-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.dr-debug-graph-canvas-container::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.3);
  border-radius: 3px;
}

.dr-debug-graph-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.dr-debug-causal-link {
  fill: none;
  stroke: rgba(56, 189, 248, 0.5);
  stroke-width: 2;
  stroke-dasharray: 4 3;
}

.dr-debug-causal-pulse {
  fill: none;
  stroke: #00f0ff;
  stroke-width: 2.5;
  stroke-dasharray: 8 20;
  animation: graph-pulse 1.8s linear infinite;
}

@keyframes graph-pulse {
  from { stroke-dashoffset: 28; }
  to { stroke-dashoffset: 0; }
}

.dr-debug-graph-node {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.dr-debug-graph-node:hover {
  border-color: #00f0ff;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.25);
  z-index: 10;
}

.dr-debug-graph-node.selected {
  border-color: #00f0ff;
  box-shadow: 0 0 16px rgba(0, 240, 255, 0.4);
}

.dr-debug-graph-node.node-docker {
  border-left: 3px solid #818cf8;
  background: linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
}

.dr-debug-graph-node.node-network {
  border-left: 3px solid #00f0ff;
  background: linear-gradient(135deg, rgba(8, 47, 73, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
}

.dr-debug-graph-node.node-console {
  border-left: 3px solid #f43f5e;
  background: linear-gradient(135deg, rgba(76, 5, 25, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
}

.dr-debug-graph-node.node-dom {
  border-left: 3px solid #c084fc;
  background: linear-gradient(135deg, rgba(59, 7, 100, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
}

.dr-debug-graph-node.is-root {
  border: 1.5px solid #f43f5e !important;
  box-shadow: 0 0 20px rgba(244, 63, 94, 0.4) !important;
}

.dr-debug-node-root-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  background: #f43f5e;
  color: #fff;
  letter-spacing: 0.4px;
}

.dr-debug-node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.dr-debug-node-title {
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dr-debug-node-layer {
  font-size: 9px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.dr-debug-node-summary {
  font-size: 10.5px;
  color: #cbd5e1;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dr-debug-node-detail-box {
  margin-top: 10px;
  background: rgba(6, 9, 16, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
}

.dr-debug-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.dr-debug-detail-pre {
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: #94a3b8;
  background: rgba(0, 0, 0, 0.4);
  padding: 8px;
  border-radius: 6px;
  max-height: 140px;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* ==========================================================================
   8. CAUSAL GRAPH VIEW
   ========================================================================== */

.dr-debug-graph-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.dr-debug-graph-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 32px 20px;
  gap: 8px;
  color: #64748b;
}

.dr-debug-graph-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px;
  flex-shrink: 0;
}

.dr-debug-btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.dr-debug-btn-secondary:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

.dr-debug-badge {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 600;
}

.dr-debug-graph-canvas-container {
  overflow: auto;
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(4, 7, 14, 0.6);
  position: relative;
}

.dr-debug-graph-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.dr-debug-causal-link {
  fill: none;
  stroke: rgba(0, 240, 255, 0.45);
  stroke-width: 1.5;
  stroke-dasharray: 6 3;
  animation: causal-flow 1.5s linear infinite;
}

.dr-debug-causal-pulse {
  fill: none;
  stroke: rgba(0, 240, 255, 0.12);
  stroke-width: 4;
}

.dr-debug-graph-node {
  position: absolute;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.85);
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.dr-debug-graph-node:hover {
  transform: scale(1.03);
  z-index: 2;
}

.dr-debug-graph-node.node-docker {
  border-color: rgba(251, 146, 60, 0.4);
  background: rgba(30, 18, 10, 0.9);
}

.dr-debug-graph-node.node-network {
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(8, 22, 32, 0.9);
}

.dr-debug-graph-node.node-console {
  border-color: rgba(244, 63, 94, 0.4);
  background: rgba(28, 10, 16, 0.9);
}

.dr-debug-graph-node.node-dom {
  border-color: rgba(99, 102, 241, 0.4);
  background: rgba(15, 14, 36, 0.9);
}

.dr-debug-graph-node.is-root {
  box-shadow: 0 0 16px rgba(251, 146, 60, 0.5), 0 2px 8px rgba(0, 0, 0, 0.4);
  border-width: 2px;
}

.dr-debug-graph-node.selected {
  outline: 2px solid #38bdf8;
  outline-offset: 2px;
  z-index: 3;
}

.dr-debug-node-root-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(251, 146, 60, 0.9);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 9999px;
  white-space: nowrap;
}

.dr-debug-node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.dr-debug-node-title {
  font-size: 11px;
  font-weight: 600;
  color: #f1f5f9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.dr-debug-node-layer {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  color: #64748b;
  flex-shrink: 0;
}

.dr-debug-node-summary {
  font-size: 10px;
  color: #64748b;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.dr-debug-node-detail-box {
  background: rgba(8, 12, 22, 0.98);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
  flex-shrink: 0;
  max-height: 140px;
  overflow: hidden;
}

.dr-debug-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dr-debug-detail-pre {
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #94a3b8;
  white-space: pre-wrap;
  overflow-y: auto;
  max-height: 90px;
}

@media (max-width: 520px) {
  .dr-debug-modal {
    width: calc(100vw - 20px) !important;
    left: 10px !important;
    right: 10px !important;
    bottom: 10px !important;
    height: 75vh !important;
    max-height: 75vh !important;
    border-radius: 12px;
  }

  .dr-debug-header {
    padding: 8px 10px;
  }

  .dr-debug-header-metrics {
    display: none;
  }

  .dr-debug-tabs {
    padding: 2px 4px;
  }

  .dr-debug-tab {
    padding: 5px 6px;
    font-size: 10.5px;
  }

  .dr-debug-body {
    padding: 8px;
  }

  .dr-debug-pill {
    bottom: 16px;
    right: 16px;
    padding: 5px 12px;
    gap: 6px;
  }
}
`


