"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dices, Trophy, Users, Clock, Swords, ChevronUp, ChevronDown, Zap } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

const BOARD_SIZE = 100;
const SNAKES = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 95: 75, 98: 79 };
const LADDERS = { 3: 22, 5: 8, 11: 26, 20: 29, 27: 53, 40: 59, 51: 67, 61: 79, 71: 92, 88: 91 };

const CHANNEL_NAME = "game-snakes-ladders";

function SnakesAndLaddersGame({ localPlayer, sessionId, getPlayerName }) {
  const [gameState, setGameState] = useState("menu");
  const [player1Pos, setPlayer1Pos] = useState(0);
  const [player2Pos, setPlayer2Pos] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(PLAYER_IDS.ONE);
  const [diceValue, setDiceValue] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [winner, setWinner] = useState(null);
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
      setPlayer1Pos(0);
      setPlayer2Pos(0);
      setCurrentTurn(PLAYER_IDS.ONE);
      setDiceValue(null);
      setWinner(null);
    });

    gameChannel.bind('game-move', (data) => {
      if (data.player !== localPlayer) {
        if (data.player === PLAYER_IDS.ONE) setPlayer1Pos(data.position);
        else setPlayer2Pos(data.position);
        setCurrentTurn(data.nextTurn);
        setDiceValue(data.dice);
        if (data.winner) {
          setWinner(data.winner);
          setGameState("finished");
        }
      }
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

  const rollDice = async () => {
    if (gameState !== "playing" || currentTurn !== localPlayer || isRolling || winner) return;

    setIsRolling(true);
    const dice = Math.floor(Math.random() * 6) + 1;
    setDiceValue(dice);

    // Simulate roll animation delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const currentPos = localPlayer === PLAYER_IDS.ONE ? player1Pos : player2Pos;
    let newPos = currentPos + dice;

    if (newPos > BOARD_SIZE) newPos = currentPos;
    if (SNAKES[newPos]) newPos = SNAKES[newPos];
    if (LADDERS[newPos]) newPos = LADDERS[newPos];

    const gameWinner = newPos === BOARD_SIZE ? localPlayer : null;

    if (localPlayer === PLAYER_IDS.ONE) setPlayer1Pos(newPos);
    else setPlayer2Pos(newPos);

    const nextTurn = localPlayer === PLAYER_IDS.ONE ? PLAYER_IDS.TWO : PLAYER_IDS.ONE;
    
    if (gameWinner) {
      setWinner(gameWinner);
      setGameState("finished");
    } else {
      setCurrentTurn(nextTurn);
    }

    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: 'game-move',
        data: { player: localPlayer, position: newPos, dice, nextTurn, winner: gameWinner }
      })
    });

    setIsRolling(false);
  };

  const renderBoard = () => {
    const cells = [];
    for (let row = 9; row >= 0; row--) {
      for (let col = 0; col < 10; col++) {
        const num = row % 2 === 1 ? row * 10 + (10 - col) : row * 10 + col + 1;
        const hasP1 = player1Pos === num;
        const hasP2 = player2Pos === num;
        const isSnake = SNAKES[num];
        const isLadder = LADDERS[num];

        cells.push(
          <div key={num} className={`relative aspect-square border-[0.5px] border-stone-100 flex items-center justify-center text-[8px] font-bold ${(row + col) % 2 === 0 ? "bg-stone-50" : "bg-white"}`}>
            <span className="absolute top-0.5 left-0.5 opacity-20">{num}</span>
            {isSnake && <div className="text-[14px] opacity-40">🐍</div>}
            {isLadder && <div className="text-[14px] opacity-40">🪜</div>}
            
            <div className="flex gap-0.5 z-10">
               {hasP1 && <div className="w-4 h-4 rounded-full bg-[#ab4400] border border-white shadow-sm flex items-center justify-center text-[6px] text-white font-black animate-bounce">1</div>}
               {hasP2 && <div className="w-4 h-4 rounded-full bg-[#9d4867] border border-white shadow-sm flex items-center justify-center text-[6px] text-white font-black animate-bounce">2</div>}
            </div>
          </div>
        );
      }
    }
    return cells;
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
              Snakes & Ladders
            </h1>
          </div>

          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-5 sm:p-6">
              <CardTitle className="text-center">
                <Zap size={28} className="mx-auto mb-2 opacity-80" />
                <span className="text-xl sm:text-2xl font-black tracking-tight">The Big Race</span>
                <p className="text-white/70 text-[10px] sm:text-xs font-medium mt-1">Climb ladders, avoid snakes, reach 100!</p>
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
                 {localReady ? "WAITING FOR PARTNER..." : "READY TO ROLL! 🎲"}
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
      <div className="flex flex-col p-2 sm:p-4 h-dvh overflow-y-auto scrollbar-hide bg-[#fffaf8]">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2 sm:mb-4 px-2">
            <div className="flex items-center gap-2">
              <Link href="/games">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <h1 className={`${plusJakarta.className} text-lg sm:text-xl font-bold text-[#ab4400]`}>
                Board Race
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-[#fff0e8] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#ffae88]/30">
              <Swords size={14} className="text-[#ab4400]" />
              <p className="text-[10px] sm:text-xs font-bold text-[#ab4400] uppercase tracking-wider">
                SNAKE DUEL
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-4 sm:space-y-8 pb-12">
             <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <div className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${currentTurn === PLAYER_IDS.ONE ? "bg-orange-50 border-orange-400 shadow-lg scale-105" : "bg-stone-50 border-stone-100 opacity-60"}`}>
                   <div className="flex flex-col">
                      <span className="font-black text-[#ab4400] text-[10px]">{localPlayer === PLAYER_IDS.ONE ? "YOU" : "PARTNER"}</span>
                      <span className="text-xl font-black text-[#ab4400]">{player1Pos}</span>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-[#ab4400] flex items-center justify-center text-white font-black">1</div>
                </div>
                <div className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${currentTurn === PLAYER_IDS.TWO ? "bg-pink-50 border-pink-400 shadow-lg scale-105" : "bg-stone-50 border-stone-100 opacity-60"}`}>
                   <div className="flex flex-col">
                      <span className="font-black text-[#9d4867] text-[10px]">{localPlayer === PLAYER_IDS.TWO ? "YOU" : "PARTNER"}</span>
                      <span className="text-xl font-black text-[#9d4867]">{player2Pos}</span>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-[#9d4867] flex items-center justify-center text-white font-black">2</div>
                </div>
             </div>

             <div className="grid grid-cols-10 gap-[1px] w-full max-w-sm aspect-square bg-stone-100 rounded-2xl border-4 border-white shadow-2xl overflow-hidden">
                {renderBoard()}
             </div>

             <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                   <div className={`w-20 h-20 bg-white rounded-2xl border-4 border-orange-100 shadow-xl flex items-center justify-center text-4xl font-black text-[#ab4400] transition-all ${isRolling ? "animate-bounce" : ""}`}>
                      {diceValue || "?"}
                   </div>
                   <Button 
                    onClick={rollDice}
                    disabled={currentTurn !== localPlayer || isRolling}
                    className="py-8 px-10 bg-[#ab4400] hover:bg-[#973b00] rounded-2xl font-black text-lg shadow-lg active:scale-95 disabled:opacity-50"
                   >
                     {isRolling ? "ROLLING..." : "ROLL DICE 🎲"}
                   </Button>
                </div>
                <p className="text-xs font-black text-[#ab4400] uppercase tracking-widest">
                  {currentTurn === localPlayer ? "YOUR TURN! 🎯" : "WAITING FOR MOVE... ⏳"}
                </p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "finished") {
    return (
      <div className="flex flex-col items-center pt-2 p-4">
        <div className="max-w-xl w-full">
          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-8 text-center">
              <Trophy size={48} className="mx-auto mb-4 text-yellow-300" />
              <CardTitle className="text-3xl font-black tracking-tight">
                {winner === localPlayer ? "VICTORY!" : "GOOD RACE!"}
              </CardTitle>
              <p className="text-white/70 font-medium mt-2">
                {winner === localPlayer ? "You reached 100 first!" : "Your partner took the lead this time."}
              </p>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div className={`p-4 sm:p-6 rounded-3xl border-2 flex flex-col items-center gap-1 sm:gap-3 ${winner === localPlayer ? "bg-orange-50 border-orange-200 ring-4 ring-orange-100" : "bg-stone-50 border-stone-100 opacity-60"}`}>
                  <span className="text-3xl sm:text-5xl mb-1">{localEmoji}</span>
                  <span className="font-black text-[#6a2700] text-sm sm:text-lg text-center truncate w-full">{localPlayerName}</span>
                </div>
                <div className={`p-4 sm:p-6 rounded-3xl border-2 flex flex-col items-center gap-1 sm:gap-3 ${winner === remotePlayer ? "bg-orange-50 border-orange-200 ring-4 ring-orange-100" : "bg-stone-50 border-stone-100 opacity-60"}`}>
                  <span className="text-3xl sm:text-5xl mb-1">{remoteEmoji}</span>
                  <span className="font-black text-[#6a2700] text-sm sm:text-lg text-center truncate w-full">{remotePlayerName}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full py-8 text-xl font-black bg-[#ab4400] text-white rounded-2xl shadow-lg hover:bg-[#973b00] transition-all active:scale-95 shadow-[#ab4400]/20"
                >
                  RACE AGAIN 🔄
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

export default function SnakesAndLadders() {
  return (
    <LocalMultiplayerWrapper gameId="snakes-ladders" gameName="Snakes & Ladders">
      {(props) => <SnakesAndLaddersGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
