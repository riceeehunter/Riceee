"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Heart, Zap, RotateCcw } from "lucide-react";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";
import {
  LobbyScreen,
  GameFrame,
  BackToArena,
  PlayerDisc,
} from "../_components/game-ui";


const ALL_QUESTIONS = [
  { this: "Coffee ☕", that: "Tea 🍵" },
  { this: "Beach 🏖️", that: "Mountains ⛰️" },
  { this: "Dogs 🐕", that: "Cats 🐈" },
  { this: "Summer ☀️", that: "Winter ❄️" },
  { this: "Books 📚", that: "Movies 🎬" },
  { this: "Pizza 🍕", that: "Burgers 🍔" },
  { this: "Morning 🌅", that: "Night 🌙" },
  { this: "Text 💬", that: "Call 📞" },
  { this: "Chocolate 🍫", that: "Vanilla 🍦" },
  { this: "City 🏙️", that: "Countryside 🌾" },
  { this: "Netflix 📺", that: "Gaming 🎮" },
  { this: "Hot 🔥", that: "Cold 🧊" },
  { this: "Sweet 🍭", that: "Salty 🥨" },
  { this: "Early Bird 🐦", that: "Night Owl 🦉" },
  { this: "Singing 🎤", that: "Dancing 💃" },
  { this: "Android 🤖", that: "iOS 🍎" },
  { this: "Past 📜", that: "Future 🚀" },
  { this: "Invisibility 👻", that: "Flying 🦅" },
  { this: "Rich 💰", that: "Famous 🌟" },
  { this: "Adventure 🗺️", that: "Comfort 🛋️" },
];

