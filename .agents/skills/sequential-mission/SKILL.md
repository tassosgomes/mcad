---
name: sequential-mission
description: Orchestrates a sequential multi-task PRD implementation run by resolving stack rules, validating contracts, executing tasks in order, verifying each checkpoint, and producing final QA evidence. Use when a prompt includes an ordered set of PRD task files that must be executed as one mission instead of isolated tasks. Do not use for single-task execution, review-only work, or brainstorming.
---

# Sequential Mission

Execute an ordered PRD mission from context anchoring through per-task delivery and final QA closeout.

This skill is the Codex-native adaptation of `.agents/workflows/sequential-mission-v2.md`.

## Required Inputs

- PRD directory path, or explicit paths to `prd.md`, `techspec.md`, and task files.
- Ordered task file list.
- Auto-commit mode.
- Optional repository guidance files named by the caller.
- Optional workflow memory paths when the caller wants persistent mission memory.

## Workflow

1. Resolve stack and applicable repository rules once.
   - Read the current task file first and identify the active language, framework/runtime, and build/test toolchain.
   - Read repository guidance files provided by the caller. If none are provided, read the local repository guidance file such as `CLAUDE.md` when present.
   - Identify the stack-specific skills that apply to the task scope.
   - Because Codex does not have Antigravity-style dynamic workflow loading, explicitly open the relevant skill files and extract:
     - expected layer and folder structure
     - required architectural patterns and explicit prohibitions
     - build, lint, unit-test, integration-test, and full verification commands
     - quality and production-readiness checklists
   - If no stack-specific skill exists, continue with a documented fallback: preserve current repository patterns, apply clean layering, and require automated verification. Record the fallback for the final QA report.

2. Anchor context and validate contracts before any code change.
   - Read `prd.md` to align on business scope.
   - Read `techspec.md` plus `api-contract.md` and `api-contract.yaml` when they exist.
   - Read ADRs under the PRD directory when present.
   - Extract public contracts, domain invariants, architectural constraints, and request/response models.
   - Validate that the tech spec and API contract are consistent. Stop and report before editing if any endpoint, method, path, or payload diverges.
   - Map the workspace for each ordered task:
     - affected layers
     - affected modules/packages
     - interfaces or ports added or changed
     - files to create
     - files to modify and why
   - Detect cross-task conflicts before starting the loop. If one task invalidates another task's contract, schema, or interface assumptions, stop and report the dependency or propose a reorder instead of guessing.

3. Execute tasks strictly in order.
   - For each task file, build and print an Implementation Plan before editing:

     ```markdown
     ## Implementation Plan - Task [N]: [Name]

     ### Active stack
     - Language:
     - Framework/runtime:
     - Skills/rules loaded:

     ### Affected layers
     - ...

     ### Files to create
     - `path/to/file` - why

     ### Files to modify
     - `path/to/file` - what changes and why

     ### Impacted modules/packages
     - ...

     ### Architectural invariants
     - ...
     ```

   - If workflow memory paths were provided, use `cy-workflow-memory` before editing and again before closeout.
   - Implement only the current task scope. Record out-of-scope discoveries as follow-up notes instead of silently expanding the mission.
   - Derive API request/response models from the actual contract documents. Do not invent or reconcile contract gaps automatically.
   - Do not assume sub-agents are available. Execute locally unless the user explicitly authorizes delegation.

4. Validate each task in strict order and self-heal before moving on.
   - Run validation from fastest to slowest using the commands extracted in step 1:
     - syntax/build
     - lint/static quality
     - domain/core unit tests
     - module-scoped unit tests
     - full regression suite for the affected stack
   - If any step fails:
     - read the full failure
     - identify the root cause
     - fix the actual cause
     - restart from the first validation step
   - Limit self-healing to 3 full retry cycles per validation stage. If the stage does not converge, stop and report the failure with the best available root-cause hypothesis and log summary.
   - Do not start the next task while the current task has failing checks, contract drift, or architectural violations.

5. Checkpoint and track each completed task correctly.
   - Use `cy-final-verify` before any completion claim or commit.
   - Update task tracking only after implementation and fresh verification evidence are complete.
   - If the mission uses task memory, update memory before task status updates and commits.
   - If auto-commit is enabled, create one local commit per completed task using the repository commit convention. Never push automatically.
   - If auto-commit is disabled, leave the diff and tracking files ready for manual review.

6. Perform final integration and QA closeout after the last task.
   - Run the full verification pipeline for every stack touched by the mission.
   - Verify module-to-module behavior against the contracts anchored earlier.
   - If the mission touched API or UI surfaces, perform a final contract and UX fidelity review.
   - Update `qa_report.md` using `references/qa-report-template.md`.
   - The final report must list:
     - mission name and date
     - branch
     - active stack
     - skills/rules used
     - whether fallback was needed
     - task-by-task status and commit references
     - verification evidence
     - architectural violations found and fixed
     - contract conflicts found
     - regressions found and resolved
     - review notes and tradeoffs

## Critical Rules

- Do not treat `.agents/workflows/*.md` as executable automation. In Codex, this document is guidance and this skill is the executable wrapper.
- Do not claim completion without fresh verification evidence from the current run.
- Do not continue past contract inconsistencies between `techspec.md` and API contract files.
- Do not begin task N+1 with unresolved failures from task N.
- Do not silently widen scope beyond the active task file.
- Do not invent stack commands when repository guidance or stack skills define the actual commands.

## Error Handling

- If the PRD directory or any required task file is missing, stop and report the missing path.
- If stack detection is ambiguous, state the ambiguity, inspect the task's concrete target files, and choose the narrowest defensible rule set.
- If no matching stack skill exists, continue with documented fallback and record the limitation in `qa_report.md`.
- If the full verification pipeline is unavailable in the environment, report the exact blocker and avoid broad completion claims that the available evidence cannot support.
