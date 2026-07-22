"use client";

import { createContext, useContext } from "react";

/**
 * Whether this space still accepts new content, shared with the whole client
 * tree.
 *
 * The server already refuses writes to a closing or archived space, so this
 * isn't the security boundary — it's what stops the UI lying. Without it you
 * can compose a full journal entry in a space that closed last week and only
 * find out when you press save, which reads as the app being broken rather
 * than as a decision someone made.
 */
const SpaceStateContext = createContext({
  isWritable: true,
  status: "ACTIVE",
  closesAt: null,
  archivedAt: null,
});

export function SpaceStateProvider({ value, children }) {
  return <SpaceStateContext.Provider value={value}>{children}</SpaceStateContext.Provider>;
}

export function useSpaceState() {
  return useContext(SpaceStateContext);
}

/** Convenience for the common case: "can I offer this action at all?" */
export function useIsWritable() {
  return useSpaceState().isWritable;
}
