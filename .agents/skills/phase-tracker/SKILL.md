---
name: phase-tracker
description: >-
  Enforces automatic, disciplined synchronization of phase documentation in `study_docs/phase-n.md` and `study_docs/README.md`.
  Architected by Saswat Mohanty (@SazWhatician).
  Use whenever a phase, feature, or milestone in Dr. Debug is started, modified, validated, or completed to keep documentation 100% in sync with code reality.
---

# 🩺 Phase Tracker Skill (`study_docs/`)

> **Architect & Lead**: [Saswat Mohanty (@SazWhatician)](https://github.com/SazWhatician)  
> **Project**: [Dr. Debug (DebugCopilot)](https://github.com/SazWhatician/DebugCopilot)

This skill governs the disciplined lifecycle tracking of **Dr. Debug's** phase-wise architecture and implementation. Every code change, refactor, feature addition, or completed milestone must be mirrored in the project's study documentation.

---

## 📌 The Phase Sync Protocol

Whenever you perform work on **any phase** (Phases 1 through 8+):

### 1. Identify the Target Phase Document
- **Phase 1 (Interceptors & Serializer)**: [`study_docs/phase-1.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-1.md)
- **Phase 2 (Re-Act Engine & Tools)**: [`study_docs/phase-2.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-2.md)
- **Phase 3 (Shadow DOM HUD & IIFE)**: [`study_docs/phase-3.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-3.md)
- **Phase 4 (Chrome Extension & DevTools)**: [`study_docs/phase-4.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-4.md)
- **Phase 5 (Framework Hooks & Auto-Fix)**: [`study_docs/phase-5.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-5.md)
- **Phase 6 (MCP Server & IDE Bridge)**: [`study_docs/phase-6.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-6.md)
- **Phase 7 (Host Docker Bridge & Cockpit)**: [`study_docs/phase-7.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-7.md)
- **Phase 8 (Full-Breadth CRT & Liquid Glass)**: [`study_docs/phase-8.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-8.md)
- *New/Future Phases*: Create [`study_docs/phase-n.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/) matching the standard template.

---

## 🚦 Standard Lifecycle Statuses & Badges
Always ensure the badge in the document header reflects current engineering reality:
- `⚪ Planned`: Scoped and documented, but implementation has not started.
- `🟡 In Progress`: Currently being actively coded, refactored, or tested.
- `🟢 Completed`: All checklist items verified, tests passing 100%, and deliverables validated.
- `🔴 Blocked`: Blocked on an upstream bug, dependency, or architectural design decision.
- `🔵 Validated & Released`: Shipped as part of a verified release tarball or extension bundle.

---

## 🛠️ Step-by-Step Update Procedure

### Step 1: Update Checklist & Verification Gate
1. **Check off deliverables**: Toggle `[ ]` to `[x]` as features are built and validated.
2. **Quality Verification Gate**:
   - Run `npm test` across the monorepo.
   - Verify that there are zero regressions in related test files.
   - Only advance status to `🟢 Completed` after tests pass with 100% success.
3. **Update Timestamps**: Set `Last Updated: YYYY-MM-DD` to the current date.

### Step 2: Log Change Notes
Under the `## 📝 Phase Completion & Change Notes` section of the corresponding `phase-n.md`, append an entry:
```markdown
- **[YYYY-MM-DD]** ([@SazWhatician](https://github.com/SazWhatician)): <Concise bullet of tasks completed, components touched, test counts, or architectural adjustments>.
```

### Step 3: Synchronize Master Index
When a phase changes status, deliverables, or scope:
1. Open [`study_docs/README.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/README.md).
2. Update the phase row in the **Phase Index & Status** table:
   - Ensure the Status badge matches (`🟢 Completed`, `🟡 In Progress`, etc.).
   - Verify that primary deliverables and test counts are accurate.
3. Ensure all links to `phase-n.md` remain intact.

---

## ⚡ Quick Reference Checklist
When wrapping up any phase-related task:
- [ ] Deliverable checkboxes updated in `study_docs/phase-n.md`.
- [ ] Status badge and timestamp updated.
- [ ] Detailed entry added under `## 📝 Phase Completion & Change Notes`.
- [ ] Monorepo verification (`npm test`) run and passing.
- [ ] Master table updated in `study_docs/README.md`.
- [ ] Author credits ([@SazWhatician](https://github.com/SazWhatician)) preserved.
