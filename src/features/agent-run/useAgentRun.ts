import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  clearAcpSession,
  cancelAgentRun,
  listAcpSessions,
  listAgents,
  startAgentRun,
} from "./api";
import type {
  AgentRunRequest,
  EventGroup,
  RalphLoopSettings,
  ResumePolicy,
  TimelineItem,
} from "../../entities/message";
import type { SavedPromptRunMode } from "../../entities/saved-prompt";
import {
  defaultRalphLoopSettings,
  selectTab,
  selectTabList,
  useWorkbenchStore,
  type FollowUpQueueItem,
  type TabState,
} from "./model";
import { composeScenarioPrompt, type RunScenarioId } from "./scenario";

const EMPTY_FOLLOW_UP_QUEUE: FollowUpQueueItem[] = [];
const EMPTY_ITEMS: TimelineItem[] = [];

export type RunAgentOptions = {
  goal?: string;
};

export function useAgentRun(tabId: string) {
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: listAgents });
  const agents = agentsQuery.data ?? [];

  const tab = useWorkbenchStore(useShallow((state) => selectTab(state, tabId)));

  const patch = useCallback(
    (update: Partial<TabState>) => useWorkbenchStore.getState().patchTab(tabId, update),
    [tabId],
  );

  useEffect(() => {
    const current = tab?.selectedAgentId;
    if (!current) return;
    if (agents.length > 0 && !agents.some((agent) => agent.id === current)) {
      patch({ selectedAgentId: agents[0].id });
    }
  }, [agents, tab?.selectedAgentId, patch]);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === tab?.selectedAgentId),
    [agents, tab?.selectedAgentId],
  );

  const acpSessionQuery = useMemo(
    () => ({
      workspaceId: null,
      checkoutId: null,
      workdir: tab?.cwd?.trim() || null,
      agentId: tab?.selectedAgentId ?? null,
      agentCommand: (tab?.customCommand.trim() || selectedAgent?.command) ?? null,
      limit: 1,
    }),
    [selectedAgent?.command, tab?.customCommand, tab?.cwd, tab?.selectedAgentId],
  );

  const acpSessionsQuery = useQuery({
    queryKey: ["acp-sessions", acpSessionQuery],
    queryFn: () => listAcpSessions(acpSessionQuery),
    enabled: Boolean(acpSessionQuery.agentId),
  });

  const items = tab?.items ?? EMPTY_ITEMS;
  const filter: EventGroup | "all" = tab?.filter ?? "all";
  const visibleItems = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.group === filter)),
    [filter, items],
  );

  const run = useCallback(
    async (options: RunAgentOptions = {}) => {
      const current = selectTab(useWorkbenchStore.getState(), tabId);
      if (!current) return;
      const trimmedGoal = (options.goal ?? current.goal).trim();
      if (!trimmedGoal) {
        patch({ error: "Goal is empty." });
        return;
      }

      const sameWorkdirRuns = selectTabList(useWorkbenchStore.getState()).filter(
        (entry) =>
          entry.id !== current.id &&
          entry.sessionActive &&
          entry.cwd.trim() === current.cwd.trim(),
      ).length;
      if (
        sameWorkdirRuns > 0 &&
        !window.confirm(
          `There ${sameWorkdirRuns === 1 ? "is" : "are"} ${sameWorkdirRuns} active run${
            sameWorkdirRuns === 1 ? "" : "s"
          } in this working directory. Start another run anyway?`,
        )
      ) {
        return;
      }

      const runId = crypto.randomUUID();
      const submittedGoal = composeScenarioPrompt(current.scenario, trimmedGoal, {
        workdir: current.cwd,
      });
      const store = useWorkbenchStore.getState();
      store.beginRun(tabId, runId);

      const request: AgentRunRequest = {
        runId,
        goal: submittedGoal,
        agentId: current.selectedAgentId,
        cwd: current.cwd.trim() || undefined,
        agentCommand: current.customCommand.trim() || undefined,
        stdioBufferLimitMb: Math.min(512, Math.max(1, current.stdioBufferLimitMb || 50)),
        autoAllow: current.autoAllow,
        resumePolicy: current.resumePolicy === "fresh" ? undefined : current.resumePolicy,
        ralphLoop: current.ralphLoop.enabled ? current.ralphLoop : undefined,
      };

      try {
        await startAgentRun(request);
        void acpSessionsQuery.refetch();
      } catch (err) {
        store.patchTab(tabId, { error: String(err) });
        store.endRun(tabId);
        store.patchTab(tabId, { activeRunId: null });
      }
    },
    [acpSessionsQuery, tabId, patch],
  );

  const cancel = useCallback(async () => {
    const current = selectTab(useWorkbenchStore.getState(), tabId);
    if (!current?.activeRunId) return;
    try {
      await cancelAgentRun(current.activeRunId);
      useWorkbenchStore.getState().endRun(tabId);
      patch({ error: null });
    } catch (err) {
      patch({ error: String(err) });
    }
  }, [tabId, patch]);

  const send = useCallback(() => {
    const store = useWorkbenchStore.getState();
    const current = selectTab(store, tabId);
    if (!current?.sessionActive) return;
    const trimmed = current.followUpDraft.trim();
    if (!trimmed) return;
    store.enqueueFollowUp(tabId, trimmed);
    store.patchTab(tabId, { followUpDraft: "" });
  }, [tabId]);

  const applySavedPrompt = useCallback(
    (body: string, runMode: SavedPromptRunMode) => {
      const store = useWorkbenchStore.getState();
      const current = selectTab(store, tabId);
      const trimmed = body.trim();
      if (!current || !trimmed) return;
      if (!current.sessionActive) {
        store.patchTab(tabId, { goal: trimmed });
        return;
      }
      if (runMode === "insert") {
        store.patchTab(tabId, { followUpDraft: trimmed });
        return;
      }
      store.enqueueFollowUp(tabId, trimmed);
    },
    [tabId],
  );

  const cancelFollowUp = useCallback(
    (id: string) => useWorkbenchStore.getState().removeFollowUp(tabId, id),
    [tabId],
  );
  const setSelectedAgentId = useCallback((value: string) => patch({ selectedAgentId: value }), [patch]);
  const setScenario = useCallback((value: RunScenarioId) => patch({ scenario: value }), [patch]);
  const setGoal = useCallback((value: string) => patch({ goal: value }), [patch]);
  const setCwd = useCallback((value: string) => patch({ cwd: value }), [patch]);
  const setCustomCommand = useCallback((value: string) => patch({ customCommand: value }), [patch]);
  const setStdioBufferLimitMb = useCallback(
    (value: number) => patch({ stdioBufferLimitMb: value }),
    [patch],
  );
  const setAutoAllow = useCallback((value: boolean) => patch({ autoAllow: value }), [patch]);
  const setResumePolicy = useCallback((value: ResumePolicy) => patch({ resumePolicy: value }), [patch]);
  const setRalphLoop = useCallback((value: RalphLoopSettings) => patch({ ralphLoop: value }), [patch]);
  const setIdleTimeoutSec = useCallback((value: number) => patch({ idleTimeoutSec: value }), [patch]);
  const setFollowUpDraft = useCallback((value: string) => patch({ followUpDraft: value }), [patch]);
  const setFilter = useCallback((value: EventGroup | "all") => patch({ filter: value }), [patch]);
  const setError = useCallback((value: string | null) => patch({ error: value }), [patch]);
  const clearLatestAcpSession = useCallback(async () => {
    const latest = acpSessionsQuery.data?.[0];
    if (!latest) return;
    try {
      await clearAcpSession(latest.runId);
      await acpSessionsQuery.refetch();
      patch({ error: null });
    } catch (err) {
      patch({ error: String(err) });
    }
  }, [acpSessionsQuery, patch]);

  return {
    agents,
    agentsLoading: agentsQuery.isLoading,
    selectedAgent,
    workspaceId: null,
    checkoutId: null,
    selectedAgentId: tab?.selectedAgentId ?? "",
    setSelectedAgentId,
    scenario: tab?.scenario ?? "default",
    setScenario,
    goal: tab?.goal ?? "",
    setGoal,
    cwd: tab?.cwd ?? "",
    setCwd,
    customCommand: tab?.customCommand ?? "",
    setCustomCommand,
    stdioBufferLimitMb: tab?.stdioBufferLimitMb ?? 50,
    setStdioBufferLimitMb,
    autoAllow: tab?.autoAllow ?? true,
    setAutoAllow,
    resumePolicy: tab?.resumePolicy ?? "fresh",
    setResumePolicy,
    latestAcpSession: acpSessionsQuery.data?.[0] ?? null,
    acpSessionLoading: acpSessionsQuery.isFetching,
    clearLatestAcpSession,
    ralphLoop: tab?.ralphLoop ?? defaultRalphLoopSettings,
    setRalphLoop,
    idleTimeoutSec: tab?.idleTimeoutSec ?? 0,
    setIdleTimeoutSec,
    idleRemainingSec: tab?.idleRemainingSec ?? null,
    activeRunId: tab?.activeRunId ?? null,
    sourceTask: null,
    sessionActive: tab?.sessionActive ?? false,
    awaitingResponse: tab?.awaitingResponse ?? false,
    isRunning: tab?.sessionActive ?? false,
    followUpDraft: tab?.followUpDraft ?? "",
    setFollowUpDraft,
    followUpQueue: tab?.followUpQueue ?? EMPTY_FOLLOW_UP_QUEUE,
    cancelFollowUp,
    error: tab?.error ?? (agentsQuery.error ? String(agentsQuery.error) : null),
    setError,
    run,
    cancel,
    send,
    applySavedPrompt,
    items,
    visibleItems,
    filter,
    setFilter,
  };
}
