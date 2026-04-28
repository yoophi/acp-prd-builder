import { useShallow } from "zustand/react/shallow";
import { isTabState, selectTabList, useWorkbenchStore, type TabState } from "./model";
import { closeWorkbenchTab, detachWorkbenchTab } from "./tabActions";

export type WorkbenchTabListItem = Readonly<
  Pick<
    TabState,
    | "id"
    | "title"
    | "goal"
    | "cwd"
    | "sessionActive"
    | "awaitingResponse"
    | "idleRemainingSec"
    | "error"
    | "unreadCount"
    | "permissionPending"
    | "closing"
  >
>;

export function useActiveTabId() {
  return useWorkbenchStore((state) => state.activeTabId);
}

export function useTabList(): WorkbenchTabListItem[] {
  return useWorkbenchStore(useShallow(selectTabList));
}

export function createWorkbenchTab() {
  return useWorkbenchStore.getState().addTab();
}

export function activateWorkbenchTab(tabId: string) {
  useWorkbenchStore.getState().activateTab(tabId);
}

export { closeWorkbenchTab, detachWorkbenchTab };

export function hydrateDetachedWorkbenchTab(tab: unknown) {
  if (!isTabState(tab)) return false;
  useWorkbenchStore.getState().hydrateDetachedTab(tab);
  return true;
}

export function setTabWorkdir(tabId: string, workdir: string) {
  useWorkbenchStore.getState().setTabWorkdir(tabId, workdir);
}
