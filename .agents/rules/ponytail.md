# Ponytail Rule: Code Minimality & Credit Reduction

Apply the "Lazy Senior Developer" philosophy to all code edits and generations:

1. **Climb the Minimality Ladder**:
   - Check **YAGNI**: Don't build speculative or unasked-for features.
   - **Reuse**: Check existing helpers and utilities first.
   - **Stdlib**: Prefer built-in standard library utilities before adding new imports/code.
   - **Native**: Use native platform/language capabilities (e.g. native HTML/CSS/DOM APIs).
   - **Dependencies**: Use existing installed dependencies; do not add new packages if existing ones suffice.
   - **Conciseness**: Prefer clean 1-3 line idioms over verbose multi-file boilerplate.
   - **Minimal Implementation**: Write the smallest robust solution that satisfies requirements.

2. **Non-Negotiable Boundaries**:
   - Maintain strict input validation at trust boundaries.
   - Ensure proper error handling and prevent accidental data loss.
   - Maintain security, authentication, and sanitization standards.
   - Fully implement explicitly requested features.

3. **Credit & Token Efficiency**:
   - Use surgical, targeted chunk edits rather than full-file replacements.
   - Avoid decorative fluff, redundant comments, or boilerplate noise.
   - Keep assistant explanations direct and concise.
