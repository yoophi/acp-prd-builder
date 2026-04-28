import type { AgentDescriptor } from "../../entities/agent";
import type { AcpSessionListQuery, AcpSessionRecord } from "../../entities/acp-session";
import type { AgentRun, AgentRunRequest, RunEventEnvelope } from "../../entities/message";
import type {
  CreateSavedPromptInput,
  SavedPrompt,
  UpdateSavedPromptPatch,
} from "../../entities/saved-prompt";
import type { WorkbenchWindowInfo } from "../../entities/workbench-window";
import { invokeCommand, listenEvent } from "../../shared/api";
import type { TabState } from "./model";

export function listAgents() {
  return invokeCommand<AgentDescriptor[]>("list_agents");
}

export function startAgentRun(request: AgentRunRequest) {
  return invokeCommand<AgentRun>("start_agent_run", { request });
}

export function cancelAgentRun(runId: string) {
  return invokeCommand<void>("cancel_agent_run", { runId });
}

export function sendPromptToRun(runId: string, prompt: string) {
  return invokeCommand<void>("send_prompt_to_run", { runId, prompt });
}

export function detachAgentRunTab(tab: TabState) {
  return invokeCommand<WorkbenchWindowInfo>("detach_tab", {
    tab,
    runId: tab.sessionActive ? tab.activeRunId : null,
  });
}

export function listenRunEvents(callback: (event: RunEventEnvelope) => void) {
  return listenEvent<RunEventEnvelope>("agent-run-event", callback);
}

export function listAcpSessions(query: AcpSessionListQuery) {
  return invokeCommand<AcpSessionRecord[]>("list_acp_sessions", { query });
}

export function clearAcpSession(runId: string) {
  return invokeCommand<boolean>("clear_acp_session", { runId });
}

export function listSavedPrompts(workspaceId?: string | null) {
  return invokeCommand<SavedPrompt[]>("list_saved_prompts", { workspaceId });
}

export function createSavedPrompt(input: CreateSavedPromptInput) {
  return invokeCommand<SavedPrompt>("create_saved_prompt", { input });
}

export function updateSavedPrompt(id: string, patch: UpdateSavedPromptPatch) {
  return invokeCommand<SavedPrompt | null>("update_saved_prompt", { id, patch });
}

export function deleteSavedPrompt(id: string) {
  return invokeCommand<void>("delete_saved_prompt", { id });
}

export function recordSavedPromptUsed(id: string) {
  return invokeCommand<SavedPrompt | null>("record_saved_prompt_used", { id });
}
