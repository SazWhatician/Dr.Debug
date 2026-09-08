export const shadowStyles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

:host {
  all: initial;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  flex-wrap: wrap;
  line-height: 1.15;
  user-select: none;
}

.dr-debug-brand-bold {
  color: #ffffff;
  font-weight: 800;
  font-size: 13.5px;
  letter-spacing: 0.8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif;
  text-shadow: 0 0 16px rgba(255, 255, 255, 0.45), 0 2px 4px rgba(0, 0, 0, 0.85);
  -webkit-font-smoothing: antialiased;
  display: inline-block;
}

.dr-debug-brand-sub {
  color: #38bdf8;
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.8px;
  opacity: 0.88;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.dr-debug-brand-sep {
  color: rgba(56, 189, 248, 0.45);
  font-weight: 400;
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
  padding: 4px 6px;
  gap: 3px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  align-items: center;
  flex-shrink: 0;
}

.dr-debug-tabs::-webkit-scrollbar {
  display: none;
}

.dr-debug-tab {
  flex: 1 1 0;
  min-width: max-content;
  height: 28px;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid transparent;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  user-select: none;
  box-sizing: border-box;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.dr-debug-tab:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.dr-debug-tab.active {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.14);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15);
}

/* In-Tab Guide Trigger & Header */
.dr-debug-tab-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.dr-debug-tab-view-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 700;
  color: #f8fafc;
}

.dr-debug-tab-guide-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.28);
  color: #38bdf8;
  border-radius: 9999px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  line-height: 1;
}

.dr-debug-tab-guide-trigger:hover {
  background: rgba(56, 189, 248, 0.25);
  border-color: rgba(56, 189, 248, 0.6);
  color: #ffffff;
  transform: scale(1.04);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
}

.dr-debug-tab-guide-trigger svg {
  width: 10px;
  height: 10px;
  stroke: currentColor;
  flex-shrink: 0;
}

/* Tab Guide Overlay Card */
.dr-debug-tab-info-backdrop {
  position: absolute;
  top: 76px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(4, 7, 15, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 94;
  animation: tab-info-fade-in 0.2s ease;
}

.dr-debug-tab-info-card {
  position: absolute;
  top: 80px;
  left: 12px;
  right: 12px;
  max-height: calc(100% - 136px);
  background: rgba(10, 15, 29, 0.96);
  border: 1px solid rgba(56, 189, 248, 0.38);
  border-radius: 12px;
  box-shadow:
    0 20px 50px -8px rgba(0, 0, 0, 0.88),
    0 0 30px rgba(6, 182, 212, 0.22),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(28px) saturate(200%);
  -webkit-backdrop-filter: blur(28px) saturate(200%);
  z-index: 95;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: tab-info-spring-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-tab-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(6, 9, 16, 0.6);
}

.dr-debug-tab-info-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dr-debug-tab-info-icon {
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dr-debug-tab-info-title {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: -0.2px;
}

.dr-debug-tab-info-badge {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 7px;
  border-radius: 9999px;
  background: rgba(56, 189, 248, 0.16);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.35);
}

.dr-debug-tab-info-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(56, 189, 248, 0.3) rgba(10, 14, 23, 0.4);
}

.dr-debug-tab-info-body::-webkit-scrollbar {
  width: 5px;
}

.dr-debug-tab-info-body::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.35);
  border-radius: 9999px;
}

.dr-debug-tab-info-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.dr-debug-tab-info-sec-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 5px;
}

.dr-debug-tab-info-desc {
  font-size: 12px;
  line-height: 1.5;
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 9px 11px;
}

.dr-debug-tab-info-tips {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
}

.dr-debug-tab-info-tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 11.5px;
  line-height: 1.45;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 7px 9px;
}

.dr-debug-tab-info-tip-bullet {
  font-size: 12px;
  line-height: 1;
  margin-top: 1px;
  flex-shrink: 0;
}

.dr-debug-tab-info-tip-text strong {
  color: #38bdf8;
  font-weight: 600;
}

.dr-debug-tab-info-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(6, 9, 16, 0.6);
  gap: 10px;
}

.dr-debug-tab-info-status {
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 5px;
}

.dr-debug-tab-info-status.active {
  color: #34d399;
}

.dr-debug-tab-info-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dr-debug-tab-info-btn-switch {
  background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-tab-info-btn-switch:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(6, 182, 212, 0.5);
}

.dr-debug-tab-info-btn-gotit {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.dr-debug-tab-info-btn-gotit:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.25);
}

@keyframes tab-info-spring-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes tab-info-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}


/* Body Content */
.dr-debug-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(56, 189, 248, 0.3) rgba(10, 14, 23, 0.4);
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
  line-height: 1.55;
  /* The root-cause text carries its own paragraph and causal-chain line breaks;
     collapsing them turns the whole section into one unreadable block. */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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

.dr-debug-telemetry-item.warn {
  border-left: 3px solid #38bdf8;
  background: rgba(56, 189, 248, 0.06);
}

.dr-debug-telemetry-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: #94a3b8;
}

.dr-debug-telemetry-tag.error {
  color: #fb7185;
  font-weight: 700;
}

.dr-debug-telemetry-tag.net-fail {
  color: #fbbf24;
  font-weight: 700;
}

.dr-debug-telemetry-tag.warn {
  color: #38bdf8;
  font-weight: 700;
}

.dr-debug-telemetry-tag.ok {
  color: #34d399;
  font-weight: 700;
}

.dr-debug-telemetry-time {
  color: #64748b;
  font-size: 9.5px;
}

.dr-debug-telemetry-payload {
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
  font-size: 11.5px;
  color: #f1f5f9;
  word-break: break-word;
  line-height: 1.45;
}

