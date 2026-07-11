"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Clock, RotateCcw } from "lucide-react";
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

const DRAWING_PROMPTS = [
  "Draw a cat riding a bicycle 🚴",
  "Draw a pizza with sunglasses 🍕",
  "Draw an alien drinking coffee ☕",
  "Draw a robot dancing 🤖",
  "Draw a superhero doing laundry 🦸",
  "Draw a dragon eating ice cream 🍦",
  "Draw a ninja playing guitar 🎸",
  "Draw a unicorn wearing sneakers 👟",
  "Draw a pirate in a hot air balloon 🎈",
  "Draw a dinosaur skateboarding 🛹",
  "Draw a wizard cooking pasta 🍝",
  "Draw a mermaid taking a selfie 🤳",
  "Draw an astronaut walking a dog 🐕",
  "Draw a bear doing yoga 🧘",
  "Draw a chicken driving a car 🚗",
];

const COLORS = [
  "#ab4400", "#9d4867", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFA500", "#800080"
];

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function QuickDrawGame({ localPlayer, sessionId, getPlayerName }) {
  const [gameState, setGameState] = useState("menu");
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [round, setRound] = useState(1);
  const [drawings, setDrawings] = useState([]);
  const [remoteDrawings, setRemoteDrawings] = useState([]);
  const [localRoundComplete, setLocalRoundComplete] = useState(false);
  const [remoteRoundComplete, setRemoteRoundComplete] = useState(false);
  
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const remoteCanvasRef = useRef(null);
  const remoteCtxRef = useRef(null);
  const [channel, setChannel] = useState(null);
  const localReadyRef = useRef(localReady);

  useEffect(() => {
    localReadyRef.current = localReady;
  }, [localReady]);

  const localStrokeRef = useRef({ last: null, prev: null });
  const remoteStrokeRef = useRef({ last: null, prev: null });
  const lastSentAtRef = useRef(0);

  const remotePlayer = getOtherPlayer(localPlayer);
  const localPlayerName = getPlayerName(localPlayer);
  const remotePlayerName = getPlayerName(remotePlayer);

  const CHANNEL_NAME = sessionId;

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
      setCurrentPrompt(data.prompt);
      setTimeLeft(60);
      setRound(1);
      setDrawings([]);
      setRemoteDrawings([]);
      setLocalRoundComplete(false);
      setRemoteRoundComplete(false);
      
      setTimeout(() => {
        setupCanvas(canvasRef.current, ctxRef);
        setupCanvas(remoteCanvasRef.current, remoteCtxRef);
      }, 100);
    });

    gameChannel.bind('drawing-stroke', (data) => {
      if (data.player !== localPlayer && remoteCtxRef.current) {
        const ctx = remoteCtxRef.current;
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (data.type === "start") {
          remoteStrokeRef.current.last = { x: data.x, y: data.y };
          ctx.beginPath();
          ctx.moveTo(data.x, data.y);
        } else if (data.type === "draw") {
          const last = remoteStrokeRef.current.last;
          const next = { x: data.x, y: data.y };
          if (last) {
            const mid = midpoint(last, next);
            ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
            ctx.stroke();
            remoteStrokeRef.current.last = next;
          }
        }
      }
    });

    gameChannel.bind('canvas-clear', (data) => {
      if (data.player !== localPlayer && remoteCtxRef.current && remoteCanvasRef.current) {
        const ctx = remoteCtxRef.current;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, remoteCanvasRef.current.width, remoteCanvasRef.current.height);
      }
    });

    gameChannel.bind('round-complete', (data) => {
      if (data.player !== localPlayer) {
        setRemoteRoundComplete(true);
        // Save remote drawing if provided
        if (data.image) {
          setRemoteDrawings(prev => [...prev, { image: data.image, round: data.round }]);
        }
      }
    });

    return () => {
      gameChannel.unbind_all();
      pusher.unsubscribe(CHANNEL_NAME);
      pusher.disconnect();
    };
  }, [localPlayer, sessionId]);

  const setupCanvas = (canvas, ctxRef) => {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctxRef.current = ctx;
  };

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
      const prompt = DRAWING_PROMPTS[Math.floor(Math.random() * DRAWING_PROMPTS.length)];
      fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: 'game-start',
          data: { prompt }
        })
      });
    }
  }, [localReady, remoteReady, localPlayer, gameState]);

  const startDrawing = (e) => {
    if (localRoundComplete || gameState !== "playing") return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    setIsDrawing(true);
    localStrokeRef.current.last = { x, y };
    
    const ctx = ctxRef.current;
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(x, y);

    broadcastStroke("start", x, y);
  };

  const draw = (e) => {
    if (!isDrawing || localRoundComplete) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    
    const last = localStrokeRef.current.last;
    const next = { x, y };
    const mid = midpoint(last, next);
    
    const ctx = ctxRef.current;
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
    ctx.stroke();
    
    localStrokeRef.current.last = next;
    broadcastStroke("draw", x, y);
  };

  const stopDrawing = () => setIsDrawing(false);

  const broadcastStroke = (type, x, y) => {
    const now = Date.now();
    if (type === "draw" && now - lastSentAtRef.current < 20) return;
    lastSentAtRef.current = now;

    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: 'drawing-stroke',
        data: { player: localPlayer, type, x, y, color: selectedColor, size: brushSize }
      })
    });
  };

  const clearCanvas = () => {
    const ctx = ctxRef.current;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: 'canvas-clear',
        data: { player: localPlayer }
      })
    });
  };

  const handleFinishRound = () => {
    setLocalRoundComplete(true);
    const image = canvasRef.current.toDataURL("image/jpeg", 0.5);
    setDrawings(prev => [...prev, { image, round }]);
    
    fetch('/api/pusher/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: 'round-complete',
        data: { player: localPlayer, image, round }
      })
    });
  };

  useEffect(() => {
    if (localRoundComplete && remoteRoundComplete) {
      if (round < 1) { // We'll just do 1 round for simplicity/performance for now
        // Start next round logic
      } else {
        setGameState("finished");
      }
    }
  }, [localRoundComplete, remoteRoundComplete, round]);

  // Timer
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === "playing" && !localRoundComplete) {
      handleFinishRound();
    }
  }, [timeLeft, gameState, localRoundComplete]);

  if (gameState === "menu") {
    return (
      <LobbyScreen
        gameTitle="Quick Draw"
        tagline="One canvas, two pens, zero artistic dignity."
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
    const lowTime = timeLeft < 10;
    return (
      <GameFrame size="max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <BackToArena />
          <div className="min-w-0 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#9d4867]/70">Draw this</p>
            <h2 className={`${plusJakarta.className} truncate text-base font-extrabold tracking-tight text-[#393832] sm:text-lg`}>
              {currentPrompt}
            </h2>
          </div>
          <span
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold tabular-nums transition-colors ${
              lowTime
                ? "animate-pulse border-[#9d4867] bg-[#9d4867] text-white"
                : "border-[#ffdfcf] bg-[#fff5ef] text-[#ab4400]"
            }`}
          >
            <Clock size={13} />
            {timeLeft}s
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Your canvas */}
          <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
            <div className="flex items-center justify-between gap-2 border-b border-[#f5f2ee] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <PlayerDisc name={localPlayerName} kind="local" size="sm" />
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>You</p>
              </div>
              <div className="flex items-center gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`h-5 w-5 rounded-full transition-transform ${
                      selectedColor === c ? "scale-110 ring-2 ring-[#393832] ring-offset-2" : "ring-1 ring-[#efe9e2]"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button
                  onClick={clearCanvas}
                  className="ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-[#efe9e2] text-[#a09d95] transition-colors hover:border-[#ffba99] hover:text-[#ab4400]"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>
            <div className="relative aspect-[4/3] bg-white">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="h-full w-full cursor-crosshair touch-none"
              />
              {localRoundComplete && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <span className="rounded-full bg-[#ab4400] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                    Locked in
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Their canvas */}
          <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-dashed border-[#e8e3dc] bg-white">
            <div className="flex items-center justify-between border-b border-[#f0ebe4] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <PlayerDisc name={remotePlayerName} kind="remote" size="sm" />
                <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>
                  {remotePlayerName.split(" ")[0]}
                </p>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a09d95]">Live</span>
            </div>
            <div className="relative aspect-[4/3] bg-white">
              <canvas ref={remoteCanvasRef} className="pointer-events-none h-full w-full" />
              {remoteRoundComplete && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <span className="rounded-full bg-[#9d4867] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                    Done
                  </span>
                </div>
              )}
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
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">The Gallery</p>
            <h1 className={`${plusJakarta.className} mt-3 text-4xl font-extrabold tracking-tighter text-[#393832] sm:text-5xl`}>
              Same prompt. Different crimes.
            </h1>
            <p className="mt-3 text-sm text-[#66645e]">
              The prompt was <span className="font-semibold text-[#393832]">{currentPrompt}</span>. You be the judge.
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-7">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <PlayerDisc name={localPlayerName} kind="local" size="sm" />
                  <p className={`${plusJakarta.className} text-sm font-bold text-[#393832]`}>{localPlayerName}</p>
                </div>
                <div className="aspect-square overflow-hidden rounded-3xl border border-[#ffdfcf] bg-white">
                  {drawings[0] && (
                    <img src={drawings[0].image} className="h-full w-full object-contain" alt={`${localPlayerName}'s drawing`} />
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <PlayerDisc name={remotePlayerName} kind="remote" size="sm" />
                  <p className={`${plusJakarta.className} text-sm font-bold text-[#393832]`}>{remotePlayerName}</p>
                </div>
                <div className="aspect-square overflow-hidden rounded-3xl border border-[#ffd9e2] bg-white">
                  {remoteDrawings[0] && (
                    <img src={remoteDrawings[0].image} className="h-full w-full object-contain" alt={`${remotePlayerName}'s drawing`} />
                  )}
                </div>
              </div>
            </div>

            <div className="mx-auto flex max-w-sm flex-col gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#ab4400] py-5 text-base font-extrabold tracking-tight text-white shadow-[0_14px_30px_rgba(171,68,0,0.28)] transition-all hover:bg-[#973b00] active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" />
                New prompt
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

export default function QuickDraw() {
  return (
    <LocalMultiplayerWrapper gameId="quick-draw" gameName="Quick Draw">
      {(props) => <QuickDrawGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
