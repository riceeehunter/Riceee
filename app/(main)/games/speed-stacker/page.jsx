"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, Crown, Users, Zap } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

const COLORS = [
  "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
  "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-cyan-500",
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
  const localEmoji = getPlayerMeta(localPlayer)?.emoji || "🎮";
  const remoteEmoji = getPlayerMeta(remotePlayer)?.emoji || "🎮";
  const channelName = 'game-speed-stacker';

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
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 pb-20 sm:pb-4">
        <div className="max-w-xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/games">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className={`${plusJakarta.className} text-2xl sm:text-3xl font-bold text-[#ab4400]`}>
              Speed Stacker
            </h1>
          </div>

          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-5 sm:p-6">
              <CardTitle className="text-center">
                <Zap size={28} className="mx-auto mb-2 opacity-80" />
                <span className="text-xl sm:text-2xl font-black tracking-tight">The Quick Stack</span>
                <p className="text-white/70 text-[10px] sm:text-xs font-medium mt-1">Tap the numbers in order. Be fast!</p>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-6">
               <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${localReady ? "bg-green-50 border-green-200" : "bg-stone-50 border-stone-100"}`}>
                    <span className="text-2xl sm:text-3xl">{localEmoji}</span>
                    <span className="font-bold text-xs sm:text-sm text-[#6a2700] truncate max-w-full">{localPlayerName}</span>
                    <div className={`text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${localReady ? "bg-green-500 text-white" : "bg-stone-200 text-stone-500"}`}>
                      {localReady ? "READY" : "WAITING"}
                    </div>
                  </div>
                  <div className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${remoteReady ? "bg-green-50 border-green-200" : "bg-stone-50 border-stone-100"}`}>
                    <span className="text-2xl sm:text-3xl opacity-50">{remoteEmoji}</span>
                    <span className="font-bold text-xs sm:text-sm text-[#6a2700] opacity-50 truncate max-w-full">{remotePlayerName}</span>
                    <div className={`text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${remoteReady ? "bg-green-500 text-white" : "bg-stone-200 text-stone-500"}`}>
                      {remoteReady ? "READY" : "WAITING"}
                    </div>
                  </div>
               </div>

               <Button 
                onClick={handleReady}
                className={`w-full py-6 sm:py-8 text-base sm:text-lg font-black rounded-2xl shadow-lg transition-all active:scale-95 ${
                  localReady 
                  ? "bg-stone-200 text-stone-600 hover:bg-stone-300" 
                  : "bg-[#ab4400] text-white hover:bg-[#973b00] shadow-[#ab4400]/20"
                }`}
               >
                 {localReady ? "WAITING FOR PARTNER..." : "READY TO STACK! ⚡"}
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (gameState === "playing") {
    return (
      <div className="flex flex-col p-2 sm:p-4 h-dvh overflow-y-auto scrollbar-hide bg-[#fffaf8]">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2 sm:mb-4 px-2">
            <div className="flex items-center gap-2">
              <Link href="/games">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <h1 className={`${plusJakarta.className} text-lg sm:text-xl font-bold text-[#ab4400]`} >
                The Stack
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-[#fff0e8] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#ffae88]/30">
              <Zap size={14} className="text-[#ab4400]" />
              <p className="text-[10px] sm:text-xs font-bold text-[#ab4400] uppercase tracking-wider">
                SPEED BATTLE
              </p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-h-0">
            {/* Local Player */}
            <Card className={`border-2 sm:border-4 flex flex-col ${localColor === "orange" ? "border-orange-400" : "border-pink-400"}`}>
              <CardHeader className={`${localColor === "orange" ? "bg-orange-50" : "bg-pink-50"} py-3 sm:py-4`}>
                <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                  <span className="flex items-center gap-2">
                    {`${localEmoji} YOU`}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#ab4400]">{localScore}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 flex-1 flex flex-col">
                <div 
                  className="relative flex-1 bg-gradient-to-b from-sky-100 to-sky-200 rounded-lg overflow-hidden min-h-[350px]" 
                >
                  {/* Camera Offset Layer */}
                  <div 
                    className="absolute inset-0 transition-transform duration-500 ease-out"
                    style={{ transform: `translateY(${localCameraOffset}px)` }}
                  >
                    <div className="absolute bottom-0 w-full h-full flex flex-col justify-end">
                      {localStack.map((block, idx) => (
                        <div
                          key={idx}
                          className={`${block.color} border-2 border-white transition-all duration-200 shrink-0`}
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

                  {/* Falling Block - Fixed relative to viewport top */}
                  {!localGameOver && (
                    <div
                      className={`absolute ${COLORS[localStack.length % COLORS.length]} border-2 border-white/50 transition-all duration-100 z-10`}
                      style={{
                        left: `${localPosition}%`,
                        top: `40px`,
                        width: `${localBlockWidth}%`,
                        height: "24px",
                      }}
                    />
                  )}
                </div>

                <Button onClick={placeBlock} disabled={localGameOver} className="w-full mt-3 sm:mt-4 bg-[#ab4400] hover:bg-[#973b00] py-6 text-lg font-bold" size="lg">
                  {localGameOver ? "Tower Toppled!" : "Drop Block (SPACE)"}
                </Button>
                <p className="text-[10px] text-center text-[#9d4867] font-bold uppercase tracking-widest mt-2">
                  Height: {localStack.length} blocks
                </p>
              </CardContent>
            </Card>

            {/* Remote Player */}
            <Card className={`border-2 sm:border-4 flex flex-col ${remoteColor === "orange" ? "border-orange-400" : "border-pink-400"}`}>
              <CardHeader className={`${remoteColor === "orange" ? "bg-orange-50" : "bg-pink-50"} py-3 sm:py-4`}>
                <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                  <span className="flex items-center gap-2">
                    {`${remoteEmoji} ${remotePlayerName}`}
                    {winner === remotePlayer && <Crown className="text-yellow-500" size={18} />}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold">{remoteScore}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 flex-1 flex flex-col">
                <div 
                  className="relative flex-1 bg-gradient-to-b from-sky-100 to-sky-200 rounded-lg overflow-hidden min-h-[350px]" 
                >
                  {/* Camera Offset Layer */}
                  <div 
                    className="absolute inset-0 transition-transform duration-500 ease-out"
                    style={{ transform: `translateY(${remoteCameraOffset}px)` }}
                  >
                    <div className="absolute bottom-0 w-full h-full flex flex-col justify-end">
                      {remoteStack.map((block, idx) => (
                        <div
                          key={idx}
                          className={`${block.color} border-2 border-white transition-all duration-200 shrink-0`}
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
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[2px] z-20">
                      <div className="bg-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-black text-[#ab4400] shadow-xl text-sm uppercase tracking-widest border-2 border-[#ab4400]">
                        Tower Finished
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 sm:mt-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 text-center">
                  <p className="text-xs font-bold text-[#6a2700] uppercase tracking-wider">
                    {remoteGameOver ? "Partner Finished" : "Stacking in progress..."}
                  </p>
                  <p className="text-[10px] text-[#9d4867] font-bold mt-1 uppercase tracking-widest opacity-60">
                    Height: {remoteStack.length} blocks
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "finished") {
    return (
      <div className="flex flex-col items-center pt-4 sm:pt-8 p-4">
        <div className="max-w-2xl w-full">
          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-8 text-center">
              <div className="text-6xl mb-4">
                {winner === localPlayer ? "🏆" : winner ? "😅" : "🤝"}
              </div>
              <CardTitle className="text-3xl font-black tracking-tight">
                {winner === localPlayer && "VICTORY!"}
                {winner && winner !== localPlayer && "GOOD TRY!"}
                {!winner && "IT'S A TIE!"}
              </CardTitle>
              <p className="text-white/70 font-medium mt-2">
                {winner === localPlayer ? "Your tower stood tall!" : "Your partner was just a bit faster."}
              </p>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-2 ${winner === localPlayer ? "bg-orange-50 border-orange-200 ring-4 ring-orange-100" : "bg-stone-50 border-stone-100 opacity-60"}`}>
                  <span className="text-4xl">{localEmoji}</span>
                  <span className="font-bold text-[#6a2700]">{localPlayerName}</span>
                  <span className="text-2xl font-black text-[#ab4400]">{localScore}</span>
                  <span className="text-[10px] font-bold uppercase text-[#9d4867]">{localStack.length} Blocks</span>
                </div>
                <div className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-2 ${winner === remotePlayer ? "bg-orange-50 border-orange-200 ring-4 ring-orange-100" : "bg-stone-50 border-stone-100 opacity-60"}`}>
                  <span className="text-4xl">{remoteEmoji}</span>
                  <span className="font-bold text-[#6a2700]">{remotePlayerName}</span>
                  <span className="text-2xl font-black text-[#ab4400]">{remoteScore}</span>
                  <span className="text-[10px] font-bold uppercase text-[#9d4867]">{remoteStack.length} Blocks</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full py-8 text-xl font-black bg-[#ab4400] text-white rounded-2xl shadow-lg hover:bg-[#973b00] transition-all active:scale-95 shadow-[#ab4400]/20"
                >
                  PLAY AGAIN 🔄
                </Button>
                <Link href="/games">
                  <Button variant="ghost" className="w-full py-6 text-[#9d4867] font-bold">
                    BACK TO MENU
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

export default function SpeedStackerOnline() {
  return (
    <LocalMultiplayerWrapper
      gameId="speed-stacker"
      gameName="Speed Stacker Online"
      hunterColor="from-orange-500 to-red-600"
      riceeeColor="from-pink-500 to-rose-600"
    >
      {(props) => <StackerGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
