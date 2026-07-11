"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X as XIcon, Circle } from "lucide-react";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";
import {
  LobbyScreen,
  ResultScreen,
  GameFrame,
  BackToArena,
  TurnPill,
  PlayerDisc,
} from "../_components/game-ui";


function TicTacToeGame({ localPlayer, sessionId, getPlayerName }) {
  const CHANNEL_NAME = sessionId;
  const [board, setBoard] = useState(Array(9).fill(null));
  const [gameState, setGameState] = useState("menu");
  const [currentTurn, setCurrentTurn] = useState(PLAYER_IDS.ONE);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
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

  const localSymbol = localPlayer === PLAYER_IDS.ONE ? "X" : "O";
  const remoteSymbol = localSymbol === "X" ? "O" : "X";

  // Initialize Pusher
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const gameChannel = pusher.subscribe(CHANNEL_NAME);
    setChannel(gameChannel);

    gameChannel.bind('pusher:subscription_succeeded', () => {
      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: 'player-joined',
          data: { player: localPlayer, ready: localReadyRef.current }
        })
      });
    });

    gameChannel.bind('player-joined', (data) => {
      if (data.player !== localPlayer) {
        setRemoteConnected(true);
        setRemoteReady(data.ready);
        fetch('/api/pusher/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: CHANNEL_NAME,
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
      if (data.player !== localPlayer) setRemoteReady(data.ready);
    });

    gameChannel.bind('game-start', (data) => {
      setGameState("playing");
      setBoard(Array(9).fill(null));
      setCurrentTurn(PLAYER_IDS.ONE);
      setWinner(null);
      setWinningLine(null);
    });

    gameChannel.bind('move-made', (data) => {
      if (data.player !== localPlayer) {
        setBoard(data.board);
        setCurrentTurn(data.nextTurn);
      }
    });

    gameChannel.bind('game-over', (data) => {
      setBoard(data.board);
      setWinner(data.winner);
      setWinningLine(data.winningLine);
      setGameState("finished");
    });

    return () => {
      gameChannel.unbind_all();
      pusher.unsubscribe(CHANNEL_NAME);
      pusher.disconnect();
    };
  }, [localPlayer]);

  const handleReady = () => {
    const nextReady = !localReady;
    setLocalReady(nextReady);
    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
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
          channel: CHANNEL_NAME,
          event: 'game-start',
          data: {}
        })
      });
    }
  }, [localReady, remoteReady, localPlayer, gameState]);

  const checkWinner = (currentBoard) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let line of lines) {
      const [a, b, c] = line;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a], line };
      }
    }
    if (currentBoard.every(cell => cell !== null)) return { winner: "draw", line: null };
    return null;
  };

  const handleCellClick = async (index) => {
    if (gameState !== "playing" || currentTurn !== localPlayer || board[index] !== null) return;

    const newBoard = [...board];
    newBoard[index] = localSymbol;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    const nextTurn = currentTurn === PLAYER_IDS.ONE ? PLAYER_IDS.TWO : PLAYER_IDS.ONE;

    if (result) {
      const winnerPlayer = result.winner === "draw" ? "draw" : (result.winner === "X" ? PLAYER_IDS.ONE : PLAYER_IDS.TWO);
      setWinner(winnerPlayer);
      setWinningLine(result.line);
      setGameState("finished");

      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: 'game-over',
          data: { winner: winnerPlayer, winningLine: result.line, board: newBoard }
        })
      });
    } else {
      setCurrentTurn(nextTurn);
      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: 'move-made',
          data: { player: localPlayer, board: newBoard, nextTurn }
        })
      });
    }
  };

  if (gameState === "menu") {
    return (
      <LobbyScreen
        gameTitle="Tic Tac Toe"
        tagline="Three in a row, live on both screens."
        localName={localPlayerName}
        remoteName={remotePlayerName}
        localReady={localReady}
        remoteReady={remoteReady}
        remoteConnected={remoteConnected}
        onReady={handleReady}
        localRole={`You · ${localSymbol}`}
        remoteRole={remoteSymbol}
      />
    );
  }

  if (gameState === "playing") {
    return (
      <GameFrame size="max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <BackToArena />
          <TurnPill isLocalTurn={currentTurn === localPlayer} remoteName={remotePlayerName} />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
          {/* Players strip */}
          <div className="flex items-center justify-between border-b border-[#f5f2ee] px-5 py-3.5">
            <div className={`flex items-center gap-2.5 transition-opacity ${currentTurn === localPlayer ? "" : "opacity-40"}`}>
              <PlayerDisc name={localPlayerName} kind="local" size="sm" />
              <div className="leading-tight">
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>You</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ab4400]/70">{localSymbol}</p>
              </div>
            </div>
            <span className={`${plusJakarta.className} text-sm font-extrabold italic text-[#d8d4cb]`}>vs</span>
            <div className={`flex flex-row-reverse items-center gap-2.5 text-right transition-opacity ${currentTurn === remotePlayer ? "" : "opacity-40"}`}>
              <PlayerDisc name={remotePlayerName} kind="remote" size="sm" />
              <div className="leading-tight">
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>{remotePlayerName.split(" ")[0]}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9d4867]/70">{remoteSymbol}</p>
              </div>
            </div>
          </div>

          {/* Board */}
          <div className="bg-[#fdfaf7] p-5 sm:p-6">
            <div className="mx-auto grid aspect-square w-full max-w-[340px] grid-cols-3 gap-2.5">
              {board.map((cell, i) => {
                const inWinningLine = winningLine && winningLine.includes(i);
                const playable = !cell && currentTurn === localPlayer;
                return (
                  <button
                    key={i}
                    onClick={() => handleCellClick(i)}
                    className={`flex aspect-square items-center justify-center rounded-2xl border transition-all active:scale-95 ${
                      inWinningLine
                        ? "border-[#ab4400] bg-[#fff4ec] shadow-[0_8px_20px_rgba(171,68,0,0.16)]"
                        : playable
                          ? "cursor-pointer border-[#efe9e2] bg-white hover:border-[#ffba99] hover:bg-[#fff8f3]"
                          : "cursor-default border-[#f5f2ee] bg-white"
                    }`}
                  >
                    {cell === "X" && (
                      <XIcon className="h-10 w-10 text-[#ab4400] animate-in zoom-in-50 duration-200" strokeWidth={3.2} />
                    )}
                    {cell === "O" && (
                      <Circle className="h-9 w-9 text-[#9d4867] animate-in zoom-in-50 duration-200" strokeWidth={3.2} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </GameFrame>
    );
  }

  if (gameState === "finished") {
    return (
      <ResultScreen
        outcome={winner === localPlayer ? "win" : winner === "draw" ? "draw" : "lose"}
        localName={localPlayerName}
        remoteName={remotePlayerName}
        onRematch={() => window.location.reload()}
      />
    );
  }

  return null;
}

export default function TicTacToe() {
  return (
    <LocalMultiplayerWrapper gameId="tic-tac-toe" gameName="Tic Tac Toe">
      {(props) => <TicTacToeGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
