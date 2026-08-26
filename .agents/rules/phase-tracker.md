# Phase Tracker Rule: Documentation Synchronization

Maintain strict 1:1 synchronization between implementation progress and the phase study documents:

1. **Active Phase Tracking**:
   - Whenever any phase task (Phases 1 through 6) is started, edited, or completed, the corresponding `study_docs/phase-n.md` document **must** be updated.
   - Check off completed deliverables (`[x]`).
   - Update the status badge (`🟡 In Progress`, `🟢 Completed`, etc.) and the `Last Updated` timestamp.

2. **Log Change Notes**:
   - Append concise bullets under `## 📝 Phase Completion & Change Notes` documenting what was created, tested, or modified.

3. **Master Index Sync**:
   - Keep `study_docs/README.md` updated with the current status of each phase.
