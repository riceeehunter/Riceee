"use client";

import { createContext, useContext } from "react";

const GameSetupContext = createContext(null);

export function GameSetupProvider({ value, children }) {
  return <GameSetupContext.Provider value={value}>{children}</GameSetupContext.Provider>;
}

// null when the games layout couldn't resolve it — caller falls back to fetching
export function useGameSetup() {
  return useContext(GameSetupContext);
}