function ThisOrThatGame({ localPlayer, sessionId, getPlayerName }) {
  const CHANNEL_NAME = sessionId;
  const [gameState, setGameState] = useState("menu");
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [localAnswers, setLocalAnswers] = useState([]);
  const [remoteAnswers, setRemoteAnswers] = useState([]);
  const [localFinished, setLocalFinished] = useState(false);
  const [remoteFinished, setRemoteFinished] = useState(false);
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
      setQuestions(data.questions);
      setGameState("playing");
      setCurrentQuestion(0);
      setLocalAnswers([]);
      setRemoteAnswers([]);
      setLocalFinished(false);
      setRemoteFinished(false);
    });

    gameChannel.bind('answer-submitted', (data) => {
      if (data.player !== localPlayer) {
        setRemoteAnswers(data.answers);
        if (data.finished) setRemoteFinished(true);
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
      const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: 'game-start',
          data: { questions: shuffled }
        })
      });
    }
  }, [localReady, remoteReady, localPlayer, gameState]);

  const handleChoice = async (choice) => {
    const newAnswers = [...localAnswers, choice];
    setLocalAnswers(newAnswers);

    const isFinished = currentQuestion >= questions.length - 1;
    if (isFinished) setLocalFinished(true);

    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: 'answer-submitted',
        data: {
          player: localPlayer,
          answers: newAnswers,
          finished: isFinished
        }
      })
    });

    if (!isFinished) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (localFinished && remoteFinished && gameState === "playing") {
      setGameState("finished");
    }
  }, [localFinished, remoteFinished, gameState]);

  const getMatchCount = () => {
    let matches = 0;
    for (let i = 0; i < Math.min(localAnswers.length, remoteAnswers.length); i++) {
      if (localAnswers[i] === remoteAnswers[i]) matches++;
    }
    return matches;
  };

  if (gameState === "menu") {
    return (
      <LobbyScreen
        gameTitle="This or That"
        tagline="Impossible choices. Suspiciously revealing answers."
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
    const question = questions[currentQuestion];
    const progress = (currentQuestion / questions.length) * 100;

    return (
      <GameFrame size="max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <BackToArena />
          <span className="rounded-full border border-[#ffd9e2] bg-[#fff1f6] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9d4867]">
            {remoteFinished ? `${remotePlayerName.split(" ")[0]} is done` : "Both choosing live"}
          </span>
        </div>

        {!localFinished ? (
          <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
            <div className="border-b border-[#f5f2ee] px-7 pb-6 pt-7 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">
                Round {currentQuestion + 1} of {questions.length}
              </p>
              <h2 className={`${plusJakarta.className} mt-2 text-2xl font-extrabold tracking-tight text-[#393832] sm:text-3xl`}>
                Which one is you?
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 sm:gap-4 sm:p-7">
              <button
                onClick={() => handleChoice("this")}
                className="group flex items-center gap-4 rounded-3xl border border-[#ffdfcf] bg-[#fff9f5] p-6 text-left transition-all hover:-translate-y-1 hover:border-[#ab4400] hover:shadow-[0_16px_32px_rgba(171,68,0,0.14)] active:scale-[0.98] sm:flex-col sm:py-9 sm:text-center"
              >
                <span className="text-3xl transition-transform group-hover:scale-110">{question.this.split(" ").pop()}</span>
                <span className={`${plusJakarta.className} flex-1 text-lg font-extrabold tracking-tight text-[#ab4400] sm:flex-none`}>
                  {question.this.split(" ").slice(0, -1).join(" ")}
                </span>
              </button>
              <button
                onClick={() => handleChoice("that")}
                className="group flex items-center gap-4 rounded-3xl border border-[#ffd9e2] bg-[#fffafc] p-6 text-left transition-all hover:-translate-y-1 hover:border-[#9d4867] hover:shadow-[0_16px_32px_rgba(157,72,103,0.14)] active:scale-[0.98] sm:flex-col sm:py-9 sm:text-center"
              >
                <span className="text-3xl transition-transform group-hover:scale-110">{question.that.split(" ").pop()}</span>
                <span className={`${plusJakarta.className} flex-1 text-lg font-extrabold tracking-tight text-[#9d4867] sm:flex-none`}>
                  {question.that.split(" ").slice(0, -1).join(" ")}
                </span>
              </button>
            </div>

            <div className="px-7 pb-7">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#f5f2ee]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ab4400] to-[#9d4867] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-[#efe9e2] bg-white px-7 py-14 text-center shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
            <div className="flex justify-center">
              <PlayerDisc name={remotePlayerName} kind="remote" size="lg" />
            </div>
            <h2 className={`${plusJakarta.className} mt-5 text-2xl font-extrabold tracking-tight text-[#393832]`}>
              You&apos;re done. {remotePlayerName.split(" ")[0]} isn&apos;t.
            </h2>
            <p className="mt-2 text-sm text-[#66645e]">
              They&apos;re on {remoteAnswers.length} of {questions.length}. Judge them silently.
            </p>
            <div className="mx-auto mt-6 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-[#f5f2ee]">
              <div
                className="h-full rounded-full bg-[#9d4867] transition-all duration-500"
                style={{ width: `${(remoteAnswers.length / questions.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </GameFrame>
    );
  }

  if (gameState === "finished") {
    const matches = getMatchCount();
    const pct = Math.round((matches / questions.length) * 100);
    const verdict =
      matches >= 8 ? "Dangerously compatible." : matches >= 5 ? "Mostly in sync." : "Opposites. Officially.";
    const verdictSub =
      matches >= 8
        ? `${matches} of ${questions.length} identical answers. Slightly suspicious, honestly.`
        : matches >= 5
          ? `${matches} of ${questions.length} matched. Enough to share a pizza, barely.`
          : `${matches} of ${questions.length} matched. And yet, here you both are.`;

    return (
      <GameFrame size="max-w-2xl">
        <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
          <div className="border-b border-[#f5f2ee] px-7 pb-7 pt-9 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">Compatibility Report</p>
            <h1 className={`${plusJakarta.className} mt-3 text-4xl font-extrabold tracking-tighter text-[#393832] sm:text-5xl`}>
              {verdict}
            </h1>
            <p className="mt-3 text-sm text-[#66645e]">{verdictSub}</p>

            <div className="mt-7 flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <PlayerDisc name={localPlayerName} kind="local" />
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>You</p>
              </div>
              <div className={`${plusJakarta.className} text-5xl font-extrabold tracking-tighter text-[#ab4400]`}>
                {pct}%
              </div>
              <div className="flex flex-col items-center gap-2">
                <PlayerDisc name={remotePlayerName} kind="remote" />
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>{remotePlayerName.split(" ")[0]}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6 sm:p-7">
            <div className="custom-scrollbar grid max-h-[300px] grid-cols-1 gap-2.5 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const localC = localAnswers[idx];
                const remoteC = remoteAnswers[idx];
                const isMatch = localC === remoteC;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                      isMatch ? "border-[#ffdfcf] bg-[#fff9f5]" : "border-[#efe9e2] bg-white opacity-70"
                    }`}
                  >
                    <div className="flex-1 text-xs font-bold text-[#393832]">
                      {localC === "this" ? q.this : q.that}
                    </div>
                    <div className="px-4">
                      {isMatch ? (
                        <Heart className="fill-[#ab4400] text-[#ab4400]" size={15} />
                      ) : (
                        <Zap className="text-[#d8d4cb]" size={15} />
                      )}
                    </div>
                    <div className="flex-1 text-right text-xs font-bold text-[#393832]">
                      {remoteC === "this" ? q.this : q.that}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#ab4400] py-5 text-base font-extrabold tracking-tight text-white shadow-[0_14px_30px_rgba(171,68,0,0.28)] transition-all hover:bg-[#973b00] active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" />
                New round of questions
              </button>
              <Link
                href="/games"
                className="w-full rounded-2xl py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[#a09d95] transition-colors hover:text-[#ab4400]"
              >
                Back to Arena
              </Link>
            </div>
          </div>
        </div>
      </GameFrame>
    );
  }

  return null;
}

export default function ThisOrThat() {
  return (
    <LocalMultiplayerWrapper gameId="this-or-that" gameName="This or That">
      {(props) => <ThisOrThatGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
