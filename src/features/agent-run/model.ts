import { create } from "zustand";
import {
  toTimelineItem,
  type EventGroup,
  type RalphLoopSettings,
  type ResumePolicy,
  type RunEvent,
  type TimelineItem,
} from "../../entities/message";
import type { RunScenarioId } from "./scenario";

const defaultGoal = "새 기능에 대한 PRD를 작성해주세요.";

export const defaultRalphLoopSettings: RalphLoopSettings = {
  enabled: false,
  maxIterations: 3,
  promptTemplate: "Continue from the previous result. If the PRD is complete, say so clearly.",
  stopOnError: true,
  stopOnPermission: true,
  delayMs: 0,
};

export type FollowUpQueueItem = {
  id: string;
  runId: string;
  text: string;
  createdAt: number;
};

export type LocalTaskRunSource = {
  id: string;
  title: string;
  status: string | null;
  blocked: boolean;
};

export type AgentRunDraft = {
  selectedAgentId: string;
  scenario: RunScenarioId;
  goal: string;
  customCommand: string;
  stdioBufferLimitMb: number;
  autoAllow: boolean;
  resumePolicy: ResumePolicy;
  ralphLoop: RalphLoopSettings;
  idleTimeoutSec: number;
};

export type TabState = AgentRunDraft & {
  id: string;
  title: string;
  cwd: string;
  activeRunId: string | null;
  sessionActive: boolean;
  awaitingResponse: boolean;
  followUpDraft: string;
  followUpQueue: FollowUpQueueItem[];
  items: TimelineItem[];
  filter: EventGroup | "all";
  error: string | null;
  unreadCount: number;
  permissionPending: boolean;
  idleRemainingSec: number | null;
  closing: boolean;
};

