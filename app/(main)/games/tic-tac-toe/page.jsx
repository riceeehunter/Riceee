"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X as XIcon, Circle, Users, Trophy, RotateCcw, Clock, Swords, Zap } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

const CHANNEL_NAME = "game-tic-tac-toe";

function TicTacToeGame({ localPlayer, sessionId, getPlayerName }) {
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
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 pb-20 sm:pb-4">
        <div className="max-w-xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/games">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className={`${plusJakarta.className} text-2xl sm:text-3xl font-bold text-[#ab4400]`}>
              Tic Tac Toe
            </h1>
          </div>

          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-5 sm:p-6">
              <CardTitle className="text-center">
                <Users size={28} className="mx-auto mb-2 opacity-80" />
                <span className="text-xl sm:text-2xl font-black tracking-tight">The Grid Duel</span>
                <p className="text-white/70 text-[10px] sm:text-xs font-medium mt-1">First to three in a row wins!</p>
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
                 {localReady ? "WAITING FOR PARTNER..." : "READY TO DUEL! ⚔️"}
               </Button>

               {!remoteConnected && (
                 <p className="text-center text-[10px] sm:text-xs text-[#9d4867] font-medium animate-pulse">
                   Waiting for {remotePlayerName} to join...
                 </p>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState === "playing") {
    return (
      <div className="flex flex-col p-2 sm:p-4 min-h-dvh overflow-y-auto scrollbar-hide bg-[#fffaf8]">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center py-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6 px-2">
            <div className="flex items-center gap-2">
              <Link href="/games">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <h1 className={`${plusJakarta.className} text-lg sm:text-xl font-bold text-[#ab4400]`}>
                The Grid
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-[#fff0e8] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#ffae88]/30">
              <Zap size={14} className="text-[#ab4400]" />
              <p className="text-[10px] sm:text-xs font-bold text-[#ab4400] uppercase tracking-wider">
                {currentTurn === localPlayer ? "YOUR TURN" : `${remotePlayerName.split(' ')[0]}'S TURN`}
              </p>
            </div>
          </div>

          <Card className="border-none shadow-xl flex flex-col bg-white overflow-hidden rounded-[2.5rem] sm:rounded-3xl border-2 border-orange-100 mb-20 sm:mb-0">
             <CardHeader className="bg-orange-50/50 py-2 sm:py-3 border-b border-orange-100 flex-shrink-0">
                <div className="flex items-center justify-between px-2">
                   <div className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${currentTurn === localPlayer ? "bg-[#ab4400] text-white shadow-lg" : "text-[#6a2700] opacity-40"}`}>
                      <span className="text-lg sm:text-xl">{localEmoji}</span>
                      <span className="text-[8px] sm:text-[10px] font-black uppercase">YOU (X)</span>
                   </div>
                   <div className="text-xl font-black text-[#ab4400]/20">VS</div>
                   <div className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${currentTurn === remotePlayer ? "bg-[#9d4867] text-white shadow-lg" : "text-[#6a2700] opacity-40"}`}>
                      <span className="text-lg sm:text-xl">{remoteEmoji}</span>
                      <span className="text-[8px] sm:text-[10px] font-black uppercase">{remotePlayerName.split(' ')[0]} (O)</span>
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[300px] sm:max-w-none aspect-square">
                   {board.map((cell, i) => (
                     <button
                       key={i}
                       onClick={() => handleCellClick(i)}
                       className={`aspect-square rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-5xl font-black transition-all transform active:scale-90 border-2 sm:border-4 ${
                         !cell && currentTurn === localPlayer ? "bg-stone-50 hover:bg-orange-50 border-stone-100 cursor-pointer" : "bg-white border-orange-50 cursor-default"
                       } ${winningLine && winningLine.includes(i) ? "bg-green-100 border-green-300" : ""}`}
                     >
                       {cell === "X" && <XIcon className="w-10 h-10 text-blue-500 animate-in zoom-in-50 duration-200" strokeWidth={4} />}
                       {cell === "O" && <Circle className="w-10 h-10 text-red-500 animate-in zoom-in-50 duration-200" strokeWidth={4} />}
                     </button>
                   ))}
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState === "finished") {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 pb-20 sm:pb-4">
        <div className="max-w-lg w-full">
          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-6 sm:p-8 text-center rounded-t-3xl">
              <Trophy size={40} className="mx-auto mb-4 text-yellow-300 sm:h-12 sm:w-12" />
              <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight">
                {winner === localPlayer ? "VICTORY!" : winner === "draw" ? "STALEMATE!" : "GOOD GAME!"}
              </CardTitle>
              <p className="text-white/70 font-medium mt-2 text-sm">
                {winner === localPlayer ? "The grid is yours." : winner === "draw" ? "No winner this time." : `${remotePlayerName} took the win.`}
              </p>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6 sm:space-y-8">
              <div className="flex items-center justify-around">
                 <div className={`flex flex-col items-center gap-2 p-4 sm:p-6 rounded-3xl border-4 ${winner === localPlayer ? "bg-orange-50 border-orange-200 ring-8 ring-orange-50" : "bg-stone-50 border-stone-100 opacity-60"}`}>
                   <span className="text-3xl sm:text-4xl">{localEmoji}</span>
                   <p className="font-black text-[#ab4400] text-sm sm:text-base">YOU</p>
                 </div>
                 <div className="text-3xl font-black text-[#ab4400]/20">VS</div>
                 <div className={`flex flex-col items-center gap-2 p-4 sm:p-6 rounded-3xl border-4 ${winner === remotePlayer ? "bg-pink-50 border-pink-200 ring-8 ring-pink-50" : "bg-stone-50 border-stone-100 opacity-60"}`}>
                   <span className="text-3xl sm:text-4xl">{remoteEmoji}</span>
                   <p className="font-black text-[#9d4867] text-sm sm:text-base uppercase truncate max-w-[80px]">{remotePlayerName.split(' ')[0]}</p>
                 </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full py-6 sm:py-8 text-lg sm:text-xl font-black bg-[#ab4400] text-white rounded-2xl shadow-lg hover:bg-[#973b00] transition-all active:scale-95 shadow-[#ab4400]/20"
                >
                  REMATCH 🔄
                </Button>
                <Link href="/games">
                  <Button variant="ghost" className="w-full py-4 text-[#9d4867] font-bold text-sm">
                    BACK TO ARENA
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

export default function TicTacToe() {
  return (
    <LocalMultiplayerWrapper gameId="tic-tac-toe" gameName="Tic Tac Toe">
      {(props) => <TicTacToeGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
