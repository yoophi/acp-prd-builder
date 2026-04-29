# PRD Generation Research

Date: 2026-04-29

This note summarizes commonly used approaches for AI-assisted Product Requirements Document generation and how they apply to ACP PRD Builder.

## Common Approaches

### Template And Prompt Based Generation

The most common pattern is to collect a product idea, target users, requirements, and constraints, then ask an LLM to fill a structured PRD template.

Typical output sections:

- Summary
- Problem statement
- Goals and non-goals
- User stories
- Functional requirements
- Acceptance criteria
- Metrics
- Risks
- Open questions

Examples in the market include MakePRD, Miro AI PRD, and Beam PRD. These tools generally emphasize fast PRD drafting, Markdown/PDF export, build-ready prompts, or integration with existing ideation boards.

References:

- https://www.makeprd.ai/
- https://miro.com/ai/product-development/ai-prd/
- https://beam.ai/skills/product-requirements-document

### Question Driven Requirements Elicitation

Higher-quality PRDs often start with clarification rather than immediate generation. The agent asks targeted questions before drafting the document.

Useful question categories:

- Product goal and success criteria
- User personas and use cases
- Workflow boundaries
- Functional scope
- Non-goals
- Data, privacy, and security constraints
- UX expectations
- Edge cases

This is useful for ACP PRD Builder because the app can support an interactive loop: collect brief input, ask clarifying questions, then generate or revise the PRD.

Reference:

- https://github.com/anombyte93/prd-taskmaster

### MCP Based PRD Generation Services

Model Context Protocol can expose PRD generation as reusable tools, resources, and prompts. Instead of hard-coding every PRD prompt in the app, a dedicated MCP server can provide capabilities such as:

- `prd.generate`
- `prd.review`
- `prd.expand_user_stories`
- `prd.generate_acceptance_criteria`
- `prd.export_markdown`

This separates the app shell from the PRD domain logic. The app can focus on ACP sessions, rendering, and user interaction, while the MCP service owns PRD-specific generation workflows.

References:

- https://modelcontextprotocol.io/docs/learn/architecture
- https://modelcontextprotocol.io/specification/draft
- https://github.com/Saml1211/PRD-MCP-Server
- https://github.com/bacoco/ai-expert-workflow-mcp
- https://market-mcp.com/mcp/prd-generator

### Spec Driven Development

Spec driven development treats the PRD or specification as the first artifact in a larger implementation workflow:

1. Specify
2. Clarify
3. Plan
4. Tasks
5. Implement

GitHub Spec Kit is a representative tool in this category. It installs agent-specific commands or skills and helps move from a feature idea to implementation-ready artifacts.

This is a strong fit for ACP PRD Builder because the app already manages ACP agent sessions and follow-up prompts. ACP PRD Builder can generate a PRD first, then guide the selected agent through Spec Kit stages.

References:

- https://github.github.io/spec-kit/quickstart.html
- https://github.github.io/spec-kit/reference/integrations.html

### User Stories And Acceptance Criteria Generation

Most PRD generators include explicit user story and acceptance criteria generation. Common formats include:

- User story: `As a [user], I want [action], so that [benefit]`
- Gherkin: `Given / When / Then`
- EARS: `WHEN <event> THE SYSTEM SHALL <behavior>`

Acceptance criteria are central because they make requirements testable and implementation-ready.

References:

- https://aikoder.run/products/plan-builder
- https://seo.software/tools/acceptance-criteria-generator
- https://en.wikipedia.org/wiki/Easy_Approach_to_Requirements_Syntax

### RAG And Context Attachment

PRD generation quality improves when the agent can use relevant context:

- Existing README and docs
- Meeting notes
- Customer research
- Design files
- Roadmap docs
- Existing issues
- Current product behavior

MCP resources are a natural fit for this because they can expose project files, documents, or external data sources as structured context.

## Recommendation For ACP PRD Builder

Start with an internal PRD generation skill before adding a full MCP service.

Recommended first version:

- Keep PRD form fields inside the app.
- Compose a structured prompt from the form.
- Render PRD output as Markdown.
- Use OpenUI blocks for interactive decisions such as clarifications, section approval, or regeneration actions.

Recommended next version:

- Extract PRD generation into an MCP server.
- Add tools for generating, reviewing, expanding, and exporting PRDs.
- Attach project context through MCP resources.
- Keep ACP PRD Builder as the session UI and interaction surface.

## Practical Architecture

Suggested layers:

- `features/prd-input`: collects product brief and composes initial PRD prompt.
- `widgets/agent-response-renderer`: renders Markdown and optional OpenUI blocks.
- `features/spec-kit`: detects and initializes Spec Kit in the user's target workdir.
- Future MCP server: owns PRD generation and review tools.

The app should not silently modify a user's workdir. Any command that writes files, initializes Spec Kit, or installs agent commands should require explicit user action.