type WorkbenchState = {
  tabs: TabState[];
  activeTabId: string;
  addTab: (preset?: Partial<TabState>) => string;
  closeTab: (tabId: string) => string | null;
  forceCloseTab: (tabId: string) => string | null;
  hydrateDetachedTab: (tab: TabState) => void;
  activateTab: (tabId: string) => void;
  renameTab: (tabId: string, title: string) => void;
  patchTab: (tabId: string, patch: Partial<TabState>) => void;
  setTabWorkdir: (tabId: string, workdir: string) => void;
  enqueueFollowUp: (tabId: string, text: string) => void;
  removeFollowUp: (tabId: string, id: string) => void;
  dequeueFollowUp: (tabId: string) => FollowUpQueueItem | undefined;
  beginRun: (tabId: string, runId: string) => void;
  endRun: (tabId: string) => void;
  dispatchRunEvent: (runId: string, event: RunEvent) => void;
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function defaultTabTitle(index: number) {
  return `PRD ${index + 1}`;
}

export function createTabState(preset: Partial<TabState> = {}, index = 0): TabState {
  return {
    id: preset.id ?? createId("tab"),
    title: preset.title ?? defaultTabTitle(index),
    selectedAgentId: preset.selectedAgentId ?? "claude-code",
    scenario: preset.scenario ?? "default",
    goal: preset.goal ?? defaultGoal,
    cwd: preset.cwd ?? "~/tmp/acp-prd-builder",
    customCommand: preset.customCommand ?? "",
    stdioBufferLimitMb: preset.stdioBufferLimitMb ?? 50,
    autoAllow: preset.autoAllow ?? true,
    resumePolicy: preset.resumePolicy ?? "fresh",
    ralphLoop: preset.ralphLoop ?? { ...defaultRalphLoopSettings },
    idleTimeoutSec: preset.idleTimeoutSec ?? 60,
    idleRemainingSec: preset.idleRemainingSec ?? null,
    activeRunId: preset.activeRunId ?? null,
    sessionActive: preset.sessionActive ?? false,
    awaitingResponse: preset.awaitingResponse ?? false,
    followUpDraft: preset.followUpDraft ?? "",
    followUpQueue: preset.followUpQueue ?? [],
    items: preset.items ?? [],
    filter: preset.filter ?? "all",
    error: preset.error ?? null,
    unreadCount: preset.unreadCount ?? 0,
    permissionPending: preset.permissionPending ?? false,
    closing: preset.closing ?? false,
  };
}

function replaceTab(tabs: TabState[], tabId: string, updater: (tab: TabState) => TabState) {
  return tabs.map((tab) => (tab.id === tabId ? updater(tab) : tab));
}

function mergeStreamedText(items: TimelineItem[], item: TimelineItem): TimelineItem[] {
  const previous = items[items.length - 1];
  const canMerge =
    (previous?.event.type === "agentMessage" && item.event.type === "agentMessage") ||
    (previous?.event.type === "thought" && item.event.type === "thought");
  if (previous && canMerge) {
    const previousText = (previous.event as { text: string }).text;
    const incomingText = (item.event as { text: string }).text;
    const mergedText = `${previousText}${incomingText}`;
    return [
      ...items.slice(0, -1),
      {
        ...previous,
        body: `${previous.body}${item.body}`,
        event: { ...previous.event, text: mergedText } as typeof previous.event,
      },
    ];
  }
  return [...items, item];
}

const initialTab = createTabState({}, 0);

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,

  addTab: (preset) => {
    const state = get();
    const activeTab = selectTab(state, state.activeTabId);
    const tab = createTabState(
      {
        cwd: activeTab?.cwd,
        selectedAgentId: activeTab?.selectedAgentId,
        customCommand: activeTab?.customCommand,
        ...preset,
      },
      state.tabs.length,
    );
    set({ tabs: [...state.tabs, tab], activeTabId: tab.id });
    return tab.id;
  },

  closeTab: (tabId) => {
    const state = get();
    const target = selectTab(state, tabId);
    if (!target) return state.activeTabId;
    if (target.sessionActive && target.activeRunId) {
      set({ tabs: replaceTab(state.tabs, tabId, (tab) => ({ ...tab, closing: true })) });
      return state.activeTabId;
    }
    if (state.tabs.length <= 1) {
      const replacement = createTabState({}, 0);
      set({ tabs: [replacement], activeTabId: replacement.id });
      return replacement.id;
    }
    const index = state.tabs.findIndex((tab) => tab.id === tabId);
    const remaining = state.tabs.filter((tab) => tab.id !== tabId);
    const nextActive =
      state.activeTabId === tabId
        ? (remaining[index] ?? remaining[index - 1] ?? remaining[0]).id
        : state.activeTabId;
    set({ tabs: remaining, activeTabId: nextActive });
    return nextActive;
  },

  forceCloseTab: (tabId) => {
    const state = get();
    if (state.tabs.length <= 1) {
      const replacement = createTabState({}, 0);
      set({ tabs: [replacement], activeTabId: replacement.id });
      return replacement.id;
    }
    const index = state.tabs.findIndex((tab) => tab.id === tabId);
    const remaining = state.tabs.filter((tab) => tab.id !== tabId);
    const nextActive =
      state.activeTabId === tabId
        ? (remaining[index] ?? remaining[index - 1] ?? remaining[0]).id
        : state.activeTabId;
    set({ tabs: remaining, activeTabId: nextActive });
    return nextActive;
  },

  hydrateDetachedTab: (snapshot) => {
    const tab = createTabState({ ...snapshot, closing: false }, 0);
    set({ tabs: [tab], activeTabId: tab.id });
  },

  activateTab: (tabId) =>
    set((state) => {
      if (!state.tabs.some((tab) => tab.id === tabId)) return state;
      return {
        activeTabId: tabId,
        tabs: replaceTab(state.tabs, tabId, (tab) => ({ ...tab, unreadCount: 0 })),
      };
    }),

  renameTab: (tabId, title) =>
    set((state) => ({ tabs: replaceTab(state.tabs, tabId, (tab) => ({ ...tab, title })) })),

  patchTab: (tabId, patch) =>
    set((state) => ({
      tabs: replaceTab(state.tabs, tabId, (tab) => ({ ...tab, ...patch })),
    })),

  setTabWorkdir: (tabId, workdir) =>
    set((state) => ({ tabs: replaceTab(state.tabs, tabId, (tab) => ({ ...tab, cwd: workdir })) })),

  enqueueFollowUp: (tabId, text) =>
    set((state) => ({
      tabs: replaceTab(state.tabs, tabId, (tab) => {
        if (!tab.activeRunId) return tab;
        return {
          ...tab,
          followUpQueue: [
            ...tab.followUpQueue,
            {
              id: createId("follow-up"),
              runId: tab.activeRunId,
              text,
              createdAt: Date.now(),
            },
          ],
        };
      }),
    })),

  removeFollowUp: (tabId, id) =>
    set((state) => ({
      tabs: replaceTab(state.tabs, tabId, (tab) => ({
        ...tab,
        followUpQueue: tab.followUpQueue.filter((item) => item.id !== id),
      })),
    })),

  dequeueFollowUp: (tabId) => {
    const state = get();
    const tab = selectTab(state, tabId);
    const next = tab?.followUpQueue[0];
    if (!next) return undefined;
    set({
      tabs: replaceTab(state.tabs, tabId, (entry) => ({
        ...entry,
        followUpQueue: entry.followUpQueue.slice(1),
      })),
    });
    return next;
  },

  beginRun: (tabId, runId) =>
    set((state) => ({
      tabs: replaceTab(state.tabs, tabId, (tab) => ({
        ...tab,
        activeRunId: runId,
        sessionActive: true,
        awaitingResponse: true,
        idleRemainingSec: null,
        permissionPending: false,
        followUpQueue: [],
        items: [],
        error: null,
        closing: false,
      })),
    })),

  endRun: (tabId) =>
    set((state) => ({
      tabs: replaceTab(state.tabs, tabId, (tab) => ({
        ...tab,
        sessionActive: false,
        awaitingResponse: false,
        idleRemainingSec: null,
        permissionPending: false,
        followUpQueue: [],
        closing: false,
      })),
    })),

  dispatchRunEvent: (runId, event) =>
    set((state) => {
      const item = toTimelineItem(runId, event);
      return {
        tabs: state.tabs.map((tab) => {
          if (tab.activeRunId !== runId) return tab;
          const sessionEnded =
            event.type === "lifecycle" &&
            ["completed", "cancelled"].includes(event.status);
          const promptSettled =
            event.type === "lifecycle" &&
            ["promptCompleted", "completed", "cancelled"].includes(event.status);
          const permissionPending =
            event.type === "permission" && event.requiresResponse
              ? true
              : event.type === "permission"
                ? false
                : tab.permissionPending;
          return {
            ...tab,
            items: mergeStreamedText(tab.items, item),
            sessionActive: sessionEnded ? false : tab.sessionActive,
            awaitingResponse: promptSettled ? false : tab.awaitingResponse,
            permissionPending,
            error: event.type === "error" ? event.message : tab.error,
            unreadCount: tab.id === state.activeTabId ? tab.unreadCount : tab.unreadCount + 1,
            closing: sessionEnded ? false : tab.closing,
          };
        }),
      };
    }),
}));

export function selectTab(state: Pick<WorkbenchState, "tabs">, tabId: string): TabState | undefined {
  return state.tabs.find((tab) => tab.id === tabId);
}

export function selectTabList(state: Pick<WorkbenchState, "tabs">): TabState[] {
  return state.tabs;
}

export function isTabState(value: unknown): value is TabState {
  if (!value || typeof value !== "object") return false;
  const tab = value as Partial<TabState>;
  return (
    typeof tab.id === "string" &&
    typeof tab.title === "string" &&
    typeof tab.goal === "string" &&
    typeof tab.cwd === "string"
  );
}
