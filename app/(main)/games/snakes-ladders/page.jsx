"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import {
  LobbyScreen,
  ResultScreen,
  GameFrame,
  BackToArena,
  TurnPill,
  PlayerDisc,
} from "../_components/game-ui";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

const BOARD_SIZE = 100;
const SNAKES = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 95: 75, 98: 79 };
const LADDERS = { 3: 22, 5: 8, 11: 26, 20: 29, 27: 53, 40: 59, 51: 67, 61: 79, 71: 92, 88: 91 };


function SnakesAndLaddersGame({ localPlayer, sessionId, getPlayerName }) {
  const CHANNEL_NAME = sessionId;
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
      <LobbyScreen
        gameTitle="Snakes & Ladders"
        tagline="Climb. Slide. Scream. Square 100 settles everything."
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
      <GameFrame size="max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <BackToArena />
          <TurnPill isLocalTurn={currentTurn === localPlayer} remoteName={remotePlayerName} />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
          {/* Position strip */}
          <div className="flex items-stretch gap-3 border-b border-[#f5f2ee] p-4">
            <div className={`flex flex-1 items-center justify-between rounded-2xl border px-4 py-3 transition-all ${currentTurn === PLAYER_IDS.ONE ? "border-[#ab4400] bg-[#fff4ec]" : "border-[#efe9e2] bg-white opacity-50"}`}>
              <div className="leading-tight">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ab4400]/70">
                  {localPlayer === PLAYER_IDS.ONE ? "You" : remotePlayerName.split(" ")[0]}
                </p>
                <p className={`${plusJakarta.className} text-xl font-extrabold text-[#ab4400]`}>{player1Pos}</p>
              </div>
              <PlayerDisc
                name={localPlayer === PLAYER_IDS.ONE ? localPlayerName : remotePlayerName}
                kind={localPlayer === PLAYER_IDS.ONE ? "local" : "remote"}
                size="sm"
              />
            </div>
            <div className={`flex flex-1 items-center justify-between rounded-2xl border px-4 py-3 transition-all ${currentTurn === PLAYER_IDS.TWO ? "border-[#9d4867] bg-[#fff1f6]" : "border-[#efe9e2] bg-white opacity-50"}`}>
              <div className="leading-tight">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#9d4867]/70">
                  {localPlayer === PLAYER_IDS.TWO ? "You" : remotePlayerName.split(" ")[0]}
                </p>
                <p className={`${plusJakarta.className} text-xl font-extrabold text-[#9d4867]`}>{player2Pos}</p>
              </div>
              <PlayerDisc
                name={localPlayer === PLAYER_IDS.TWO ? localPlayerName : remotePlayerName}
                kind={localPlayer === PLAYER_IDS.TWO ? "local" : "remote"}
                size="sm"
              />
            </div>
          </div>

          {/* Board */}
          <div className="bg-[#fdfaf7] p-4 sm:p-5">
            <div className="mx-auto grid aspect-square w-full grid-cols-10 gap-[1px] overflow-hidden rounded-2xl border border-[#efe9e2] bg-[#efe9e2]">
              {renderBoard()}
            </div>
          </div>

          {/* Dice */}
          <div className="flex items-center justify-center gap-4 border-t border-[#f5f2ee] p-5">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-[#efe9e2] bg-[#fdfaf7] text-3xl font-extrabold text-[#ab4400] transition-all ${isRolling ? "animate-bounce" : ""}`}>
              {diceValue || "?"}
            </div>
            <button
              onClick={rollDice}
              disabled={currentTurn !== localPlayer || isRolling}
              className="rounded-2xl bg-[#ab4400] px-9 py-4.5 text-base font-extrabold tracking-tight text-white shadow-[0_14px_30px_rgba(171,68,0,0.28)] transition-all hover:bg-[#973b00] active:scale-[0.97] disabled:opacity-40 disabled:shadow-none py-4"
            >
              {isRolling ? "Rolling…" : "Roll the dice"}
            </button>
          </div>
        </div>
      </GameFrame>
    );
  }

  if (gameState === "finished") {
    return (
      <ResultScreen
        outcome={winner === localPlayer ? "win" : "lose"}
        localName={localPlayerName}
        remoteName={remotePlayerName}
        onRematch={() => window.location.reload()}
        rematchLabel="Race again"
        subline={
          winner === localPlayer
            ? "First to 100. The snakes couldn't save them."
            : "The board betrayed you. Demand a rematch."
        }
      />
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
