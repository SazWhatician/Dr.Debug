---
name: phase-tracker
description: >-
  Enforces automatic synchronization of phase documentation in `study_docs/phase-n.md` and `study_docs/README.md`.
  Use whenever a phase, feature, or milestone in Dr. Debug is started, modified, validated, or completed to keep documentation 100% in sync with code reality.
---

# Phase Tracker Skill (`study_docs/`)

This skill governs the disciplined lifecycle tracking of Dr. Debug's phase-wise implementation. Every code change, refactor, or completed milestone must be mirrored in the project's study documentation.

---

## 📌 Mandatory Rule: The Phase Sync Protocol

Whenever you perform work on **any phase** (e.g. Phase 1 through Phase 6):

### 1. Identify the Target Phase Document
- Phase 1 (Interceptors & Serializer): [`study_docs/phase-1.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-1.md)
- Phase 2 (Re-Act Engine & Tools): [`study_docs/phase-2.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-2.md)
- Phase 3 (Shadow DOM HUD & IIFE): [`study_docs/phase-3.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-3.md)
- Phase 4 (Chrome Extension & DevTools): [`study_docs/phase-4.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-4.md)
- Phase 5 (Framework Hooks & Auto-Fix): [`study_docs/phase-5.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-5.md)
- Phase 6 (MCP Server & IDE Bridge): [`study_docs/phase-6.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-6.md)

---

### 2. Update Checklist & Status
1. **Check off completed tasks**: Change `[ ]` to `[x]` for finished items.
2. **Update Status Header**:
   - `⚪ Planned`: Not started.
   - `🟡 In Progress`: Currently being coded or tested.
   - `🟢 Completed`: All criteria met and verified.
   - `🔴 Blocked`: Blocked on an upstream dependency.
3. **Update Date**: Set `Last Updated` to the current date.

---

### 3. Log Change Notes
Under the `## 📝 Phase Completion & Change Notes` section of `phase-n.md`, append a concise entry:
```markdown
- **[YYYY-MM-DD]**: <Action taken / tasks completed / design adjustments made>.
```

---

### 4. Sync Master Index
If a phase status changes (e.g., from `⚪ Planned` to `🟡 In Progress` or `🟢 Completed`), update the corresponding status badge in [`study_docs/README.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/README.md).
