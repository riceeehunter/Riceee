"use client";

import React, { useState, useEffect } from "react";
import { getCurrentGameSetup } from "@/actions/onboarding";
import { useGameSetup } from "@/components/game-setup-provider";
import { getSpaceGameChannel } from "@/lib/constants/channels";
import { DEFAULT_PARTNER_NAMES } from "@/lib/constants/partner-names";
import {
  PLAYER_IDS,
  getOtherPlayer,
  getPlayerDisplayNameFromSettings,
} from "@/lib/constants/players";
import { LobbySkeleton } from "@/app/(main)/games/_components/game-ui";

export function LocalMultiplayerWrapper({
  gameId,
  gameName,
  children,
  onPlayerSelect,
}) {
  // Served with the HTML by app/(main)/games/layout.js — so the lobby paints
  // on first render instead of waiting on a client round trip
  const serverSetup = useGameSetup();

  const [mode, setMode] = useState(serverSetup?.assignedPlayerId ? "playing" : "select");
  const [localPlayer, setLocalPlayer] = useState(serverSetup?.assignedPlayerId ?? null);
  const [spaceId, setSpaceId] = useState(serverSetup?.spaceId ?? null);
  // Scoped per couple space so different accounts never share a game channel
  const sessionId = spaceId ? getSpaceGameChannel(gameId, spaceId) : `local-game-${gameId}`;
  const [partnerNames, setPartnerNames] = useState(
    serverSetup?.partnerNames ?? {
      ...DEFAULT_PARTNER_NAMES,
      bothLabel: `${DEFAULT_PARTNER_NAMES.partnerOneName} x ${DEFAULT_PARTNER_NAMES.partnerTwoName}`,
    }
  );
  const playerOneName = getPlayerDisplayNameFromSettings(PLAYER_IDS.ONE, partnerNames);
  const playerTwoName = getPlayerDisplayNameFromSettings(PLAYER_IDS.TWO, partnerNames);

  useEffect(() => {
    // Already have it from the server — nothing to fetch
    if (serverSetup?.assignedPlayerId) return;

    let mounted = true;
    (async () => {
      try {
        const setup = await getCurrentGameSetup();
        if (!mounted || !setup) {
          return;
        }

        if (setup.partnerNames) {
          setPartnerNames(setup.partnerNames);
        }

        if (setup.spaceId) {
          setSpaceId(setup.spaceId);
        }

        if (setup.assignedPlayerId) {
          setLocalPlayer(setup.assignedPlayerId);
          setMode("playing");
        }
      } catch {
        // Keep local defaults if fetching names fails.
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Check if other player already selected
  useEffect(() => {
    if (typeof window !== "undefined") {
      const existingSession = localStorage.getItem(sessionId);
      if (existingSession) {
        const session = JSON.parse(existingSession);
        // Check if session is recent (within 5 minutes)
        if (Date.now() - session.timestamp < 5 * 60 * 1000) {
          console.log("Active session found:", session);
        }
      }
    }
  }, [sessionId]);

  const selectPlayer = (player) => {
    setLocalPlayer(player);
    setMode("playing");
    
    // Save to localStorage
    if (typeof window !== "undefined") {
      const session = {
        player,
        timestamp: Date.now(),
      };
      localStorage.setItem(`${sessionId}-${player}`, JSON.stringify(session));
    }
    
    if (onPlayerSelect) {
      onPlayerSelect(player, sessionId);
    }
  };

  // Only reached if the server layout couldn't resolve identity. Shows the
  // lobby's real shape so there's no blank screen and no layout jump.
  if (mode === "select") {
    return <LobbySkeleton gameTitle={gameName} />;
  }

  // Playing mode - render children with player context
  const getPlayerName = (playerId) =>
    getPlayerDisplayNameFromSettings(playerId, partnerNames);

  return children({ 
    localPlayer, 
    sessionId,
    partnerNames,
    getPlayerName,
    localPlayerName: getPlayerName(localPlayer),
    remotePlayerName: getPlayerName(getOtherPlayer(localPlayer)),
  });
}
