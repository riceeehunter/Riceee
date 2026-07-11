"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Flame, CheckCircle2, Zap } from "lucide-react";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";
import {
  LobbyScreen,
  GameFrame,
  BackToArena,
  PlayerDisc,
} from "../_components/game-ui";

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


function DailyDareGame({ localPlayer, sessionId, getPlayerName }) {
  const CHANNEL_NAME = sessionId;
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
      <LobbyScreen
        gameTitle="Daily Dare"
        tagline="One dare a day. Streaks don't forgive absences."
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

  if (gameState === "playing" || gameState === "completed") {
    return (
      <GameFrame size="max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <BackToArena />
          <span className="flex items-center gap-2 rounded-full border border-[#ffdfcf] bg-[#fff5ef] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ab4400]">
            <Flame size={13} />
            {streak}-day streak
          </span>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
          {/* Today's dare */}
          <div className="border-b border-[#f5f2ee] px-7 pb-7 pt-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">Today&apos;s dare</p>
            <h2 className={`${plusJakarta.className} mt-3 text-2xl font-extrabold tracking-tight text-[#393832] sm:text-3xl`}>
              {todaysDare?.dare}
            </h2>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#fff8e8] border border-[#fbe9b7] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a6d00]">
              <Zap size={12} />
              {todaysDare?.points} points
            </span>
          </div>

          <div className="space-y-5 p-6 sm:p-7">
            <div className="flex items-stretch gap-3">
              <div className={`flex flex-1 flex-col items-center gap-2.5 rounded-3xl border p-4 transition-all ${localCompleted ? "border-[#ab4400] bg-[#fff4ec]" : "border-[#efe9e2] bg-white"}`}>
                <PlayerDisc name={localPlayerName} kind="local" size="sm" />
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>You</p>
                {localCompleted ? (
                  <CheckCircle2 size={18} className="text-[#ab4400]" />
                ) : (
                  <div className="h-[18px] w-[18px] rounded-full border-2 border-[#e8e3dc]" />
                )}
              </div>
              <div className={`flex flex-1 flex-col items-center gap-2.5 rounded-3xl border p-4 transition-all ${remoteCompleted ? "border-[#9d4867] bg-[#fff1f6]" : "border-[#efe9e2] bg-white"}`}>
                <PlayerDisc name={remotePlayerName} kind="remote" size="sm" dim={!remoteCompleted} />
                <p className={`${plusJakarta.className} truncate max-w-full text-xs font-bold text-[#393832]`}>
                  {remotePlayerName.split(" ")[0]}
                </p>
                {remoteCompleted ? (
                  <CheckCircle2 size={18} className="text-[#9d4867]" />
                ) : (
                  <div className="h-[18px] w-[18px] animate-pulse rounded-full border-2 border-[#e8e3dc]" />
                )}
              </div>
            </div>

            {!localCompleted ? (
              <button
                onClick={completeDare}
                className="w-full rounded-2xl bg-[#ab4400] py-5 text-base font-extrabold tracking-tight text-white shadow-[0_14px_30px_rgba(171,68,0,0.28)] transition-all hover:bg-[#973b00] active:scale-[0.98]"
              >
                Done it. Mark me down.
              </button>
            ) : !remoteCompleted ? (
              <div className="rounded-2xl border border-[#ffdfcf] bg-[#fff5ef] p-4 text-center">
                <p className={`${plusJakarta.className} text-sm font-bold text-[#ab4400]`}>Yours is in the books.</p>
                <p className="mt-1 text-xs text-[#66645e]">Waiting on {remotePlayerName.split(" ")[0]} — feel free to apply pressure.</p>
              </div>
            ) : (
              <div className="animate-in zoom-in-50 duration-500 rounded-2xl border border-[#ab4400] bg-[#fff4ec] p-5 text-center">
                <p className={`${plusJakarta.className} text-lg font-extrabold tracking-tight text-[#ab4400]`}>
                  Streak saved.
                </p>
                <p className="mt-1 text-xs text-[#66645e]">Same time tomorrow. No excuses.</p>
                <Link
                  href="/games"
                  className="mt-4 inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[#a09d95] transition-colors hover:text-[#ab4400]"
                >
                  Back to Arena
                </Link>
              </div>
            )}
          </div>
        </div>
      </GameFrame>
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
