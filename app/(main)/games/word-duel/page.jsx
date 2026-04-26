"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trophy, Clock, Users, Sparkles, Send, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getPlayerMeta, getOtherPlayer } from "@/lib/constants/players";
import { Plus_Jakarta_Sans } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";

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

// Stunning Animated Background
const GameBackground = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-[#fffaf8]">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-orange-300 to-transparent blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tr from-rose-300 to-transparent blur-[100px]" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
        <div className="grid grid-cols-6 gap-20 transform rotate-12">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="text-8xl font-black text-[#ab4400]"
            >
              {String.fromCharCode(65 + (i % 26))}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
  const localMeta = localPlayer ? getPlayerMeta(localPlayer) : null;
  const remoteMeta = localPlayer ? getPlayerMeta(getOtherPlayer(localPlayer)) : null;
  const localEmoji = localMeta?.emoji || "👤";
  const remoteEmoji = remoteMeta?.emoji || "👤";

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

  return (
    <div className={`fixed inset-0 bg-[#fffaf8] z-[40] flex flex-col ${plusJakarta.className}`}>
      <GameBackground />

      {/* Game Content Container */}
      <div className="flex-1 flex flex-col pt-24 md:pt-28 pb-20 md:pb-10 relative">
        {/* Header (Internal Game Header) */}
        <div className="flex items-center justify-between px-6 py-1 md:px-12 z-20">
          <div className="flex items-center gap-3">
            <Link href="/games">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/50 backdrop-blur-md shadow-sm border border-white/20">
                  <ArrowLeft size={20} className="text-[#ab4400]" />
                </Button>
              </motion.div>
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-black text-[#ab4400] leading-none">Word Duel</h1>
              <span className="text-[10px] font-bold text-[#9d4867] uppercase tracking-[0.2em] opacity-60">Multiplayer Arena</span>
            </div>
          </div>

          {gameState === "playing" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 bg-white/60 backdrop-blur-xl px-4 py-2 rounded-full border border-[#ffae88]/30 shadow-lg shadow-orange-500/5"
            >
              <Clock size={16} className="text-[#ab4400]" />
              <span className="text-sm font-black text-[#ab4400] tabular-nums">{timeLeft}s</span>
            </motion.div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
          {gameState === "menu" && (
            <div className="max-w-md w-full z-10 px-4 md:-translate-y-12">
              <Card className="border-none shadow-[0_50px_200px_rgba(171,68,0,0.25)] bg-white/70 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
                <div className="bg-gradient-to-br from-[#ab4400] via-[#ab4400] to-[#9d4867] p-4 sm:p-5 text-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.4),transparent)]" />
                  </div>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="relative z-10 inline-block mb-4"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                      <Users size={32} className="text-white" />
                    </div>
                  </motion.div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight relative z-10">Lexical Battle</h2>
                  <p className="text-white/70 text-[9px] font-medium mt-1 relative z-10 uppercase tracking-widest">Arena Ready</p>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <PlayerSlot
                      name={localPlayerName}
                      emoji={localEmoji}
                      ready={localReady}
                      isLocal={true}
                    />
                    <PlayerSlot
                      name={remotePlayerName}
                      emoji={remoteEmoji}
                      ready={remoteReady}
                      isLocal={false}
                      isConnected={!!remotePlayer}
                    />
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="pt-2"
                  >
                    <Button
                      onClick={startGame}
                      disabled={!remotePlayer || localReady}
                      className={`w-full h-12 sm:h-16 text-sm sm:text-lg font-black rounded-2xl shadow-xl transition-all duration-300 relative overflow-hidden ${localReady
                        ? "bg-emerald-500 text-white cursor-default"
                        : !remotePlayer
                          ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                          : "bg-[#ab4400] text-white hover:bg-[#973b00] hover:shadow-orange-500/40"
                        }`}
                    >
                      {!remotePlayer ? (
                        <span className="flex items-center gap-2">
                          <RefreshCcw className="animate-spin" size={20} /> SEARCHING...
                        </span>
                      ) : localReady ? (
                        <span className="flex items-center gap-2 text-white">
                          WAITING...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          READY TO SPELL! <Sparkles size={20} />
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          )}

          {gameState === "playing" && (
            <div className="w-full max-w-4xl flex flex-col items-center justify-center gap-4 sm:gap-8 z-10 px-4 md:-translate-y-14">
              {/* Category Header */}
              <div className="text-center space-y-1">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block px-4 py-1.5 rounded-full bg-[#9d4867]/10 text-[#9d4867] text-[10px] font-black uppercase tracking-[0.3em]"
                >
                  Category: {targetCategory}
                </motion.div>
                <h2 className="text-2xl sm:text-4xl font-black text-[#ab4400]">
                  {targetWord.length} Letter Word
                </h2>
              </div>

              {/* Main Game Area */}
              <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 sm:gap-8 items-center">
                {/* Local Player Side */}
                <div className="flex flex-col items-center gap-4">
                  <div className="flex flex-wrap justify-center gap-2">
                    {targetWord.split('').map((char, i) => {
                      const isGuessed = guessedLetters.includes(char);
                      return (
                        <motion.div
                          key={i}
                          initial={false}
                          animate={isGuessed ? {
                            scale: [1, 1.1, 1],
                            backgroundColor: "#f97316",
                            color: "#fff",
                            borderColor: "#ea580c"
                          } : {
                            backgroundColor: "#fff",
                            color: "#ab4400",
                            borderColor: "#ffedd5"
                          }}
                          className={`w-8 h-12 sm:w-16 sm:h-20 rounded-xl sm:rounded-2xl border-4 flex items-center justify-center text-xl sm:text-4xl font-black shadow-lg shadow-orange-500/5`}
                        >
                          {isGuessed ? char : ""}
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4 bg-white/40 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/20 shadow-sm">
                    <div className="text-xl">{localEmoji}</div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-[#ab4400]/40 uppercase tracking-widest">Your Score</span>
                      <span className="text-lg font-black text-[#ab4400] tabular-nums">{totalScore + score}</span>
                    </div>
                  </div>
                </div>

                {/* VS Divider */}
                <div className="hidden md:flex flex-col items-center gap-4">
                  <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#ab4400]/20 to-transparent" />
                  <div className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-md border border-[#ab4400]/20 flex items-center justify-center text-[10px] font-black text-[#ab4400]">VS</div>
                  <div className="w-px h-16 bg-gradient-to-b from-[#ab4400]/20 via-[#ab4400]/20 to-transparent" />
                </div>

                {/* Remote Player Side */}
                <div className="flex flex-col items-center gap-4 opacity-60">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {targetWord.split('').map((_, i) => (
                      <motion.div
                        key={i}
                        animate={i < remoteRevealedCount ? {
                          backgroundColor: "#ec4899",
                          color: "#fff",
                          borderColor: "#db2777"
                        } : {
                          backgroundColor: "#fff",
                          color: "#9d4867",
                          borderColor: "#fce7f3"
                        }}
                        className="w-7 h-10 sm:w-10 sm:h-14 rounded-xl border-2 flex items-center justify-center text-sm sm:text-xl font-black"
                      >
                        {i < remoteRevealedCount ? "•" : ""}
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 bg-white/40 backdrop-blur-md px-5 py-2 rounded-xl border border-white/20">
                    <div className="text-lg">{remoteEmoji}</div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-[#9d4867]/40 uppercase tracking-widest">{remotePlayerName.split(' ')[0]}</span>
                      <span className="text-lg font-black text-[#9d4867] tabular-nums">{remoteTotalScore + remoteScore}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center gap-3 relative">
                <AnimatePresence>
                  {showCelebration && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: -40 }}
                      exit={{ opacity: 0, scale: 1.5 }}
                      className="absolute top-0 left-0 right-0 text-center pointer-events-none z-50"
                    >
                      <div className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-full font-black shadow-2xl text-sm">
                        EXCELLENT! +{lastWordScore} ✨
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleGuess} className="w-full relative group">
                  <motion.div
                    animate={shakeInput ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value.toUpperCase())}
                      placeholder="Letter..."
                      maxLength={1}
                      className="h-14 sm:h-16 text-center text-3xl font-black border-4 border-white/80 rounded-[2rem] bg-white/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(171,68,0,0.1)] focus:border-[#ab4400] focus:ring-0 transition-all duration-300 placeholder:text-stone-200"
                      autoFocus
                      autoComplete="off"
                    />
                  </motion.div>
                </form>
                <p className="text-[9px] font-black text-[#ab4400]/40 uppercase tracking-[0.2em]">Press Enter to Guess</p>
              </div>
            </div>
          )}

          {gameState === "finished" && (
            <div className="max-w-md w-full z-10 px-4 md:-translate-y-20">
              {(() => {
                const winner = getWinner();
                const localFinalScore = totalScore + score;
                const remoteFinalScore = remoteTotalScore + remoteScore;
                const isVictory = winner === localPlayer;
                const isTie = winner === "tie";

                return (
                  <Card className="border-none shadow-[0_40px_150px_rgba(171,68,0,0.2)] bg-white/80 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
                    <div className={`p-3 sm:p-4 text-center relative overflow-hidden ${isVictory ? "bg-gradient-to-br from-amber-400 to-orange-600" :
                      isTie ? "bg-gradient-to-br from-indigo-500 to-purple-600" :
                        "bg-gradient-to-br from-rose-500 to-pink-600"
                      } text-white`}>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                        transition={{ delay: 0.2, duration: 0.6, ease: "easeInOut" }}
                        className="mb-2 inline-block"
                      >
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl">
                          {isVictory ? <Trophy size={28} className="text-white" /> : <Sparkles size={28} className="text-white" />}
                        </div>
                      </motion.div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-1">
                        {isVictory ? "Victory!" : isTie ? "Draw!" : "Nice Try!"}
                      </h2>
                      <p className="text-white/70 font-bold uppercase tracking-widest text-[9px]">Final Verdict</p>
                    </div>

                    <CardContent className="p-4 sm:p-5 space-y-2 sm:space-y-3">
                      <div className="space-y-2">
                        <ResultRow
                          name={localPlayerName}
                          emoji={localEmoji}
                          score={localFinalScore}
                          rounds={round}
                          isWinner={winner === localPlayer}
                          primaryColor="#ab4400"
                          bgColor="bg-orange-50"
                        />
                        <ResultRow
                          name={remotePlayerName}
                          emoji={remoteEmoji}
                          score={remoteFinalScore}
                          rounds={remoteRound}
                          isWinner={winner === remotePlayer}
                          primaryColor="#9d4867"
                          bgColor="bg-rose-50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <Button
                          onClick={resetGame}
                          variant="outline"
                          className="h-10 rounded-xl font-black text-[#ab4400] border-orange-100 hover:bg-orange-50 text-xs"
                        >
                          LOBBY
                        </Button>
                        <Button
                          onClick={playAgain}
                          className="h-10 rounded-xl font-black bg-[#ab4400] text-white hover:bg-[#973b00] shadow-xl shadow-orange-500/20 text-xs"
                        >
                          REMATCH
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components
const PlayerSlot = ({ name, emoji, ready, isLocal, isConnected = true }) => (
  <div className={`relative p-3 sm:p-4 rounded-3xl border-2 transition-all duration-500 flex flex-col items-center gap-2 ${ready
    ? "bg-emerald-50 border-emerald-200 shadow-[0_10px_30px_rgba(16,185,129,0.1)]"
    : isConnected
      ? "bg-white border-stone-100 shadow-sm"
      : "bg-stone-50 border-dashed border-stone-200"
    }`}>
    <div className="relative">
      <span className={`text-4xl sm:text-5xl block transition-opacity duration-300 ${!isConnected ? "opacity-20 grayscale" : "opacity-100"}`}>
        {emoji}
      </span>
      {ready && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center"
        >
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
        </motion.div>
      )}
    </div>
    <div className="text-center w-full">
      <p className={`font-black text-xs sm:text-sm truncate max-w-full ${!isConnected ? "text-stone-300" : "text-[#6a2700]"}`}>
        {isConnected ? (isLocal ? "You" : name.split(' ')[0]) : "???"}
      </p>
      <div className={`mt-2 inline-block text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${ready
        ? "bg-emerald-500 text-white"
        : isConnected
          ? "bg-amber-100 text-amber-700 animate-pulse"
          : "bg-stone-200 text-stone-400"
        }`}>
        {ready ? "READY" : isConnected ? "WAITING" : "IDLE"}
      </div>
    </div>
  </div>
);

const ResultRow = ({ name, emoji, score, rounds, isWinner, primaryColor, bgColor }) => (
  <div
    style={isWinner ? { borderColor: primaryColor, boxShadow: `0 10px 30px ${primaryColor}20` } : {}}
    className={`p-2 sm:p-3 rounded-2xl border-2 ${isWinner ? `ring-4 ring-[${primaryColor}]/20 ring-offset-2` : "border-transparent"} ${bgColor} flex items-center justify-between`}
  >
    <div className="flex items-center gap-2">
      <span className="text-3xl">{emoji}</span>
      <div className="flex flex-col">
        <span className="font-black text-[#6a2700] text-sm leading-tight">{name}</span>
        <span className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{rounds} Rounds</span>
      </div>
    </div>
    <div className="text-right">
      <div className={`text-2xl font-black`} style={{ color: primaryColor }}>{score}</div>
      <div className={`text-[8px] font-black opacity-30 uppercase tracking-tighter`}>PTS</div>
    </div>
  </div>
);

export default function WordDuelPage() {
  return (
    <LocalMultiplayerWrapper
      gameId="word-duel"
      gameName="Word Duel Arena"
      hunterColor="from-purple-500 to-blue-600"
      riceeeColor="from-pink-500 to-rose-600"
    >
      {(props) => <WordDuelGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
