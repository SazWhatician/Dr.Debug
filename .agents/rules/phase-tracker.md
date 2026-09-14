# 📌 Phase Tracker Rule: Documentation & Progress Synchronization

> **Architect & Lead**: [Saswat Mohanty (@SazWhatician)](https://github.com/SazWhatician)  
> **Repository**: [DebugCopilot](https://github.com/SazWhatician/DebugCopilot)

Enforce strict 1:1 synchronization between code implementation progress, test suite verification, and the master phase study documentation:

## 1. Mandatory Skill Activation
Whenever any task, bugfix, refactor, or feature related to an implementation phase (Phases 1 through 8+) is initiated or modified:
- You **MUST** consult and execute the [`phase-tracker`](file:///c:/Users/saswa/Desktop/DebugCopilot/.agents/skills/phase-tracker/SKILL.md) skill.
- Keep documentation in lockstep with the actual state of the codebase.

## 2. Active Phase Document Tracking
- Update the corresponding phase document in [`study_docs/phase-n.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/).
- Check off completed deliverables (`[x]`).
- Update the phase status badge (`⚪ Planned`, `🟡 In Progress`, `🟢 Completed`, `🔴 Blocked`).
- Update the `Last Updated: YYYY-MM-DD` timestamp.

## 3. Quality & Verification Gate
- **Never** mark a phase as `🟢 Completed` unless all associated tests pass (`npm test`) and deliverables are fully verified.
- If a regression or blocking issue occurs, immediately flag the phase as `🔴 Blocked` or `🟡 In Progress`.

## 4. Log Change Notes
- In `study_docs/phase-n.md`, append an entry under `## 📝 Phase Completion & Change Notes` noting what was created, tested, or modified, with date and author attribution ([@SazWhatician](https://github.com/SazWhatician)).

## 5. Master Index Sync
- Keep [`study_docs/README.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/README.md) updated with matching status badges and deliverable counts whenever a phase's state or scope changes.
