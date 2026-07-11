"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Check, RotateCcw } from "lucide-react";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";
import {
  LobbyScreen,
  GameFrame,
  BackToArena,
  PlayerDisc,
} from "../_components/game-ui";

const STORY_ELEMENTS = {
  characters: ["🧙‍♂️ A wizard", "🦸‍♀️ A superhero", "🐉 A dragon", "👸 A princess", "🤖 A robot", "🧛‍♂️ A vampire", "🦊 A clever fox", "👻 A friendly ghost"],
  settings: ["🏰 in a castle", "🌋 on a volcano", "🏝️ on a desert island", "🚀 in space", "🌲 in an enchanted forest", "🏙️ in a futuristic city", "🏔️ on a mountain peak", "🌊 under the sea"],
  objects: ["💎 a magical gem", "📜 an ancient scroll", "⚔️ a legendary sword", "🔮 a crystal ball", "🗝️ a mysterious key", "📱 a time-traveling phone", "🎭 a cursed mask", "🌟 a shooting star"],
  twists: ["but everything was a dream", "and discovered a hidden power", "while time was running backwards", "as reality started glitching", "and made an unlikely friend", "but had to make a sacrifice", "and learned a valuable lesson", "while the world watched"],
};


function StoryDiceGame({ localPlayer, sessionId, getPlayerName }) {
  const CHANNEL_NAME = sessionId;
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
      <LobbyScreen
        gameTitle="Story Dice"
        tagline="Roll five dice, write one ridiculous story together."
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

  if (gameState === "playing") {
    const elements = [
      { label: "Character", val: rolledStory?.character },
      { label: "Setting", val: rolledStory?.setting },
      { label: "Object", val: rolledStory?.object },
      { label: "Twist", val: rolledStory?.twist },
    ];

    return (
      <GameFrame size="max-w-5xl">
        <div className="mb-5 flex items-center justify-between">
          <BackToArena />
          <span className="rounded-full border border-[#ffdfcf] bg-[#fff5ef] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ab4400]">
            Both writing live
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
          {/* The prompt the dice dealt */}
          <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
            <div className="border-b border-[#f5f2ee] px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">The dice dealt</p>
              <h2 className={`${plusJakarta.className} mt-1 text-xl font-extrabold tracking-tight text-[#393832]`}>
                Work all four in.
              </h2>
            </div>
            <div className="space-y-2.5 p-5">
              {elements.map((el) => (
                <div key={el.label} className="rounded-2xl border border-[#efe9e2] bg-[#fdfaf7] px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a09d95]">{el.label}</p>
                  <p className={`${plusJakarta.className} mt-0.5 text-sm font-bold text-[#393832]`}>{el.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Both stories */}
          <div className="grid grid-rows-2 gap-4">
            <div className="flex flex-col overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
              <div className="flex items-center justify-between border-b border-[#f5f2ee] px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <PlayerDisc name={localPlayerName} kind="local" size="sm" />
                  <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>Your story</p>
                </div>
                <button
                  onClick={handleFinish}
                  disabled={localFinished}
                  className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-all active:scale-95 ${
                    localFinished
                      ? "bg-[#f5f2ee] text-[#a09d95]"
                      : "bg-[#ab4400] text-white hover:bg-[#973b00]"
                  }`}
                >
                  {localFinished ? "Locked in" : "Finish"}
                </button>
              </div>
              <div className="relative flex-1">
                <textarea
                  value={userStory}
                  onChange={(e) => setUserStory(e.target.value)}
                  disabled={localFinished}
                  placeholder="Once upon a time…"
                  className="custom-scrollbar h-full min-h-[180px] w-full resize-none break-words bg-transparent p-5 text-sm leading-relaxed text-[#393832] placeholder:text-[#c9c5bd] focus:outline-none"
                />
                {localFinished && <div className="absolute inset-0 bg-white/50" />}
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-[2rem] border border-dashed border-[#e8e3dc] bg-[#fdfaf7]">
              <div className="flex items-center justify-between border-b border-[#f0ebe4] px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <PlayerDisc name={remotePlayerName} kind="remote" size="sm" dim={!remoteStory} />
                  <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>
                    {remotePlayerName.split(" ")[0]}&apos;s story
                  </p>
                </div>
                {remoteFinished && (
                  <span className="flex items-center gap-1 rounded-full bg-[#9d4867] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                    <Check className="h-3 w-3" />
                    Done
                  </span>
                )}
              </div>
              <div className="custom-scrollbar min-h-[180px] flex-1 overflow-y-auto p-5">
                <p className="whitespace-pre-wrap break-words text-sm italic leading-relaxed text-[#66645e]">
                  {remoteStory || "Nothing on their page yet…"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </GameFrame>
    );
  }

  if (gameState === "finished") {
    return (
      <GameFrame size="max-w-4xl">
        <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
          <div className="border-b border-[#f5f2ee] px-7 pb-7 pt-9 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">Same prompt, two minds</p>
            <h1 className={`${plusJakarta.className} mt-3 text-4xl font-extrabold tracking-tighter text-[#393832] sm:text-5xl`}>
              Read them side by side.
            </h1>
            <p className="mt-3 text-sm text-[#66645e]">No scores here. Just evidence of how differently you two think.</p>
          </div>

          <div className="space-y-6 p-6 sm:p-7">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <PlayerDisc name={localPlayerName} kind="local" size="sm" />
                  <p className={`${plusJakarta.className} text-sm font-bold text-[#393832]`}>{localPlayerName}</p>
                </div>
                <div className="min-h-[260px] whitespace-pre-wrap rounded-3xl border border-[#ffdfcf] bg-[#fff9f5] p-6 text-sm leading-relaxed text-[#393832]">
                  {userStory || "Wrote nothing. Bold choice."}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <PlayerDisc name={remotePlayerName} kind="remote" size="sm" />
                  <p className={`${plusJakarta.className} text-sm font-bold text-[#393832]`}>{remotePlayerName}</p>
                </div>
                <div className="min-h-[260px] whitespace-pre-wrap rounded-3xl border border-[#ffd9e2] bg-[#fffafc] p-6 text-sm leading-relaxed text-[#393832]">
                  {remoteStory || "Wrote nothing. Bold choice."}
                </div>
              </div>
            </div>

            <div className="mx-auto flex max-w-sm flex-col gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#ab4400] py-5 text-base font-extrabold tracking-tight text-white shadow-[0_14px_30px_rgba(171,68,0,0.28)] transition-all hover:bg-[#973b00] active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" />
                Roll a new prompt
              </button>
              <Link
                href="/games"
                className="w-full rounded-2xl py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[#a09d95] transition-colors hover:text-[#ab4400]"
              >
                Back to Arena
              </Link>
            </div>
          </div>
        </div>
      </GameFrame>
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
