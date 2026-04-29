# Spec Kit Integration Plan

Date: 2026-04-29

This document describes how ACP PRD Builder should integrate GitHub Spec Kit.

## Summary

ACP PRD Builder should initialize Spec Kit in the user's target working directory, not in the ACP PRD Builder app repository.

The app should:

1. Let the user choose a working directory.
2. Detect whether Spec Kit is already initialized.
3. Ask for explicit confirmation before running initialization.
4. Run `specify init` in the selected working directory.
5. Use ACP sessions to drive Spec Kit stages.
6. Read generated spec artifacts and render them in the app.

## Why Initialize In The User Workdir

Spec Kit is meant to add project-local specification workflow files. These artifacts belong to the product or codebase for which the PRD/spec is being created.

Initializing Spec Kit in the ACP PRD Builder repository would only configure the builder itself, not the user's target project.

## Initial Command

Recommended first implementation:

```sh
uvx --from git+https://github.com/github/spec-kit.git specify init . --ai codex --ai-skills --script sh
```

Run this command with the user's selected workdir as the current directory.

For the first version, use Codex integration as the default because this project is already built around ACP agent interaction and can send follow-up prompts to a Codex-compatible agent.

References:

- https://github.github.io/spec-kit/quickstart.html
- https://github.github.io/spec-kit/reference/integrations.html

## Detection

Add a Tauri command:

```text
detect_spec_kit(workdir) -> SpecKitStatus
```

Suggested status fields:

- `workdir`
- `exists`
- `hasSpecifyDir`
- `hasAgentSkills`
- `detectedAi`
- `warnings`

Initial detection can check for:

- `.specify/`
- `.agents/skills/`
- `.agents/commands/`
- agent-specific command or skill files

## Initialization

Add a Tauri command:

```text
init_spec_kit(workdir, integration) -> SpecKitStatus
```

Suggested integration enum:

- `codex`
- `claude`
- `generic`

Initial implementation can support only `codex` and return a clear error for unsupported integrations.

The command should:

1. Validate that `workdir` exists and is a directory.
2. Refuse empty or root-like paths.
3. Check current Spec Kit status.
4. If already initialized, return status without running init.
5. Run `uvx --from git+https://github.com/github/spec-kit.git specify init . --ai codex --ai-skills --script sh`.
6. Return updated status.

## UI

Add a Spec Kit section near the existing execution controls.

Suggested controls:

- Status: `Not initialized`, `Initialized`, `Partial`, `Error`
- Integration select: `Codex`, later `Claude`, `Generic`
- Button: `Initialize Spec Kit`
- Button: `Generate Spec`
- Button: `Clarify`
- Button: `Plan`
- Button: `Tasks`
- Button: `Implement`

The first version can expose only:

- `Initialize Spec Kit`
- `Generate Spec`

## ACP Prompt Flow

After initialization, ACP PRD Builder should send prompts to the selected ACP agent rather than implementing every Spec Kit step itself.

Initial prompt flow:

1. Compose the PRD/spec prompt from the PRD form.
2. Ask the agent to run the Spec Kit specify flow in the current workdir.
3. Ask the agent to produce or update the feature spec.
4. Render the result from the ACP response stream.

The prompt should explicitly include:

- User's product brief
- Current workdir
- Desired output language
- Requirement to follow installed Spec Kit commands/skills
- Instruction to ask clarifying questions only when needed

## Reading Generated Artifacts

After the agent completes a Spec Kit step, the app should scan for generated artifacts.

Potential files:

- `specs/**/spec.md`
- `specs/**/plan.md`
- `specs/**/tasks.md`

Add a later Tauri command:

```text
list_spec_artifacts(workdir) -> SpecArtifact[]
```

Suggested artifact fields:

- `path`
- `kind`
- `title`
- `updatedAt`
- `contentPreview`

Then the app can render generated specs directly, instead of relying only on the ACP event stream.

## Safety

Spec Kit initialization writes files into the selected workdir. The app must not do this silently.

Required UX:

- Show target workdir.
- Show the command that will be run.
- Ask for explicit confirmation.
- Surface stdout/stderr or a concise diagnostic if initialization fails.

This follows MCP-style user consent principles: user-visible tools that access or modify local files should be clearly approved by the user.

Reference:

- https://modelcontextprotocol.io/specification/draft

## Implementation Tasks

- Add `src-tauri/src/domain/spec_kit.rs`.
- Add `src-tauri/src/application/spec_kit.rs`.
- Add `src-tauri/src/adapters/spec_kit_cli.rs`.
- Add Tauri commands for detection and initialization.
- Add frontend entity types under `src/entities/spec-kit`.
- Add frontend API functions under `src/features/spec-kit/api.ts`.
- Add a `SpecKitPanel` widget.
- Wire `SpecKitPanel` into the PRD Builder page.
- Add tests for command construction and status detection.

## Recommended First Milestone

Milestone 1 should only do the following:

- Detect `.specify/`.
- Initialize Codex Spec Kit in the selected workdir.
- Show initialization status.
- Keep PRD generation through the existing ACP session flow.

This keeps the change small while enabling the main workflow.
