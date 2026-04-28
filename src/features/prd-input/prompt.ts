export type PrdInput = {
  featureName: string;
  problem: string;
  users: string;
  requirements: string;
  constraints: string;
  outputLanguage: "ko" | "en";
};

export const defaultPrdInput: PrdInput = {
  featureName: "",
  problem: "",
  users: "",
  requirements: "",
  constraints: "",
  outputLanguage: "ko",
};

export function composePrdPrompt(input: PrdInput) {
  const language = input.outputLanguage === "ko" ? "Korean" : "English";
  return `
You are a senior product manager writing a practical Product Requirements Document.
Write the PRD in ${language}.

Feature name:
${input.featureName || "(not provided)"}

Problem / background:
${input.problem || "(not provided)"}

Target users:
${input.users || "(not provided)"}

Initial requirements:
${input.requirements || "(not provided)"}

Constraints / assumptions:
${input.constraints || "(not provided)"}

Return a structured PRD with these sections:
1. Summary
2. Problem statement
3. Goals
4. Non-goals
5. User stories
6. Functional requirements
7. UX and interaction notes
8. Acceptance criteria
9. Open questions

Keep the document specific, decision-oriented, and ready for implementation planning.
`.trim();
}
