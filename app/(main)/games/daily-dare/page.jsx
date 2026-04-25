"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Calendar, Trophy, Flame, Users, Clock, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

const DAILY_DARES = [
  { id: 1, dare: "Write 3 things you're grateful for", emoji: "🙏", points: 10 },
  { id: 2, dare: "Drink 8 glasses of water today", emoji: "💧", points: 10 },
  { id: 3, dare: "Do 20 push-ups or squats", emoji: "💪", points: 15 },
  { id: 4, dare: "Read for 30 minutes", emoji: "📚", points: 15 },
  { id: 5, dare: "No social media for 2 hours", emoji: "📵", points: 20 },
  { id: 6, dare: "Meditate for 10 minutes", emoji: "🧘", points: 15 },
  { id: 7, dare: "Compliment 3 people today", emoji: "💝", points: 10 },
  { id: 8, dare: "Learn 5 new words", emoji: "📖", points: 15 },
  { id: 9, dare: "Take a 30-minute walk", emoji: "🚶", points: 15 },
  { id: 10, dare: "Try a new healthy recipe", emoji: "🥗", points: 20 },
];

const CHANNEL_NAME = "game-daily-dare";

function DailyDareGame({ localPlayer, sessionId, getPlayerName }) {
  const [gameState, setGameState] = useState("menu");
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  
  const [todaysDare, setTodaysDare] = useState(null);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [remoteCompleted, setRemoteCompleted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [channel, setChannel] = useState(null);
  const localReadyRef = useRef(localReady);

  useEffect(() => {
    localReadyRef.current = localReady;
  }, [localReady]);

  const remotePlayer = getOtherPlayer(localPlayer);
  const localPlayerName = getPlayerName(localPlayer);
  const remotePlayerName = getPlayerName(remotePlayer);
  const localEmoji = getPlayerMeta(localPlayer)?.emoji || "🎯";
  const remoteEmoji = getPlayerMeta(remotePlayer)?.emoji || "🎯";

  useEffect(() => {
    // Generate today's dare based on date
    const dayIndex = new Date().getDate() % DAILY_DARES.length;
    setTodaysDare(DAILY_DARES[dayIndex]);

    // Load streak/points from local storage for individual progress tracking
    const saved = localStorage.getItem(`dailyDare-${localPlayer}`);
    if (saved) {
      const data = JSON.parse(saved);
      setStreak(data.streak || 0);
      setTotalPoints(data.points || 0);
    }
  }, [localPlayer]);

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
      setGameState("playing");
      setLocalCompleted(false);
      setRemoteCompleted(false);
    });

    gameChannel.bind('dare-completed', (data) => {
      if (data.player !== localPlayer) setRemoteCompleted(true);
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

  const completeDare = () => {
    setLocalCompleted(true);
    const newStreak = streak + 1;
    const newPoints = totalPoints + (todaysDare?.points || 0);
    
    setStreak(newStreak);
    setTotalPoints(newPoints);
    
    localStorage.setItem(`dailyDare-${localPlayer}`, JSON.stringify({
      streak: newStreak,
      points: newPoints,
      lastCompleted: new Date().toDateString()
    }));

    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: 'dare-completed',
        data: { player: localPlayer }
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
              Daily Dare
            </h1>
          </div>

          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-5 sm:p-6">
              <CardTitle className="text-center">
                <Users size={28} className="mx-auto mb-2 opacity-80" />
                <span className="text-xl sm:text-2xl font-black tracking-tight">Duo Habits</span>
                <p className="text-white/70 text-[10px] sm:text-xs font-medium mt-1">Complete your daily challenge together.</p>
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
                 {localReady ? "WAITING FOR PARTNER..." : "GO TO CHALLENGE! 🎯"}
               </Button>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState === "playing" || gameState === "completed") {
    return (
      <div className="flex flex-col p-2 sm:p-4 h-dvh overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <Link href="/games">
                <Button variant="ghost" size="icon">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <h1 className={`${plusJakarta.className} text-xl font-bold text-[#ab4400]`}>
                Duo Goals
              </h1>
            </div>
            <div className="flex items-center gap-2 bg-[#fff0e8] px-4 py-2 rounded-full border border-[#ffae88]/30">
              <Flame size={16} className="text-[#ab4400]" />
              <p className="text-xs font-black text-[#ab4400]">
                {streak} DAY STREAK
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-8 pb-12">
             <div className="text-center space-y-1">
                <p className="text-xs font-black text-[#9d4867] uppercase tracking-[0.2em] opacity-60">TODAY'S MISSION</p>
                <h2 className="text-3xl font-black text-[#ab4400]">Level Up Together</h2>
             </div>

             <Card className="w-full max-w-sm border-none shadow-[0_30px_70px_rgba(171,68,0,0.15)] rounded-[2.5rem] overflow-hidden">
                <div className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] p-10 text-center text-white">
                   <div className="text-6xl mb-4">{todaysDare?.emoji}</div>
                   <p className="text-xl font-bold leading-tight">{todaysDare?.dare}</p>
                   <div className="mt-4 flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm py-1 px-4 rounded-full inline-flex">
                      <Zap size={14} className="text-yellow-300" />
                      <span className="text-xs font-black uppercase tracking-widest">{todaysDare?.points} PTS</span>
                   </div>
                </div>
                <CardContent className="p-8 bg-white space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${localCompleted ? "bg-green-50 border-green-200" : "bg-stone-50 border-stone-100"}`}>
                        <div className="text-2xl">{localEmoji}</div>
                        <span className="text-[10px] font-black text-stone-400 uppercase">YOU</span>
                        {localCompleted ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-stone-200" />}
                      </div>
                      <div className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${remoteCompleted ? "bg-green-50 border-green-200" : "bg-stone-50 border-stone-100"}`}>
                        <div className="text-2xl opacity-40">{remoteEmoji}</div>
                        <span className="text-[10px] font-black text-stone-400 uppercase">{remotePlayerName}</span>
                        {remoteCompleted ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-5 h-5 rounded-full border-2 border-stone-200 animate-pulse" />}
                      </div>
                   </div>

                   {!localCompleted ? (
                     <Button 
                      onClick={completeDare}
                      className="w-full py-8 text-xl font-black bg-[#ab4400] hover:bg-[#973b00] rounded-2xl shadow-lg active:scale-95"
                     >
                       I'VE DONE IT! 🚀
                     </Button>
                   ) : (
                     <div className="text-center p-4 bg-green-50 rounded-2xl border-2 border-green-100">
                        <p className="text-sm font-black text-green-600 uppercase tracking-widest mb-1">MISSION CLEAR! ✨</p>
                        <p className="text-xs font-medium text-green-700/60 italic">Waiting for your partner to finish...</p>
                     </div>
                   )}
                </CardContent>
             </Card>

             {localCompleted && remoteCompleted && (
                <div className="text-center animate-in zoom-in-50 duration-500">
                   <div className="flex items-center gap-4 justify-center mb-4">
                      <Trophy size={48} className="text-yellow-400" />
                      <div className="text-left">
                         <p className="text-2xl font-black text-[#ab4400]">STREAK SAVED!</p>
                         <p className="text-xs font-bold text-[#9d4867] uppercase tracking-widest">See you both tomorrow</p>
                      </div>
                   </div>
                   <Link href="/games">
                      <Button variant="ghost" className="text-[#9d4867] font-black">
                        BACK TO GAMES
                      </Button>
                   </Link>
                </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function DailyDare() {
  return (
    <LocalMultiplayerWrapper gameId="daily-dare" gameName="Daily Dare">
      {(props) => <DailyDareGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
