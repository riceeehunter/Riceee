"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trophy, Clock, Zap, Users, Crown, Type } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getPlayerMeta } from "@/lib/constants/players";
import { Plus_Jakarta_Sans } from "next/font/google";

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

function WordDuelGame({ localPlayer, sessionId, getPlayerName, localPlayerName, remotePlayerName, localEmoji, remoteEmoji }) {
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
          nextTotalScore = totalScore + nextScore;
          setTotalScore(nextTotalScore);
          setScore(0);
          setLocalCompleted(true);
          nextScore = 0;
        }
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
      const nextRound = round + 1;
      const wordObj = getRandomWord();
      await safeTrigger({
        channel: channelName,
        event: 'round-sync',
        data: { player: localPlayer, matchId, round: nextRound, word: wordObj.word, category: wordObj.category },
      });
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
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 pb-20 sm:pb-4">
        <div className="max-w-xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/games">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className={`${plusJakarta.className} text-2xl sm:text-3xl font-bold text-[#ab4400]`}>
              Word Duel
            </h1>
          </div>

          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-5 sm:p-6">
              <CardTitle className="text-center">
                <Users size={28} className="mx-auto mb-2 opacity-80" />
                <span className="text-xl sm:text-2xl font-black tracking-tight">Lexical Battle</span>
                <p className="text-white/70 text-[10px] sm:text-xs font-medium mt-1">Both spell the same secret word live!</p>
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
                onClick={startGame}
                disabled={!remotePlayer}
                className={`w-full py-6 sm:py-8 text-base sm:text-lg font-black rounded-2xl shadow-lg transition-all active:scale-95 ${
                  localReady 
                  ? "bg-stone-200 text-stone-600 hover:bg-stone-300" 
                  : "bg-[#ab4400] text-white hover:bg-[#973b00] shadow-[#ab4400]/20"
                }`}
               >
                 {localReady ? "WAITING FOR PARTNER..." : "READY TO SPELL! ✍️"}
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState === "playing") {
    return (
      <div className="flex flex-col p-2 sm:p-4 h-dvh overflow-hidden">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2 sm:mb-4 px-2">
            <div className="flex items-center gap-2">
              <Link href="/games">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <h1 className={`${plusJakarta.className} text-lg sm:text-xl font-bold text-[#ab4400]`}>
                Word Arena
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-[#fff0e8] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#ffae88]/30">
              <Clock size={14} className="text-[#ab4400]" />
              <p className="text-[10px] sm:text-xs font-bold text-[#ab4400] uppercase tracking-wider">
                {timeLeft}S LEFT
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-4 sm:space-y-8 pb-12 min-h-0">
             <div className="text-center space-y-1 sm:space-y-2">
                <p className="text-[10px] sm:text-xs font-black text-[#9d4867] uppercase tracking-widest opacity-60">CATEGORY: {targetCategory}</p>
                <h2 className="text-xl sm:text-2xl font-black text-[#ab4400] px-4">Guess the {targetWord.length} letter word!</h2>
             </div>

             <div className="w-full space-y-6 sm:space-y-12">
                <div className="space-y-3 sm:space-y-4">
                   <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                      {targetWord.split('').map((char, i) => {
                        const isGuessed = guessedLetters.includes(char);
                        return (
                          <div 
                            key={i}
                            className={`w-8 h-10 sm:w-12 sm:h-16 rounded-xl sm:rounded-2xl border-2 sm:border-4 flex items-center justify-center text-xl sm:text-3xl font-black transition-all ${
                              isGuessed 
                              ? "bg-orange-500 border-orange-600 text-white shadow-lg scale-105" 
                              : "bg-white border-orange-100 text-[#ab4400]"
                            }`}
                          >
                            {isGuessed ? char : ""}
                          </div>
                        );
                      })}
                   </div>
                   <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] font-black text-[#ab4400] uppercase tracking-widest">YOU</span>
                      <span className="text-lg font-black text-[#ab4400]">SCORE: {totalScore + score}</span>
                   </div>
                </div>

                <div className="opacity-40 space-y-2">
                   <div className="flex justify-center gap-1">
                      {targetWord.split('').map((_, i) => (
                        <div 
                          key={i}
                          className={`w-5 h-7 sm:w-8 sm:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center text-xs sm:text-lg font-black ${
                            i < remoteRevealedCount ? "bg-pink-500 border-pink-600 text-white" : "bg-white border-pink-100 text-[#9d4867]"
                          }`}
                        >
                          {i < remoteRevealedCount ? "•" : ""}
                        </div>
                      ))}
                   </div>
                   <div className="flex items-center justify-center gap-2">
                      <span className="text-[8px] font-black text-[#9d4867] uppercase tracking-widest">{remotePlayerName.split(' ')[0]}</span>
                      <span className="text-xs font-black text-[#9d4867]">SCORE: {remoteTotalScore + remoteScore}</span>
                   </div>
                </div>
             </div>

             <form onSubmit={handleGuess} className="w-full max-w-xs px-4">
               <Input
                 value={input}
                 onChange={(e) => setInput(e.target.value.toUpperCase())}
                 placeholder="Type a letter..."
                 maxLength={1}
                 className="h-14 sm:h-16 text-center text-xl sm:text-2xl font-black border-4 border-orange-100 rounded-2xl bg-white shadow-lg focus:border-[#ab4400] transition-colors"
                 autoFocus
                 autoComplete="off"
               />
               <Button type="submit" className="w-full mt-3 py-4 sm:py-6 bg-[#ab4400] hover:bg-[#973b00] rounded-xl font-black text-sm sm:text-base shadow-lg">
                 GUESS LETTER
               </Button>
             </form>

             {localCompleted && (
               <div className="animate-bounce bg-[#ab4400] text-white px-6 py-3 rounded-full font-black shadow-xl">
                 WORD COMPLETED! ✨
               </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "finished") {
    const winner = getWinner();
    const localFinalScore = totalScore + score;
    const remoteFinalScore = remoteTotalScore + remoteScore;

    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="max-w-xl w-full">
          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-6">
              <CardTitle className="text-3xl text-center font-black">
                {winner === localPlayer && "🏆 Victory!"}
                {winner === remotePlayer && "💪 Good Try!"}
                {winner === "tie" && "🤝 It's a Tie!"}
                {winner === null && "⏳ Waiting..."}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className={`p-6 rounded-2xl border-2 bg-orange-50 border-orange-100`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl mb-1 block">{localEmoji}</span>
                      <span className="font-bold text-[#ab4400]">{localPlayerName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-[#ab4400]">{localFinalScore}</div>
                      <div className="text-xs font-bold text-[#ab4400]/50 uppercase tracking-widest">{round} Rounds</div>
                    </div>
                  </div>
                </div>

                {remotePlayer && (
                  <div className={`p-6 rounded-2xl border-2 bg-pink-50 border-pink-100`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-3xl mb-1 block">{remoteEmoji}</span>
                        <span className="font-bold text-[#9d4867]">{remotePlayerName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-[#9d4867]">{remoteFinalScore}</div>
                        <div className="text-xs font-bold text-[#9d4867]/50 uppercase tracking-widest">{remoteRound} Rounds</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button onClick={resetGame} variant="outline" className="py-6 rounded-2xl font-black text-[#ab4400] border-orange-100">MENU</Button>
                <Button onClick={playAgain} className="py-6 rounded-2xl font-black bg-[#ab4400] text-white">PLAY AGAIN</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

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
