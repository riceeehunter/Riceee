"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Clock } from "lucide-react";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";
import { Plus_Jakarta_Sans } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import {
  LobbyScreen,
  ResultScreen,
  GameFrame,
  BackToArena,
  PlayerDisc,
} from "../_components/game-ui";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

const WORDS = [
  { word: "PIZZA", category: "Food" },
  { word: "CHOCOLATE", category: "Dessert" },
  { word: "RAINBOW", category: "Nature" },
  { word: "GUITAR", category: "Musical Instrument" },
  { word: "ELEPHANT", category: "Animal" },
  { word: "PANCAKE", category: "Breakfast" },
  { word: "VOLCANO", category: "Nature" },
  { word: "UNICORN", category: "Mythical Creature" },
  { word: "ASTRONAUT", category: "Profession" },
  { word: "BUTTERFLY", category: "Insect" },
  { word: "TREASURE", category: "Adventure" },
  { word: "SUNFLOWER", category: "Flower" },
  { word: "POPCORN", category: "Snack" },
  { word: "DOLPHIN", category: "Sea Animal" },
  { word: "PINEAPPLE", category: "Fruit" },
  { word: "SMARTPHONE", category: "Technology" },
  { word: "SKATEBOARD", category: "Sport Equipment" },
  { word: "CUPCAKE", category: "Dessert" },
  { word: "DINOSAUR", category: "Prehistoric" },
  { word: "HAMBURGER", category: "Food" },
  { word: "KANGAROO", category: "Animal" },
  { word: "WATERFALL", category: "Nature" },
  { word: "FIREWORKS", category: "Celebration" },
  { word: "BASKETBALL", category: "Sport" },
  { word: "OCTOPUS", category: "Sea Animal" },
  { word: "SANDWICH", category: "Food" },
  { word: "PENGUIN", category: "Bird" },
  { word: "STRAWBERRY", category: "Fruit" },
  { word: "UMBRELLA", category: "Weather Item" },
  { word: "TORNADO", category: "Weather" },
];

const getRandomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];

const makeMatchId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};
const getChannelName = (sessionId) => sessionId || "local-game-word-duel";

async function safeTrigger({ channel, event, data }) {
  try {
    const res = await fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, event, data }),
    });
    return res.ok;
  } catch (err) {
    console.warn("Pusher trigger failed:", { channel, event, err });
    return false;
  }
}


