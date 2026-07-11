"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Search } from "lucide-react";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";
import {
  LobbyScreen,
  ResultScreen,
  GameFrame,
  BackToArena,
  PlayerDisc,
} from "../_components/game-ui";

const ALL_CHALLENGES = [
  { type: "math", question: "What is 15 + 27?", answer: "42", emoji: "🧮" },
  { type: "riddle", question: "I speak without a mouth and hear without ears. What am I?", answer: "echo", emoji: "🤔" },
  { type: "word", question: "Unscramble: TRESAERU", answer: "treasure", emoji: "📝" },
  { type: "math", question: "What is 8 × 7?", answer: "56", emoji: "🧮" },
  { type: "trivia", question: "How many continents are there?", answer: "7", emoji: "🌍" },
  { type: "word", question: "Unscramble: DANVTEREU", answer: "adventure", emoji: "📝" },
  { type: "math", question: "What is 100 - 37?", answer: "63", emoji: "🧮" },
  { type: "riddle", question: "What has keys but no locks?", answer: "keyboard", emoji: "🤔" },
  { type: "trivia", question: "What color is a ruby?", answer: "red", emoji: "💎" },
  { type: "word", question: "Unscramble: YORTCIV", answer: "victory", emoji: "📝" },
  { type: "math", question: "What is 12 × 12?", answer: "144", emoji: "🧮" },
  { type: "riddle", question: "What has hands but cannot clap?", answer: "clock", emoji: "🤔" },
  { type: "word", question: "Unscramble: MIACG", answer: "magic", emoji: "📝" },
  { type: "trivia", question: "What planet is closest to the Sun?", answer: "mercury", emoji: "🌞" },
  { type: "math", question: "What is 50 + 75?", answer: "125", emoji: "🧮" },
];


