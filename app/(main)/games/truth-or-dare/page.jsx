"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Zap } from "lucide-react";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";
import {
  LobbyScreen,
  GameFrame,
  BackToArena,
} from "../_components/game-ui";


const TRUTH_QUESTIONS = [
  "What's your biggest fear? 😨",
  "Who was your first crush? 💕",
  "What's your most embarrassing moment? 😳",
  "What's a secret you've never told anyone? 🤫",
  "What's your biggest regret? 💭",
  "Who do you secretly admire? ⭐",
  "What's the last lie you told? 🤥",
  "What's your guilty pleasure? 😅",
  "If you could change one thing about yourself, what would it be? 🔄",
  "What's the meanest thing you've ever done? 😔",
];

const DARE_CHALLENGES = [
  "Do 20 jumping jacks right now! 🤸",
  "Send a silly selfie to someone 🤳",
  "Speak in an accent for the next 3 minutes 🗣️",
  "Do your best animal impression 🐶",
  "Dance with no music for 30 seconds 💃",
  "Tell a joke (it can be bad!) 😄",
  "Do 10 pushups 💪",
  "Sing your favorite song loudly 🎤",
  "Call someone and tell them a compliment 📞",
  "Post something embarrassing on your story 📱",
];

function TruthOrDareGame({ localPlayer, sessionId, getPlayerName }) {
  const CHANNEL_NAME = sessionId;
  const [gameState, setGameState] = useState("menu");
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  
  const [currentTurn, setCurrentTurn] = useState(PLAYER_IDS.ONE);
  const [currentType, setCurrentType] = useState(null);
  const [currentChallenge, setCurrentChallenge] = useState("");
  const [score, setScore] = useState({ [PLAYER_IDS.ONE]: 0, [PLAYER_IDS.TWO]: 0 });
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
      setGameState("choosing");
      setCurrentTurn(PLAYER_IDS.ONE);
      setCurrentType(null);
      setCurrentChallenge("");
      setScore({ [PLAYER_IDS.ONE]: 0, [PLAYER_IDS.TWO]: 0 });
    });

    gameChannel.bind('challenge-chosen', (data) => {
      if (data.player !== localPlayer) {
        setCurrentType(data.type);
        setCurrentChallenge(data.challenge);
        setGameState("challenge");
      }
    });

    gameChannel.bind('challenge-completed', (data) => {
      if (data.player !== localPlayer) {
        setScore(data.score);
        setCurrentTurn(data.nextTurn);
        setGameState("choosing");
        setCurrentType(null);
        setCurrentChallenge("");
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

  const chooseType = (type) => {
    if (currentTurn !== localPlayer) return;
    
    let challenge = "";
    if (type === "truth") {
      challenge = TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)];
    } else {
      challenge = DARE_CHALLENGES[Math.floor(Math.random() * DARE_CHALLENGES.length)];
    }
    
    setCurrentType(type);
    setCurrentChallenge(challenge);
    setGameState("challenge");

    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: 'challenge-chosen',
        data: { player: localPlayer, type, challenge }
      })
    });
  };

  const completeChallenge = () => {
    if (currentTurn !== localPlayer) return;

    const newScore = { ...score, [localPlayer]: score[localPlayer] + 1 };
    const nextTurn = localPlayer === PLAYER_IDS.ONE ? PLAYER_IDS.TWO : PLAYER_IDS.ONE;
    
    setScore(newScore);
    setCurrentTurn(nextTurn);
    setGameState("choosing");
    setCurrentType(null);
    setCurrentChallenge("");

    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: 'challenge-completed',
        data: { player: localPlayer, score: newScore, nextTurn }
      })
    });
  };

  if (gameState === "menu") {
    return (
      <LobbyScreen
        gameTitle="Truth or Dare"
        tagline="The classic that starts better conversations."
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

  if (gameState === "choosing") {
    return (
      <GameFrame size="max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <BackToArena />
          <div className="flex items-center gap-3 rounded-full border border-[#efe9e2] bg-white px-4 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ab4400]">
              {localPlayerName.split(" ")[0]} <span className={plusJakarta.className}>{score[localPlayer]}</span>
            </span>
            <span className="h-3 w-px bg-[#efe9e2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9d4867]">
              {remotePlayerName.split(" ")[0]} <span className={plusJakarta.className}>{score[remotePlayer]}</span>
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
          <div className="border-b border-[#f5f2ee] px-7 pb-6 pt-7 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">
              {currentTurn === localPlayer ? "Your turn" : `${remotePlayerName.split(" ")[0]}'s turn`}
            </p>
            <h2 className={`${plusJakarta.className} mt-2 text-3xl font-extrabold tracking-tight text-[#393832]`}>
              {currentTurn === localPlayer ? "Choose your fate." : `${remotePlayerName.split(" ")[0]} is deciding…`}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 sm:gap-4 sm:p-7">
            <button
              disabled={currentTurn !== localPlayer}
              onClick={() => chooseType("truth")}
              className={`group flex flex-col items-center gap-3 rounded-3xl border p-9 transition-all active:scale-[0.98] ${
                currentTurn === localPlayer
                  ? "border-[#ffdfcf] bg-[#fff9f5] hover:-translate-y-1 hover:border-[#ab4400] hover:shadow-[0_16px_32px_rgba(171,68,0,0.14)]"
                  : "cursor-default border-[#f5f2ee] bg-white opacity-40"
              }`}
            >
              <MessageCircle className="h-8 w-8 text-[#ab4400] transition-transform group-hover:scale-110" strokeWidth={2} />
              <p className={`${plusJakarta.className} text-2xl font-extrabold tracking-tight text-[#ab4400]`}>Truth</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a09d95]">Say it honestly</p>
            </button>
            <button
              disabled={currentTurn !== localPlayer}
              onClick={() => chooseType("dare")}
              className={`group flex flex-col items-center gap-3 rounded-3xl border p-9 transition-all active:scale-[0.98] ${
                currentTurn === localPlayer
                  ? "border-[#ffd9e2] bg-[#fffafc] hover:-translate-y-1 hover:border-[#9d4867] hover:shadow-[0_16px_32px_rgba(157,72,103,0.14)]"
                  : "cursor-default border-[#f5f2ee] bg-white opacity-40"
              }`}
            >
              <Zap className="h-8 w-8 text-[#9d4867] transition-transform group-hover:scale-110" strokeWidth={2} />
              <p className={`${plusJakarta.className} text-2xl font-extrabold tracking-tight text-[#9d4867]`}>Dare</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a09d95]">Do it anyway</p>
            </button>
          </div>
        </div>
      </GameFrame>
    );
  }

  if (gameState === "challenge") {
    const accent = currentType === "truth" ? "#ab4400" : "#9d4867";
    const wash = currentType === "truth" ? "#fff4ec" : "#fff1f6";
    return (
      <GameFrame size="max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <BackToArena />
          <span
            className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
            style={{ backgroundColor: accent }}
          >
            {currentType}
          </span>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
          <div className="px-7 pb-4 pt-8 text-center" style={{ backgroundColor: wash }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: accent, opacity: 0.75 }}>
              {currentTurn === localPlayer ? "Your challenge" : `${remotePlayerName.split(" ")[0]}'s challenge`}
            </p>
            <h2 className={`${plusJakarta.className} mx-auto mt-4 max-w-lg pb-6 text-2xl font-extrabold leading-snug tracking-tight text-[#393832] sm:text-3xl`}>
              {currentChallenge}
            </h2>
          </div>

          <div className="space-y-3 p-6 sm:p-7">
            {currentTurn === localPlayer ? (
              <>
                <button
                  onClick={completeChallenge}
                  className="w-full rounded-2xl py-5 text-base font-extrabold tracking-tight text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: accent, boxShadow: `0 14px 30px ${accent}44` }}
                >
                  Done — claim the point
                </button>
                <button
                  onClick={() => setGameState("choosing")}
                  className="w-full rounded-2xl py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a09d95] transition-colors hover:text-[#ab4400]"
                >
                  Coward&apos;s exit (skip)
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2.5 py-3">
                <div className="flex gap-1.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d8d4cb]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d8d4cb] [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d8d4cb] [animation-delay:0.3s]" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a09d95]">
                  {remotePlayerName.split(" ")[0]} is on the spot
                </p>
              </div>
            )}
          </div>
        </div>
      </GameFrame>
    );
  }

  return null;
}

export default function TruthOrDare() {
  return (
    <LocalMultiplayerWrapper gameId="truth-or-dare" gameName="Truth or Dare">
      {(props) => <TruthOrDareGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