function WordDuelGame({ localPlayer, sessionId, getPlayerName, localPlayerName, remotePlayerName }) {
  const [pusherClient, setPusherClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [remotePlayer, setRemotePlayer] = useState(null);

  const remotePlayerRef = useRef(null);
  const channelName = getChannelName(sessionId);

  const [gameState, setGameState] = useState("menu");
  const [matchId, setMatchId] = useState(null);
  const [targetWord, setTargetWord] = useState("");
  const [targetCategory, setTargetCategory] = useState("");
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [initialTime, setInitialTime] = useState(60);
  const [timeBudget, setTimeBudget] = useState(60);
  const [startAtMs, setStartAtMs] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [localFinished, setLocalFinished] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [remoteCompleted, setRemoteCompleted] = useState(false);

  // UI state for animations
  const [shakeInput, setShakeInput] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastWordScore, setLastWordScore] = useState(0);

  // Player Meta

  // Remote player state
  const [remoteGameState, setRemoteGameState] = useState("waiting");
  const [remoteGuessedLetters, setRemoteGuessedLetters] = useState([]);
  const [remoteScore, setRemoteScore] = useState(0);
  const [remoteTimeLeft, setRemoteTimeLeft] = useState(60);
  const [remoteRound, setRemoteRound] = useState(1);
  const [remoteTotalScore, setRemoteTotalScore] = useState(0);
  const [remoteFinished, setRemoteFinished] = useState(false);
  const [remoteRevealedCount, setRemoteRevealedCount] = useState(0);
  const localReadyRef = useRef(localReady);

  useEffect(() => {
    localReadyRef.current = localReady;
  }, [localReady]);

  const isStartingRef = useRef(false);
  const isAdvancingRoundRef = useRef(false);
  const matchIdRef = useRef(null);
  const gameStateRef = useRef("menu");
  const broadcastStateRef = useRef(null);

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

  useEffect(() => {
    remotePlayerRef.current = remotePlayer;
  }, [remotePlayer]);

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const broadcastState = useCallback(
    async (finished = false, overrides = {}) => {
      if (!channel || gameState === "menu") return;

      const nextGuessedLetters = overrides.guessedLetters ?? guessedLetters;
      const nextScore = overrides.score ?? score;
      const nextTotalScore = overrides.totalScore ?? totalScore;
      const nextCompleted = overrides.completed ?? localCompleted;
      const nextWord = overrides.word ?? targetWord;
      const nextCategory = overrides.category ?? targetCategory;
      const nextRound = overrides.round ?? round;
      const nextTimeLeft = overrides.timeLeft ?? timeLeft;
      const nextTimeBudget = overrides.timeBudget ?? timeBudget;
      const nextStartAtMs = overrides.startAtMs ?? startAtMs;

      const nextRevealedCount =
        typeof overrides.revealedCount === "number"
          ? overrides.revealedCount
          : nextWord
            ? nextWord.split("").filter((l) => nextGuessedLetters.includes(l)).length
            : 0;

      await safeTrigger({
        channel: channelName,
        event: 'game-update',
        data: {
          player: localPlayer,
          matchId,
          gameState,
          guessedLetters: nextGuessedLetters,
          score: nextScore,
          timeLeft: nextTimeLeft,
          timeBudget: nextTimeBudget,
          startAtMs: nextStartAtMs,
          round: nextRound,
          totalScore: nextTotalScore,
          finished,
          wordLength: nextWord?.length || 0,
          category: nextCategory || "",
          revealedCount: nextRevealedCount,
          word: nextWord || "",
          completed: nextCompleted,
        },
      });
    },
    [channel, channelName, localPlayer, matchId, gameState, guessedLetters, score, timeLeft, timeBudget, startAtMs, round, totalScore, targetWord, targetCategory, localCompleted]
  );

  useEffect(() => {
    broadcastStateRef.current = broadcastState;
  }, [broadcastState]);

  useEffect(() => {
    if (!channel) return;

    let announceInterval;

    channel.bind('pusher:subscription_succeeded', async () => {
      await announcePresence();
      announceInterval = setInterval(announcePresence, 2000);
    });

    const announcePresence = async () => {
      if (remotePlayerRef.current) return;
      await safeTrigger({
        channel: channelName,
        event: 'player-joined',
        data: { player: localPlayer, ready: localReadyRef.current },
      });
    };

    channel.bind('player-joined', (data) => {
      if (data.player !== localPlayer) {
        setRemotePlayer(data.player);
        setRemoteReady(data.ready);
        if (!remotePlayerRef.current) {
          safeTrigger({
            channel: channelName,
            event: 'player-joined',
            data: { player: localPlayer, ready: localReadyRef.current },
          });
        }
        if (announceInterval) {
          clearInterval(announceInterval);
          announceInterval = undefined;
        }
      }
    });

    channel.bind('timer-sync', (data) => {
      if (data.player !== localPlayer) {
        setInitialTime(data.time);
        setTimeBudget(data.time);
        setTimeLeft(data.time);
      }
    });

    channel.bind('rematch', (data) => {
      if (data.player === localPlayer) return;
      if (data?.matchId && matchIdRef.current && data.matchId !== matchIdRef.current) return;
      resetGame();
    });

    channel.bind('player-ready', (data) => {
      if (data.player !== localPlayer) {
        if (gameStateRef.current !== "menu") return;
        setRemoteReady(Boolean(data.ready));
        if (typeof data.time === "number") {
          setInitialTime(data.time);
          setTimeBudget(data.time);
          setTimeLeft(data.time);
        }
      }
    });

    channel.bind('game-start', (data) => {
      if (!data?.matchId) return;
      setMatchId(data.matchId);
      setTargetWord(data.word);
      setTargetCategory(data.category);
      setGuessedLetters([]);
      setInput("");
      setScore(0);
      setRound(typeof data.round === "number" ? data.round : 1);
      setTotalScore(0);
      setLocalFinished(false);
      setLocalReady(false);
      setRemoteFinished(false);
      setLocalCompleted(false);
      setRemoteCompleted(false);
      setStartAtMs(data.startAtMs);
      setInitialTime(data.time);
      setTimeBudget(data.time);
      setTimeLeft(data.time);
      setGameState("playing");
      setRemoteGameState("playing");
      setRemoteRevealedCount(0);
      isStartingRef.current = false;
      isAdvancingRoundRef.current = false;
    });

    channel.bind('game-update', (data) => {
      if (data.player !== localPlayer) {
        if (data?.matchId && matchIdRef.current && data.matchId !== matchIdRef.current) return;
        if (gameStateRef.current === "menu" && data?.gameState === "playing" && data?.matchId) {
          setMatchId(data.matchId);
          setTargetCategory(data.category);
          setTargetWord(data.word);
          setGuessedLetters([]);
          setRound(data.round || 1);
          setStartAtMs(data.startAtMs);
          setInitialTime(data.timeBudget);
          setTimeBudget(data.timeBudget);
          setTimeLeft(data.timeLeft ?? data.timeBudget);
          setGameState("playing");
        }
        setRemoteGameState(data.gameState);
        setRemoteGuessedLetters(Array.isArray(data.guessedLetters) ? data.guessedLetters : []);
        setRemoteScore(typeof data.score === "number" ? data.score : 0);
        setRemoteTimeLeft(typeof data.timeLeft === "number" ? data.timeLeft : initialTime);
        setRemoteRound(typeof data.round === "number" ? data.round : 1);
        setRemoteTotalScore(typeof data.totalScore === "number" ? data.totalScore : 0);
        setRemoteFinished(Boolean(data.finished));
        setRemoteCompleted(Boolean(data.completed));
        setRemoteRevealedCount(typeof data.revealedCount === "number" ? data.revealedCount : 0);
      }
    });

    channel.bind('round-sync', (data) => {
      if (!data?.matchId || data.matchId !== matchIdRef.current) return;
      setTargetWord(data.word);
      setTargetCategory(data.category);
      setRound(data.round);
      setGuessedLetters([]);
      setInput("");
      setScore(0);
      setLocalCompleted(false);
      setRemoteCompleted(false);
      setRemoteGameState("playing");
      setRemoteRevealedCount(0);
      setShowCelebration(false);
      isAdvancingRoundRef.current = false;
      setTimeout(() => broadcastStateRef.current?.(), 100);
    });

    return () => {
      if (announceInterval) clearInterval(announceInterval);
      channel.unbind_all();
    };
  }, [channel, localPlayer, channelName, initialTime]);

  useEffect(() => {
    if (gameState !== "playing" || !startAtMs) return;
    const tick = () => {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startAtMs) / 1000));
      const next = Math.max(0, timeBudget - elapsedSeconds);
      setTimeLeft(next);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [gameState, startAtMs, timeBudget]);

  useEffect(() => {
    if (gameState === "playing" && timeLeft === 0 && !localFinished) {
      endGame();
    }
  }, [timeLeft, gameState, localFinished]);

  const startGame = async () => {
    if (remotePlayer) {
      setLocalReady(true);
      await safeTrigger({
        channel: channelName,
        event: 'player-ready',
        data: { player: localPlayer, ready: true, time: initialTime },
      });
    }
  };

  useEffect(() => {
    if (!channel || gameState !== "menu" || localPlayer !== PLAYER_IDS.ONE || !remotePlayer || !localReady || !remoteReady) return;
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    (async () => {
      const startAt = Date.now() + 1500;
      const nextMatchId = makeMatchId();
      const wordObj = getRandomWord();
      await safeTrigger({
        channel: channelName,
        event: 'game-start',
        data: {
          player: localPlayer,
          matchId: nextMatchId,
          startAtMs: startAt,
          time: initialTime,
          round: 1,
          word: wordObj.word,
          category: wordObj.category,
        },
      });
    })();
  }, [channel, channelName, gameState, localPlayer, remotePlayer, localReady, remoteReady, initialTime]);

  const handleGuess = async (e) => {
    e.preventDefault();
    const letter = input.toUpperCase();
    if (localCompleted || localFinished || timeLeft <= 0 || !letter || guessedLetters.includes(letter)) {
      setInput("");
      return;
    }
    if (/^[A-Z]$/.test(letter)) {
      const newGuessedLetters = [...guessedLetters, letter];
      setGuessedLetters(newGuessedLetters);
      setInput("");

      let nextScore = score;
      let nextTotalScore = totalScore;
      let completedNow = false;

      if (targetWord.includes(letter)) {
        const occurrences = targetWord.split("").filter((l) => l === letter).length;
        nextScore = score + occurrences * 10;
        setScore(nextScore);
        const allLettersGuessed = targetWord.split("").every((l) => newGuessedLetters.includes(l));
        if (allLettersGuessed) {
          completedNow = true;
          const pointsGained = nextScore;
          nextTotalScore = totalScore + nextScore;
          setTotalScore(nextTotalScore);
          setLastWordScore(pointsGained);
          setScore(0);
          setLocalCompleted(true);
          setShowCelebration(true);
          nextScore = 0;
        }
      } else {
        // Wrong guess feedback
        setShakeInput(true);
        setTimeout(() => setShakeInput(false), 500);
      }

      const revealedCount = targetWord ? targetWord.split("").filter((l) => newGuessedLetters.includes(l)).length : 0;
      await broadcastState(false, {
        guessedLetters: newGuessedLetters,
        score: nextScore,
        totalScore: nextTotalScore,
        completed: completedNow || localCompleted,
        revealedCount,
      });
    }
  };

  useEffect(() => {
    if (!channel || localPlayer !== PLAYER_IDS.ONE || gameState !== "playing" || !matchId || (!localCompleted && !remoteCompleted) || isAdvancingRoundRef.current) return;
    isAdvancingRoundRef.current = true;
    (async () => {
      // Delay round advancement slightly for visual effect
      setTimeout(async () => {
        const nextRound = round + 1;
        const wordObj = getRandomWord();
        await safeTrigger({
          channel: channelName,
          event: 'round-sync',
          data: { player: localPlayer, matchId, round: nextRound, word: wordObj.word, category: wordObj.category },
        });
      }, 2000);
    })();
  }, [channel, channelName, localPlayer, gameState, matchId, localCompleted, remoteCompleted, round]);

  const endGame = async () => {
    setGameState("finished");
    setLocalFinished(true);
    await broadcastState(true);
  };

  const resetGame = () => {
    setGameState("menu");
    setMatchId(null);
    setTargetWord("");
    setTargetCategory("");
    setLocalFinished(false);
    setRemoteFinished(false);
    setLocalReady(false);
    setRemoteReady(false);
    setStartAtMs(null);
    setTimeBudget(initialTime);
    setTimeLeft(initialTime);
    setGuessedLetters([]);
    setRemoteGuessedLetters([]);
    setRemoteScore(0);
    setRemoteTimeLeft(initialTime);
    setRemoteRound(1);
    setRemoteTotalScore(0);
    setRemoteRevealedCount(0);
    setLocalCompleted(false);
    setRemoteCompleted(false);
    setShowCelebration(false);
    setLastWordScore(0);
    isStartingRef.current = false;
    isAdvancingRoundRef.current = false;
  };

  const playAgain = async () => {
    if (!remotePlayer) return;
    await safeTrigger({
      channel: channelName,
      event: 'rematch',
      data: { player: localPlayer, at: Date.now(), matchId },
    });
    resetGame();
  };

  const getWinner = () => {
    if (!localFinished && !remoteFinished) return null;
    const localFinalScore = totalScore + score;
    const remoteFinalScore = remoteTotalScore + remoteScore;
    if (localFinalScore > remoteFinalScore) return localPlayer;
    if (remoteFinalScore > localFinalScore) return remotePlayer;
    return "tie";
  };

  if (gameState === "menu") {
    return (
      <LobbyScreen
        gameTitle="Word Duel"
        tagline="Same word. Two brains. First to crack it gloats forever."
        localName={localPlayerName}
        remoteName={remotePlayerName}
        localReady={localReady}
        remoteReady={remoteReady}
        remoteConnected={!!remotePlayer}
        onReady={startGame}
        localRole="You"
      />
    );
  }

  if (gameState === "playing") {
    const lowTime = timeLeft < 10;
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

        <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
          <div className="border-b border-[#f5f2ee] px-7 pb-6 pt-7 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9d4867]/70">
              {targetCategory}
            </p>
            <h2 className={`${plusJakarta.className} mt-2 text-2xl font-extrabold tracking-tight text-[#393832] sm:text-3xl`}>
              {targetWord.length} letters
            </h2>
          </div>

          <div className="space-y-7 p-6 sm:p-8">
            {/* Your board */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap justify-center gap-2">
                {targetWord.split("").map((char, i) => {
                  const isGuessed = guessedLetters.includes(char);
                  return (
                    <motion.div
                      key={i}
                      initial={false}
                      animate={
                        isGuessed
                          ? { scale: [1, 1.08, 1], backgroundColor: "#ab4400", color: "#fff", borderColor: "#ab4400" }
                          : { backgroundColor: "#fdfaf7", color: "#ab4400", borderColor: "#efe9e2" }
                      }
                      className={`${plusJakarta.className} flex h-14 w-10 items-center justify-center rounded-xl border text-2xl font-extrabold sm:h-20 sm:w-14 sm:text-3xl`}
                    >
                      {isGuessed ? char : ""}
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 rounded-full border border-[#efe9e2] bg-[#fdfaf7] px-5 py-2">
                <PlayerDisc name={localPlayerName} kind="local" size="sm" />
                <div className="leading-tight">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#a09d95]">Your score</p>
                  <p className={`${plusJakarta.className} text-base font-extrabold tabular-nums text-[#ab4400]`}>
                    {totalScore + score}
                  </p>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="relative mx-auto flex w-full max-w-xs flex-col items-center gap-2.5">
              <AnimatePresence>
                {showCelebration && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: -44 }}
                    exit={{ opacity: 0, scale: 1.3 }}
                    className="pointer-events-none absolute inset-x-0 top-0 z-50 text-center"
                  >
                    <span className="inline-block rounded-full bg-[#ab4400] px-5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lg">
                      Nailed it +{lastWordScore}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleGuess} className="w-full">
                <motion.div animate={shakeInput ? { x: [-8, 8, -8, 8, 0] } : {}} transition={{ duration: 0.4 }}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    placeholder="?"
                    maxLength={1}
                    autoFocus
                    autoComplete="off"
                    className={`${plusJakarta.className} h-16 w-full rounded-2xl border border-[#efe9e2] bg-[#fdfaf7] text-center text-3xl font-extrabold text-[#393832] transition-colors placeholder:text-[#d8d4cb] focus:border-[#ab4400] focus:bg-white focus:outline-none`}
                  />
                </motion.div>
              </form>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#a09d95]">Enter to guess</p>
            </div>

            {/* Their progress */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-[#e8e3dc] bg-[#fdfaf7] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <PlayerDisc name={remotePlayerName} kind="remote" size="sm" />
                <div className="leading-tight">
                  <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>
                    {remotePlayerName.split(" ")[0]}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#a09d95]">
                    {remoteRevealedCount} of {targetWord.length} revealed
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden gap-1 sm:flex">
                  {targetWord.split("").map((_, i) => (
                    <motion.span
                      key={i}
                      animate={{ backgroundColor: i < remoteRevealedCount ? "#9d4867" : "#efe9e2" }}
                      className="h-2 w-2 rounded-full"
                    />
                  ))}
                </div>
                <span className={`${plusJakarta.className} text-base font-extrabold tabular-nums text-[#9d4867]`}>
                  {remoteTotalScore + remoteScore}
                </span>
              </div>
            </div>
          </div>
        </div>
      </GameFrame>
    );
  }

  if (gameState === "finished") {
    const winner = getWinner();
    const localFinalScore = totalScore + score;
    const remoteFinalScore = remoteTotalScore + remoteScore;

    return (
      <ResultScreen
        outcome={winner === localPlayer ? "win" : winner === "tie" ? "draw" : "lose"}
        localName={localPlayerName}
        remoteName={remotePlayerName}
        onRematch={playAgain}
        rematchLabel="Rematch"
        subline={
          winner === localPlayer
            ? `${localFinalScore} points across ${round} rounds. The dictionary bends to you.`
            : winner === "tie"
              ? "Identical scores. The words refuse to pick a side."
              : `They finished on ${remoteFinalScore}. You got ${localFinalScore}. Read more.`
        }
      >
        <div className="flex items-center justify-center gap-8 rounded-2xl border border-[#efe9e2] bg-[#fdfaf7] py-4">
          <div className="text-center">
            <p className={`${plusJakarta.className} text-2xl font-extrabold tabular-nums text-[#ab4400]`}>
              {localFinalScore}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a09d95]">{round} rounds</p>
          </div>
          <span className="h-8 w-px bg-[#efe9e2]" />
          <div className="text-center">
            <p className={`${plusJakarta.className} text-2xl font-extrabold tabular-nums text-[#9d4867]`}>
              {remoteFinalScore}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a09d95]">{remoteRound} rounds</p>
          </div>
        </div>
      </ResultScreen>
    );
  }

  return null;
}

export default function WordDuelPage() {
  return (
    <LocalMultiplayerWrapper
      gameId="word-duel"
      gameName="Word Duel Arena"
    >
      {(props) => <WordDuelGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
