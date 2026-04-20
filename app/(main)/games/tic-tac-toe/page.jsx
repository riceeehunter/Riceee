"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X as XIcon, Circle } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";

const CHANNEL_NAME = "game-tic-tac-toe";
const getChannelName = (sessionId) => (sessionId ? `${CHANNEL_NAME}-${sessionId}` : CHANNEL_NAME);

function TicTacToeGame({ localPlayer, sessionId, getPlayerName }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [gameState, setGameState] = useState("menu"); // menu, playing, finished
  const [currentTurn, setCurrentTurn] = useState(PLAYER_IDS.ONE); // Who's turn it is
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [localScore, setLocalScore] = useState(0);
  const [remoteScore, setRemoteScore] = useState(0);
  const [pusherClient, setPusherClient] = useState(null);
  const [channel, setChannel] = useState(null);

  const channelName = getChannelName(sessionId);

  const remotePlayerId = getOtherPlayer(localPlayer);
  const localPlayerName = getPlayerName(localPlayer);
  const remotePlayerName = getPlayerName(remotePlayerId);

  // Determine player symbols
  const localSymbol = localPlayer === PLAYER_IDS.ONE ? "X" : "O";
  const remoteSymbol = localSymbol === "X" ? "O" : "X";

  // Initialize Pusher
  useEffect(() => {
    if (!localPlayer) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const gameChannel = pusher.subscribe(channelName);
    setPusherClient(pusher);
    setChannel(gameChannel);

    return () => {
      gameChannel.unsubscribe();
      pusher.disconnect();
    };
  }, [localPlayer, channelName]);

  // Listen for game events
  useEffect(() => {
    if (!channel) return;

    channel.bind("game-start", () => {
      setGameState("playing");
      setBoard(Array(9).fill(null));
      setCurrentTurn(PLAYER_IDS.ONE);
      setWinner(null);
      setWinningLine(null);
    });

    channel.bind("move-made", (data) => {
      if (data.player !== localPlayer) {
        setBoard(data.board);
        setCurrentTurn(data.nextTurn);
      }
    });

    channel.bind("game-over", (data) => {
      if (Array.isArray(data?.board) && data.board.length === 9) {
        setBoard(data.board);
      }
      if (typeof data?.nextTurn === "string") {
        setCurrentTurn(data.nextTurn);
      }
      setWinner(data.winner);
      setWinningLine(data.winningLine);
      setGameState("finished");
      
      // Update scores
      if (data.winner === localPlayer) {
        setLocalScore((prev) => prev + 1);
      } else if (data.winner && data.winner !== "draw") {
        setRemoteScore((prev) => prev + 1);
      }
    });

    return () => {
      channel.unbind("game-start");
      channel.unbind("move-made");
      channel.unbind("game-over");
    };
  }, [channel, localPlayer]);

  // Broadcast game start
  const startGame = async () => {
    if (!channel) return;

    await fetch("/api/pusher/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: channelName,
        event: "game-start",
        data: {},
      }),
    });

    setGameState("playing");
    setBoard(Array(9).fill(null));
    setCurrentTurn(PLAYER_IDS.ONE);
    setWinner(null);
    setWinningLine(null);
  };

  // Check for winner
  const checkWinner = (currentBoard) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return { winner: currentBoard[a], line: lines[i] };
      }
    }

    if (currentBoard.every((cell) => cell !== null)) {
      return { winner: "draw", line: null };
    }

    return null;
  };

  // Make a move
  const handleCellClick = async (index) => {
    if (
      gameState !== "playing" ||
      currentTurn !== localPlayer ||
      board[index] !== null
    ) {
      return;
    }

    const newBoard = [...board];
    newBoard[index] = localSymbol;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    const nextTurn = currentTurn === PLAYER_IDS.ONE ? PLAYER_IDS.TWO : PLAYER_IDS.ONE;

    if (result) {
      // Game over
      const winnerPlayer =
        result.winner === "draw"
          ? "draw"
          : result.winner === "X"
          ? PLAYER_IDS.ONE
          : PLAYER_IDS.TWO;

      setWinner(winnerPlayer);
      setWinningLine(result.line);
      setGameState("finished");

      if (winnerPlayer === localPlayer) {
        setLocalScore((prev) => prev + 1);
      } else if (winnerPlayer !== "draw") {
        setRemoteScore((prev) => prev + 1);
      }

      await fetch("/api/pusher/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: channelName,
          event: "game-over",
          data: {
            winner: winnerPlayer,
            winningLine: result.line,
            board: newBoard,
            nextTurn,
          },
        }),
      });
    } else {
      // Continue game
      setCurrentTurn(nextTurn);

      await fetch("/api/pusher/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: channelName,
          event: "move-made",
          data: {
            player: localPlayer,
            board: newBoard,
            nextTurn: nextTurn,
          },
        }),
      });
    }
  };

  const playerColors = {
    [PLAYER_IDS.ONE]: {
      border: "border-orange-500",
      bg: "bg-orange-500/20",
      text: "text-orange-500",
    },
    [PLAYER_IDS.TWO]: {
      border: "border-pink-500",
      bg: "bg-pink-500/20",
      text: "text-pink-500",
    },
  };

  const localColor = playerColors[localPlayer] || playerColors[PLAYER_IDS.ONE];
  const remoteColor = playerColors[remotePlayerId] || playerColors[PLAYER_IDS.TWO];

  const renderCell = (index) => {
    const value = board[index];
    const isWinningCell = winningLine && winningLine.includes(index);

    return (
      <button
        key={index}
        onClick={() => handleCellClick(index)}
        disabled={gameState !== "playing" || currentTurn !== localPlayer || value !== null}
        className={`aspect-square rounded-lg border-2 flex items-center justify-center text-4xl font-bold transition-all
          ${
            gameState === "playing" && currentTurn === localPlayer && value === null
              ? "hover:bg-muted cursor-pointer"
              : ""
          }
          ${isWinningCell ? "bg-green-100 border-green-500" : "border-border"}
          ${value === null ? "" : "cursor-not-allowed"}
        `}
      >
        {value === "X" && <XIcon className="w-12 h-12 text-blue-600" strokeWidth={3} />}
        {value === "O" && <Circle className="w-12 h-12 text-red-600" strokeWidth={3} />}
      </button>
    );
  };

  if (gameState === "menu") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/games">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2" size={16} />
            Back to Games
          </Button>
        </Link>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl text-center">Tic Tac Toe</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="text-6xl mb-4">⭕❌</div>
            <h2 className="text-2xl font-bold">Ready to Play?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Classic strategy game in real-time! <span className="font-bold">{localPlayerName}</span> plays as{" "}
              <span className="text-blue-600 font-bold">X</span>, {remotePlayerName} plays as{" "}
              <span className="text-red-600 font-bold">O</span>. First player always goes first!
            </p>
            
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className={`p-4 rounded-lg border-2 ${localColor.border} ${localColor.bg}`}>
                <div className="font-bold mb-2">{localPlayerName}</div>
                <div className="text-3xl mb-1">
                  {localSymbol === "X" ? <XIcon className="w-8 h-8 mx-auto text-blue-600" /> : <Circle className="w-8 h-8 mx-auto text-red-600" />}
                </div>
                <div className="text-2xl font-bold">{localScore} wins</div>
              </div>
              <div className={`p-4 rounded-lg border-2 ${remoteColor.border} ${remoteColor.bg}`}>
                <div className="font-bold mb-2 capitalize">{remotePlayerName}</div>
                <div className="text-3xl mb-1">
                  {remoteSymbol === "X" ? <XIcon className="w-8 h-8 mx-auto text-blue-600" /> : <Circle className="w-8 h-8 mx-auto text-red-600" />}
                </div>
                <div className="text-2xl font-bold">{remoteScore} wins</div>
              </div>
            </div>

            <Button onClick={startGame} size="lg" className="text-lg px-8">
              Start Game! 🎮
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/games">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2" size={16} />
          Back to Games
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl text-center">Tic Tac Toe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg border-2 ${localColor.border} ${localColor.bg} ${
                currentTurn === localPlayer && gameState === "playing" ? "ring-2 ring-offset-2 " + localColor.text.replace("text-", "ring-") : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{localPlayerName}</span>
                {localSymbol === "X" ? <XIcon className="w-6 h-6 text-blue-600" /> : <Circle className="w-6 h-6 text-red-600" />}
              </div>
              <div className="text-2xl font-bold mt-2">{localScore} wins</div>
              {currentTurn === localPlayer && gameState === "playing" && (
                <div className="text-sm mt-1 font-semibold">Your turn! ⏰</div>
              )}
            </div>
            <div
              className={`p-4 rounded-lg border-2 ${remoteColor.border} ${remoteColor.bg} ${
                currentTurn === remotePlayerId && gameState === "playing" ? "ring-2 ring-offset-2 " + remoteColor.text.replace("text-", "ring-") : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{remotePlayerName}</span>
                {remoteSymbol === "X" ? <XIcon className="w-6 h-6 text-blue-600" /> : <Circle className="w-6 h-6 text-red-600" />}
              </div>
              <div className="text-2xl font-bold mt-2">{remoteScore} wins</div>
              {currentTurn === remotePlayerId && gameState === "playing" && (
                <div className="text-sm mt-1 font-semibold">Waiting... ⏳</div>
              )}
            </div>
          </div>

          {/* Game Board */}
          <div className="max-w-md mx-auto">
            <div className="grid grid-cols-3 gap-3 mb-6">
              {Array(9)
                .fill(null)
                .map((_, index) => renderCell(index))}
            </div>
          </div>

          {/* Game Over Message */}
          {gameState === "finished" && (
            <div className="text-center space-y-4">
              <div className="text-4xl mb-2">
                {winner === "draw" ? "🤝" : winner === localPlayer ? "🎉" : "😔"}
              </div>
              <h3 className="text-2xl font-bold">
                {winner === "draw"
                  ? "It's a Draw!"
                  : winner === localPlayer
                  ? "You Won!"
                    : `${remotePlayerName} Won!`}
              </h3>
              <Button onClick={startGame} size="lg">
                Play Again 🔄
              </Button>
            </div>
          )}

          {/* Turn Indicator */}
          {gameState === "playing" && (
            <div className="text-center text-lg font-semibold">
              {currentTurn === localPlayer ? (
                <span className={localColor.text}>Your turn - make your move!</span>
              ) : (
                <span className={remoteColor.text}>
                  Waiting for {remotePlayerName}'s move...
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TicTacToe() {
  return (
    <LocalMultiplayerWrapper gameId="tic-tac-toe" gameName="Tic Tac Toe">
      {(props) => <TicTacToeGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
