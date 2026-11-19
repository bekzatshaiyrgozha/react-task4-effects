import { useSyncExternalStore } from "react";
import { getState, subscribe } from "./pwa";

export function usePwaState() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useOnlineStatus() {
  return usePwaState().online;
}