.dr-debug-telemetry-text {
  font-size: 12px;
  color: #cbd5e1;
  line-height: 1.45;
}

.dr-debug-triage-empty {
  color: #34d399;
  text-align: center;
  padding: 40px 10px;
  font-size: 13px;
}

.dr-debug-triage-empty-title {
  color: #34d399;
  font-size: 13px;
}

.dr-debug-triage-empty-desc {
  color: #64748b;
  font-size: 12px;
  margin-top: 4px;
}

.dr-debug-empty-title {
  color: #f1f5f9;
  font-size: 13px;
}

.dr-debug-empty-desc {
  font-size: 12px;
  max-width: 320px;
  line-height: 1.5;
  color: #94a3b8;
}

.dr-debug-presc-files {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11.5px;
  color: #38bdf8;
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
}

/* ==========================================================================
   9. ERRORS & ANOMALY MATRIX (2D HEATMAP GRID, STREAM, cURL & WORKBENCH)
   ========================================================================== */

.dr-debug-error-dashboard {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 8px;
}

.dr-debug-err-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 2px;
  gap: 8px;
  flex-shrink: 0;
}

.dr-debug-err-title {
  font-size: 12px;
  font-weight: 700;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dr-debug-err-stats {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.dr-debug-stat-chip {
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: all 0.2s;
}

.dr-debug-stat-chip:hover {
  transform: translateY(-1px);
  filter: brightness(1.2);
}

.chip-5xx { background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.35); }
.chip-4xx { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }
.chip-js { background: rgba(236, 72, 153, 0.2); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.35); }
.chip-doc { background: rgba(129, 140, 248, 0.2); color: #a5b4fc; border: 1px solid rgba(129, 140, 248, 0.35); }

/* Mode Switcher & Search Bar */
.dr-debug-matrix-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.dr-debug-mode-toggle {
  display: flex;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.dr-debug-mode-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.dr-debug-mode-btn.active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.2);
}

.dr-debug-search-box {
  flex: 1;
  position: relative;
  max-width: 260px;
}

.dr-debug-search-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 4px 8px 4px 24px;
  font-size: 11px;
  color: #f1f5f9;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.dr-debug-search-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
}

.dr-debug-search-icon {
  position: absolute;
  left: 7px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: #64748b;
  pointer-events: none;
}

