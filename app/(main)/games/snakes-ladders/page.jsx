"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Dices } from "lucide-react";
import Link from "next/link";
import Pusher from "pusher-js";
import { toast } from "sonner";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";

const BOARD_SIZE = 100;

// More realistic snake positions with varied lengths
const SNAKES = {
  17: 7,    // Short snake
  54: 34,   // Medium snake
  62: 19,   // Long snake
  64: 60,   // Short snake
  87: 36,   // Very long snake
  93: 73,   // Medium snake
  95: 75,   // Medium snake
  98: 79,   // Short snake
};

// Ladders with realistic climbing heights
const LADDERS = {
  3: 22,    // Medium ladder
  5: 8,     // Short ladder
  11: 26,   // Medium ladder
  20: 29,   // Short ladder
  27: 53,   // Long ladder
  40: 59,   // Medium ladder
  51: 67,   // Medium ladder
  61: 79,   // Medium ladder
  71: 92,   // Long ladder
  88: 91,   // Short ladder
};

function getChannelName(sessionId) {
  return `snakes-ladders-${sessionId}`;
}

function SnakesAndLaddersGame({ localPlayer, sessionId }) {
  const [uiState, setUiState] = useState("lobby"); // lobby | playing | finished
  const [matchId, setMatchId] = useState(null);

  const [player1Pos, setPlayer1Pos] = useState(0);
  const [player2Pos, setPlayer2Pos] = useState(0);
  const [currentTurn, setCurrentTurn] = useState("Partner 1");
  const [diceValue, setDiceValue] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [winner, setWinner] = useState(null);

  const [remoteConnected, setRemoteConnected] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);

  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  const matchIdRef = useRef(matchId);
  const remoteLastSeenRef = useRef(Date.now());

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  const channelName = useMemo(() => getChannelName(sessionId), [sessionId]);

  const playerName = useMemo(
    () => (localPlayer === "hunter" ? "Partner 1" : "Partner 2"),
    [localPlayer]
  );
  const remotePlayerName = useMemo(
    () => (playerName === "Partner 1" ? "Partner 2" : "Partner 1"),
    [playerName]
  );
  const isHost = localPlayer === "hunter";

  const safeTrigger = useCallback(
    async (event, data, keepalive = false) => {
      try {
        await fetch("/api/pusher/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel: channelName, event, data }),
          keepalive,
        });
      } catch (err) {
        console.error(`[${playerName}] Failed to trigger ${event}`, err);
      }
    },
    [channelName, playerName]
  );

  const resetToLobby = useCallback(
    (showToast = false) => {
      setUiState("lobby");
      setMatchId(null);
      setPlayer1Pos(0);
      setPlayer2Pos(0);
      setCurrentTurn("Partner 1");
      setDiceValue(null);
      setWinner(null);
      setIsRolling(false);
      setLocalReady(false);
      setRemoteReady(false);
      if (showToast) toast.info("Waiting for partner...");
    },
    []
  );

  // Initialize Pusher + events.
  useEffect(() => {
    setRemoteConnected(false);
    remoteLastSeenRef.current = Date.now();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });
    const channel = pusher.subscribe(channelName);
    pusherRef.current = pusher;
    channelRef.current = channel;

    channel.bind("pusher:subscription_succeeded", () => {
      safeTrigger("player-joined", { player: playerName, ts: Date.now() });
    });

    channel.bind("player-joined", (data) => {
      if (!data?.player || data.player === playerName) return;
      setRemoteConnected(true);
      remoteLastSeenRef.current = Date.now();
    });

    channel.bind("player-left", (data) => {
      if (!data?.player || data.player === playerName) return;
      setRemoteConnected(false);
      setRemoteReady(false);
      toast.info(`${data.player} left the game`);
      resetToLobby(false);
    });

    channel.bind("player-ready", (data) => {
      if (!data?.player || data.player === playerName) return;
      setRemoteConnected(true);
      remoteLastSeenRef.current = Date.now();
      setRemoteReady(Boolean(data?.ready));
    });

    channel.bind("player-ping", (data) => {
      if (!data?.player || data.player === playerName) return;
      setRemoteConnected(true);
      remoteLastSeenRef.current = Date.now();
    });

    channel.bind("game-start", (data) => {
      if (!data?.matchId) return;
      setMatchId(data.matchId);
      setPlayer1Pos(0);
      setPlayer2Pos(0);
      setCurrentTurn("Partner 1");
      setDiceValue(null);
      setWinner(null);
      setIsRolling(false);
      setUiState("playing");
      setLocalReady(false);
      setRemoteReady(false);
      toast.success("Game started! 🎲");
    });

    channel.bind("game-move", (data) => {
      if (!data) return;
      if (!data.matchId || data.matchId !== matchIdRef.current) return;

      if (data.player === "Partner 1") {
        setPlayer1Pos(data.position);
      } else {
        setPlayer2Pos(data.position);
      }
      setCurrentTurn(data.nextTurn);
      setDiceValue(data.dice);

      if (data.winner) {
        setWinner(data.winner);
        setUiState("finished");
        toast.success(`🎉 ${data.winner} wins!`);
      }
    });

    channel.bind("back-to-lobby", (data) => {
      if (!data?.player || data.player === playerName) return;
      resetToLobby(false);
    });

    return () => {
      try {
        safeTrigger("player-left", { player: playerName, ts: Date.now() }, true);
      } catch {
        // ignore
      }
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
      pusherRef.current = null;
      channelRef.current = null;
    };
  }, [channelName, playerName, resetToLobby, safeTrigger]);

  // Best-effort leave signal on navigation/close.
  useEffect(() => {
    const handler = () => {
      safeTrigger("player-left", { player: playerName, ts: Date.now() }, true);
    };
    window.addEventListener("pagehide", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [playerName, safeTrigger]);

  // Heartbeat + disconnect detection.
  useEffect(() => {
    const pingInterval = setInterval(() => {
      safeTrigger("player-ping", { player: playerName, ts: Date.now() });
    }, 3000);

    const checkInterval = setInterval(() => {
      if (!remoteConnected) return;
      const msSinceSeen = Date.now() - remoteLastSeenRef.current;
      if (msSinceSeen > 10000) {
        setRemoteConnected(false);
        setRemoteReady(false);
        toast.info("Partner disconnected");
        resetToLobby(false);
      }
    }, 2000);

    return () => {
      clearInterval(pingInterval);
      clearInterval(checkInterval);
    };
  }, [playerName, remoteConnected, resetToLobby, safeTrigger]);

  const rollDice = async () => {
    if (uiState !== "playing") return;
    if (!remoteConnected) return;
    if (currentTurn !== playerName || isRolling || winner) return;

    setIsRolling(true);
    const dice = Math.floor(Math.random() * 6) + 1;
    setDiceValue(dice);

    const currentPos = playerName === "Partner 1" ? player1Pos : player2Pos;
    let newPos = currentPos + dice;

    // Can't go beyond 100
    if (newPos > BOARD_SIZE) {
      newPos = currentPos;
    }

    // Check for snakes
    if (SNAKES[newPos]) {
      toast.error(`🐍 Snake! Slide down to ${SNAKES[newPos]}`);
      newPos = SNAKES[newPos];
    }

    // Check for ladders
    if (LADDERS[newPos]) {
      toast.success(`🪜 Ladder! Climb up to ${LADDERS[newPos]}`);
      newPos = LADDERS[newPos];
    }

    // Check for winner
    const gameWinner = newPos === BOARD_SIZE ? playerName : null;

    // Update position
    if (playerName === "Partner 1") {
      setPlayer1Pos(newPos);
    } else {
      setPlayer2Pos(newPos);
    }

    // Broadcast move
    await fetch("/api/games/snakes-ladders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        matchId,
        player: playerName,
        position: newPos,
        dice,
        nextTurn: playerName === "Partner 1" ? "Partner 2" : "Partner 1",
        winner: gameWinner,
      }),
    });

    setIsRolling(false);
  };

  const toggleReady = async () => {
    const next = !localReady;
    setLocalReady(next);
    await safeTrigger("player-ready", { player: playerName, ready: next, ts: Date.now() });
  };

  const startGame = async () => {
    if (!isHost) return;
    if (!remoteConnected || !localReady || !remoteReady) return;
    if (uiState !== "lobby") return;

    const nextMatchId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMatchId(nextMatchId);
    setPlayer1Pos(0);
    setPlayer2Pos(0);
    setCurrentTurn("Partner 1");
    setDiceValue(null);
    setWinner(null);
    setIsRolling(false);
    setUiState("playing");
    setLocalReady(false);
    setRemoteReady(false);

    await safeTrigger("game-start", { matchId: nextMatchId, startedBy: "Partner 1", ts: Date.now() });
  };

  const backToLobby = async () => {
    resetToLobby(false);
    await safeTrigger("back-to-lobby", { player: playerName, ts: Date.now() });
  };

  const renderBoard = () => {
    const cells = [];
    for (let row = 9; row >= 0; row--) {
      const rowCells = [];
      for (let col = 0; col < 10; col++) {
        const num = row % 2 === 1 
          ? row * 10 + (10 - col)
          : row * 10 + col + 1;

        const isSnake = SNAKES[num];
        const isLadder = LADDERS[num];
        const hasPlayer1 = player1Pos === num;
        const hasPlayer2 = player2Pos === num;

        // Determine snake size for emoji
        const snakeLength = isSnake ? num - isSnake : 0;
        const snakeEmoji = snakeLength > 30 ? "🐉" : snakeLength > 20 ? "🐍" : "🪱";
        
        // Determine ladder height for visual
        const ladderHeight = isLadder ? isLadder - num : 0;
        const ladderSize = ladderHeight > 25 ? "text-3xl" : ladderHeight > 15 ? "text-2xl" : "text-xl";

        rowCells.push(
          <div
            key={num}
            className={`relative aspect-square border-2 flex items-center justify-center text-xs sm:text-sm font-semibold transition-all hover:scale-105 ${
              isSnake
                ? "bg-gradient-to-br from-red-100 to-red-200 border-red-300 shadow-inner"
                : isLadder
                ? "bg-gradient-to-br from-green-100 to-emerald-200 border-green-300 shadow-inner"
                : num === BOARD_SIZE
                ? "bg-gradient-to-br from-yellow-200 to-orange-300 border-yellow-400 shadow-lg animate-pulse"
                : (row + col) % 2 === 0
                ? "bg-gradient-to-br from-purple-50 to-pink-100 border-purple-200"
                : "bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200"
            }`}
          >
            {/* Cell number */}
            <span className={`absolute top-1 left-1.5 text-[10px] font-bold ${
              num === BOARD_SIZE ? "text-orange-700" : "text-gray-600"
            }`}>
              {num}
            </span>
            
            {/* Win star */}
            {num === BOARD_SIZE && (
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-spin-slow">
                ⭐
              </div>
            )}
            
            {/* Snake */}
            {isSnake && (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                <div className={`${snakeLength > 20 ? 'text-3xl' : 'text-2xl'} transform rotate-12`}>
                  {snakeEmoji}
                </div>
                <div className="text-[8px] font-bold text-red-700 bg-white/70 px-1 rounded">
                  ↓{isSnake}
                </div>
              </div>
            )}
            
            {/* Ladder */}
            {isLadder && (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50">
                <div className={`${ladderSize} transform -rotate-12`}>
                  🪜
                </div>
                <div className="text-[8px] font-bold text-green-700 bg-white/70 px-1 rounded">
                  ↑{isLadder}
                </div>
              </div>
            )}

            {/* Players */}
            <div className="absolute bottom-1 right-1 flex gap-0.5 z-10">
              {hasPlayer1 && (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white animate-bounce">
                  H
                </div>
              )}
              {hasPlayer2 && (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white animate-bounce">
                  R
                </div>
              )}
            </div>
          </div>
        );
      }
      cells.push(
        <div key={row} className="grid grid-cols-10 gap-0">
          {rowCells}
        </div>
      );
    }
    return cells;
  };

  const didWin = winner && winner === playerName;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
        <Link href="/games">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Games
          </Button>
        </Link>

        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-2">
              🐍 Snakes & Ladders 🪜
            </h1>
            <p className="text-gray-600">Race to 100! Watch out for snakes!</p>
          </div>

          {uiState === "lobby" ? (
            <div className="text-center py-10 space-y-6">
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      H
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-700">Partner 1 💙</p>
                      <p className={`text-xs ${playerName === "Partner 1" && localReady ? "text-green-700 font-bold" : playerName === "Partner 1" ? "text-muted-foreground" : remoteReady ? "text-green-700 font-bold" : "text-muted-foreground"}`}>
                        {playerName === "Partner 1" ? (localReady ? "Ready" : "Not ready") : remoteReady ? "Ready" : remoteConnected ? "Not ready" : "Not connected"}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      R
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-700">Partner 2 💖</p>
                      <p className={`text-xs ${playerName === "Partner 2" && localReady ? "text-green-700 font-bold" : playerName === "Partner 2" ? "text-muted-foreground" : remoteReady ? "text-green-700 font-bold" : "text-muted-foreground"}`}>
                        {playerName === "Partner 2" ? (localReady ? "Ready" : "Not ready") : remoteReady ? "Ready" : remoteConnected ? "Not ready" : "Not connected"}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You are playing as <span className="font-bold">{playerName}</span>.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={toggleReady} variant={localReady ? "outline" : "default"}>
                    {localReady ? "Unready" : "I'm Ready"}
                  </Button>

                  {isHost ? (
                    <Button
                      onClick={startGame}
                      className="bg-gradient-to-r from-rose-500 to-pink-600"
                      disabled={!remoteConnected || !localReady || !remoteReady}
                    >
                      Start Game
                    </Button>
                  ) : (
                    <Button disabled className="bg-gradient-to-r from-rose-500 to-pink-600 opacity-60">
                      Waiting for Partner 1 to start...
                    </Button>
                  )}
                </div>

                {!remoteConnected && (
                  <p className="text-xs text-muted-foreground">
                    Waiting for {remotePlayerName} to open the game.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Game Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className={`p-4 transition-all ${currentTurn === "Partner 1" ? "ring-4 ring-blue-400 shadow-lg shadow-blue-300/50 scale-105" : "opacity-75"}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        H
                      </div>
                      {currentTurn === "Partner 1" && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-700">Partner 1 💙</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-blue-600">{player1Pos}</p>
                        <p className="text-xs text-gray-500">/ 100</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-gradient-to-r from-blue-400 to-blue-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${player1Pos}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className={`p-4 transition-all ${currentTurn === "Partner 2" ? "ring-4 ring-pink-400 shadow-lg shadow-pink-300/50 scale-105" : "opacity-75"}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        R
                      </div>
                      {currentTurn === "Partner 2" && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-700">Partner 2 💖</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-pink-600">{player2Pos}</p>
                        <p className="text-xs text-gray-500">/ 100</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-gradient-to-r from-pink-400 to-pink-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${player2Pos}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Dice and Controls */}
              <div className="text-center mb-6">
                {diceValue && (
                  <div className="mb-4 relative">
                    <div className="text-7xl sm:text-8xl animate-bounce inline-block">
                      {["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][diceValue - 1]}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                )}

                {uiState === "finished" && winner ? (
                  <div className="space-y-4 py-8">
                    <div className="text-6xl">{didWin ? "🏆" : "💖"}</div>
                    <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                      {didWin ? "You won!" : "Good game!"}
                    </p>
                    <p className="text-gray-600">
                      {didWin ? `Winner: ${winner}` : `Winner: ${winner} — You’ll win the next one 😌`}
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <Button onClick={backToLobby} size="lg" className="bg-gradient-to-r from-rose-500 to-pink-600 hover:shadow-lg transition-all">
                        Back to Start
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className={`w-3 h-3 rounded-full ${currentTurn === playerName ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                      <p className="text-lg font-semibold">
                        {!remoteConnected
                          ? `⏳ Waiting for ${remotePlayerName}...`
                          : currentTurn === playerName
                          ? "🎯 Your turn!"
                          : `⏳ ${currentTurn}'s turn`}
                      </p>
                    </div>
                    <Button
                      onClick={rollDice}
                      disabled={!remoteConnected || currentTurn !== playerName || isRolling}
                      size="lg"
                      className="bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Dices className="mr-2 h-5 w-5" />
                      {isRolling ? "🎲 Rolling..." : "🎲 Roll Dice"}
                    </Button>
                    <div className="mt-3">
                      <Button variant="outline" onClick={backToLobby}>
                        Back to Start
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Game Board */}
              <div className="bg-white rounded-lg p-2 sm:p-4 shadow-inner">
                {renderBoard()}
              </div>

              {/* Legend */}
              <div className="mt-4 flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border border-gray-300"></div>
                  <span>🐍 Snake</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-gray-300"></div>
                  <span>🪜 Ladder</span>
                </div>
              </div>
            </>
          )}
        </div>
    </div>
  );
}

export default function SnakesAndLadders() {
  return (
    <LocalMultiplayerWrapper
      gameId="snakes-ladders"
      gameName="Snakes & Ladders"
      hunterColor="from-blue-500 to-blue-700"
      riceeeColor="from-pink-500 to-rose-600"
    >
      {(props) => <SnakesAndLaddersGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