function TreasureHuntGame({ localPlayer, sessionId, getPlayerName }) {
  const CHANNEL_NAME = sessionId;
  const [gameState, setGameState] = useState("menu");
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  
  const [challenges, setChallenges] = useState([]);
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [treasuresFound, setTreasuresFound] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [winner, setWinner] = useState(null);
  const [channel, setChannel] = useState(null);
  const localReadyRef = useRef(localReady);

  useEffect(() => {
    localReadyRef.current = localReady;
  }, [localReady]);

  // Remote player state
  const [remoteScore, setRemoteScore] = useState(0);
  const [remoteTreasuresFound, setRemoteTreasuresFound] = useState(0);
  const [remoteCurrentChallenge, setRemoteCurrentChallenge] = useState(0);
  const [remoteFinished, setRemoteFinished] = useState(false);

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
      // Announce presence
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
        // Reply to let them know we are here
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
      if (data.player !== localPlayer) {
        setRemoteReady(data.ready);
      }
    });

    gameChannel.bind('challenges-sync', (data) => {
      if (data.player !== localPlayer) {
        setChallenges(data.challenges);
      }
    });

    gameChannel.bind('game-start', (data) => {
      setGameState("playing");
      setTimeLeft(90);
      setScore(0);
      setTreasuresFound(0);
      setCurrentChallenge(0);
      setRemoteScore(0);
      setRemoteTreasuresFound(0);
      setRemoteCurrentChallenge(0);
      setRemoteFinished(false);
      setWinner(null);
    });

    gameChannel.bind('game-update', (data) => {
      if (data.player !== localPlayer) {
        setRemoteScore(data.score);
        setRemoteTreasuresFound(data.treasuresFound);
        setRemoteCurrentChallenge(data.currentChallenge);
        setRemoteFinished(data.finished);
      }
    });

    return () => {
      gameChannel.unbind_all();
      pusher.unsubscribe(CHANNEL_NAME);
      pusher.disconnect();
    };
  }, [localPlayer]);

  // Sync state
  useEffect(() => {
    if (gameState === "playing") {
      const interval = setInterval(() => {
        fetch('/api/pusher/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: CHANNEL_NAME,
            event: 'game-update',
            data: {
              player: localPlayer,
              score,
              treasuresFound,
              currentChallenge,
              finished: false
            }
          })
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [gameState, score, treasuresFound, currentChallenge, localPlayer]);

  // Timer
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === "playing") {
      handleFinish();
    }
  }, [timeLeft, gameState]);

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
      const shuffled = [...ALL_CHALLENGES]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      
      setChallenges(shuffled);

      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: 'challenges-sync',
          data: { player: localPlayer, challenges: shuffled }
        })
      });

      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: 'game-start',
          data: { startAt: Date.now() }
        })
      });
    }
  }, [localReady, remoteReady, localPlayer, gameState]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    const challenge = challenges[currentChallenge];
    if (userAnswer.trim().toLowerCase() === challenge.answer.toLowerCase()) {
      setFeedback("✅ Found!");
      setScore(prev => prev + 100);
      setTreasuresFound(prev => prev + 1);
      
      setTimeout(() => {
        if (currentChallenge < challenges.length - 1) {
          setCurrentChallenge(prev => prev + 1);
          setUserAnswer("");
          setFeedback("");
        } else {
          handleFinish();
        }
      }, 800);
    } else {
      setFeedback("❌ Not here...");
      setTimeLeft(prev => Math.max(0, prev - 5));
      setTimeout(() => setFeedback(""), 1000);
    }
  };

  const handleFinish = () => {
    setGameState("finished");
    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: 'game-update',
        data: {
          player: localPlayer,
          score,
          treasuresFound,
          currentChallenge,
          finished: true
        }
      })
    });
  };

  useEffect(() => {
    if (gameState === "finished") {
      if (score > remoteScore) setWinner(localPlayer);
      else if (remoteScore > score) setWinner(remotePlayer);
      else setWinner(null);
    }
  }, [gameState, score, remoteScore, localPlayer, remotePlayer]);

  if (gameState === "menu") {
    return (
      <LobbyScreen
        gameTitle="Treasure Hunt"
        tagline="Follow the clues. Get to the X before they do."
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
    const challenge = challenges[currentChallenge] || ALL_CHALLENGES[0];
    const isCorrect = feedback.includes("✅");
    const lowTime = timeLeft < 15;

    return (
      <GameFrame size="max-w-4xl">
        <div className="mb-5 flex items-center justify-between">
          <BackToArena />
          <span
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold tabular-nums transition-colors ${
              lowTime
                ? "animate-pulse border-[#9d4867] bg-[#9d4867] text-white"
                : "border-[#ffdfcf] bg-[#fff5ef] text-[#ab4400]"
            }`}
          >
            <Clock size={13} />
            {timeLeft}s
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
          {/* Your hunt */}
          <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
            <div className="flex items-center justify-between border-b border-[#f5f2ee] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <PlayerDisc name={localPlayerName} kind="local" size="sm" />
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>You</p>
              </div>
              <span className={`${plusJakarta.className} text-xl font-extrabold tabular-nums text-[#ab4400]`}>{score}</span>
            </div>

            <div className="p-6 sm:p-7">
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">
                Clue {currentChallenge + 1} of {challenges.length}
              </p>
              <h2 className={`${plusJakarta.className} mx-auto mt-3 max-w-md text-center text-2xl font-extrabold leading-snug tracking-tight text-[#393832]`}>
                {challenge.question}
              </h2>

              <form onSubmit={handleSubmit} className="mx-auto mt-6 w-full max-w-sm space-y-3">
                <input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Your answer…"
                  autoFocus
                  className="w-full rounded-2xl border border-[#efe9e2] bg-[#fdfaf7] py-4 text-center text-lg font-semibold text-[#393832] placeholder:font-normal placeholder:text-[#c9c5bd] transition-colors focus:border-[#ab4400] focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#ab4400] py-4 text-base font-extrabold tracking-tight text-white shadow-[0_14px_30px_rgba(171,68,0,0.28)] transition-all hover:bg-[#973b00] active:scale-[0.98]"
                >
                  Claim it
                </button>
              </form>

              {feedback && (
                <p
                  className={`mt-4 text-center text-sm font-bold ${
                    isCorrect ? "text-[#ab4400]" : "animate-bounce text-[#9d4867]"
                  }`}
                >
                  {isCorrect ? "Found it." : "Not it. Try again."}
                </p>
              )}

              <div className="mt-6 flex h-1.5 gap-1 overflow-hidden rounded-full">
                {challenges.map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${
                      i < treasuresFound
                        ? "bg-[#ab4400]"
                        : i === currentChallenge
                          ? "animate-pulse bg-[#ffae88]"
                          : "bg-[#f0ebe4]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Their hunt */}
          <div className="flex flex-col overflow-hidden rounded-[2rem] border border-dashed border-[#e8e3dc] bg-[#fdfaf7]">
            <div className="flex items-center justify-between border-b border-[#f0ebe4] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <PlayerDisc name={remotePlayerName} kind="remote" size="sm" />
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>
                  {remotePlayerName.split(" ")[0]}
                </p>
              </div>
              <span className={`${plusJakarta.className} text-xl font-extrabold tabular-nums text-[#9d4867]`}>
                {remoteScore}
              </span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <Search className="h-8 w-8 animate-pulse text-[#9d4867]/40" strokeWidth={1.8} />
              <p className="text-sm font-medium text-[#66645e]">
                {remoteFinished
                  ? "They've finished the hunt."
                  : `Digging through clue ${remoteCurrentChallenge + 1}.`}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a09d95]">
                {remoteTreasuresFound} found
              </p>
            </div>

            <div className="p-5 pt-0">
              <div className="flex h-1.5 gap-1 overflow-hidden rounded-full">
                {challenges.map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${
                      i < remoteTreasuresFound
                        ? "bg-[#9d4867]"
                        : i === remoteCurrentChallenge
                          ? "animate-pulse bg-[#d3567f]/50"
                          : "bg-[#f0ebe4]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </GameFrame>
    );
  }

  if (gameState === "finished") {
    return (
      <ResultScreen
        outcome={winner === localPlayer ? "win" : winner ? "lose" : "draw"}
        localName={localPlayerName}
        remoteName={remotePlayerName}
        onRematch={() => window.location.reload()}
        rematchLabel="Hunt again"
        subline={
          winner === localPlayer
            ? `${score} points, ${treasuresFound} treasures. The map was yours.`
            : winner
              ? `They finished on ${remoteScore}. You got ${score}. Study the clues.`
              : "Identical hauls. The treasure stays buried."
        }
      >
        <div className="flex items-center justify-center gap-8 rounded-2xl border border-[#efe9e2] bg-[#fdfaf7] py-4">
          <div className="text-center">
            <p className={`${plusJakarta.className} text-2xl font-extrabold tabular-nums text-[#ab4400]`}>{score}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a09d95]">{treasuresFound} found</p>
          </div>
          <span className="h-8 w-px bg-[#efe9e2]" />
          <div className="text-center">
            <p className={`${plusJakarta.className} text-2xl font-extrabold tabular-nums text-[#9d4867]`}>{remoteScore}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a09d95]">{remoteTreasuresFound} found</p>
          </div>
        </div>
      </ResultScreen>
    );
  }

  return null;
}

export default function TreasureHunt() {
  return (
    <LocalMultiplayerWrapper gameId="treasure-hunt" gameName="Treasure Hunt">
      {(props) => <TreasureHuntGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}