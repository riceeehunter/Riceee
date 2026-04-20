"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Star, Clock, Trophy } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";

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

const CHANNEL_NAME = 'game-treasure-hunt';

function TreasureHuntGame({ localPlayer, sessionId, getPlayerName }) {
  const [pusherClient, setPusherClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [remotePlayer, setRemotePlayer] = useState(null);

  const [gameState, setGameState] = useState("menu");
  const [challenges, setChallenges] = useState([]);
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [treasuresFound, setTreasuresFound] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [localFinished, setLocalFinished] = useState(false);

  // Remote player state
  const [remoteScore, setRemoteScore] = useState(0);
  const [remoteTreasuresFound, setRemoteTreasuresFound] = useState(0);
  const [remoteCurrentChallenge, setRemoteCurrentChallenge] = useState(0);
  const [remoteFinished, setRemoteFinished] = useState(false);

  const remotePlayerId = getOtherPlayer(localPlayer);
  const localPlayerName = getPlayerName(localPlayer);
  const remotePlayerName = getPlayerName(remotePlayer || remotePlayerId);

  // Initialize Pusher
  useEffect(() => {
    if (!localPlayer) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const gameChannel = pusher.subscribe(CHANNEL_NAME);
    setPusherClient(pusher);
    setChannel(gameChannel);

    console.log(`[${localPlayer}] 🗺️ Treasure Hunt initialized`);

    return () => {
      gameChannel.unsubscribe();
      pusher.disconnect();
    };
  }, [localPlayer]);

  // Listen for remote player updates
  useEffect(() => {
    if (!channel) return;

    channel.bind('pusher:subscription_succeeded', async () => {
      console.log(`[${localPlayer}] ✅ Subscribed to ${CHANNEL_NAME}`);
      
      await fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: 'player-joined',
          data: { player: localPlayer },
        }),
      });
    });

    channel.bind('player-joined', (data) => {
      if (data.player !== localPlayer) {
        console.log(`[${localPlayer}] 👋 ${data.player} joined`);
        setRemotePlayer(data.player);
      }
    });

    channel.bind('challenges-sync', (data) => {
      if (data.player !== localPlayer) {
        console.log(`[${localPlayer}] 🎲 Challenges synced`);
        setChallenges(data.challenges);
      }
    });

    channel.bind('game-update', (data) => {
      if (data.player !== localPlayer) {
        console.log(`[${localPlayer}] 📡 Update from ${data.player}`);
        setRemoteScore(data.score);
        setRemoteTreasuresFound(data.treasuresFound);
        setRemoteCurrentChallenge(data.currentChallenge);
        setRemoteFinished(data.finished);
      }
    });

    return () => {
      channel.unbind_all();
    };
  }, [channel, localPlayer]);

  // Broadcast state changes
  const broadcastState = useCallback(async (finished = false) => {
    if (channel && gameState !== "menu") {
      await fetch('/api/pusher/trigger', {
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
            finished,
          },
        }),
      });
    }
  }, [channel, localPlayer, score, treasuresFound, currentChallenge, gameState]);

  // Timer
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === "playing") {
      endGame();
    }
  }, [timeLeft, gameState]);

  const startGame = async () => {
    // Shuffle challenges to make them non-repetitive
    const shuffled = [...ALL_CHALLENGES]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10); // Take 10 random challenges
    
    setChallenges(shuffled);
    setCurrentChallenge(0);
    setUserAnswer("");
    setScore(0);
    setTimeLeft(60);
    setTreasuresFound(0);
    setFeedback("");
    setLocalFinished(false);
    setGameState("playing");

    // Broadcast challenges to sync both players
    if (channel) {
      await fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: 'challenges-sync',
          data: {
            player: localPlayer,
            challenges: shuffled,
          },
        }),
      });
    }

    setTimeout(() => broadcastState(), 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const challenge = challenges[currentChallenge];
    
    if (userAnswer.trim().toLowerCase() === challenge.answer.toLowerCase()) {
      setFeedback("✅ Treasure Found!");
      setScore(score + 100);
      setTreasuresFound(treasuresFound + 1);
      
      setTimeout(() => {
        if (currentChallenge < challenges.length - 1) {
          setCurrentChallenge(currentChallenge + 1);
          setUserAnswer("");
          setFeedback("");
          broadcastState();
        } else {
          // All treasures found!
          endGame();
        }
      }, 1000);
    } else {
      setFeedback("❌ Try again!");
      setTimeLeft(Math.max(0, timeLeft - 5)); // Penalty
      setTimeout(() => setFeedback(""), 1500);
    }
  };

  const skipChallenge = () => {
    if (currentChallenge < challenges.length - 1) {
      setCurrentChallenge(currentChallenge + 1);
      setUserAnswer("");
      setFeedback("");
      setTimeLeft(Math.max(0, timeLeft - 3)); // Small penalty for skipping
      broadcastState();
    }
  };

  const endGame = async () => {
    setLocalFinished(true);
    setGameState("finished");
    await broadcastState(true);
  };

  if (challenges.length === 0 && gameState === "playing") {
    return <div className="flex items-center justify-center min-h-screen">Loading challenges...</div>;
  }

  const challenge = challenges[currentChallenge];

  const playerColors = {
    [PLAYER_IDS.ONE]: { border: "border-orange-500", bg: "bg-orange-500/20", text: "text-orange-500" },
    [PLAYER_IDS.TWO]: { border: "border-pink-500", bg: "bg-pink-500/20", text: "text-pink-500" },
  };

  const localColor = playerColors[localPlayer] || playerColors[PLAYER_IDS.ONE];
  const remoteColor = playerColors[remotePlayer || remotePlayerId] || playerColors[PLAYER_IDS.TWO];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/games">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2" size={16} />
          Back to Games
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl text-center bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
            <Package className="inline mr-2 mb-1" size={32} />
            Treasure Hunt Race
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gameState === "menu" && (
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-2xl font-bold">Ready to Hunt Treasures?</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Race against {remotePlayerName || "your opponent"} to find hidden treasures! Solve varied challenges - math, riddles, trivia, and word games.
                First to collect the most treasures wins!
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto my-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <span className="text-3xl">🧮</span>
                  <p className="text-xs font-bold mt-2">Math</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <span className="text-3xl">🤔</span>
                  <p className="text-xs font-bold mt-2">Riddles</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <span className="text-3xl">📝</span>
                  <p className="text-xs font-bold mt-2">Words</p>
                </div>
              </div>
              <Button onClick={startGame} size="lg" className="text-lg px-8">
                Start Hunt! 🗺️
              </Button>
            </div>
          )}

          {gameState === "playing" && (
            <div className="space-y-6">
              {/* Player Progress Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Local Player */}
                <div className={`p-4 rounded-lg border-2 ${localColor.border} ${localColor.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{localPlayerName} (You)</span>
                    <span className={`text-lg font-bold ${localColor.text}`}>
                      {score} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>💎 {treasuresFound}/{challenges.length}</span>
                    <span>•</span>
                    <span>Challenge #{currentChallenge + 1}</span>
                  </div>
                  {localFinished && (
                    <div className="mt-2 text-green-600 font-bold">✅ Finished!</div>
                  )}
                </div>

                {/* Remote Player */}
                <div className={`p-4 rounded-lg border-2 ${remoteColor.border} ${remoteColor.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold capitalize">{remotePlayerName || "Opponent"}</span>
                    <span className={`text-lg font-bold ${remoteColor.text}`}>
                      {remoteScore} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>💎 {remoteTreasuresFound}/{challenges.length}</span>
                    <span>•</span>
                    <span>Challenge #{remoteCurrentChallenge + 1}</span>
                  </div>
                  {remoteFinished && (
                    <div className="mt-2 text-green-600 font-bold">✅ Finished!</div>
                  )}
                </div>
              </div>

              {/* Timer */}
              <div className="text-center">
                <Clock className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                <p className={`text-2xl font-bold ${timeLeft < 15 ? "text-red-500" : "text-blue-600"}`}>
                  {timeLeft}s
                </p>
              </div>

              {/* Challenge Card */}
              <div className="bg-muted p-8 rounded-lg border-2 min-h-[250px] flex flex-col justify-center">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">{challenge.emoji}</div>
                  <p className="text-sm font-semibold uppercase tracking-wide mb-2 text-muted-foreground">
                    Challenge #{currentChallenge + 1}
                  </p>
                  <h3 className="text-2xl font-bold">
                    {challenge.question}
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Your answer..."
                    className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none text-center text-lg"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={!userAnswer.trim()}>
                      Submit Answer 🔍
                    </Button>
                    <Button type="button" variant="outline" onClick={skipChallenge}>
                      Skip (-3s)
                    </Button>
                  </div>
                </form>

                {feedback && (
                  <div className={`text-center mt-4 text-lg font-bold ${
                    feedback.includes("✅") ? "text-green-600" : "text-red-600"
                  }`}>
                    {feedback}
                  </div>
                )}
              </div>
            </div>
          )}

          {gameState === "finished" && (
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">
                {score > remoteScore ? "🏆" : score < remoteScore ? "💎" : "🤝"}
              </div>
              <h2 className="text-2xl font-bold">
                {score > remoteScore ? "You Won!" : score < remoteScore ? `${remotePlayerName} Won!` : "It's a Tie!"}
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* Local Player Final Stats */}
                <div className={`p-6 rounded-lg border-2 ${localColor.border} ${localColor.bg}`}>
                  <div className="font-bold mb-2 text-lg">{localPlayerName}</div>
                  <div className="text-3xl font-bold mb-2">{score} pts</div>
                  <div className="text-sm">💎 {treasuresFound}/{challenges.length} treasures</div>
                </div>

                {/* Remote Player Final Stats */}
                <div className={`p-6 rounded-lg border-2 ${remoteColor.border} ${remoteColor.bg}`}>
                  <div className="font-bold mb-2 capitalize text-lg">{remotePlayerName || "Opponent"}</div>
                  <div className="text-3xl font-bold mb-2">{remoteScore} pts</div>
                  <div className="text-sm">💎 {remoteTreasuresFound}/{challenges.length} treasures</div>
                </div>
              </div>

              <div className="flex gap-4 justify-center flex-wrap">
                <Button onClick={startGame} size="lg">
                  Hunt Again 🔄
                </Button>
                <Link href="/games">
                  <Button variant="outline" size="lg">
                    Choose Another Game
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TreasureHunt() {
  return (
    <LocalMultiplayerWrapper gameId="treasure-hunt" gameName="Treasure Hunt">
      {(props) => <TreasureHuntGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}