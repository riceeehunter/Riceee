"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Pusher from "pusher-js";
import { Heart, Loader2 } from "lucide-react";
import { getCurrentGameSetup } from "@/actions/onboarding";
import { DEFAULT_PARTNER_NAMES } from "@/lib/constants/partner-names";
import {
  PLAYER_DEFAULT_COLORS,
  PLAYER_IDS,
  getPlayerDisplayNameFromSettings,
  getPlayerLabelFromSettings,
  getOtherPlayer,
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
        }
      } catch {
        // Keep defaults when unavailable.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  
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

  // Show loading screen while identifying the player
  if (!localPlayer) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="text-center">
          <Loader2 className="inline-block animate-spin text-[#ab4400] mb-4" size={48} />
          <h2 className={`${plusJakarta.className} text-2xl font-bold text-[#ab4400]`}>
            Initializing {gameName}...
          </h2>
          <p className="text-[#9d4867] opacity-70 mt-2">Identifying your cosmic signature...</p>
        </div>
      </div>
    );
  }

  // Show waiting screen
  if (isConnecting || !remotePlayer) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="inline-block animate-spin text-primary mb-4" size={48} />
            <h2 className={`${plusJakarta.className} text-2xl font-bold mb-4 text-[#ab4400]`}>
              {getPlayerLabelFromSettings(localPlayer, partnerNames)} is ready!
            </h2>
            <p className="text-[#9d4867] mb-6">
              Waiting for {getPlayerLabelFromSettings(getOtherPlayer(localPlayer), partnerNames)} to enter the arena...
            </p>
            <div className="p-6 bg-[#fff0e8] rounded-2xl border border-[#ffae88]/30 shadow-sm">
              <p className="text-sm font-bold text-[#ab4400] mb-3 uppercase tracking-wider">
                How to join:
              </p>
              <ul className="text-sm text-left space-y-3 text-[#6a2700]">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#ab4400] text-white flex items-center justify-center text-[10px] font-bold">1</div>
                  <span>Ask your partner to open this game.</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#ab4400] text-white flex items-center justify-center text-[10px] font-bold">2</div>
                  <span>The connection will happen magically! ✨</span>
                </li>
              </ul>
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
    partnerNames,
    getPlayerName: (playerId) => getPlayerDisplayNameFromSettings(playerId, partnerNames),
  });
}
