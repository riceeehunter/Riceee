"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Heart, Users, Clock, Zap, Swords, Flame } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

const CHANNEL_NAME = "game-truth-or-dare";

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
  const localEmoji = getPlayerMeta(localPlayer)?.emoji || "🎭";
  const remoteEmoji = getPlayerMeta(remotePlayer)?.emoji || "🎭";

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
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 pb-20 sm:pb-4">
        <div className="max-w-xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/games">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className={`${plusJakarta.className} text-2xl sm:text-3xl font-bold text-[#ab4400]`}>
              Truth or Dare
            </h1>
          </div>

          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-5 sm:p-6">
              <CardTitle className="text-center">
                <Flame size={28} className="mx-auto mb-2 opacity-80" />
                <span className="text-xl sm:text-2xl font-black tracking-tight">The Honest Truth</span>
                <p className="text-white/70 text-[10px] sm:text-xs font-medium mt-1">Reveal your secrets or take a dare.</p>
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
                 {localReady ? "WAITING FOR PARTNER..." : "LET'S PLAY! 🎭"}
               </Button>

               {!remoteConnected && (
                 <p className="text-center text-[10px] sm:text-xs text-[#9d4867] font-medium animate-pulse">
                   Waiting for {remotePlayerName} to join...
                 </p>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState === "choosing") {
    return (
      <div className="flex flex-col p-2 sm:p-4 min-h-dvh overflow-y-auto scrollbar-hide bg-[#fffaf8]">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center py-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <Link href="/games">
                <Button variant="ghost" size="icon">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <h1 className={`${plusJakarta.className} text-xl font-bold text-[#ab4400]`}>
                Truth or Dare
              </h1>
            </div>
            <div className="flex items-center gap-4 bg-[#fff0e8] px-4 py-2 rounded-full border border-[#ffae88]/30">
               <div className="flex items-center gap-1.5 border-r border-[#ffae88]/30 pr-3">
                  <span className="text-[10px] font-bold text-[#ab4400] uppercase">{localPlayerName}:</span>
                  <span className="text-sm font-black text-[#ab4400]">{score[localPlayer]}</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#9d4867] uppercase">{remotePlayerName}:</span>
                  <span className="text-sm font-black text-[#9d4867]">{score[remotePlayer]}</span>
               </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-12 pb-20">
             <div className="text-center space-y-2">
                <p className="text-xs font-black text-[#9d4867] uppercase tracking-widest opacity-60">
                  {currentTurn === localPlayer ? "YOUR TURN" : "PARTNER'S TURN"}
                </p>
                <h2 className="text-3xl font-black text-[#ab4400]">
                  {currentTurn === localPlayer ? "Choose your fate!" : `Watching ${remotePlayerName}...`}
                </h2>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl px-4">
                <button
                  disabled={currentTurn !== localPlayer}
                  onClick={() => chooseType("truth")}
                  className={`p-10 rounded-3xl border-4 transition-all transform active:scale-95 group ${
                    currentTurn === localPlayer 
                    ? "bg-white border-orange-100 hover:border-orange-400 shadow-xl" 
                    : "bg-stone-50 border-stone-100 opacity-50 cursor-default"
                  }`}
                >
                   <div className="text-6xl mb-4 transition-transform group-hover:scale-110">💭</div>
                   <p className="text-2xl font-black text-[#ab4400]">TRUTH</p>
                   <p className="text-xs font-bold text-stone-400 mt-1 uppercase">Share a secret</p>
                </button>
                <button
                  disabled={currentTurn !== localPlayer}
                  onClick={() => chooseType("dare")}
                  className={`p-10 rounded-3xl border-4 transition-all transform active:scale-95 group ${
                    currentTurn === localPlayer 
                    ? "bg-white border-pink-100 hover:border-pink-400 shadow-xl" 
                    : "bg-stone-50 border-stone-100 opacity-50 cursor-default"
                  }`}
                >
                   <div className="text-6xl mb-4 transition-transform group-hover:scale-110">⚡</div>
                   <p className="text-2xl font-black text-[#9d4867]">DARE</p>
                   <p className="text-xs font-bold text-stone-400 mt-1 uppercase">Take a risk</p>
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "challenge") {
    return (
      <div className="flex flex-col p-2 sm:p-4 h-dvh overflow-hidden">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
           <Card className="border-none shadow-[0_30px_70px_rgba(171,68,0,0.15)] overflow-visible rounded-[2.5rem]">
              <CardHeader className={`p-8 text-center rounded-t-[2.5rem] ${currentType === "truth" ? "bg-orange-500" : "bg-pink-500"} text-white`}>
                 <div className="text-5xl mb-4">
                   {currentType === "truth" ? "💭" : "⚡"}
                 </div>
                 <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">
                   {currentTurn === localPlayer ? "YOUR CHALLENGE" : `${remotePlayerName.toUpperCase()}'S CHALLENGE`}
                 </p>
                 <CardTitle className="text-3xl font-black">{currentType.toUpperCase()}</CardTitle>
              </CardHeader>
              <CardContent className="p-10 text-center space-y-8 bg-white rounded-b-[2.5rem]">
                 <p className="text-2xl font-bold text-[#6a2700] leading-relaxed">
                   {currentChallenge}
                 </p>

                 {currentTurn === localPlayer ? (
                   <div className="space-y-4 pt-4">
                      <Button 
                        onClick={completeChallenge}
                        className={`w-full py-8 text-xl font-black rounded-2xl shadow-lg transition-all active:scale-95 ${
                          currentType === "truth" ? "bg-orange-500 hover:bg-orange-600" : "bg-pink-500 hover:bg-pink-600"
                        }`}
                      >
                        DONE! (+1 PT) ✨
                      </Button>
                      <Button variant="ghost" onClick={() => setGameState("choosing")} className="w-full text-stone-400 font-bold">
                        Skip this one
                      </Button>
                   </div>
                 ) : (
                   <div className="pt-4 flex flex-col items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Waiting for partner...</p>
                   </div>
                 )}
              </CardContent>
           </Card>
        </div>
      </div>
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
