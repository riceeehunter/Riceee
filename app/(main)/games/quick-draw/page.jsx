"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pencil, Clock, Eraser, RotateCcw, Users, Crown, Palette, Brush } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer, getPlayerMeta } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

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
  const localEmoji = getPlayerMeta(localPlayer)?.emoji || "🎨";
  const remoteEmoji = getPlayerMeta(remotePlayer)?.emoji || "🎨";

  const CHANNEL_NAME = `game-quick-draw-${sessionId}`;

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
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 pb-20 sm:pb-4">
        <div className="max-w-xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/games">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className={`${plusJakarta.className} text-2xl sm:text-3xl font-bold text-[#ab4400]`}>
              Quick Draw
            </h1>
          </div>

          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-5 sm:p-6">
              <CardTitle className="text-center">
                <Palette size={28} className="mx-auto mb-2 opacity-80" />
                <span className="text-xl sm:text-2xl font-black tracking-tight">Art Battle!</span>
                <p className="text-white/70 text-[10px] sm:text-xs font-medium mt-1">Both draw the same prompt live.</p>
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
                 {localReady ? "WAITING FOR PARTNER..." : "LET'S DRAW! 🎨"}
               </Button>
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
          <div className="flex items-center justify-between mb-2 sm:mb-4 px-2">
            <div className="flex items-center gap-2">
              <Link href="/games">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <h1 className={`${plusJakarta.className} text-lg sm:text-xl font-bold text-[#ab4400]`}>
                Art Arena
              </h1>
            </div>
            <div className="flex flex-col items-center">
               <p className="text-[8px] sm:text-[10px] font-bold text-[#9d4867] uppercase tracking-widest">PROMPT:</p>
               <h2 className="text-sm sm:text-lg font-black text-[#ab4400] leading-none">{currentPrompt}</h2>
            </div>
            <div className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border ${timeLeft < 10 ? "bg-red-50 border-red-200 animate-pulse text-red-600" : "bg-[#fff0e8] border-[#ffae88]/30 text-[#ab4400]"}`}>
              <Clock size={14} />
              <span className="text-[10px] sm:text-sm font-black uppercase tracking-wider">{timeLeft}s</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 flex-1 min-h-0 pb-4">
            {/* Local Canvas */}
            <Card className="border-none shadow-xl flex flex-col bg-white overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-orange-100 relative">
               <CardHeader className="bg-orange-50/50 py-1.5 sm:py-2 border-b border-orange-100 px-3">
                  <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
                    <span className="flex items-center gap-2 font-bold text-[#6a2700] text-[10px] sm:text-sm whitespace-nowrap">
                      {localEmoji} YOU
                    </span>
                    <div className="flex gap-1 items-center">
                      {COLORS.map(c => (
                        <button 
                          key={c} 
                          onClick={() => setSelectedColor(c)}
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 ${selectedColor === c ? "border-[#ab4400] scale-110" : "border-white"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <Button variant="ghost" size="icon" onClick={clearCanvas} className="w-5 h-5 sm:w-6 sm:h-6 ml-1">
                        <RotateCcw size={12} />
                      </Button>
                    </div>
                  </div>
               </CardHeader>
               <CardContent className="p-0 flex-1 relative bg-white">
                  <canvas 
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full cursor-crosshair touch-none"
                  />
                  {localRoundComplete && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                       <div className="bg-[#ab4400] text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full text-xs sm:text-base font-black shadow-xl">
                         SAVED! ✨
                       </div>
                    </div>
                  )}
               </CardContent>
            </Card>

            {/* Remote Canvas */}
            <Card className="border-none shadow-xl flex flex-col bg-white overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-pink-100 relative h-32 sm:h-auto">
               <CardHeader className="bg-pink-50/50 py-1 sm:py-2 border-b border-pink-100 px-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-[#6a2700] opacity-70 text-[10px] sm:text-sm">
                      {remoteEmoji} {remotePlayerName.split(' ')[0]}
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-bold text-[#9d4867] uppercase tracking-widest">Watching...</span>
                  </div>
               </CardHeader>
               <CardContent className="p-0 flex-1 bg-white overflow-hidden">
                  <canvas 
                    ref={remoteCanvasRef}
                    className="w-full h-full pointer-events-none"
                  />
                  {remoteRoundComplete && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                       <div className="bg-[#9d4867] text-white px-4 py-2 rounded-full text-[10px] font-black shadow-xl">
                         DONE! 🎨
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
    return (
      <div className="flex flex-col items-center pt-2 p-4">
        <div className="max-w-4xl w-full">
          <Card className="border-none shadow-[0_20px_60px_rgba(171,68,0,0.12)] overflow-visible rounded-3xl">
            <CardHeader className="bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white p-8 text-center">
              <Trophy size={48} className="mx-auto mb-4 text-yellow-300" />
              <CardTitle className="text-3xl font-black tracking-tight">The Art Gallery</CardTitle>
              <p className="text-white/70 font-medium mt-2">Check out your masterpieces!</p>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 font-black text-[#ab4400]">
                     {localEmoji} {localPlayerName}
                   </div>
                   <div className="aspect-square bg-white rounded-2xl border-4 border-orange-100 shadow-inner overflow-hidden">
                      {drawings[0] && <img src={drawings[0].image} className="w-full h-full object-contain" alt="Local masterpiece" />}
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center gap-2 font-black text-[#9d4867]">
                     {remoteEmoji} {remotePlayerName}
                   </div>
                   <div className="aspect-square bg-white rounded-2xl border-4 border-pink-100 shadow-inner overflow-hidden">
                      {remoteDrawings[0] && <img src={remoteDrawings[0].image} className="w-full h-full object-contain" alt="Remote masterpiece" />}
                   </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full py-8 text-xl font-black bg-[#ab4400] text-white rounded-2xl shadow-lg hover:bg-[#973b00] transition-all active:scale-95 shadow-[#ab4400]/20"
                >
                  DRAW AGAIN 🔄
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

export default function QuickDraw() {
  return (
    <LocalMultiplayerWrapper gameId="quick-draw" gameName="Quick Draw">
      {(props) => <QuickDrawGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