/* 2D Multi-Dimensional Matrix Grid */
/* Modern Status Dot Indicators */
.dr-debug-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.dr-debug-status-dot.dot-critical { background: #f43f5e; box-shadow: 0 0 6px rgba(244, 63, 94, 0.6); }
.dr-debug-status-dot.dot-high { background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.6); }
.dr-debug-status-dot.dot-notice { background: #38bdf8; box-shadow: 0 0 6px rgba(56, 189, 248, 0.6); }
.dr-debug-status-dot.dot-5xx { background: #fb7185; }
.dr-debug-status-dot.dot-4xx { background: #fbbf24; }
.dr-debug-status-dot.dot-js { background: #f472b6; }
.dr-debug-status-dot.dot-docker { background: #818cf8; }
.dr-debug-status-dot.dot-sys { background: #34d399; }

.dr-debug-2d-matrix {
  flex-shrink: 0;
  background: rgba(10, 15, 28, 0.92);
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 6px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  width: 100%;
  box-sizing: border-box;
}

.dr-debug-matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 3px 2px;
  table-layout: fixed;
}

.dr-debug-matrix-th {
  font-size: 8px;
  font-weight: 700;
  color: #94a3b8;
  text-align: center;
  padding: 1px 2px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.dr-debug-matrix-row-label {
  font-size: 8.5px;
  font-weight: 700;
  color: #cbd5e1;
  padding: 1px 3px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  letter-spacing: 0.2px;
}

.dr-debug-matrix-cell {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  padding: 3px 2px;
  text-align: center;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  min-width: 44px;
  box-sizing: border-box;
}

.dr-debug-matrix-cell:hover {
  transform: translateY(-1px);
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.dr-debug-matrix-cell.has-errors {
  background: rgba(15, 23, 42, 0.85);
}

.dr-debug-matrix-cell.sev-critical.has-errors {
  border-color: rgba(244, 63, 94, 0.45);
  background: rgba(244, 63, 94, 0.1);
}

.dr-debug-matrix-cell.sev-high.has-errors {
  border-color: rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.1);
}

.dr-debug-matrix-cell.sev-notice.has-errors {
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(56, 189, 248, 0.08);
}

.dr-debug-matrix-cell.active-filter {
  box-shadow: 0 0 0 2px #00f0ff, 0 0 12px rgba(0, 240, 255, 0.4);
  border-color: #00f0ff !important;
}

.dr-debug-cell-count {
  font-size: 11px;
  line-height: 1.1;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.dr-debug-cell-count.critical { color: #fb7185; }
.dr-debug-cell-count.high { color: #fbbf24; }
.dr-debug-cell-count.notice { color: #38bdf8; }
.dr-debug-cell-count.zero { color: #475569; font-size: 9.5px; font-weight: 400; }

.dr-debug-cell-sub {
  font-size: 6.5px;
  color: #64748b;
  margin-top: 0px;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  line-height: 1;
}

/* Histogram Graph */
.dr-debug-chart-wrapper {
  background: rgba(10, 15, 28, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dr-debug-hist-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #38bdf8;
  letter-spacing: 0.4px;
}

.dr-debug-histogram {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 48px;
  padding-top: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dr-debug-hist-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  gap: 2px;
  cursor: pointer;
}

.dr-debug-hist-bar {
  width: 100%;
  border-radius: 2px 2px 0 0;
  display: flex;
  flex-direction: column-reverse;
  overflow: hidden;
  transition: all 0.2s ease;
  min-height: 3px;
}

.dr-debug-hist-col:hover .dr-debug-hist-bar {
  filter: brightness(1.25);
  transform: scaleY(1.08);
}

.dr-debug-hist-label {
  font-size: 8px;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
}

/* Filter Bar */
.dr-debug-err-filter-bar {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 2px 0;
  flex-shrink: 0;
}

.dr-debug-err-filter-bar::-webkit-scrollbar { display: none; }

.dr-debug-filter-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.18s;
}

.dr-debug-filter-btn:hover {
  background: rgba(56, 189, 248, 0.12);
  color: #f1f5f9;
  border-color: rgba(56, 189, 248, 0.3);
}

.dr-debug-filter-btn.active {
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  border-color: #38bdf8;
}

/* Main Split View */
.dr-debug-err-main-view {
  display: flex;
  gap: 8px;
  flex: 1 1 0;
  min-height: 0;
}

.dr-debug-err-list {
  flex: 1 1 0;
  min-width: 0;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dr-debug-err-list::-webkit-scrollbar { width: 4px; }
.dr-debug-err-list::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.3); border-radius: 4px; }

.dr-debug-err-empty {
  text-align: center;
  padding: 30px 10px;
  color: #94a3b8;
  font-size: 12px;
}

.dr-debug-err-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: all 0.2s;
}

.dr-debug-err-card:hover {
  background: rgba(20, 30, 50, 0.85);
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateX(2px);
}

.dr-debug-err-card.selected {
  border-color: #00f0ff;
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
  background: rgba(14, 26, 48, 0.95);
}

.dr-debug-err-card.type-5xx { border-left: 3px solid #f43f5e; }
.dr-debug-err-card.type-4xx { border-left: 3px solid #f59e0b; }
.dr-debug-err-card.type-console { border-left: 3px solid #ec4899; }
.dr-debug-err-card.type-docker { border-left: 3px solid #818cf8; }

.dr-debug-err-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dr-debug-err-badge {
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}

.badge-5xx { background: rgba(244, 63, 94, 0.2); color: #fb7185; }
.badge-4xx { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.badge-console { background: rgba(236, 72, 153, 0.2); color: #f472b6; }
.badge-docker { background: rgba(129, 140, 248, 0.2); color: #a5b4fc; }

.dr-debug-err-time {
  font-size: 9px;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
}

.dr-debug-err-card-title {
  font-size: 11.5px;
  font-weight: 600;
  color: #f1f5f9;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dr-debug-err-card-subtitle {
  font-size: 10px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Inspector Drawer */
.dr-debug-err-inspector {
  flex: 1.2 1 0;
  min-width: 0;
  min-height: 380px;
  box-sizing: border-box;
  background: rgba(6, 10, 20, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.dr-debug-err-inspector::-webkit-scrollbar { width: 4px; }
.dr-debug-err-inspector::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.3); border-radius: 4px; }

.dr-debug-insp-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dr-debug-insp-badge {
  font-size: 9.5px;
  font-weight: 700;
  color: #fb7185;
  background: rgba(244, 63, 94, 0.15);
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  margin-bottom: 3px;
}

.dr-debug-insp-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #f8fafc;
  font-family: 'JetBrains Mono', monospace;
  word-break: break-all;
}

.dr-debug-insp-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.dr-debug-btn-primary-glow {
  flex: 1;
  background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%);
  color: #ffffff;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  box-shadow: 0 3px 12px rgba(6, 182, 212, 0.35);
  transition: all 0.2s;
}

.dr-debug-btn-primary-glow:hover {
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.6);
  transform: translateY(-1px);
}

.dr-debug-btn-curl {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: #ffffff;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  transition: all 0.2s;
}

.dr-debug-btn-curl:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

.dr-debug-btn-replay {
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.dr-debug-btn-replay:hover {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  transform: translateY(-1px);
}

.dr-debug-btn-mock {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.dr-debug-btn-mock:hover {
  background: rgba(245, 158, 11, 0.25);
  border-color: #fbbf24;
  transform: translateY(-1px);
}

.dr-debug-btn-synth {
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.35);
  color: #c084fc;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.dr-debug-btn-synth:hover {
  background: rgba(168, 85, 247, 0.25);
  border-color: #c084fc;
  transform: translateY(-1px);
}

.dr-debug-copy-inline-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.dr-debug-copy-inline-btn:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

.dr-debug-copy-inline-btn.primary {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(129, 140, 248, 0.16));
  border-color: rgba(56, 189, 248, 0.4);
  color: #7dd3fc;
  font-weight: 700;
}

.dr-debug-copy-inline-btn.primary:hover {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(129, 140, 248, 0.28));
  border-color: rgba(56, 189, 248, 0.7);
  color: #e0f2fe;
}

.dr-debug-copy-inline-btn.copied {
  background: rgba(16, 185, 129, 0.22) !important;
  border-color: rgba(16, 185, 129, 0.6) !important;
  color: #6ee7b7 !important;
}

/* RFC Status Explainer Box */
.dr-debug-rfc-box {
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.25);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dr-debug-rfc-box.type-4xx {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.25);
}

.dr-debug-rfc-title {
  font-size: 11px;
  font-weight: 700;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 5px;
}

.dr-debug-rfc-desc {
  font-size: 10.5px;
  color: #cbd5e1;
  line-height: 1.4;
}

.dr-debug-rfc-rec {
  font-size: 10px;
  color: #38bdf8;
  font-weight: 600;
  margin-top: 2px;
}

/* cURL Preview Code Box */
.dr-debug-curl-preview {
  background: rgba(3, 7, 18, 0.95);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
  padding: 8px 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #6ee7b7;
  white-space: pre-wrap;
  word-break: break-all;
  position: relative;
}


/* Demangled Call Frames Visualizer */
.dr-debug-frame-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dr-debug-frame-item {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 5px;
  padding: 5px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  font-family: ui-monospace, 'Fira Code', Menlo, monospace;
  font-size: 10.5px;
  transition: all 0.15s;
}

.dr-debug-frame-item.user-code {
  border-color: rgba(56, 189, 248, 0.3);
  background: rgba(14, 30, 56, 0.7);
}

.dr-debug-frame-item:hover {
  background: rgba(30, 41, 59, 0.9);
  border-color: #38bdf8;
}

.dr-debug-frame-fn {
  color: #f1f5f9;
  font-weight: 600;
}

.dr-debug-frame-loc {
  color: #94a3b8;
  font-size: 9.5px;
}

.dr-debug-frame-tag {
  font-size: 8.5px;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
}

.tag-user { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
.tag-vendor { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }

.dr-debug-insp-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-insp-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dr-debug-insp-sec-title {
  font-size: 10px;
  font-weight: 700;

  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dr-debug-code-box {
  background: rgba(3, 7, 18, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  padding: 6px 8px;
  font-family: ui-monospace, 'Fira Code', Menlo, monospace;
  font-size: 10.5px;
  color: #cbd5e1;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
}

.dr-debug-code-box.error-highlight {
  border-color: rgba(244, 63, 94, 0.3);
  color: #fca5a5;
  background: rgba(20, 6, 10, 0.85);
}

/* ==========================================================================
   10. SETTINGS MODAL OVERLAY
   ========================================================================== */

.dr-debug-settings-overlay {
  position: absolute;
  inset: 0;
  background: rgba(6, 9, 16, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: 14px;
  animation: modal-spring-in 0.25s ease;
}

.dr-debug-settings-modal {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dr-debug-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 12px;
}

.dr-debug-settings-title {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dr-debug-settings-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.dr-debug-form-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dr-debug-form-label {
  font-size: 10.5px;
  font-weight: 600;
  color: #94a3b8;
}

.dr-debug-form-select, .dr-debug-form-input {
  background: rgba(6, 9, 16, 0.9);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 7px 10px;
  color: #f8fafc;
  font-size: 11.5px;
  outline: none;
  transition: all 0.2s;
}

.dr-debug-form-select:focus, .dr-debug-form-input:focus {
  border-color: #00f0ff;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);
}

.dr-debug-settings-status {
  font-size: 11px;
  min-height: 16px;
  line-height: 1.4;
  margin-top: 2px;
}

.dr-debug-settings-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.dr-debug-btn-outline {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #e2e8f0;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 11.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.2s;
}

.dr-debug-btn-outline:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: #00f0ff;
  color: #00f0ff;
}

/* Settings Update Banner & Button */
.dr-debug-settings-update-banner {
  margin-top: 10px;
  padding: 9px 12px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.45) 100%);
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.dr-debug-update-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dr-debug-update-tag {
  font-size: 8.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #38bdf8;
  opacity: 0.85;
}

.dr-debug-update-version {
  font-size: 11.5px;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 0.2px;
}

.dr-debug-btn-update {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(14, 165, 233, 0.28) 100%);
  border: 1px solid rgba(56, 189, 248, 0.45);
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 11.5px;
  letter-spacing: 0.3px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 10px rgba(14, 165, 233, 0.25);
}

.dr-debug-btn-update:hover {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.32) 0%, rgba(14, 165, 233, 0.48) 100%);
  border-color: #38bdf8;
  color: #ffffff;
  box-shadow: 0 4px 18px rgba(56, 189, 248, 0.45);
  transform: translateY(-1px);
}

.dr-debug-btn-update:active {
  transform: translateY(0);
}

.dr-debug-update-arrow {
  font-size: 12px;
  transition: transform 0.2s ease;
}

.dr-debug-btn-update:hover .dr-debug-update-arrow {
  transform: translate(1.5px, -1.5px);
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

  .dr-debug-err-main-view {
    flex-direction: column;
  }

  .dr-debug-docker-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 10px;
  }

  .dr-debug-docker-status-left {
    width: 100%;
  }

  .dr-debug-docker-status-right {
    width: 100%;
    justify-content: flex-start;
    gap: 6px;
  }
}

/* Voice Debugger Component Styles */
.dr-debug-voice-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dr-debug-voice-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
}

.dr-debug-voice-btn.listening {
  background: rgba(244, 63, 94, 0.25);
  border-color: #f43f5e;
  color: #f43f5e;
  animation: pulse-voice 1.2s infinite ease-in-out;
}

@keyframes pulse-voice {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.5); }
  50% { transform: scale(1.12); box-shadow: 0 0 0 8px rgba(244, 63, 94, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
}

/* ── Session hand-off: "Copy for AI" ───────────────────────────────────── */

.dr-debug-export-btn {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(129, 140, 248, 0.18));
  border: 1px solid rgba(56, 189, 248, 0.45);
  color: #7dd3fc;
  border-radius: 6px;
  padding: 5px 11px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.dr-debug-export-btn:hover {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(129, 140, 248, 0.3));
  border-color: rgba(56, 189, 248, 0.75);
  color: #e0f2fe;
  transform: translateY(-1px);
}

.dr-debug-export-btn.copied,
.dr-debug-copy-btn.copied {
  background: rgba(16, 185, 129, 0.22);
  border-color: rgba(16, 185, 129, 0.6);
  color: #6ee7b7;
}

.dr-debug-copy-btn.primary {
  align-self: flex-start;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(129, 140, 248, 0.2));
  border-color: rgba(56, 189, 248, 0.45);
  color: #7dd3fc;
  padding: 7px 14px;
  font-size: 11.5px;
}

.dr-debug-copy-btn.primary:hover {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.32), rgba(129, 140, 248, 0.32));
  border-color: rgba(56, 189, 248, 0.8);
  color: #e0f2fe;
}

.dr-debug-handoff {
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  margin-top: 4px;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-handoff-desc {
  font-size: 11px;
  line-height: 1.55;
  color: #94a3b8;
}

/* ── Dedicated Docker Dashboard Page ── */
.dr-debug-docker-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.dr-debug-docker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  box-sizing: border-box;
}

.dr-debug-docker-status-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1 1 240px;
}

.dr-debug-docker-status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.dr-debug-docker-status-dot.online {
  background: #34d399;
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.6);
}

.dr-debug-docker-status-dot.offline {
  background: #fb7185;
  box-shadow: 0 0 8px rgba(251, 113, 133, 0.5);
}

.dr-debug-docker-status-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.dr-debug-docker-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  flex-wrap: wrap;
}

.dr-debug-docker-badge {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 800;
  letter-spacing: 0.4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.badge-running {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.badge-stopped {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.3);
}

.dr-debug-docker-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 3px;
  word-break: break-word;
  line-height: 1.4;
}

.dr-debug-docker-status-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.dr-debug-docker-stat-pill {
  padding: 4px 9px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  font-size: 10.5px;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.dr-debug-docker-stat-pill.alert {
  background: rgba(244, 63, 94, 0.15);
  border-color: rgba(244, 63, 94, 0.4);
  color: #fda4af;
}

.dr-debug-dock-btn-refresh {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: #38bdf8;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.dr-debug-dock-btn-refresh:hover {
  background: rgba(56, 189, 248, 0.25);
  transform: rotate(180deg);
}

.dr-debug-docker-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dr-debug-docker-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dr-debug-docker-hint {
  font-size: 10px;
  color: #64748b;
  text-transform: none;
  font-weight: normal;
}

.dr-debug-docker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.dr-debug-docker-card {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 7px;
  padding: 9px 11px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dr-debug-docker-card:hover {
  background: rgba(30, 41, 59, 0.75);
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-1px);
}

.dr-debug-docker-card.selected {
  border-color: #38bdf8;
  background: rgba(14, 165, 233, 0.1);
  box-shadow: 0 0 12px rgba(14, 165, 233, 0.15);
}

.dr-debug-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dr-debug-card-name {
  font-size: 12px;
  font-weight: 700;
  color: #f1f5f9;
  font-family: ui-monospace, Menlo, monospace;
}

.dr-debug-card-state {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 700;
}

.state-running {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
}

.state-exited {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
}

.dr-debug-card-image {
  font-size: 10.5px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dr-debug-card-ports {
  font-size: 10px;
  color: #64748b;
  font-family: ui-monospace, Menlo, monospace;
}

.dr-debug-card-errors {
  font-size: 10px;
  color: #fb7185;
  font-weight: 700;
  margin-top: 2px;
}

.dr-debug-card-desc {
  font-size: 10px;
  color: #94a3b8;
}

.dr-debug-err-badge {
  background: rgba(244, 63, 94, 0.2);
  color: #fda4af;
  border: 1px solid rgba(244, 63, 94, 0.4);
  padding: 0 5px;
  border-radius: 9999px;
  font-size: 9px;
  font-weight: 700;
}

.dr-debug-dock-empty-containers {
  grid-column: 1 / -1;
  padding: 18px;
  text-align: center;
  background: rgba(15, 23, 42, 0.4);
  border: 1px dashed rgba(148, 163, 184, 0.2);
  border-radius: 7px;
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.dr-debug-docker-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dr-debug-docker-filters {
  display: flex;
  gap: 6px;
}

.dr-debug-dock-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  padding: 4px 9px;
  border-radius: 5px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.dr-debug-dock-btn:hover {
  background: rgba(56, 189, 248, 0.15);
  color: #e2e8f0;
}

.dr-debug-dock-btn.active {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
  font-weight: 700;
}

.dr-debug-docker-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-grow: 1;
  justify-content: flex-end;
}

.dr-debug-dock-search {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #f8fafc;
  padding: 4px 10px;
  border-radius: 5px;
  font-size: 11px;
  width: 220px;
  font-family: ui-monospace, Menlo, monospace;
}

.dr-debug-dock-search:focus {
  outline: none;
  border-color: #38bdf8;
}

.dr-debug-dock-autoscroll {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  color: #94a3b8;
  cursor: pointer;
}

.dr-debug-dock-action-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.dr-debug-dock-action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.dr-debug-dock-action-btn.primary {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

.dr-debug-dock-action-btn.primary:hover {
  background: rgba(56, 189, 248, 0.25);
}

.dr-debug-docker-terminal-wrapper {
  background: #030712;
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  flex-grow: 1;
  min-height: 220px;
  max-height: 380px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dr-debug-docker-terminal {
  padding: 10px 12px;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 11px;
  line-height: 1.6;
  overflow-y: auto;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dr-debug-dock-log-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 3px;
  word-break: break-all;
}

.dr-debug-dock-log-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.dr-debug-dock-log-row.log-error {
  background: rgba(244, 63, 94, 0.08);
  border-left: 2px solid #f43f5e;
}

.dr-debug-dock-log-row.log-warn {
  background: rgba(245, 158, 11, 0.06);
  border-left: 2px solid #f59e0b;
}

.dr-debug-dock-time {
  color: #64748b;
  font-size: 10px;
  flex-shrink: 0;
}

.dr-debug-dock-container-tag {
  color: #818cf8;
  font-weight: 700;
  font-size: 10.5px;
  flex-shrink: 0;
}

.dr-debug-dock-stream-tag {
  color: #64748b;
  font-size: 9.5px;
  flex-shrink: 0;
}

.stream-stderr .dr-debug-dock-stream-tag {
  color: #fb923c;
}

.dr-debug-dock-msg {
  color: #e2e8f0;
  flex-grow: 1;
}

.dr-debug-dock-inline-diag {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(225, 29, 72, 0.25));
  border: 1px solid rgba(244, 63, 94, 0.5);
  color: #fda4af;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  margin-left: 8px;
}

.dr-debug-dock-inline-diag:hover {
  background: linear-gradient(135deg, #f43f5e, #e11d48);
  color: #fff;
  transform: scale(1.05);
}

.dr-debug-dock-term-empty {
  text-align: center;
  padding: 40px 10px;
  color: #64748b;
}

.dr-debug-dock-offline-box {
  background: rgba(15, 23, 42, 0.7);
  border: 1px dashed rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 30px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dr-debug-dock-cmd-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #030712;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
}

.dr-debug-dock-cmd-box code {
  color: #38bdf8;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.dr-debug-dock-cmd-box button {
  background: rgba(56, 189, 248, 0.15);
  border: none;
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.dr-debug-cockpit-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  color: #64748b;
  padding: 8px 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(3, 7, 18, 0.5);
  backdrop-filter: blur(8px);
}

/* ── Docker Instructions Panel ── */
.dr-debug-docker-instructions-wrapper {
  display: flex;
  flex-direction: column;
}

.dr-debug-dock-instructions-card {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.7));
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.dr-debug-dock-connected-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.25);
  border-radius: 6px;
  padding: 6px 12px;
}

.dr-debug-dock-dot-live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.7);
  display: inline-block;
}

.dr-debug-dock-toggle-help {
  background: transparent;
  border: none;
  color: #38bdf8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.dr-debug-dock-help-content {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-dock-guide-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dr-debug-dock-guide-badge {
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.35);
  letter-spacing: 0.4px;
}

.dr-debug-dock-guide-desc {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}

.dr-debug-dock-steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
}

.dr-debug-dock-step-box {
  background: rgba(3, 7, 18, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 6px;
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.dr-debug-dock-step-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dr-debug-dock-step-badge {
  background: rgba(56, 189, 248, 0.2);
  color: #7dd3fc;
  font-size: 8.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}

.dr-debug-dock-step-label {
  font-size: 11px;
  font-weight: 700;
  color: #f1f5f9;
}

.dr-debug-dock-step-text {
  font-size: 10.5px;
  color: #94a3b8;
}

.dr-debug-dock-cmd-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #020617;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 5px;
  padding: 4px 8px;
  margin-top: 3px;
}

.dr-debug-dock-cmd-line code {
  color: #38bdf8;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
}

.dr-debug-copy-cmd-btn {
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #bae6fd;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.dr-debug-copy-cmd-btn:hover {
  background: rgba(56, 189, 248, 0.35);
  color: #fff;
}

.dr-debug-copy-cmd-btn.copied {
  background: rgba(16, 185, 129, 0.3);
  border-color: rgba(52, 211, 153, 0.6);
  color: #6ee7b7;
}

.dr-debug-dock-launcher-box {
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: #020617;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 10.5px;
  color: #cbd5e1;
  font-family: ui-monospace, monospace;
}

.dr-debug-dock-launcher-box code {
  color: #a78bfa;
}

.dr-debug-dock-step-footer {
  font-size: 10.5px;
  color: #34d399;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-style: italic;
}

/* ==========================================================================
   THEME 1: Dr.Debug (Original Cyan Dark Glassmorphism)
   ========================================================================== */
.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) button,
.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) input,
.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) select,
.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) .dr-debug-tab,
.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) .dr-debug-btn {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
}

