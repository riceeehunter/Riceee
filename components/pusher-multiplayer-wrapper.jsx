"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Pusher from "pusher-js";
import { Heart, Loader2 } from "lucide-react";
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

export function PusherMultiplayerWrapper({ 
  gameId, 
  gameName, 
  children,
  hunterColor = PLAYER_DEFAULT_COLORS[PLAYER_IDS.ONE],
  riceeeColor = PLAYER_DEFAULT_COLORS[PLAYER_IDS.TWO]
}) {
  const [localPlayer, setLocalPlayer] = useState(null);
  const [remotePlayer, setRemotePlayer] = useState(null);
  const [pusher, setPusher] = useState(null);
  const [channel, setChannel] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const playerOne = getPlayerMeta(PLAYER_IDS.ONE);
  const playerTwo = getPlayerMeta(PLAYER_IDS.TWO);
  
  // Use a simple public channel (no auth required)
  const sessionId = `game-${gameId}-public`;

  // Initialize Pusher (simple, no auth)
  useEffect(() => {
    if (PUSHER_KEY && PUSHER_CLUSTER && localPlayer) {
      console.log(`[${localPlayer}] Initializing Pusher`);
      const pusherInstance = new Pusher(PUSHER_KEY, {
        cluster: PUSHER_CLUSTER,
      });
      
      pusherInstance.connection.bind('connected', () => {
        console.log(`[${localPlayer}] ✅ Pusher connected successfully!`);
      });
      
      pusherInstance.connection.bind('error', (err) => {
        console.error(`[${localPlayer}] ❌ Pusher connection error:`, err);
      });
      
      setPusher(pusherInstance);

      return () => {
        pusherInstance.disconnect();
      };
    }
  }, [localPlayer]);

  // Join public channel and exchange hellos
  useEffect(() => {
    if (pusher && localPlayer && !channel) {
      setIsConnecting(true);
      console.log(`[${localPlayer}] Subscribing to public channel: ${sessionId}`);
      
      const gameChannel = pusher.subscribe(sessionId);
      setChannel(gameChannel);

      // Check subscription state
      gameChannel.bind('pusher:subscription_error', (error) => {
        console.error(`[${localPlayer}] ❌ Subscription error:`, error);
      });

      // Listen for hello messages from other players
      gameChannel.bind('player-hello', (data) => {
        console.log(`[${localPlayer}] Received hello from:`, data.player);
        if (data.player !== localPlayer && data.player !== remotePlayer) {
          console.log(`[${localPlayer}] ✅ Partner found: ${data.player}`);
          setRemotePlayer(data.player);
          setIsConnecting(false);
          
          // Say hello back immediately
          console.log(`[${localPlayer}] Saying hello back to ${data.player}`);
          fetch("/api/pusher/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channel: sessionId,
              event: "player-hello",
              data: { player: localPlayer, timestamp: Date.now() },
            }),
          });
        }
      });

      // When subscription succeeds, say hello
      gameChannel.bind('pusher:subscription_succeeded', () => {
        console.log(`[${localPlayer}] ✅ Subscription succeeded! Saying hello...`);
        
        // Say hello immediately
        fetch("/api/pusher/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: sessionId,
            event: "player-hello",
            data: { player: localPlayer, timestamp: Date.now() },
          }),
        }).then(res => {
          console.log(`[${localPlayer}] First hello sent, status: ${res.status}`);
        }).catch(err => {
          console.error(`[${localPlayer}] Failed to send hello:`, err);
        });
        
        // Keep saying hello every 2 seconds to detect partners who join later
        const helloInterval = setInterval(() => {
          if (!remotePlayer) {
            console.log(`[${localPlayer}] Still waiting, sending another hello...`);
            fetch("/api/pusher/trigger", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channel: sessionId,
                event: "player-hello",
                data: { player: localPlayer, timestamp: Date.now() },
              }),
            });
          } else {
            console.log(`[${localPlayer}] Partner connected, stopping hello broadcasts`);
            clearInterval(helloInterval);
          }
        }, 2000);
      });

      // Fallback: If subscription_succeeded doesn't fire after 3 seconds, try anyway
      const fallbackTimer = setTimeout(() => {
        console.log(`[${localPlayer}] ⚠️ Subscription timeout, trying to send hello anyway...`);
        fetch("/api/pusher/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: sessionId,
            event: "player-hello",
            data: { player: localPlayer, timestamp: Date.now() },
          }),
        }).then(res => {
          console.log(`[${localPlayer}] Fallback hello sent, status: ${res.status}`);
        });
      }, 3000);

      return () => {
        clearTimeout(fallbackTimer);
        gameChannel.unbind_all();
        pusher.unsubscribe(sessionId);
      };
    }
  }, [pusher, localPlayer, sessionId, channel, remotePlayer]);

  const handlePlayerSelect = (player) => {
    setLocalPlayer(player);
  };

  // Show player selection screen
  if (!localPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <Heart className="inline-block text-pink-500 mb-4" size={48} />
              <h1 className="text-4xl font-bold mb-2">{gameName}</h1>
              <p className="text-muted-foreground">Choose your player to start</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hunter */}
              <button
                onClick={() => handlePlayerSelect(playerOne.id)}
                className={`group relative overflow-hidden rounded-xl p-8 border-4 ${playerOne.cardClass} transition-all hover:scale-105 bg-gradient-to-br ${hunterColor}`}
              >
                <div className="text-center text-white">
                  <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                    {playerOne.emoji}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{playerOne.displayName}</h3>
                  <p className={playerOne.textClass}>{playerOne.tagline}</p>
                </div>
              </button>

              {/* Riceee */}
              <button
                onClick={() => handlePlayerSelect(playerTwo.id)}
                className={`group relative overflow-hidden rounded-xl p-8 border-4 ${playerTwo.cardClass} transition-all hover:scale-105 bg-gradient-to-br ${riceeeColor}`}
              >
                <div className="text-center text-white">
                  <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                    {playerTwo.emoji}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{playerTwo.displayName}</h3>
                  <p className={playerTwo.textClass}>{playerTwo.tagline}</p>
                </div>
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                💡 Both of you just need to open this game and select different players!
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                No link sharing needed - just visit the game on any device! 🌍
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show waiting screen
  if (isConnecting || !remotePlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="inline-block animate-spin text-primary mb-4" size={48} />
            <h2 className="text-2xl font-bold mb-4">
              {getPlayerLabel(localPlayer)} is ready!
            </h2>
            <p className="text-muted-foreground mb-6">
              Waiting for {getPlayerLabel(getOtherPlayer(localPlayer))} to join...
            </p>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                Tell your partner to:
              </p>
              <ol className="text-sm text-left space-y-1 text-blue-800">
                <li>1. Open this game on their device</li>
                <li>2. Select {getPlayerLabel(getOtherPlayer(localPlayer))}</li>
                <li>3. You'll connect automatically! ✨</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Both players connected - render the game
  return children({
    localPlayer,
    sessionId,
    channel,
  });
}
