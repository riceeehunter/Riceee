"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentGameSetup } from "@/actions/onboarding";
import { DEFAULT_PARTNER_NAMES } from "@/lib/constants/partner-names";
import {
  PLAYER_IDS,
  getOtherPlayer,
  getPlayerDisplayNameFromSettings,
  getPlayerMeta,
} from "@/lib/constants/players";

export function LocalMultiplayerWrapper({ 
  gameId, 
  gameName, 
  children, 
  onPlayerSelect,
  hunterColor = "from-orange-500 to-red-600",
  riceeeColor = "from-pink-500 to-rose-600"
}) {
  const [mode, setMode] = useState("select"); // select, playing
  const [localPlayer, setLocalPlayer] = useState(null);
  const [sessionId] = useState(() => `local-game-${gameId}`);
  const [partnerNames, setPartnerNames] = useState({
    ...DEFAULT_PARTNER_NAMES,
    bothLabel: `${DEFAULT_PARTNER_NAMES.partnerOneName} x ${DEFAULT_PARTNER_NAMES.partnerTwoName}`,
  });
  const playerOne = getPlayerMeta(PLAYER_IDS.ONE);
  const playerTwo = getPlayerMeta(PLAYER_IDS.TWO);
  const playerOneName = getPlayerDisplayNameFromSettings(PLAYER_IDS.ONE, partnerNames);
  const playerTwoName = getPlayerDisplayNameFromSettings(PLAYER_IDS.TWO, partnerNames);

  useEffect(() => {
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

  if (mode === "select") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#ffae88]/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">🎮</span>
          </div>
          <h2 className="text-2xl font-bold text-[#ab4400]">
            Loading {gameName}...
          </h2>
          <p className="text-[#9d4867] opacity-70 mt-2">Checking your player identity...</p>
        </div>
      </div>
    );
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