.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) code,
.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) pre,
.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) .dr-debug-telemetry-payload,
.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) .dr-debug-step-output,
.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) .dr-debug-docker-terminal,
.dr-debug-modal:not(.theme-minimal-glass):not(.theme-monotone-skeuomorphic) .dr-debug-metric-badge {
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}

/* ==========================================================================
   THEME 2: Minimalistic Glassmorphism (Light Theme)
   ========================================================================== */
.dr-debug-modal.theme-minimal-glass {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  letter-spacing: -0.012em;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow:
    0 24px 60px -8px rgba(100, 116, 139, 0.25),
    0 0 20px rgba(56, 189, 248, 0.12),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass button,
.dr-debug-modal.theme-minimal-glass input,
.dr-debug-modal.theme-minimal-glass select,
.dr-debug-modal.theme-minimal-glass .dr-debug-tab,
.dr-debug-modal.theme-minimal-glass .dr-debug-btn,
.dr-debug-modal.theme-minimal-glass .dr-debug-brand-bold,
.dr-debug-modal.theme-minimal-glass .dr-debug-err-title,
.dr-debug-modal.theme-minimal-glass .dr-debug-presc-title,
.dr-debug-modal.theme-minimal-glass .dr-debug-step-reasoning-label,
.dr-debug-modal.theme-minimal-glass .dr-debug-settings-title,
.dr-debug-modal.theme-minimal-glass .dr-debug-tab-info-title,
.dr-debug-modal.theme-minimal-glass .dr-debug-tab-view-title {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.dr-debug-modal.theme-minimal-glass code,
.dr-debug-modal.theme-minimal-glass pre,
.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-payload,
.dr-debug-modal.theme-minimal-glass .dr-debug-step-output,
.dr-debug-modal.theme-minimal-glass .dr-debug-docker-terminal,
.dr-debug-modal.theme-minimal-glass .dr-debug-metric-badge {
  font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, monospace;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-header {
  background: rgba(248, 250, 252, 0.92);
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-brand-bold {
  color: #0284c7;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-brand-sub {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-metric-badge {
  background: rgba(241, 245, 249, 0.95);
  border: 1px solid rgba(203, 213, 225, 0.9);
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-close-btn {
  background: rgba(241, 245, 249, 0.9);
  border: 1px solid rgba(203, 213, 225, 0.9);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-close-btn:hover {
  background: rgba(244, 63, 94, 0.15);
  color: #e11d48;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tabs {
  background: rgba(241, 245, 249, 0.9);
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab:hover {
  color: #000000;
  background: rgba(226, 232, 240, 0.85);
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab.active {
  color: #000000;
  font-weight: 700;
  background: rgba(2, 132, 199, 0.16);
  border-color: rgba(2, 132, 199, 0.45);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.7);
}

.dr-debug-modal.theme-minimal-glass .dr-debug-body {
  background: rgba(248, 250, 252, 0.75);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab-view-header {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.95);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab-view-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab-guide-trigger {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.18);
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab-guide-trigger:hover {
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.35);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-err-header,
.dr-debug-modal.theme-minimal-glass .dr-debug-matrix-toolbar,
.dr-debug-modal.theme-minimal-glass .dr-debug-docker-header,
.dr-debug-modal.theme-minimal-glass .dr-debug-docker-section,
.dr-debug-modal.theme-minimal-glass .dr-debug-docker-toolbar {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.95);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-err-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-stat-chip {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-mode-btn {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-mode-btn.active {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-filter-btn {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-filter-btn.active {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-2d-matrix {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.95);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-matrix-th {
  color: #000000;
  font-weight: 700;
  border-bottom: 1px solid #cbd5e1;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-matrix-sub-label {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-matrix-cell {
  background: rgba(248, 250, 252, 0.85);
  border: 1px solid #cbd5e1;
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-search-input,
.dr-debug-modal.theme-minimal-glass .dr-debug-dock-search,
.dr-debug-modal.theme-minimal-glass .dr-debug-input,
.dr-debug-modal.theme-minimal-glass .dr-debug-form-input,
.dr-debug-modal.theme-minimal-glass .dr-debug-form-select {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #000000;
  font-weight: 500;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-search-input::placeholder,
.dr-debug-modal.theme-minimal-glass .dr-debug-dock-search::placeholder,
.dr-debug-modal.theme-minimal-glass .dr-debug-input::placeholder {
  color: #475569;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-err-item,
.dr-debug-modal.theme-minimal-glass .dr-debug-step-card,
.dr-debug-modal.theme-minimal-glass .dr-debug-prescription-card,
.dr-debug-modal.theme-minimal-glass .dr-debug-docker-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-err-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-err-card-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-err-card-subtitle {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-err-time {
  color: #111827;
  font-weight: 500;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-insp-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-insp-sec-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-code-box {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-curl-preview {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-rfc-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-rfc-desc {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-rfc-rec {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-frame-fn {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-frame-loc {
  color: #111827;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-err-empty {
  color: #000000;
}

/* Light Mode: Telemetry Substrate High Contrast Black Styling */
.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-left: 3.5px solid #ef4444;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.error .dr-debug-telemetry-payload {
  color: #991b1b;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.error .dr-debug-telemetry-tag {
  color: #dc2626;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.net-fail {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-left: 3.5px solid #d97706;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.net-fail .dr-debug-telemetry-payload {
  color: #92400e;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.net-fail .dr-debug-telemetry-tag {
  color: #b45309;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.warn {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-left: 3.5px solid #0284c7;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.warn .dr-debug-telemetry-payload {
  color: #0369a1;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.warn .dr-debug-telemetry-tag {
  color: #0284c7;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.ok {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-left: 3.5px solid #16a34a;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-item.ok .dr-debug-telemetry-tag {
  color: #15803d;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-payload {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-text {
  color: #000000;
  font-weight: 500;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-meta {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-telemetry-time {
  color: #111827;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-triage-empty-title {
  color: #16a34a;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-triage-empty-desc {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-empty-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-empty-desc {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-presc-files {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-presc-label {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-presc-text {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-confidence-chip {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-prescription-diff {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-handoff {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-handoff-desc {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-step-pill {
  background: #e2e8f0;
  color: #000000;
  font-weight: 700;
  border: 1px solid #cbd5e1;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-step-tool {
  background: #f1f5f9;
  color: #000000;
  font-weight: 600;
  border: 1px solid #cbd5e1;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-step-thought {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-step-output {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-step-output-label {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-thinking-card {
  background: rgba(243, 232, 255, 0.7);
  border: 1px solid #d8b4fe;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-thinking-text {
  color: #000000;
}

/* Causal Graph Light Styling */
.dr-debug-modal.theme-minimal-glass .dr-debug-graph-toolbar {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.95);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-graph-node {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-node-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-node-summary {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-node-layer {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-detail-header {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-detail-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-detail-pre {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-graph-empty {
  color: #000000;
}

/* Docker Light Styling */
.dr-debug-modal.theme-minimal-glass .dr-debug-docker-terminal-wrapper {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-msg {
  color: #000000;
  font-weight: 500;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-time {
  color: #111827;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-container-tag {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-stream-tag {
  color: #111827;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-docker-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-docker-sub {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-docker-hint {
  color: #111827;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-docker-stat-pill {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-btn {
  color: #000000;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-btn.active {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-card-name {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-card-desc {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-card-image {
  color: #111827;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-card-ports {
  color: #111827;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-step-box {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-step-label {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-step-text {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-step-footer {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-guide-desc {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-term-empty {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-log-row.log-error {
  background: rgba(239, 68, 68, 0.08);
  border-left: 2px solid #ef4444;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-log-row.log-error .dr-debug-dock-msg {
  color: #991b1b;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-log-row.log-warn {
  background: rgba(245, 158, 11, 0.08);
  border-left: 2px solid #d97706;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-dock-log-row.log-warn .dr-debug-dock-msg {
  color: #92400e;
  font-weight: 600;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-err-name,
.dr-debug-modal.theme-minimal-glass .dr-debug-presc-title,
.dr-debug-modal.theme-minimal-glass .dr-debug-step-reasoning-label {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-err-msg {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-query-wrapper {
  background: rgba(248, 250, 252, 0.95);
  border-top: 1px solid rgba(226, 232, 240, 0.95);
}

.dr-debug-modal.theme-minimal-glass .dr-debug-query-box {
  background: #ffffff;
  border: 1px solid #cbd5e1;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-cockpit-footer {
  background: rgba(241, 245, 249, 0.95);
  border-top: 1px solid rgba(226, 232, 240, 0.95);
  color: #000000;
  font-weight: 500;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-cockpit-footer span {
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-settings-overlay,
.dr-debug-modal.theme-minimal-glass .dr-debug-tab-info-card {
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(203, 213, 225, 0.95);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-settings-title,
.dr-debug-modal.theme-minimal-glass .dr-debug-tab-info-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-form-label {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab-info-header,
.dr-debug-modal.theme-minimal-glass .dr-debug-tab-info-footer {
  background: rgba(248, 250, 252, 0.96);
  border-color: rgba(226, 232, 240, 0.95);
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab-info-sec-title {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab-info-desc {
  background: rgba(241, 245, 249, 0.85);
  border: 1px solid #cbd5e1;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab-info-tip-item {
  background: rgba(248, 250, 252, 0.95);
  border: 1px solid #cbd5e1;
  color: #000000;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab-info-tip-bullet {
  color: #000000;
  font-weight: 700;
}

.dr-debug-modal.theme-minimal-glass .dr-debug-tab-info-tip-text {
  color: #000000;
}

/* ==========================================================================
   THEME 3: Monotone Skeuomorphism (Darker Theme)
   ========================================================================== */
.dr-debug-modal.theme-monotone-skeuomorphic {
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  letter-spacing: 0.015em;
  background: #0d0f12;
  border: 1px solid #23272f;
  box-shadow:
    0 28px 70px rgba(0, 0, 0, 0.95),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.9);
  color: #f1f5f9;
}

.dr-debug-modal.theme-monotone-skeuomorphic button,
.dr-debug-modal.theme-monotone-skeuomorphic input,
.dr-debug-modal.theme-monotone-skeuomorphic select,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-tab,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-btn,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-brand-bold,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-err-title,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-presc-title,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-step-reasoning-label,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-settings-title,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-tab-info-title,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-tab-view-title {
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
}

.dr-debug-modal.theme-monotone-skeuomorphic code,
.dr-debug-modal.theme-monotone-skeuomorphic pre,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-telemetry-payload,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-step-output,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-docker-terminal,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-metric-badge {
  font-family: 'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-header {
  background: linear-gradient(180deg, #181c22 0%, #111419 100%);
  border-bottom: 1px solid #000000;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-brand-bold {
  color: #f8fafc;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-brand-sub {
  color: #64748b;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-metric-badge {
  background: #090a0d;
  border: 1px solid #1e2229;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.85);
  color: #cbd5e1;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-close-btn {
  background: linear-gradient(180deg, #2a2e36 0%, #191c22 100%);
  border: 1px solid #363c47;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  color: #94a3b8;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-close-btn:hover {
  background: linear-gradient(180deg, #373c47 0%, #20242b 100%);
  color: #ffffff;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-tabs {
  background: #090b0e;
  border-bottom: 1px solid #1f232b;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.7);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-tab {
  color: #64748b;
  border-radius: 4px;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-tab:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.04);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-tab.active {
  color: #ffffff;
  background: linear-gradient(180deg, #2b303a 0%, #1c2026 100%);
  border: 1px solid #3c4350;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-body {
  background: #0b0d10;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-tab-view-header {
  background: linear-gradient(180deg, #181c22 0%, #121419 100%);
  border: 1px solid #232832;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-err-header,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-matrix-toolbar,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-docker-header,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-docker-section,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-docker-toolbar {
  background: #111419;
  border: 1px solid #1f242e;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-2d-matrix {
  background: #0d0f13;
  border: 1px solid #1e222a;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-matrix-cell {
  background: #090a0d;
  border: 1px solid #1c2028;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.8);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-search-input,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-dock-search,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-input,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-form-input,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-form-select {
  background: #08090b;
  border: 1px solid #222630;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.9);
  color: #f1f5f9;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-err-item,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-step-card,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-prescription-card,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-docker-card {
  background: linear-gradient(180deg, #15181f 0%, #101217 100%);
  border: 1px solid #222732;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-telemetry-item {
  background: linear-gradient(180deg, #161920 0%, #111318 100%);
  border: 1px solid #242935;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-telemetry-payload {
  color: #f1f5f9;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-telemetry-text {
  color: #cbd5e1;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-telemetry-time {
  color: #64748b;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-query-wrapper {
  background: #111419;
  border-top: 1px solid #202530;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-query-box {
  background: #08090c;
  border: 1px solid #232833;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.9);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-btn {
  background: linear-gradient(180deg, #373e4b 0%, #242932 100%);
  border: 1px solid #4a5464;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.22);
  color: #f8fafc;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-btn:hover {
  background: linear-gradient(180deg, #424a59 0%, #2b313c 100%);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-cockpit-footer {
  background: #0c0e12;
  border-top: 1px solid #1e222a;
  color: #64748b;
}

.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-settings-overlay,
.dr-debug-modal.theme-monotone-skeuomorphic .dr-debug-tab-info-card {
  background: #101217;
  border: 1px solid #282d38;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
`

