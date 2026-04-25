"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dices, Sparkles, Users, Clock, Zap, BookOpen, ScrollText } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

const STORY_ELEMENTS = {
  characters: ["🧙‍♂️ A wizard", "🦸‍♀️ A superhero", "🐉 A dragon", "👸 A princess", "🤖 A robot", "🧛‍♂️ A vampire", "🦊 A clever fox", "👻 A friendly ghost"],
  settings: ["🏰 in a castle", "🌋 on a volcano", "🏝️ on a desert island", "🚀 in space", "🌲 in an enchanted forest", "🏙️ in a futuristic city", "🏔️ on a mountain peak", "🌊 under the sea"],
  objects: ["💎 a magical gem", "📜 an ancient scroll", "⚔️ a legendary sword", "🔮 a crystal ball", "🗝️ a mysterious key", "📱 a time-traveling phone", "🎭 a cursed mask", "🌟 a shooting star"],
  twists: ["but everything was a dream", "and discovered a hidden power", "while time was running backwards", "as reality started glitching", "and made an unlikely friend", "but had to make a sacrifice", "and learned a valuable lesson", "while the world watched"],
};

const CHANNEL_NAME = "game-story-dice";

function StoryDiceGame({ localPlayer, sessionId, getPlayerName }) {
  const [gameState, setGameState] = useState("menu");
  const [rolledStory, setRolledStory] = useState(null);
  const [userStory, setUserStory] = useState("");
  const [remoteStory, setRemoteStory] = useState("");
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [localFinished, setLocalFinished] = useState(false);
  const [remoteFinished, setRemoteFinished] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [channel, setChannel] = useState(null);
  const localReadyRef = useRef(localReady);
  const localFinishedRef = useRef(localFinished);

  useEffect(() => {
    localReadyRef.current = localReady;
  }, [localReady]);

  useEffect(() => {
    localFinishedRef.current = localFinished;
  }, [localFinished]);

  const remotePlayer = getOtherPlayer(localPlayer);
  const localPlayerName = getPlayerName(localPlayer);
  const remotePlayerName = getPlayerName(remotePlayer);
  const localEmoji = getPlayerMeta(localPlayer)?.emoji || "📖";
  const remoteEmoji = getPlayerMeta(remotePlayer)?.emoji || "📖";

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
          data: { 
            player: localPlayer, 
            ready: localReadyRef.current,
            finished: localFinishedRef.current 
          }
        })
      });
    });

    gameChannel.bind('player-joined', (data) => {
      if (data.player !== localPlayer) {
        setRemoteConnected(true);
        setRemoteReady(data.ready);
        if (data.finished) setRemoteFinished(true);
        fetch('/api/pusher/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: CHANNEL_NAME,
            event: 'presence-check',
            data: { 
              player: localPlayer, 
              ready: localReadyRef.current,
              finished: localFinishedRef.current
            }
          })
        });
      }
    });

    gameChannel.bind('presence-check', (data) => {
      if (data.player !== localPlayer) {
        setRemoteConnected(true);
        setRemoteReady(data.ready);
        if (data.finished) setRemoteFinished(true);
      }
    });

    gameChannel.bind('player-ready', (data) => {
      if (data.player !== localPlayer) setRemoteReady(data.ready);
    });

    gameChannel.bind('game-start', (data) => {
      setGameState("playing");
      setRolledStory(data.elements);
      setUserStory("");
      setRemoteStory("");
      setLocalFinished(false);
      setRemoteFinished(false);
    });

    gameChannel.bind('story-update', (data) => {
      if (data.player !== localPlayer) {
        setRemoteStory(data.story);
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
      const elements = {
        character: STORY_ELEMENTS.characters[Math.floor(Math.random() * STORY_ELEMENTS.characters.length)],
        setting: STORY_ELEMENTS.settings[Math.floor(Math.random() * STORY_ELEMENTS.settings.length)],
        object: STORY_ELEMENTS.objects[Math.floor(Math.random() * STORY_ELEMENTS.objects.length)],
        twist: STORY_ELEMENTS.twists[Math.floor(Math.random() * STORY_ELEMENTS.twists.length)],
      };
      
      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: 'game-start',
          data: { elements }
        })
      });
    }
  }, [localReady, remoteReady, localPlayer, gameState]);

  const handleFinish = () => {
    setLocalFinished(true);
    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: 'story-update',
        data: { player: localPlayer, story: userStory, finished: true }
      })
    });
  };

  // Sync story as user types
  useEffect(() => {
    if (gameState === "playing" && !localFinished) {
      const timer = setTimeout(() => {
        fetch('/api/pusher/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: CHANNEL_NAME,
            event: 'story-update',
            data: { player: localPlayer, story: userStory, finished: localFinished }
          })
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userStory, localFinished, gameState, localPlayer]);

  useEffect(() => {
    if (localFinished && remoteFinished && gameState === "playing") {
      setGameState("finished");
    }
  }, [localFinished, remoteFinished, gameState]);

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
              Story Dice
            </h1>
          </div>

          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-5 sm:p-6">
              <CardTitle className="text-center">
                <Users size={28} className="mx-auto mb-2 opacity-80" />
                <span className="text-xl sm:text-2xl font-black tracking-tight">Co-op Narrative</span>
                <p className="text-white/70 text-[10px] sm:text-xs font-medium mt-1">Roll the dice and weave a tale together.</p>
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
                 {localReady ? "WAITING FOR PARTNER..." : "READY TO WRITE! ✍️"}
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
                Story Arena
              </h1>
            </div>
            <div className="flex items-center gap-2 bg-[#fff0e8] px-4 py-2 rounded-full border border-[#ffae88]/30">
              <Users size={16} className="text-[#ab4400]" />
              <p className="text-xs font-bold text-[#ab4400] uppercase tracking-widest">
                Writing Live
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 pb-4">
             {/* Story Elements Panel */}
             <div className="lg:w-1/3 flex flex-col gap-3">
                <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-orange-50 overflow-hidden">
                   <CardHeader className="bg-[#ab4400] text-white py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">STORY ELEMENTS</p>
                   </CardHeader>
                   <CardContent className="p-4 space-y-3">
                      {[
                        { label: "CHARACTER", val: rolledStory?.character, color: "bg-orange-50 text-orange-700 border-orange-100" },
                        { label: "SETTING", val: rolledStory?.setting, color: "bg-blue-50 text-blue-700 border-blue-100" },
                        { label: "OBJECT", val: rolledStory?.object, color: "bg-amber-50 text-amber-700 border-amber-100" },
                        { label: "TWIST", val: rolledStory?.twist, color: "bg-pink-50 text-pink-700 border-pink-100" }
                      ].map((el, i) => (
                        <div key={i} className={`p-3 rounded-2xl border-2 ${el.color}`}>
                           <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">{el.label}</p>
                           <p className="font-bold text-sm">{el.val}</p>
                        </div>
                      ))}
                   </CardContent>
                </Card>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                   <ScrollText size={48} className="text-[#9d4867] opacity-20 mb-4" />
                   <p className="text-xs font-bold text-[#9d4867] uppercase tracking-widest italic opacity-40">Write your masterpiece...</p>
                </div>
             </div>

             {/* Writing Area */}
             <div className="lg:w-2/3 flex flex-col gap-4">
                <div className="flex-1 grid grid-rows-2 gap-4">
                   {/* Local Writing Area */}
                   <Card className="border-none shadow-xl bg-white rounded-3xl border-2 border-orange-100 flex flex-col overflow-hidden">
                      <CardHeader className="py-2 px-4 border-b border-orange-50 flex flex-row items-center justify-between">
                         <span className="text-xs font-black text-[#ab4400]">{localEmoji} YOUR STORY</span>
                         <Button 
                          onClick={handleFinish} 
                          disabled={localFinished}
                          className={`h-7 text-[10px] font-black px-4 rounded-full ${localFinished ? "bg-green-500" : "bg-[#ab4400] hover:bg-[#973b00]"}`}
                         >
                           {localFinished ? "FINISHED ✅" : "FINISH STORY"}
                         </Button>
                      </CardHeader>
                      <CardContent className="p-0 flex-1 relative">
                         <textarea 
                           value={userStory}
                           onChange={(e) => setUserStory(e.target.value)}
                           disabled={localFinished}
                           placeholder="Once upon a time..."
                           className="w-full h-full p-4 text-sm font-medium text-[#6a2700] resize-none focus:outline-none custom-scrollbar"
                         />
                         {localFinished && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />}
                      </CardContent>
                   </Card>

                   {/* Remote Watching Area */}
                   <Card className="border-none shadow-xl bg-stone-50/50 rounded-3xl border-2 border-dashed border-stone-200 flex flex-col overflow-hidden">
                      <CardHeader className="py-2 px-4 border-b border-stone-200 flex flex-row items-center justify-between">
                         <span className="text-xs font-black text-stone-400">{remoteEmoji} {remotePlayerName.toUpperCase()}'S TALE</span>
                         {remoteFinished && <span className="text-[10px] font-black text-green-500">READY ✅</span>}
                      </CardHeader>
                      <CardContent className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                         <p className="text-sm font-medium text-stone-500 whitespace-pre-wrap italic">
                           {remoteStory || "Watching for ink on paper..."}
                         </p>
                      </CardContent>
                   </Card>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "finished") {
    return (
      <div className="flex flex-col items-center pt-2 p-4">
        <div className="max-w-4xl w-full">
          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-8 text-center">
              <Sparkles size={48} className="mx-auto mb-4 text-yellow-300 animate-pulse" />
              <CardTitle className="text-3xl font-black tracking-tight">The Library of Tales</CardTitle>
              <p className="text-white/70 font-medium mt-2">Both of your stories are complete.</p>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 font-black text-[#ab4400]">
                     {localEmoji} {localPlayerName}
                   </div>
                   <div className="p-6 bg-white rounded-3xl border-4 border-orange-50 shadow-inner min-h-[300px] text-sm text-[#6a2700] leading-relaxed whitespace-pre-wrap">
                      {userStory || "No story was written..."}
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center gap-2 font-black text-[#9d4867]">
                     {remoteEmoji} {remotePlayerName}
                   </div>
                   <div className="p-6 bg-white rounded-3xl border-4 border-pink-50 shadow-inner min-h-[300px] text-sm text-[#6a2700] leading-relaxed whitespace-pre-wrap">
                      {remoteStory || "No story was written..."}
                   </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full py-8 text-xl font-black bg-[#ab4400] text-white rounded-2xl shadow-lg hover:bg-[#973b00] transition-all active:scale-95 shadow-[#ab4400]/20"
                >
                  TELL ANOTHER 🔄
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

export default function StoryDice() {
  return (
    <LocalMultiplayerWrapper gameId="story-dice" gameName="Story Dice">
      {(props) => <StoryDiceGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
