# PRD 생성 기술 조사

작성일: 2026-04-29

이 문서는 AI 기반 Product Requirements Document(PRD) 생성에서 주로 사용되는 접근 방식과 ACP PRD Builder에 적용할 방향을 정리합니다.

## 주요 접근 방식

### 템플릿 및 프롬프트 기반 생성

가장 일반적인 방식은 제품 아이디어, 대상 사용자, 요구사항, 제약조건을 수집한 뒤 LLM에게 구조화된 PRD 템플릿을 채우도록 요청하는 것입니다.

일반적인 출력 섹션은 다음과 같습니다.

- 요약
- 문제 정의
- 목표와 비목표
- 사용자 스토리
- 기능 요구사항
- 인수 조건
- 지표
- 위험 요소
- 열린 질문

MakePRD, Miro AI PRD, Beam PRD 같은 도구가 이 흐름에 가깝습니다. 이들은 빠른 PRD 초안 작성, Markdown/PDF 내보내기, 개발용 prompt 생성, 기존 아이디어 보드와의 연결을 주로 강조합니다.

참고:

- https://www.makeprd.ai/
- https://miro.com/ai/product-development/ai-prd/
- https://beam.ai/skills/product-requirements-document

### 질문 기반 요구사항 수집

품질 높은 PRD는 즉시 문서를 생성하기보다 먼저 명확화 질문으로 시작하는 경우가 많습니다. 에이전트가 누락된 정보를 확인한 뒤 PRD를 작성하는 방식입니다.

유용한 질문 범주는 다음과 같습니다.

- 제품 목표와 성공 기준
- 사용자 페르소나와 사용 사례
- 워크플로우 범위
- 기능 범위
- 비목표
- 데이터, 개인정보, 보안 제약
- UX 기대사항
- 예외 상황

ACP PRD Builder에는 이 방식이 잘 맞습니다. 앱이 brief 입력을 받고, 에이전트가 질문을 던지고, 사용자의 답변을 반영해 PRD를 생성하거나 수정하는 대화형 흐름을 만들 수 있기 때문입니다.

참고:

- https://github.com/anombyte93/prd-taskmaster

### MCP 기반 PRD 생성 서비스

Model Context Protocol(MCP)을 사용하면 PRD 생성을 재사용 가능한 도구, 리소스, 프롬프트로 노출할 수 있습니다. 모든 PRD prompt를 앱 내부에 고정하지 않고, 별도 MCP 서버가 다음과 같은 기능을 제공할 수 있습니다.

- `prd.generate`
- `prd.review`
- `prd.expand_user_stories`
- `prd.generate_acceptance_criteria`
- `prd.export_markdown`

이 방식은 앱 shell과 PRD 도메인 로직을 분리합니다. ACP PRD Builder는 ACP 세션, 렌더링, 사용자 상호작용을 담당하고, MCP 서비스는 PRD 생성과 검토 워크플로우를 담당할 수 있습니다.

참고:

- https://modelcontextprotocol.io/docs/learn/architecture
- https://modelcontextprotocol.io/specification/draft
- https://github.com/Saml1211/PRD-MCP-Server
- https://github.com/bacoco/ai-expert-workflow-mcp
- https://market-mcp.com/mcp/prd-generator

### Spec Driven Development

Spec driven development는 PRD나 specification을 더 큰 구현 워크플로우의 첫 산출물로 다룹니다.

1. Specify
2. Clarify
3. Plan
4. Tasks
5. Implement

GitHub Spec Kit이 대표적인 도구입니다. 프로젝트에 agent별 command나 skill을 설치하고, 기능 아이디어에서 구현 가능한 산출물까지 이어지는 흐름을 지원합니다.

ACP PRD Builder와도 궁합이 좋습니다. 앱이 이미 ACP agent 세션과 후속 prompt 전송을 관리하므로, 먼저 PRD를 생성하고 이후 선택한 agent가 Spec Kit 단계를 진행하도록 안내할 수 있습니다.

참고:

- https://github.github.io/spec-kit/quickstart.html
- https://github.github.io/spec-kit/reference/integrations.html

### 사용자 스토리 및 인수 조건 생성

대부분의 PRD 생성 도구는 사용자 스토리와 인수 조건 생성을 핵심 산출물로 포함합니다. 자주 쓰이는 형식은 다음과 같습니다.

- 사용자 스토리: `As a [user], I want [action], so that [benefit]`
- Gherkin: `Given / When / Then`
- EARS: `WHEN <event> THE SYSTEM SHALL <behavior>`

인수 조건은 요구사항을 테스트 가능하고 구현 가능한 형태로 만드는 핵심 요소입니다.

참고:

- https://aikoder.run/products/plan-builder
- https://seo.software/tools/acceptance-criteria-generator
- https://en.wikipedia.org/wiki/Easy_Approach_to_Requirements_Syntax

### RAG 및 컨텍스트 첨부

PRD 생성 품질은 에이전트가 관련 컨텍스트를 사용할 수 있을 때 크게 좋아집니다.

- 기존 README와 문서
- 회의록
- 고객 리서치
- 디자인 파일
- 로드맵 문서
- 기존 이슈
- 현재 제품 동작

MCP resources는 이런 컨텍스트 연결에 적합합니다. 프로젝트 파일, 문서, 외부 데이터 소스를 구조화된 컨텍스트로 노출할 수 있기 때문입니다.

## ACP PRD Builder 적용 추천

처음부터 MCP 서비스를 붙이기보다, 먼저 앱 내부 PRD 생성 skill을 만드는 편이 좋습니다.

첫 버전 추천:

- PRD 입력 필드는 앱 내부에 유지합니다.
- 입력값으로 구조화된 prompt를 조립합니다.
- PRD 결과는 Markdown으로 렌더링합니다.
- 명확화 질문, 섹션 승인, 재생성 액션 같은 상호작용은 OpenUI block으로 표현합니다.

다음 버전 추천:

- PRD 생성 로직을 MCP 서버로 분리합니다.
- PRD 생성, 검토, 확장, 내보내기 도구를 추가합니다.
- MCP resources를 통해 프로젝트 컨텍스트를 첨부합니다.
- ACP PRD Builder는 세션 UI와 상호작용 표면으로 유지합니다.

## 실용적인 구조

추천 레이어는 다음과 같습니다.

- `features/prd-input`: 제품 brief를 수집하고 초기 PRD prompt를 조립합니다.
- `widgets/agent-response-renderer`: Markdown과 선택적 OpenUI block을 렌더링합니다.
- `features/spec-kit`: 사용자의 대상 workdir에서 Spec Kit을 감지하고 초기화합니다.
- 향후 MCP server: PRD 생성과 검토 도구를 담당합니다.

앱은 사용자의 workdir을 조용히 수정하면 안 됩니다. 파일을 쓰거나, Spec Kit을 초기화하거나, agent command를 설치하는 동작은 반드시 명시적인 사용자 액션으로 실행해야 합니다.
