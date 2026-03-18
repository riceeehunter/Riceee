"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trophy, Clock, Zap, Users, Crown } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";

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

function WordDuelGame({ localPlayer, sessionId }) {
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

    console.log(`[${localPlayer}] 🎮 Word Duel initialized`);

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

  // Broadcast state changes (defined early so effects can safely reference it)
  // Supports overrides so guess/completion updates don't suffer from stale state.
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
    [
      channel,
      channelName,
      localPlayer,
      matchId,
      gameState,
      guessedLetters,
      score,
      timeLeft,
      timeBudget,
      startAtMs,
      round,
      totalScore,
      targetWord,
      targetCategory,
      localCompleted,
    ]
  );

  useEffect(() => {
    broadcastStateRef.current = broadcastState;
  }, [broadcastState]);

  // Listen for remote player
  useEffect(() => {
    if (!channel) return;

    let announceInterval;

    const announcePresence = async () => {
      if (remotePlayerRef.current) return;
      await safeTrigger({
        channel: channelName,
        event: 'player-joined',
        data: { player: localPlayer },
      });
    };

    channel.bind('pusher:subscription_succeeded', async () => {
      console.log(`[${localPlayer}] ✅ Subscribed to ${channelName}`);

      // Announce presence (repeat to avoid race conditions)
      await announcePresence();
      announceInterval = setInterval(announcePresence, 2000);
    });

    channel.bind('player-joined', (data) => {
      if (data.player !== localPlayer) {
        console.log(`[${localPlayer}] 👋 ${data.player} joined`);
        setRemotePlayer(data.player);

        // ACK back once so late joiners also discover us.
        if (!remotePlayerRef.current) {
          safeTrigger({
            channel: channelName,
            event: 'player-joined',
            data: { player: localPlayer },
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
        console.log(`[${localPlayer}] ⏱️ Timer synced: ${data.time}s`);
        setInitialTime(data.time);
        setTimeBudget(data.time);
        setTimeLeft(data.time);
      }
    });

    channel.bind('rematch', (data) => {
      if (data.player === localPlayer) return;
      if (data?.matchId && matchIdRef.current && data.matchId !== matchIdRef.current) return;
      // Reset both sides back to menu so Ready/Start works reliably.
      setGameState("menu");
      setMatchId(null);
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
      if (!data?.startAtMs || typeof data?.time !== "number") return;
      if (!data?.word || !data?.category) return;

      // Start a fresh match (or re-sync into the same match).
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
        console.log(`[${localPlayer}] 📡 Received update from ${data.player}`);

        // Ignore updates from previous matches.
        if (data?.matchId && matchIdRef.current && data.matchId !== matchIdRef.current) return;

        // Fallback: if we missed the game-start event, bootstrap into playing
        // from the opponent's first update (prevents one side getting stuck on menu).
        if (
          gameStateRef.current === "menu" &&
          data?.gameState === "playing" &&
          data?.matchId &&
          data?.startAtMs &&
          typeof data?.timeBudget === "number" &&
          data?.category &&
          data?.word
        ) {
          setMatchId(data.matchId);
          setTargetCategory(data.category);
          setTargetWord(data.word);
          setGuessedLetters([]);
          setInput("");
          setScore(0);
          setRound(data.round || 1);
          setTotalScore(0);
          setLocalFinished(false);
          setRemoteFinished(false);
          setLocalReady(false);
          setRemoteReady(false);
          setLocalCompleted(false);
          setRemoteCompleted(false);
          setStartAtMs(data.startAtMs);
          setInitialTime(data.timeBudget);
          setTimeBudget(data.timeBudget);
          setTimeLeft(data.timeLeft ?? data.timeBudget);
          setGameState("playing");
          setRemoteRevealedCount(0);
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
      if (!data?.matchId) return;
      if (!matchIdRef.current || data.matchId !== matchIdRef.current) return;
      if (!data?.word || !data?.category || typeof data?.round !== "number") return;

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

  // Broadcast every 5 seconds to keep connection alive
  useEffect(() => {
    if (gameState !== "playing") return;

    const interval = setInterval(() => {
      broadcastState();
    }, 5000);

    return () => clearInterval(interval);
  }, [gameState, broadcastState]);

  // Timer (synced startAt + local budget)
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
    // Require both players to be connected + ready before starting
    if (remotePlayer) {
      setLocalReady(true);

      if (channel) {
        await safeTrigger({
          channel: channelName,
          event: 'player-ready',
          data: { player: localPlayer, ready: true, time: initialTime },
        });
      }

      // Only Partner 1 starts the round once both are ready.
      return;
    }
  };

  // If Partner 1 is ready and Partner 2 becomes ready later, start the game.
  useEffect(() => {
    if (!channel) return;
    if (gameState !== "menu") return;
    if (localPlayer !== "hunter") return;
    if (!remotePlayer) return;
    if (!localReady || !remoteReady) return;

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

    if (localCompleted || localFinished || timeLeft <= 0) {
      setInput("");
      return;
    }

    if (
      letter.length === 1 &&
      /^[A-Z]$/.test(letter) &&
      !guessedLetters.includes(letter)
    ) {
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

        // Check if word is complete
        const allLettersGuessed = targetWord
          .split("")
          .every((l) => newGuessedLetters.includes(l));

        if (allLettersGuessed) {
          completedNow = true;
          nextTotalScore = totalScore + nextScore;
          setTotalScore(nextTotalScore);
          setScore(0);
          setLocalCompleted(true);
          nextScore = 0;
        }
      } else {
        // No timer mutation (keeps both players perfectly synced)
      }

      // Broadcast immediately using computed state (prevents missing the last letter / completion)
      const revealedCount = targetWord
        ? targetWord.split("").filter((l) => newGuessedLetters.includes(l)).length
        : 0;
      await broadcastState(false, {
        guessedLetters: newGuessedLetters,
        score: nextScore,
        totalScore: nextTotalScore,
        completed: completedNow || localCompleted,
        revealedCount,
      });
    }
  };

  // Host advances to the next word when EITHER player completes the current word.
  useEffect(() => {
    if (!channel) return;
    if (localPlayer !== "hunter") return;
    if (gameState !== "playing") return;
    if (!matchId) return;
    if (!localCompleted && !remoteCompleted) return;
    if (isAdvancingRoundRef.current) return;
    isAdvancingRoundRef.current = true;

    (async () => {
      const nextRound = round + 1;
      const wordObj = getRandomWord();

      await safeTrigger({
        channel: channelName,
        event: 'round-sync',
        data: {
          player: localPlayer,
          matchId,
          round: nextRound,
          word: wordObj.word,
          category: wordObj.category,
        },
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

    // Locally reset back to menu so Ready/Start path is valid.
    setGameState("menu");
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
    setMatchId(null);
    isStartingRef.current = false;
    isAdvancingRoundRef.current = false;
  };

  const getDisplayWord = () => {
    return targetWord.split("").map((letter, idx) => ({
      letter,
      guessed: guessedLetters.includes(letter),
      idx,
    }));
  };

  const getRemoteDisplayWord = () => {
    const len = targetWord.length;
    return Array.from({ length: len }).map((_, idx) => ({
      idx,
      filled: idx < remoteRevealedCount,
    }));
  };

  const playerColors = {
    hunter: { border: "border-orange-500", bg: "bg-orange-500/20", text: "text-orange-500" },
    riceee: { border: "border-pink-500", bg: "bg-pink-500/20", text: "text-pink-500" },
  };

  const localColor = playerColors[localPlayer] || playerColors.hunter;
  const remoteColor = playerColors[remotePlayer] || playerColors.riceee;

  // Determine winner
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/games">
              <Button
                variant="ghost"
                size="icon"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-4xl font-bold">⚔️ Word Duel Arena</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl text-center">
                Race to Guess Words!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timer Settings */}
              <div className="space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Starting Time
                </label>
                <div className="flex gap-2">
                  {[30, 60, 90, 120].map((time) => (
                    <Button
                      key={time}
                      variant={initialTime === time ? "default" : "outline"}
                      onClick={async () => {
                        setInitialTime(time);
                        // Broadcast timer selection to sync with other player
                        if (channel) {
                          await fetch('/api/pusher/trigger', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              channel: CHANNEL_NAME,
                              event: 'timer-sync',
                              data: { player: localPlayer, time },
                            }),
                          });
                        }
                      }}
                      className="flex-1"
                    >
                      {time}s
                    </Button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" /> Guess letters to reveal the word
                </p>
                <p className="flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Complete words for bonus time!
                </p>
                <p className="flex items-center gap-2">
                  <Crown className="h-4 w-4" /> Highest score wins!
                </p>
              </div>

              <Button
                onClick={startGame}
                className="w-full py-6 text-xl"
                disabled={!remotePlayer}
              >
                {!remotePlayer
                  ? "Waiting for opponent..."
                  : localReady
                    ? "Ready! Waiting..."
                    : localPlayer === "hunter" && remoteReady
                      ? "Start Duel"
                      : "Ready"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState === "playing") {
    return (
      <div className="min-h-screen p-2 sm:p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">⚔️ Word Duel</h1>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 bg-muted px-3 sm:px-4 py-1 sm:py-2 rounded-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-bold text-sm sm:text-base">{timeLeft}s</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            {/* Local Player */}
            <Card className={`border-2 ${localColor.border}`}>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className={`text-base sm:text-xl ${localColor.text} flex items-center gap-2`}>
                  {localPlayer === "hunter" ? "🦁" : "💗"} {localPlayer} (You)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-sm sm:text-base">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                    <span>Round {round}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                    <span>Score: {totalScore + score}</span>
                  </div>
                </div>

                {/* Category Hint */}
                <div className="text-center p-2 sm:p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                  <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-200 font-semibold">💡 Category: {targetCategory}</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-300/70 mt-1">{targetWord.length} letters</p>
                </div>

                {/* Show answer if time's up */}
                {timeLeft === 0 && (
                  <div className="text-center p-2 sm:p-3 bg-red-500/20 border border-red-500/50 rounded-lg animate-pulse">
                    <p className="text-xs sm:text-sm text-red-700 dark:text-red-200 font-semibold">⏰ Time's Up! The word was:</p>
                    <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-300 mt-1">{targetWord}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                  {getDisplayWord().map(({ letter, guessed, idx }) => (
                    <div
                      key={idx}
                      className={`w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center text-lg sm:text-2xl font-bold rounded-lg border-2 ${
                        guessed
                          ? `bg-green-500/30 border-green-500 text-white`
                          : "bg-muted/40 border-muted-foreground/30 text-transparent"
                      }`}
                    >
                      {guessed ? letter : "_"}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleGuess} className="space-y-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    placeholder="Guess a letter..."
                    maxLength={1}
                    className="text-center text-lg sm:text-xl font-bold uppercase"
                    autoFocus
                  />
                  <Button type="submit" className="w-full text-sm sm:text-base">
                    Guess
                  </Button>
                </form>

                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {guessedLetters.map((letter) => (
                    <div
                      key={letter}
                      className={`px-2 sm:px-3 py-1 rounded-lg font-bold text-sm ${
                        targetWord.includes(letter)
                          ? "bg-green-500/30 text-green-300"
                          : "bg-red-500/30 text-red-300"
                      }`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Remote Player */}
            <Card className={`border-2 ${remoteColor.border}`}>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className={`text-base sm:text-xl ${remoteColor.text} flex items-center gap-2`}>
                  {remotePlayer === "hunter" ? "🦁" : "💗"} {remotePlayer || "Waiting..."}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {remotePlayer ? (
                  <>
                    <div className="flex justify-between text-sm sm:text-base">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                        <span>Round {remoteRound}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                        <span>Score: {remoteTotalScore + remoteScore}</span>
                      </div>
                    </div>

                    {/* Remote word stays private; show only their progress */}
                    {(targetCategory || targetWord.length) && (
                      <div className="text-center p-2 sm:p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-200 font-semibold">
                          💡 Category: {targetCategory || "—"}
                        </p>
                        <p className="text-xs text-blue-700/70 dark:text-blue-200/70 mt-1">
                          {targetWord.length ? `${targetWord.length} letters` : ""}
                        </p>
                      </div>
                    )}

                    {targetWord.length > 0 && (
                      <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                        {getRemoteDisplayWord().map(({ idx, filled }) => (
                          <div
                            key={idx}
                            className={`w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center text-lg sm:text-2xl font-bold rounded-lg border-2 ${
                              filled
                                ? `bg-green-500/20 border-green-500/60 text-white`
                                : "bg-muted/40 border-muted-foreground/30 text-transparent"
                            }`}
                          >
                            {filled ? "•" : "_"}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="h-[40px] sm:h-[60px] flex items-center justify-center">
                      <div className="text-white/70 italic text-sm sm:text-base">
                        {remoteGameState === "playing" ? "Guessing..." : "Waiting..."}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {remoteGuessedLetters.map((letter) => (
                        <div
                          key={letter}
                          className="px-2 sm:px-3 py-1 rounded-lg font-bold text-sm bg-white/10 text-white/80"
                        >
                          {letter}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/50 py-12">
                    <div className="text-center">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Waiting for opponent...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl text-center">
                {winner === localPlayer && "🏆 Victory!"}
                {winner === remotePlayer && "💪 Good Try!"}
                {winner === "tie" && "🤝 It's a Tie!"}
                {winner === null && "⏳ Waiting for opponent..."}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${localColor.border} ${localColor.bg}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xl">
                      {localPlayer === "hunter" ? "🦁" : "💗"} {localPlayer}
                    </span>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{localFinalScore}</div>
                      <div className="text-sm opacity-75">{round} rounds</div>
                    </div>
                  </div>
                </div>

                {remotePlayer && (
                  <div className={`p-4 rounded-lg border-2 ${remoteColor.border} ${remoteColor.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xl">
                        {remotePlayer === "hunter" ? "🦁" : "💗"} {remotePlayer}
                      </span>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{remoteFinalScore}</div>
                        <div className="text-sm opacity-75">{remoteRound} rounds</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={resetGame}
                  className="flex-1 py-6 text-lg"
                >
                  Back to Menu
                </Button>
                <Button
                  onClick={playAgain}
                  className="flex-1 py-6 text-lg"
                >
                  Play Again
                </Button>
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
