# ACP PRD Builder

Tauri 기반의 Agent Client Protocol(ACP) PRD 생성 도구입니다. ACP 세션 생성, 명령 전송, 응답 스트림, 권한 응답, 탭 기반 멀티 세션 관리는 `acp-agent-workbench`의 핵심 흐름을 유지하고, 화면과 프롬프트는 PRD 작성에 맞게 단순화했습니다.

## 주요 기능

- PRD brief 입력 폼
- PRD 생성용 prompt 자동 조립
- ACP 에이전트 선택 및 실행
- 실행 작업 디렉터리 지정
- 에이전트 실행 명령 오버라이드
- ACP 메시지 스트림 표시
- 권한 요청 승인/거절
- 실행 중인 세션에 후속 명령 전송
- 탭 기반 멀티 세션 관리
- assistant 응답 markdown 렌더링
- OpenUI fenced block 감지 및 preview 확장 지점

## 설치

```sh
npm install
```

## 개발 실행

```sh
npm run tauri:dev
```

프론트엔드만 실행하려면 다음 명령을 사용할 수 있습니다.

```sh
npm run dev
```

## 검증

```sh
npm run build
npm test
cd src-tauri && cargo check
```

## 기본 에이전트

별도 설정이 없으면 다음 ACP 에이전트 목록을 사용합니다.

| ID | 이름 | 실행 명령 |
| --- | --- | --- |
| `claude-code` | Claude Code | `npx -y @agentclientprotocol/claude-agent-acp` |
| `codex` | Codex | `npx -y @zed-industries/codex-acp` |
| `opencode` | OpenCode | `npx -y opencode-ai acp` |
| `pi` | Pi | `npx -y pi-acp` |

`ACP_AGENT_CATALOG_PATH` 환경 변수에 JSON 파일 경로를 지정하면 커스텀 에이전트 목록을 사용할 수 있습니다.
