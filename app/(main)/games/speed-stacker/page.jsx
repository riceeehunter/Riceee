"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";
import {
  LobbyScreen,
  ResultScreen,
  GameFrame,
  BackToArena,
  PlayerDisc,
} from "../_components/game-ui";

// Blocks climb the app palette instead of a rainbow
const COLORS = [
  "bg-[#ab4400]", "bg-[#c25a1a]", "bg-[#d97030]", "bg-[#ff9969]",
  "bg-[#ffae88]", "bg-[#d3567f]", "bg-[#9d4867]", "bg-[#fed07f]",
];

function StackerGame({ localPlayer, sessionId, getPlayerName }) {
  const [localStack, setLocalStack] = useState([{ position: 25, width: 50, color: COLORS[0] }]);
  const [localPosition, setLocalPosition] = useState(0);
  const [localDirection, setLocalDirection] = useState(1);
  const [localSpeed, setLocalSpeed] = useState(2.5);
  const [localScore, setLocalScore] = useState(0);
  const [localBlockWidth, setLocalBlockWidth] = useState(50);
  const [localGameOver, setLocalGameOver] = useState(false);
  const localContainerRef = React.useRef(null);

  const [remoteStack, setRemoteStack] = useState([{ position: 25, width: 50, color: COLORS[0] }]);
  const [remoteScore, setRemoteScore] = useState(0);
  const [remoteGameOver, setRemoteGameOver] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const remoteContainerRef = React.useRef(null);

  const [gameState, setGameState] = useState("menu");
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [winner, setWinner] = useState(null);
  const [pusher, setPusher] = useState(null);
  const [channel, setChannel] = useState(null);
  const localReadyRef = useRef(localReady);

  useEffect(() => {
    localReadyRef.current = localReady;
  }, [localReady]);

  const remotePlayer = getOtherPlayer(localPlayer);
  const localPlayerName = getPlayerName(localPlayer);
  const remotePlayerName = getPlayerName(remotePlayer);
  const channelName = sessionId;

  // Initialize Pusher
  useEffect(() => {
    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    pusherClient.connection.bind('connected', () => {
      console.log(`[${localPlayer}] ✅ Pusher connected`);
    });

    const gameChannel = pusherClient.subscribe(channelName);
    
    gameChannel.bind('pusher:subscription_succeeded', () => {
      console.log(`[${localPlayer}] ✅ Subscribed to ${channelName}`);
      
      // Announce presence
      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channelName,
          event: 'player-joined',
          data: { player: localPlayer, ready: localReadyRef.current }
        })
      });
    });

    // Listen for other player joining
    gameChannel.bind('player-joined', (data) => {
      if (data.player !== localPlayer) {
        console.log(`[${localPlayer}] 👋 Partner ${data.player} joined!`);
        setRemoteConnected(true);
        setRemoteReady(data.ready);
        // Say hello back if we were already here
        fetch('/api/pusher/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: channelName,
            event: 'presence-check',
            data: { player: localPlayer, ready: localReadyRef.current }
          })
        });
      }
    });

    gameChannel.bind('presence-check', (data) => {
      if (data.player !== localPlayer) {
        setRemoteConnected(true);
        setRemoteReady(data.ready);
      }
    });

    gameChannel.bind('player-ready', (data) => {
      if (data.player !== localPlayer) {
        setRemoteReady(data.ready);
      }
    });

    gameChannel.bind('game-start', (data) => {
      setGameState("playing");
      setLocalStack([{ position: 25, width: 50, color: COLORS[0] }]);
      setRemoteStack([{ position: 25, width: 50, color: COLORS[0] }]);
      setLocalScore(0);
      setRemoteScore(0);
      setLocalGameOver(false);
      setRemoteGameOver(false);
      setWinner(null);
    });

    // Listen for game state updates
    gameChannel.bind('game-update', (data) => {
      if (data.player !== localPlayer) {
        setRemoteStack(data.stack || []);
        setRemoteScore(data.score || 0);
        setRemoteGameOver(data.gameOver || false);
        setRemoteConnected(true);
      }
    });

    setPusher(pusherClient);
    setChannel(gameChannel);

    return () => {
      gameChannel.unbind_all();
      pusherClient.unsubscribe(channelName);
      pusherClient.disconnect();
    };
  }, [localPlayer]);

  // Broadcast state changes via Pusher
  const broadcastState = useCallback(() => {
    if (channel) {
      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channelName,
          event: 'game-update',
          data: {
            player: localPlayer,
            stack: localStack,
            score: localScore,
            gameOver: localGameOver,
            timestamp: Date.now()
          }
        })
      });
    }
  }, [channel, localPlayer, localStack, localScore, localGameOver]);

  // Broadcast when state changes
  useEffect(() => {
    if (channel) {
      broadcastState();
    }
  }, [localStack, localScore, localGameOver, broadcastState, channel]);

  // Keep-alive only every 5 seconds (and only if game is active)
  useEffect(() => {
    if (channel && !localGameOver) {
      const keepAlive = setInterval(() => {
        broadcastState();
      }, 5000); // Every 5 seconds instead of 1 second
      return () => clearInterval(keepAlive);
    }
  }, [channel, localGameOver, broadcastState]);

  // Check for winner - wait a bit to ensure final scores are synced
  useEffect(() => {
    if (localGameOver && gameState === "playing") {
      // If remote player is connected, wait for them to finish
      if (remoteConnected && !remoteGameOver) {
        console.log(`[${localPlayer}] Waiting for ${remotePlayer} to finish...`);
        return;
      }
      
      const timer = setTimeout(() => {
        console.log(`[${localPlayer}] Final scores - Me: ${localScore}, ${remotePlayer}: ${remoteScore}`);
        if (localScore > remoteScore) {
          setWinner(localPlayer);
        } else if (remoteScore > localScore) {
          setWinner(remotePlayer);
        } else {
          setWinner(null); // Tie
        }
        setGameState("finished");
      }, remoteConnected ? 500 : 0); // No delay if playing solo
      
      return () => clearTimeout(timer);
    }
  }, [localGameOver, remoteGameOver, localScore, remoteScore, localPlayer, remotePlayer, gameState, remoteConnected]);

  // Move block animation - full left to right movement
  const moveBlock = useCallback(() => {
    if (localGameOver) return;
    
    setLocalPosition((prev) => {
      let newPos = prev + localDirection * localSpeed;
      
      // Move from 0 to (100 - blockWidth) to ensure full coverage
      const maxPosition = 100 - localBlockWidth;
      
      if (newPos <= 0) {
        setLocalDirection(1);
        return 0;
      } else if (newPos >= maxPosition) {
        setLocalDirection(-1);
        return maxPosition;
      }
      
      return newPos;
    });
  }, [localGameOver, localDirection, localSpeed, localBlockWidth]);

  useEffect(() => {
    if (!localGameOver) {
      const interval = setInterval(moveBlock, 50);
      return () => clearInterval(interval);
    }
  }, [localGameOver, moveBlock]);

  const calculateOverlap = (pos1, width1, pos2, width2) => {
    const left1 = pos1;
    const right1 = pos1 + width1;
    const left2 = pos2;
    const right2 = pos2 + width2;
    return Math.max(0, Math.min(right1, right2) - Math.max(left1, left2));
  };

  const placeBlock = () => {
    if (localGameOver) return;

    const lastBlock = localStack[localStack.length - 1];
    const overlap = calculateOverlap(localPosition, localBlockWidth, lastBlock.position, lastBlock.width);

    if (overlap <= 0) {
      setLocalGameOver(true);
      return;
    }

    const newPosition = Math.max(localPosition, lastBlock.position);
    const newWidth = overlap;
    const colorIndex = localStack.length % COLORS.length;

    const newStack = [
      ...localStack,
      { position: newPosition, width: newWidth, color: COLORS[colorIndex] },
    ];

    setLocalStack(newStack);
    setLocalScore(localScore + 10);
    setLocalBlockWidth(newWidth);
    // Reset to left edge (0) for next block
    setLocalPosition(0);
    setLocalDirection(1); // Always start moving right
    setLocalSpeed(Math.min(localSpeed + 0.3, 8)); // Faster acceleration for challenge

    if (newStack.length >= 20) {
      setLocalGameOver(true);
      setWinner(localPlayer);
      setGameState("finished");
      
      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channelName,
          event: 'game-move',
          data: { player: localPlayer, stack: newStack, score: localScore + 10, gameOver: newStack.length >= 20 }
        })
      });
    }
  };

  // Camera offset calculation based on tower height
  const getCameraOffset = (stackLength) => {
    const towerHeight = stackLength * 24;
    const viewportHeight = 350;
    const threshold = viewportHeight * 0.6;
    return Math.max(0, towerHeight - threshold);
  };

  const localCameraOffset = getCameraOffset(localStack.length);
  const remoteCameraOffset = getCameraOffset(remoteStack.length);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === "Space" && !localGameOver) {
        e.preventDefault();
        placeBlock();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [localGameOver, placeBlock]);

  const handleReady = () => {
    const nextReady = !localReady;
    setLocalReady(nextReady);
    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: channelName,
        event: 'player-ready',
        data: { player: localPlayer, ready: nextReady }
      })
    });
  };

  useEffect(() => {
    if (localReady && remoteReady && localPlayer === PLAYER_IDS.ONE && gameState === "menu") {
      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channelName,
          event: 'game-start',
          data: { startAt: Date.now() }
        })
      });
    }
  }, [localReady, remoteReady, localPlayer, gameState]);

  const localColor = localPlayer === PLAYER_IDS.ONE ? "orange" : "pink";
  const remoteColor = remotePlayer === PLAYER_IDS.ONE ? "orange" : "pink";

  if (gameState === "menu") {
    return (
      <LobbyScreen
        gameTitle="Speed Stacker"
        tagline="Stack fast, stack clean. Gravity plays for the other side."
        localName={localPlayerName}
        remoteName={remotePlayerName}
        localReady={localReady}
        remoteReady={remoteReady}
        remoteConnected={remoteConnected}
        onReady={handleReady}
        localRole="You"
      />
    );
  }

  if (gameState === "playing") {
    return (
      <GameFrame size="max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <BackToArena />
          <span className="rounded-full border border-[#ffdfcf] bg-[#fff5ef] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ab4400]">
            Stacking live
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Your tower */}
          <div className="flex flex-col overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
            <div className="flex items-center justify-between border-b border-[#f5f2ee] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <PlayerDisc name={localPlayerName} kind="local" size="sm" />
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>You</p>
              </div>
              <span className={`${plusJakarta.className} text-xl font-extrabold tabular-nums text-[#ab4400]`}>
                {localScore}
              </span>
            </div>

            <div className="p-4">
              <div className="relative min-h-[340px] flex-1 overflow-hidden rounded-2xl border border-[#efe9e2] bg-gradient-to-b from-[#fff8f3] to-[#ffeadd]">
                <div
                  className="absolute inset-0 transition-transform duration-500 ease-out"
                  style={{ transform: `translateY(${localCameraOffset}px)` }}
                >
                  <div className="absolute bottom-0 flex h-full w-full flex-col justify-end">
                    {localStack.map((block, idx) => (
                      <div
                        key={idx}
                        className={`${block.color} shrink-0 rounded-[3px] border border-white/70 transition-all duration-200`}
                        style={{
                          position: "absolute",
                          bottom: `${idx * 24}px`,
                          left: `${block.position}%`,
                          width: `${block.width}%`,
                          height: "24px",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {!localGameOver && (
                  <div
                    className={`absolute z-10 rounded-[3px] border border-white/60 transition-all duration-100 ${COLORS[localStack.length % COLORS.length]}`}
                    style={{
                      left: `${localPosition}%`,
                      top: "40px",
                      width: `${localBlockWidth}%`,
                      height: "24px",
                    }}
                  />
                )}
              </div>

              <button
                onClick={placeBlock}
                disabled={localGameOver}
                className="mt-4 w-full rounded-2xl bg-[#ab4400] py-4 text-base font-extrabold tracking-tight text-white shadow-[0_14px_30px_rgba(171,68,0,0.28)] transition-all hover:bg-[#973b00] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              >
                {localGameOver ? "Tower toppled" : "Drop it (or hit space)"}
              </button>
              <p className="mt-2.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#a09d95]">
                {localStack.length} blocks high
              </p>
            </div>
          </div>

          {/* Their tower */}
          <div className="flex flex-col overflow-hidden rounded-[2rem] border border-dashed border-[#e8e3dc] bg-[#fdfaf7]">
            <div className="flex items-center justify-between border-b border-[#f0ebe4] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <PlayerDisc name={remotePlayerName} kind="remote" size="sm" />
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>
                  {remotePlayerName.split(" ")[0]}
                </p>
              </div>
              <span className={`${plusJakarta.className} text-xl font-extrabold tabular-nums text-[#9d4867]`}>
                {remoteScore}
              </span>
            </div>

            <div className="p-4">
              <div className="relative min-h-[340px] flex-1 overflow-hidden rounded-2xl border border-[#efe9e2] bg-gradient-to-b from-[#fffafc] to-[#ffe8ef]">
                <div
                  className="absolute inset-0 transition-transform duration-500 ease-out"
                  style={{ transform: `translateY(${remoteCameraOffset}px)` }}
                >
                  <div className="absolute bottom-0 flex h-full w-full flex-col justify-end">
                    {remoteStack.map((block, idx) => (
                      <div
                        key={idx}
                        className={`${block.color} shrink-0 rounded-[3px] border border-white/70 transition-all duration-200`}
                        style={{
                          position: "absolute",
                          bottom: `${idx * 24}px`,
                          left: `${block.position}%`,
                          width: `${block.width}%`,
                          height: "24px",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {remoteGameOver && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
                    <span className="rounded-full bg-[#9d4867] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                      Tower done
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-[#efe9e2] bg-white py-4 text-center">
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>
                  {remoteGameOver ? "They've finished." : "Still stacking…"}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a09d95]">
                  {remoteStack.length} blocks high
                </p>
              </div>
            </div>
          </div>
        </div>
      </GameFrame>
    );
  }

  if (gameState === "finished") {
    return (
      <ResultScreen
        outcome={winner === localPlayer ? "win" : winner ? "lose" : "draw"}
        localName={localPlayerName}
        remoteName={remotePlayerName}
        onRematch={() => window.location.reload()}
        rematchLabel="Stack again"
        subline={
          winner === localPlayer
            ? `${localStack.length} blocks and still standing. Architecture.`
            : winner
              ? "Their tower outlived yours. Physics has no loyalty."
              : "Two identical towers. Uncanny."
        }
      >
        <div className="flex items-center justify-center gap-8 rounded-2xl border border-[#efe9e2] bg-[#fdfaf7] py-4">
          <div className="text-center">
            <p className={`${plusJakarta.className} text-2xl font-extrabold tabular-nums text-[#ab4400]`}>{localScore}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a09d95]">{localStack.length} blocks</p>
          </div>
          <span className="h-8 w-px bg-[#efe9e2]" />
          <div className="text-center">
            <p className={`${plusJakarta.className} text-2xl font-extrabold tabular-nums text-[#9d4867]`}>{remoteScore}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a09d95]">{remoteStack.length} blocks</p>
          </div>
        </div>
      </ResultScreen>
    );
  }

  return null;
}

export default function SpeedStackerOnline() {
  return (
    <LocalMultiplayerWrapper
      gameId="speed-stacker"
      gameName="Speed Stacker Online"
    >
      {(props) => <StackerGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
