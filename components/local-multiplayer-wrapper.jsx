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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-3xl font-bold mb-2">{gameName}</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Choose your player to start!
              </p>

              {/* Player Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
                {/* Player One */}
                <button
                  onClick={() => selectPlayer(playerOne.id)}
                  className={`group relative p-8 bg-gradient-to-br ${hunterColor} rounded-2xl border-4 border-orange-300 hover:border-orange-400 transition-all transform hover:scale-105 shadow-lg`}
                >
                  <div className="text-7xl mb-4">{playerOne.emoji}</div>
                  <p className="text-3xl font-bold text-white mb-2">{playerOneName}</p>
                  <p className="text-white/90 text-sm">Click to play as {playerOneName}</p>
                </button>

                {/* Player Two */}
                <button
                  onClick={() => selectPlayer(playerTwo.id)}
                  className={`group relative p-8 bg-gradient-to-br ${riceeeColor} rounded-2xl border-4 border-pink-300 hover:border-pink-400 transition-all transform hover:scale-105 shadow-lg`}
                >
                  <div className="text-7xl mb-4">{playerTwo.emoji}</div>
                  <p className="text-3xl font-bold text-white mb-2">{playerTwoName}</p>
                  <p className="text-white/90 text-sm">Click to play as {playerTwoName}</p>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
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
