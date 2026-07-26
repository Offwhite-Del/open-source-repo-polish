---
name: open-source-repo-polish
description: Audit and improve an open-source repository's README, bilingual presentation, visual hierarchy, onboarding, community health, trust signals, issue and pull-request surfaces, and GitHub metadata. Use when a repository needs polishing, beautification, open-source readiness, README redesign, clearer installation, contributor setup, or a measured repository-health pass.
---

# Open Source Repo Polish

Improve repository comprehension and trust before decoration. A polished repository makes its purpose, first verified result, evidence limits, safety boundaries, and contribution path obvious.

## Workflow

1. Read applicable repository instructions, current state, release evidence, and `git status`. Preserve unrelated work.
2. Establish the project purpose, intended users, maturity, canonical installation path, and one representative first-run result.
3. Run the bundled audit read-only:

   ```bash
   node <skill-directory>/scripts/audit-repo.mjs --root <repository> --json
   ```

4. Verify remote facts separately when GitHub access is available: description, topics, default branch, latest release, CI, community profile, security reporting, and social preview. Do not infer them from local files.
5. Report findings as `Fact / Inference / Proposal / Blocked`. Rank them by comprehension, onboarding, trust, accessibility, and only then visual distinction.
6. Read [repository-health.md](references/repository-health.md). Read [design-lenses.md](references/design-lenses.md) when visual work is in scope, and [evaluation-rubric.md](references/evaluation-rubric.md) before final validation.
7. Choose one named aesthetic direction grounded in the project's purpose and audience. Explain the memorable element and what will remain deliberately plain.
8. Propose the smallest coherent change set. Keep bilingual documents semantically aligned, but do not translate code, identifiers, or commands.
9. Apply only authorized changes on a branch. Reuse project assets; do not introduce a site, framework, font, animation, or dependency unless the outcome requires it.
10. Render every changed visual asset. Validate local links, document structure, issue-form syntax, package contents, tests, secrets, and the public first-run path.
11. Publish through the repository's normal pull-request workflow. Recheck the public page and remote metadata after merge.

## Design decision order

1. **Truth:** no fabricated claims, badges, benchmarks, compatibility, users, or testimonials.
2. **Purpose:** the first screen states what the project is, for whom, and its real boundary.
3. **Path:** one copyable route reaches a verified result quickly.
4. **Trust:** status, evidence quality, privacy, security, support, and rollback are explicit.
5. **Hierarchy:** layout, type, color, and imagery guide scanning.
6. **Distinction:** one project-specific visual idea makes the repository memorable.

## Boundaries

- Default to audit and proposal when the user did not authorize edits or publishing.
- Never read or publish `.env`, credentials, private transcripts, private plans, backups, receipts, or secret values.
- Never add fake badges, inflated statistics, inactive community links, or unsupported platform claims.
- Do not copy Anthropic, OpenAI, Apple, or another project's protected logos, fonts, layouts, or brand assets. Use public guidance as a reasoning lens only.
- Do not turn static GitHub documentation into a motion showcase. Motion principles apply only to an actual interactive surface.
- Do not equate GitHub Community Profile percentage or the bundled heuristic score with overall project quality.
- Stop when the page is clear, trustworthy, visually coherent, accessible, and verified. More content is not automatically more polish.
