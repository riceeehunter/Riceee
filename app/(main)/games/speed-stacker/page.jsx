"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, Crown, Users } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";

const COLORS = [
  "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
  "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-cyan-500",
];

function StackerGame({ localPlayer, sessionId }) {
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

  const [gameState, setGameState] = useState("playing");
  const [winner, setWinner] = useState(null);
  const [pusher, setPusher] = useState(null);
  const [channel, setChannel] = useState(null);

  const remotePlayer = localPlayer === "hunter" ? "riceee" : "hunter";
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
      setRemoteConnected(true);
      
      // Announce presence
      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channelName,
          event: 'player-joined',
          data: { player: localPlayer }
        })
      });
    });

    // Listen for other player joining
    gameChannel.bind('player-joined', (data) => {
      if (data.player !== localPlayer) {
        console.log(`[${localPlayer}] ✅ Partner ${data.player} joined!`);
        setRemoteConnected(true);
      }
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
    }
  };

  // Auto-scroll effect for local player's tower
  useEffect(() => {
    if (localContainerRef.current && localStack.length > 12) {
      const container = localContainerRef.current;
      const towerHeight = localStack.length * 24;
      const containerHeight = 350;
      const scrollAmount = Math.max(0, towerHeight - containerHeight + 80);
      container.scrollTop = scrollAmount;
    }
  }, [localStack.length]);

  // Auto-scroll effect for remote player's tower
  useEffect(() => {
    if (remoteContainerRef.current && remoteStack.length > 12) {
      const container = remoteContainerRef.current;
      const towerHeight = remoteStack.length * 24;
      const containerHeight = 350;
      const scrollAmount = Math.max(0, towerHeight - containerHeight + 80);
      container.scrollTop = scrollAmount;
    }
  }, [remoteStack.length]);

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

  const playerColor = localPlayer === "hunter" ? "orange" : "pink";
  const remoteColor = remotePlayer === "hunter" ? "orange" : "pink";

  if (gameState === "finished") {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Link href="/games">
          <Button variant="ghost" className="mb-4 sm:mb-6">
            <ArrowLeft className="mr-2" size={16} />
            Back to Games
          </Button>
        </Link>

        <Card>
          <CardContent className="p-4 sm:p-8">
            <div className="text-center space-y-4 sm:space-y-6">
              <div className="text-6xl sm:text-7xl mb-2 sm:mb-4">
                {winner === localPlayer ? "🏆" : winner ? "😅" : "🎉"}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold px-2">
                {winner === localPlayer && "You Won! 🎉"}
                {winner && winner !== localPlayer && `${winner === "hunter" ? "Partner 1 🦁" : "Partner 2 💗"} Won!`}
                {!winner && "It's a Tie! 🤝"}
              </h2>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-md mx-auto mt-4 sm:mt-6">
                {/* Always show both players' scores */}
                <div className={`p-3 sm:p-6 rounded-lg ${
                  localPlayer === "hunter" ? "bg-orange-50 border-2 border-orange-300" : "bg-pink-50 border-2 border-pink-300"
                } ${winner === localPlayer ? "ring-2 sm:ring-4 ring-yellow-400" : ""}`}>
                  <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">{localPlayer === "hunter" ? "🦁" : "💗"}</div>
                  <p className="font-bold text-sm sm:text-lg">{localPlayer === "hunter" ? "Partner 1" : "Partner 2"}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary mt-1">{localScore}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{localStack.length} blocks</p>
                  {winner === localPlayer && <div className="text-xl sm:text-2xl mt-1 sm:mt-2">🏆</div>}
                </div>
                
                <div className={`p-3 sm:p-6 rounded-lg ${
                  remotePlayer === "hunter" ? "bg-orange-50 border-2 border-orange-300" : "bg-pink-50 border-2 border-pink-300"
                } ${winner === remotePlayer ? "ring-2 sm:ring-4 ring-yellow-400" : ""}`}>
                  <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">{remotePlayer === "hunter" ? "🦁" : "💗"}</div>
                  <p className="font-bold text-sm sm:text-lg">{remotePlayer === "hunter" ? "Partner 1" : "Partner 2"}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary mt-1">{remoteScore}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{remoteStack.length} blocks</p>
                  {winner === remotePlayer && <div className="text-xl sm:text-2xl mt-1 sm:mt-2">🏆</div>}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-4 sm:mt-6 px-2">
                <Button onClick={() => window.location.reload()} size="lg" className="w-full sm:w-auto">
                  Play Again 🔄
                </Button>
                <Link href="/games" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full">
                    Choose Another Game
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <Link href="/games">
        <Button variant="ghost" className="mb-4 sm:mb-6">
          <ArrowLeft className="mr-2" size={16} />
          Back to Games
        </Button>
      </Link>

      <div className="text-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          <Layers className="inline mr-2 mb-1" size={28} />
          Speed Stacker
        </h1>
        <div className="flex items-center justify-center gap-2">
          <Users size={16} className={remoteConnected ? "text-green-500" : "text-gray-400"} />
          <p className={`text-xs sm:text-sm ${remoteConnected ? "text-green-600 font-bold" : "text-muted-foreground"}`}>
            {remoteConnected ? "💚 Partner Connected!" : "⏳ Waiting for partner..."}
          </p>
        </div>
        {!remoteConnected && (
          <p className="text-xs text-muted-foreground mt-2">
            Open another tab and select {remotePlayer === "hunter" ? "Partner 1 🦁" : "Partner 2 💗"}
          </p>
        )}
      </div>

      {/* Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Local Player */}
        <Card className={`border-2 sm:border-4 ${playerColor === "orange" ? "border-orange-400" : "border-pink-400"}`}>
          <CardHeader className={`${playerColor === "orange" ? "bg-orange-50" : "bg-pink-50"} py-3 sm:py-6`}>
            <CardTitle className="flex items-center justify-between text-base sm:text-xl">
              <span className="flex items-center gap-2">
                {localPlayer === "hunter" ? "🦁 Partner 1" : "💗 Partner 2"}
                {winner === localPlayer && <Crown className="text-yellow-500" size={18} />}
              </span>
              <span className="text-xl sm:text-2xl font-bold">{localScore}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div 
              ref={localContainerRef}
              className="relative bg-gradient-to-b from-sky-100 to-sky-200 rounded-lg overflow-y-auto overflow-x-hidden scroll-smooth" 
              style={{ height: "350px" }}
            >
              {/* Moving block */}
              {!localGameOver && (
                <div
                  className={`absolute ${COLORS[localStack.length % COLORS.length]} border-2 border-white/50 transition-all duration-100`}
                  style={{
                    left: `${localPosition}%`,
                    top: `20px`,
                    width: `${localBlockWidth}%`,
                    height: "24px",
                  }}
                />
              )}

              {/* Stacked blocks */}
              <div className="absolute bottom-0 w-full" style={{ minHeight: "100%" }}>
                {localStack.map((block, idx) => (
                  <div
                    key={idx}
                    className={`${block.color} border-2 border-white transition-all duration-200`}
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

            <Button onClick={placeBlock} disabled={localGameOver} className="w-full mt-3 sm:mt-4" size="lg">
              {localGameOver ? "Game Over!" : "Drop Block (SPACE)"}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Height: {localStack.length} blocks
            </p>
          </CardContent>
        </Card>

        {/* Remote Player */}
        <Card className={`border-2 sm:border-4 ${remoteColor === "orange" ? "border-orange-400" : "border-pink-400"}`}>
          <CardHeader className={`${remoteColor === "orange" ? "bg-orange-50" : "bg-pink-50"} py-3 sm:py-6`}>
            <CardTitle className="flex items-center justify-between text-base sm:text-xl">
              <span className="flex items-center gap-2">
                {remotePlayer === "hunter" ? "🦁 Partner 1" : "💗 Partner 2"}
                {winner === remotePlayer && <Crown className="text-yellow-500" size={18} />}
              </span>
              <span className="text-xl sm:text-2xl font-bold">{remoteScore}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div 
              ref={remoteContainerRef}
              className="relative bg-gradient-to-b from-sky-100 to-sky-200 rounded-lg overflow-y-auto overflow-x-hidden scroll-smooth" 
              style={{ height: "350px" }}
            >
              {/* Stacked blocks */}
              <div className="absolute bottom-0 w-full" style={{ minHeight: "100%" }}>
                {remoteStack.map((block, idx) => (
                  <div
                    key={idx}
                    className={`${block.color} border-2 border-white transition-all duration-200`}
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
              
              {remoteGameOver && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="bg-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base">
                    Finished!
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-100 rounded text-center">
              <p className="text-xs sm:text-sm font-semibold">
                {remoteGameOver ? "Finished!" : "Stacking..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Height: {remoteStack.length} blocks
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
