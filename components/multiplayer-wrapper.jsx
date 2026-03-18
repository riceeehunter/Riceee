"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Pusher from "pusher-js";
import {
  PLAYER_DEFAULT_COLORS,
  PLAYER_IDS,
  getOtherPlayer,
  getPlayerDisplayName,
  getPlayerLabel,
  getPlayerMeta,
} from "@/lib/constants/players";

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export function MultiplayerWrapper({ 
  gameId, 
  gameName, 
  children, 
  onPlayerSelect,
  hunterColor = PLAYER_DEFAULT_COLORS[PLAYER_IDS.ONE],
  riceeeColor = PLAYER_DEFAULT_COLORS[PLAYER_IDS.TWO]
}) {
  const [mode, setMode] = useState("select"); // select, waiting, playing
  const [localPlayer, setLocalPlayer] = useState(null); // "hunter" or "riceee"
  const [remotePlayer, setRemotePlayer] = useState(null);
  const [pusher, setPusher] = useState(null);
  const [channel, setChannel] = useState(null);
  const [sessionId] = useState(() => `game-${gameId}-${Date.now()}`);
  const playerOne = getPlayerMeta(PLAYER_IDS.ONE);
  const playerTwo = getPlayerMeta(PLAYER_IDS.TWO);

  useEffect(() => {
    if (PUSHER_KEY && PUSHER_CLUSTER) {
      const pusherInstance = new Pusher(PUSHER_KEY, {
        cluster: PUSHER_CLUSTER,
      });
      setPusher(pusherInstance);

      return () => {
        pusherInstance.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    if (pusher && localPlayer) {
      const gameChannel = pusher.subscribe(sessionId);
      setChannel(gameChannel);

      gameChannel.bind("player-joined", (data) => {
        if (data.player !== localPlayer) {
          setRemotePlayer(data.player);
          setMode("playing");
        }
      });

      gameChannel.bind("player-ready", (data) => {
        if (data.player !== localPlayer) {
          setMode("playing");
        }
      });

      // Announce player joined
      fetch("/api/pusher/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: sessionId,
          event: "player-joined",
          data: { player: localPlayer },
        }),
      });

      return () => {
        gameChannel.unbind_all();
        pusher.unsubscribe(sessionId);
      };
    }
  }, [pusher, localPlayer, sessionId]);

  const selectPlayer = (player) => {
    setLocalPlayer(player);
    setMode("waiting");
    if (onPlayerSelect) {
      onPlayerSelect(player, sessionId, channel);
    }
  };

  const startSolo = (player) => {
    setLocalPlayer(player);
    setMode("playing");
    if (onPlayerSelect) {
      onPlayerSelect(player, sessionId, null);
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
                {/* Hunter */}
                <button
                  onClick={() => selectPlayer(playerOne.id)}
                  className={`group relative p-8 bg-gradient-to-br ${hunterColor} rounded-2xl border-4 border-orange-300 hover:border-orange-400 transition-all transform hover:scale-105 shadow-lg`}
                >
                  <div className="text-7xl mb-4">{playerOne.emoji}</div>
                  <p className="text-3xl font-bold text-white mb-2">{playerOne.displayName}</p>
                  <p className="text-white/90 text-sm">Click to play as {playerOne.displayName}</p>
                </button>

                {/* Riceee */}
                <button
                  onClick={() => selectPlayer(playerTwo.id)}
                  className={`group relative p-8 bg-gradient-to-br ${riceeeColor} rounded-2xl border-4 border-pink-300 hover:border-pink-400 transition-all transform hover:scale-105 shadow-lg`}
                >
                  <div className="text-7xl mb-4">{playerTwo.emoji}</div>
                  <p className="text-3xl font-bold text-white mb-2">{playerTwo.displayName}</p>
                  <p className="text-white/90 text-sm">Click to play as {playerTwo.displayName}</p>
                </button>
              </div>

              {/* Solo Mode Option */}
              <div className="border-t pt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Or play solo without waiting for partner:
                </p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => startSolo(playerOne.id)}>
                    Solo as {getPlayerLabel(playerOne.id)}
                  </Button>
                  <Button variant="outline" onClick={() => startSolo(playerTwo.id)}>
                    Solo as {getPlayerLabel(playerTwo.id)}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "waiting") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="text-7xl mb-4 animate-bounce">
                {getPlayerMeta(localPlayer)?.emoji || "🎮"}
              </div>
              <h2 className="text-2xl font-bold">
                {getPlayerDisplayName(localPlayer)} is Ready!
              </h2>
              <p className="text-lg text-muted-foreground">
                Waiting for {getPlayerLabel(getOtherPlayer(localPlayer))} to join...
              </p>
              <div className="flex gap-2 justify-center">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse delay-75"></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse delay-150"></div>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this page with your partner!
              </p>
              <Button variant="outline" onClick={() => startSolo(localPlayer)}>
                Start Solo Instead
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing mode - render children with player context
  return children({ 
    localPlayer, 
    remotePlayer, 
    channel, 
    sessionId,
    isSolo: !remotePlayer 
  });
}
