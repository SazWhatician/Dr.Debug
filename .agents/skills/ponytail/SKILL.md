---
name: ponytail
description: >-
  Enforces a "lazy senior developer" philosophy for maximum credit/token reduction and minimal code bloat.
  Forces the agent to climb the minimality ladder (YAGNI, reuse, stdlib, native features, existing dependencies, one-liner)
  before writing new code, while strictly preserving validation, security, and data integrity.
---

# Ponytail — The Minimalist "Lazy Senior Developer" Skill

The best code is the code you never wrote. Ponytail eliminates code bloat, reduces token usage, speeds up responses, and minimizes maintenance burden by forcing all code generation through a strict Minimality Ladder.

---

## The Minimality Ladder (Check Every Rung)

Before writing any new function, class, abstraction, or file, evaluate in descending order:

1. **YAGNI (You Ain't Gonna Need It)**:
   - Does this task or edge case *actually* need to be built right now?
   - If it's speculative, future-proofing, or gold-plating: **Do not write it.**

2. **Reuse Existing Code**:
   - Does a utility, helper, function, or pattern already exist in the codebase?
   - Search first with ripgrep/grep before creating duplicates.

3. **Standard Library First**:
   - Can Python / JavaScript / the target language's standard library handle this directly?
   - Prefer `pathlib`, `itertools`, `functools`, `fetch`, standard modules over external libraries or custom 50-line helpers.

4. **Native Platform Features**:
   - Can the platform / runtime solve this natively?
   - E.g., Native HTML/CSS elements (like `<input type="date">`, CSS grid/flex, dialog tag) instead of 3rd-party widget libraries or 200 LOC JS helpers.

5. **Existing Dependencies**:
   - If standard library isn't enough, can an *already installed* dependency in `package.json` / `pyproject.toml` solve it?
   - **NEVER** install a new package if an installed package does the job.

6. **One-Liner / Concise Construct**:
   - Can this logic be cleanly and readably expressed in 1 to 3 lines using comprehensions, built-ins, or functional utilities?
   - Avoid creating 5-layer helper abstractions for simple data manipulations.

7. **Minimum Viable Implementation**:
   - Write the absolute minimum, cleanest lines of code that solve the explicit requirements.

---

## Lazy vs. Negligent (Non-Negotiable Boundaries)

"Lazy" means maximally efficient, not reckless. **NEVER compromise on:**

- **Trust Boundary & Input Validation**: Always validate external inputs, user payloads, and API arguments.
- **Data Loss & Corruption Prevention**: Always guard against destructive actions, missing WHERE clauses, and unhandled file overwrite states.
- **Security & Auth**: Never bypass encryption, authentication checks, sanitized queries (prevent SQL/command injections), or secret handling.
- **Accessibility & Explicit User Requirements**: Never omit features or accessibility requirements that the user explicitly instructed to build.

---

## Token & Credit Reduction Rules

- **Minimal Diffs**: When editing, use targeted chunk replacements. Do not rewrite whole files when modifying a few lines.
- **No Boilerplate Bloat**: Do not add unnecessary comments, redundant docstrings restating function names, or decorative fluff.
- **Concise & Direct Prose**: Be direct and concise in chat responses. State what was done without long-winded essays or repetitive summaries.
- **Runnable Proof**: If writing non-trivial logic, keep it verifiable with a concise, runnable check or assertion.
