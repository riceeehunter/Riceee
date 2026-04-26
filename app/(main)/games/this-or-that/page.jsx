"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GitCompare, Check, Users, Clock, Zap, Heart } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

const CHANNEL_NAME = "game-this-or-that";

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
  const localEmoji = getPlayerMeta(localPlayer)?.emoji || "🤔";
  const remoteEmoji = getPlayerMeta(remotePlayer)?.emoji || "🤔";

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
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 pb-20 sm:pb-4">
        <div className="max-w-xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/games">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className={`${plusJakarta.className} text-2xl sm:text-3xl font-bold text-[#ab4400]`}>
              This or That
            </h1>
          </div>

          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-5 sm:p-6">
              <CardTitle className="text-center">
                <GitCompare size={28} className="mx-auto mb-2 opacity-80" />
                <span className="text-xl sm:text-2xl font-black tracking-tight">Choice Challenge</span>
                <p className="text-white/70 text-[10px] sm:text-xs font-medium mt-1">See how much your tastes match!</p>
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
                 {localReady ? "WAITING FOR PARTNER..." : "START CHOOSING! ✨"}
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState === "playing") {
    const question = questions[currentQuestion];
    const progress = (currentQuestion / questions.length) * 100;

    return (
      <div className="flex flex-col p-2 sm:p-4 min-h-dvh overflow-y-auto scrollbar-hide bg-[#fffaf8]">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center py-8">
          <div className="flex items-center justify-between mb-2 sm:mb-4 px-2">
            <div className="flex items-center gap-2">
              <Link href="/games">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <h1 className={`${plusJakarta.className} text-lg sm:text-xl font-bold text-[#ab4400]`}>
                Choice Arena
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-[#fff0e8] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#ffae88]/30">
              <Users size={14} className="text-[#ab4400]" />
              <p className="text-[10px] sm:text-xs font-bold text-[#ab4400] uppercase tracking-wider">
                {remoteFinished ? "Partner Done" : "Choosing Live..."}
              </p>
            </div>
          </div>

          {!localFinished ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 sm:space-y-8 pb-12 min-h-0">
               <div className="text-center space-y-1 sm:space-y-2">
                 <p className="text-[10px] sm:text-xs font-black text-[#9d4867] uppercase tracking-widest opacity-60">QUESTION {currentQuestion + 1} OF {questions.length}</p>
                 <h2 className="text-xl sm:text-2xl font-black text-[#ab4400]">Which do you prefer?</h2>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl px-4">
                  <button
                    onClick={() => handleChoice("this")}
                    className="p-6 sm:p-8 bg-white hover:bg-orange-50 rounded-[2.5rem] sm:rounded-3xl border-4 border-orange-100 shadow-xl transition-all transform active:scale-95 group flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-0"
                  >
                    <div className="text-4xl sm:text-5xl mb-0 sm:mb-4 group-hover:scale-110 transition-transform">{question.this.split(" ").pop()}</div>
                    <p className="text-lg sm:text-xl font-black text-[#ab4400] flex-1 text-left sm:text-center leading-tight">{question.this.split(" ").slice(0, -1).join(" ")}</p>
                  </button>
                  <button
                    onClick={() => handleChoice("that")}
                    className="p-6 sm:p-8 bg-white hover:bg-pink-50 rounded-[2.5rem] sm:rounded-3xl border-4 border-pink-100 shadow-xl transition-all transform active:scale-95 group flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-0"
                  >
                    <div className="text-4xl sm:text-5xl mb-0 sm:mb-4 group-hover:scale-110 transition-transform">{question.that.split(" ").pop()}</div>
                    <p className="text-lg sm:text-xl font-black text-[#9d4867] flex-1 text-left sm:text-center leading-tight">{question.that.split(" ").slice(0, -1).join(" ")}</p>
                  </button>
               </div>

               <div className="w-full max-w-sm px-8 space-y-2">
                  <div className="flex justify-between text-[8px] sm:text-[10px] font-black text-[#ab4400] uppercase tracking-widest">
                    <span>PROGRESS</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                    <div 
                      className="h-full bg-gradient-to-r from-[#ab4400] to-[#9d4867] transition-all duration-500" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
               <div className="bg-[#fff0e8] p-6 sm:p-8 rounded-full shadow-inner animate-pulse">
                  <Clock size={32} className="sm:h-12 sm:w-12 text-[#ab4400]" />
               </div>
               <h2 className="text-xl sm:text-2xl font-black text-[#ab4400]">Waiting for {remotePlayerName.split(' ')[0]}...</h2>
               <p className="text-sm sm:text-base text-[#9d4867] font-medium">Almost there! They are at {remoteAnswers.length}/{questions.length}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === "finished") {
    const matches = getMatchCount();
    return (
      <div className="flex flex-col items-center pt-2 p-4">
        <div className="max-w-2xl w-full">
          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-8 text-center">
              <div className="text-6xl mb-4">{matches >= 7 ? "❤️" : matches >= 4 ? "✨" : "🤝"}</div>
              <CardTitle className="text-3xl font-black tracking-tight">The Perfect Match?</CardTitle>
              <p className="text-white/70 font-medium mt-2">You matched on {matches} out of {questions.length} choices!</p>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center justify-center gap-8 py-4">
                 <div className="text-center">
                   <div className="text-4xl mb-2">{localEmoji}</div>
                   <p className="font-bold text-[#ab4400]">{localPlayerName}</p>
                 </div>
                 <div className="text-5xl font-black text-[#ab4400] drop-shadow-lg">
                    {Math.round((matches / questions.length) * 100)}%
                 </div>
                 <div className="text-center">
                   <div className="text-4xl mb-2">{remoteEmoji}</div>
                   <p className="font-bold text-[#9d4867]">{remotePlayerName}</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto px-2 custom-scrollbar">
                {questions.map((q, idx) => {
                  const localC = localAnswers[idx];
                  const remoteC = remoteAnswers[idx];
                  const isMatch = localC === remoteC;
                  return (
                    <div key={idx} className={`p-4 rounded-2xl border-2 flex items-center justify-between ${isMatch ? "bg-green-50 border-green-200" : "bg-stone-50 border-stone-100 opacity-80"}`}>
                      <div className="flex-1 text-xs font-bold text-[#6a2700]">
                         {localC === "this" ? q.this : q.that}
                      </div>
                      <div className="px-4">
                         {isMatch ? <Heart className="text-green-500 fill-green-500" size={16} /> : <Zap className="text-stone-300" size={16} />}
                      </div>
                      <div className="flex-1 text-right text-xs font-bold text-[#6a2700]">
                         {remoteC === "this" ? q.this : q.that}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full py-8 text-xl font-black bg-[#ab4400] text-white rounded-2xl shadow-lg hover:bg-[#973b00] transition-all active:scale-95 shadow-[#ab4400]/20"
                >
                  COMPARE AGAIN 🔄
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

export default function ThisOrThat() {
  return (
    <LocalMultiplayerWrapper gameId="this-or-that" gameName="This or That">
      {(props) => <ThisOrThatGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
