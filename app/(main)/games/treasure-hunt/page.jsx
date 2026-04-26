"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Package, Star, Clock, Trophy, Users, Map, Compass, Gem } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

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
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 pb-20 sm:pb-4">
        <div className="max-w-xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/games">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className={`${plusJakarta.className} text-2xl sm:text-3xl font-bold text-[#ab4400]`}>
              Treasure Hunt
            </h1>
          </div>

          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-5 sm:p-6">
              <CardTitle className="text-center">
                <Compass size={28} className="mx-auto mb-2 opacity-80" />
                <span className="text-xl sm:text-2xl font-black tracking-tight">The Riddler's Race</span>
                <p className="text-white/70 text-[10px] sm:text-xs font-medium mt-1">Solve the clues, find the treasure first!</p>
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
                 {localReady ? "WAITING FOR PARTNER..." : "READY TO HUNT! 🗺️"}
               </Button>

               {!remoteConnected && (
                 <p className="text-center text-xs text-[#9d4867] font-medium animate-pulse">
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
    const challenge = challenges[currentChallenge] || ALL_CHALLENGES[0];
    return (
      <div className="flex flex-col p-2 sm:p-4 h-dvh overflow-y-auto scrollbar-hide bg-[#fffaf8]">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <Link href="/games">
                <Button variant="ghost" size="icon">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <h1 className={`${plusJakarta.className} text-xl font-bold text-[#ab4400]`}>
                Treasure Arena
              </h1>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 ${timeLeft < 15 ? "bg-red-50 border-red-200 animate-pulse" : "bg-blue-50"}`}>
              <Clock size={16} className={timeLeft < 15 ? "text-red-500" : "text-blue-500"} />
              <span className={`text-sm font-black ${timeLeft < 15 ? "text-red-600" : "text-blue-600"}`}>{timeLeft}s</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 flex-1 min-h-0 pb-4">
            {/* Local Player */}
            <Card className="border-none shadow-xl flex flex-col bg-white overflow-hidden rounded-3xl border-2 border-orange-100">
               <CardHeader className="bg-orange-50/50 py-3 border-b border-orange-100">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-[#6a2700]">
                      {localEmoji} {localPlayerName}
                    </span>
                    <span className="text-xl font-black text-[#ab4400]">{score}</span>
                  </div>
               </CardHeader>
               <CardContent className="p-4 flex-1 flex flex-col">
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
                    <div className="text-6xl mb-4">{challenge.emoji}</div>
                    <p className="text-[10px] font-bold text-[#9d4867] uppercase tracking-widest mb-1">
                      Treasure {currentChallenge + 1} of {challenges.length}
                    </p>
                    <h2 className="text-xl font-bold text-[#6a2700] mb-6">
                      {challenge.question}
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
                      <Input 
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type your answer..."
                        className="text-center py-6 text-lg border-2 border-[#ffae88]/30 focus:border-[#ab4400] rounded-xl"
                        autoFocus
                      />
                      <Button type="submit" className="w-full py-6 bg-[#ab4400] hover:bg-[#973b00] rounded-xl font-bold">
                        FOUND IT! 💎
                      </Button>
                    </form>

                    {feedback && (
                      <p className={`mt-4 font-bold ${feedback.includes("✅") ? "text-green-600" : "text-red-600 animate-bounce"}`}>
                        {feedback}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                    {challenges.map((_, i) => (
                      <div key={i} className={`flex-1 ${i < treasuresFound ? "bg-green-500" : i === currentChallenge ? "bg-orange-400 animate-pulse" : "bg-stone-200"}`} />
                    ))}
                  </div>
               </CardContent>
            </Card>

            {/* Remote Player */}
            <Card className="border-none shadow-xl flex flex-col bg-white overflow-hidden rounded-3xl border-2 border-pink-100">
               <CardHeader className="bg-pink-50/50 py-3 border-b border-pink-100">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-[#6a2700] opacity-70">
                      {remoteEmoji} {remotePlayerName}
                    </span>
                    <span className="text-xl font-black text-[#9d4867] opacity-70">{remoteScore}</span>
                  </div>
               </CardHeader>
               <CardContent className="p-4 flex-1 flex flex-col">
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-stone-50/50 rounded-2xl border-2 border-dashed border-stone-200 opacity-60">
                    <Gem size={48} className="text-[#9d4867] mb-4 animate-bounce" />
                    <p className="text-xs font-bold text-[#9d4867]">{remotePlayerName} is hunting...</p>
                    <p className="text-sm font-medium text-stone-500 mt-2">Currently at Treasure #{remoteCurrentChallenge + 1}</p>
                  </div>
                  <div className="mt-4 flex gap-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                    {challenges.map((_, i) => (
                      <div key={i} className={`flex-1 ${i < remoteTreasuresFound ? "bg-pink-500" : i === remoteCurrentChallenge ? "bg-pink-300 animate-pulse" : "bg-stone-200"}`} />
                    ))}
                  </div>
                  {remoteFinished && (
                    <p className="text-center text-[10px] font-black text-green-600 uppercase tracking-widest mt-2">
                      FINISHED THE HUNT!
                    </p>
                  )}
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "finished") {
    return (
      <div className="flex flex-col items-center pt-4 sm:pt-8 p-4">
        <div className="max-w-2xl w-full">
          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-8 text-center">
              <div className="text-6xl mb-4">
                {winner === localPlayer ? "🏆" : winner ? "💎" : "🤝"}
              </div>
              <CardTitle className="text-3xl font-black tracking-tight">
                {winner === localPlayer && "MASTER HUNTER!"}
                {winner && winner !== localPlayer && "GREAT HUNT!"}
                {!winner && "EQUAL SPOILS!"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-8 space-y-8">
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div className={`p-4 sm:p-6 rounded-3xl border-2 flex flex-col items-center gap-1 sm:gap-3 ${winner === localPlayer ? "bg-orange-50 border-orange-200 ring-4 ring-orange-100" : "bg-stone-50 border-stone-100 opacity-60"}`}>
                  <span className="text-3xl sm:text-5xl mb-1">{localEmoji}</span>
                  <span className="font-black text-[#6a2700] text-sm sm:text-lg text-center truncate w-full">{localPlayerName}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl sm:text-4xl font-black text-[#ab4400] leading-none">{score}</span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase text-[#9d4867] mt-1 tracking-tighter sm:tracking-widest">{treasuresFound} Found</span>
                  </div>
                </div>
                <div className={`p-4 sm:p-6 rounded-3xl border-2 flex flex-col items-center gap-1 sm:gap-3 ${winner === remotePlayer ? "bg-orange-50 border-orange-200 ring-4 ring-orange-100" : "bg-stone-50 border-stone-100 opacity-60"}`}>
                  <span className="text-3xl sm:text-5xl mb-1">{remoteEmoji}</span>
                  <span className="font-black text-[#6a2700] text-sm sm:text-lg text-center truncate w-full">{remotePlayerName}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl sm:text-4xl font-black text-[#ab4400] leading-none">{remoteScore}</span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase text-[#9d4867] mt-1 tracking-tighter sm:tracking-widest">{remoteTreasuresFound} Found</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full py-8 text-xl font-black bg-[#ab4400] text-white rounded-2xl shadow-lg hover:bg-[#973b00] transition-all active:scale-95 shadow-[#ab4400]/20"
                >
                  HUNT AGAIN 🔄
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

export default function TreasureHunt() {
  return (
    <LocalMultiplayerWrapper gameId="treasure-hunt" gameName="Treasure Hunt">
      {(props) => <TreasureHuntGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}