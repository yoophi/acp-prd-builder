# Spec Kit 적용 계획

작성일: 2026-04-29

이 문서는 ACP PRD Builder에 GitHub Spec Kit을 적용하는 방안을 정리합니다.

## 요약

ACP PRD Builder는 Spec Kit을 앱 저장소가 아니라 사용자의 대상 working directory에 초기화해야 합니다.

앱은 다음 흐름을 제공하는 것이 좋습니다.

1. 사용자가 working directory를 선택합니다.
2. 해당 디렉터리에 Spec Kit이 이미 초기화되어 있는지 감지합니다.
3. 초기화 실행 전 명시적인 확인을 받습니다.
4. 선택한 working directory에서 `specify init`을 실행합니다.
5. ACP 세션을 통해 Spec Kit 단계를 진행합니다.
6. 생성된 spec 산출물을 읽고 앱에서 렌더링합니다.

## 사용자 Workdir에 초기화해야 하는 이유

Spec Kit은 프로젝트 로컬 specification 워크플로우 파일을 추가하는 도구입니다. 이 산출물은 PRD나 spec을 만들 대상 제품 또는 코드베이스에 속해야 합니다.

ACP PRD Builder 저장소에 Spec Kit을 초기화하면 builder 앱 자체만 설정되고, 사용자의 실제 대상 프로젝트에는 아무런 준비가 되지 않습니다.

## 초기 명령

첫 구현에서 권장하는 명령은 다음과 같습니다.

```sh
uvx --from git+https://github.com/github/spec-kit.git specify init . --ai codex --ai-skills --script sh
```

이 명령은 사용자가 선택한 workdir을 현재 디렉터리로 두고 실행해야 합니다.

첫 버전에서는 Codex integration을 기본값으로 사용하는 것이 단순합니다. 이 프로젝트가 이미 ACP agent 상호작용을 중심으로 구성되어 있고, Codex 호환 agent에 후속 prompt를 보낼 수 있기 때문입니다.

참고:

- https://github.github.io/spec-kit/quickstart.html
- https://github.github.io/spec-kit/reference/integrations.html

## 감지

Tauri command를 추가합니다.

```text
detect_spec_kit(workdir) -> SpecKitStatus
```

권장 status 필드는 다음과 같습니다.

- `workdir`
- `exists`
- `hasSpecifyDir`
- `hasAgentSkills`
- `detectedAi`
- `warnings`

초기 감지는 다음 항목을 확인하면 충분합니다.

- `.specify/`
- `.agents/skills/`
- `.agents/commands/`
- agent별 command 또는 skill 파일

## 초기화

Tauri command를 추가합니다.

```text
init_spec_kit(workdir, integration) -> SpecKitStatus
```

권장 integration enum은 다음과 같습니다.

- `codex`
- `claude`
- `generic`

초기 구현에서는 `codex`만 지원하고, 지원하지 않는 integration에는 명확한 에러를 반환해도 됩니다.

명령은 다음 순서로 동작해야 합니다.

1. `workdir`이 존재하는 디렉터리인지 검증합니다.
2. 빈 경로나 루트에 가까운 위험한 경로를 거부합니다.
3. 현재 Spec Kit 상태를 확인합니다.
4. 이미 초기화되어 있으면 명령을 실행하지 않고 상태만 반환합니다.
5. `uvx --from git+https://github.com/github/spec-kit.git specify init . --ai codex --ai-skills --script sh`를 실행합니다.
6. 갱신된 상태를 반환합니다.

## UI

기존 실행 설정 근처에 Spec Kit 섹션을 추가하는 것이 좋습니다.

권장 컨트롤:

- 상태: `Not initialized`, `Initialized`, `Partial`, `Error`
- Integration 선택: `Codex`, 이후 `Claude`, `Generic`
- 버튼: `Initialize Spec Kit`
- 버튼: `Generate Spec`
- 버튼: `Clarify`
- 버튼: `Plan`
- 버튼: `Tasks`
- 버튼: `Implement`

첫 버전에서는 다음 두 개만 노출해도 충분합니다.

- `Initialize Spec Kit`
- `Generate Spec`

## ACP Prompt 흐름

초기화 이후에는 앱이 모든 Spec Kit 단계를 직접 구현하기보다, 선택한 ACP agent에게 prompt를 보내 단계 진행을 맡기는 것이 좋습니다.

초기 prompt 흐름:

1. PRD 입력 폼에서 PRD/spec prompt를 조립합니다.
2. 현재 workdir에서 Spec Kit specify 흐름을 사용하도록 agent에게 요청합니다.
3. agent가 feature spec을 생성하거나 갱신하도록 요청합니다.
4. ACP 응답 스트림에서 결과를 렌더링합니다.

prompt에는 다음 내용이 명시적으로 포함되어야 합니다.

- 사용자의 제품 brief
- 현재 workdir
- 원하는 출력 언어
- 설치된 Spec Kit command/skill을 따르라는 지시
- 필요한 경우에만 명확화 질문을 하라는 지시

## 생성 산출물 읽기

agent가 Spec Kit 단계를 완료한 뒤 앱은 생성된 산출물을 스캔할 수 있어야 합니다.

가능한 파일:

- `specs/**/spec.md`
- `specs/**/plan.md`
- `specs/**/tasks.md`

나중에 다음 Tauri command를 추가할 수 있습니다.

```text
list_spec_artifacts(workdir) -> SpecArtifact[]
```

권장 artifact 필드는 다음과 같습니다.

- `path`
- `kind`
- `title`
- `updatedAt`
- `contentPreview`

이렇게 하면 앱은 ACP 이벤트 스트림에만 의존하지 않고, 생성된 spec 파일을 직접 렌더링할 수 있습니다.

## 안전성

Spec Kit 초기화는 선택한 workdir에 파일을 씁니다. 앱은 이 작업을 조용히 실행하면 안 됩니다.

필수 UX:

- 대상 workdir을 표시합니다.
- 실행할 명령을 표시합니다.
- 명시적인 확인을 받습니다.
- 초기화 실패 시 stdout/stderr 또는 간결한 진단 메시지를 보여줍니다.

이는 MCP 스타일의 사용자 동의 원칙과도 맞습니다. 로컬 파일에 접근하거나 수정하는 도구는 사용자가 명확히 승인해야 합니다.

참고:

- https://modelcontextprotocol.io/specification/draft

## 구현 작업

- `src-tauri/src/domain/spec_kit.rs` 추가
- `src-tauri/src/application/spec_kit.rs` 추가
- `src-tauri/src/adapters/spec_kit_cli.rs` 추가
- 감지 및 초기화용 Tauri command 추가
- `src/entities/spec-kit` 아래 frontend entity type 추가
- `src/features/spec-kit/api.ts` 아래 frontend API 함수 추가
- `SpecKitPanel` widget 추가
- PRD Builder page에 `SpecKitPanel` 연결
- command 생성과 status 감지 테스트 추가

## 권장 첫 마일스톤

첫 마일스톤은 다음 범위로 제한하는 것이 좋습니다.

- `.specify/` 감지
- 선택한 workdir에 Codex Spec Kit 초기화
- 초기화 상태 표시
- PRD 생성은 기존 ACP 세션 흐름으로 유지

이렇게 하면 변경 범위를 작게 유지하면서 핵심 워크플로우를 열 수 있습니다.
