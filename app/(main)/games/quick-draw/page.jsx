"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Clock, Eraser, RotateCcw, Users, Crown } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS } from "@/lib/constants/players";

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
  "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", 
  "#FF00FF", "#00FFFF", "#FFA500", "#800080", "#FFC0CB"
];

function getChannelName(sessionId) {
  return `game-quick-draw-${sessionId}`;
}

function clampDpr(dpr) {
  if (!Number.isFinite(dpr)) return 1;
  return Math.min(2, Math.max(1, dpr));
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function QuickDrawGame({ localPlayer, sessionId, getPlayerName }) {
  const [pusherClient, setPusherClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [remotePlayer, setRemotePlayer] = useState(null);

  const channelName = useMemo(() => getChannelName(sessionId), [sessionId]);

  const [gameState, setGameState] = useState("lobby");
  const [matchId, setMatchId] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [round, setRound] = useState(1);
  const [drawings, setDrawings] = useState([]);
  const [localRoundComplete, setLocalRoundComplete] = useState(false);
  
  // Remote player state
  const [remoteDrawing, setRemoteDrawing] = useState(null);
  const [remoteDrawings, setRemoteDrawings] = useState([]);
  const [remoteGameState, setRemoteGameState] = useState("lobby");
  const [remoteRound, setRemoteRound] = useState(1);

  const [remoteConnected, setRemoteConnected] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const remoteCanvasRef = useRef(null);
  const remoteCtxRef = useRef(null);

  const matchIdRef = useRef(matchId);
  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  const isHost = localPlayer === PLAYER_IDS.ONE;
  const localPlayerName = getPlayerName(localPlayer);
  const remotePlayerName = remotePlayer ? getPlayerName(remotePlayer) : "Opponent";

  const localStrokeRef = useRef({ last: null, prev: null });
  const remoteStrokeRef = useRef({ last: null, prev: null });
  const lastSentAtRef = useRef(0);

  // Initialize Pusher
  useEffect(() => {
    if (!localPlayer) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const gameChannel = pusher.subscribe(channelName);
    setPusherClient(pusher);
    setChannel(gameChannel);

    console.log(`[${localPlayer}] 🎨 Quick Draw initialized`);

    return () => {
      gameChannel.unsubscribe();
      pusher.disconnect();
    };
  }, [channelName, localPlayer]);

  const safeTrigger = useCallback(
    async (event, data, keepalive = false) => {
      try {
        await fetch("/api/pusher/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: channelName,
            event,
            data,
          }),
          keepalive,
        });
      } catch (err) {
        console.error(`[${localPlayer}] Failed to trigger ${event}`, err);
      }
    },
    [channelName, localPlayer]
  );

  // Listen for remote player
  useEffect(() => {
    if (!channel) return;

    channel.bind("pusher:subscription_succeeded", async () => {
      console.log(`[${localPlayer}] ✅ Subscribed to ${channelName}`);
      await safeTrigger("player-joined", { player: localPlayer, ts: Date.now() });
    });

    channel.bind("player-joined", (data) => {
      if (data?.player && data.player !== localPlayer) {
        console.log(`[${localPlayer}] 👋 ${data.player} joined`);
        setRemotePlayer(data.player);
        setRemoteConnected(true);
      }
    });

    channel.bind("player-ready", (data) => {
      if (data?.player === localPlayer) return;
      setRemoteConnected(true);
      setRemoteReady(Boolean(data?.ready));
    });

    channel.bind("game-start", (data) => {
      if (!data?.matchId || !data?.prompt) return;

      setRemoteConnected(true);
      matchIdRef.current = data.matchId;
      setMatchId(data.matchId);
      setCurrentPrompt(data.prompt);
      setTimeLeft(60);
      setRound(1);
      setDrawings([]);
      setRemoteDrawings([]);
      setSelectedColor(COLORS[0]);
      setBrushSize(3);
      setLocalReady(false);
      setRemoteReady(false);
      setGameState("playing");
    });

    channel.bind("prompt-sync", (data) => {
      if (data?.player === localPlayer) return;
      if (!data?.matchId || data.matchId !== matchIdRef.current) return;
      setCurrentPrompt(data.prompt);
      if (typeof data.round === "number") setRound(data.round);
      setTimeLeft(60);
      setGameState("playing");

      // Ensure both canvases are ready/cleared for the new round.
      setTimeout(() => {
        if (canvasRef.current && ctxRef.current) {
          const canvas = canvasRef.current;
          const ctx = ctxRef.current;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
        }
        if (remoteCanvasRef.current && remoteCtxRef.current) {
          const canvas = remoteCanvasRef.current;
          const ctx = remoteCtxRef.current;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
        }
      }, 50);
    });

    channel.bind("drawing-stroke", (data) => {
      if (!data?.matchId || data.matchId !== matchIdRef.current) return;
      if (data.player !== localPlayer && remoteCtxRef.current) {
        const ctx = remoteCtxRef.current;
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (data.type === "start") {
          remoteStrokeRef.current.prev = null;
          remoteStrokeRef.current.last = { x: data.x, y: data.y };
          ctx.beginPath();
          ctx.moveTo(data.x, data.y);
        } else if (data.type === "draw") {
          const last = remoteStrokeRef.current.last;
          const next = { x: data.x, y: data.y };
          if (!last) {
            ctx.beginPath();
            ctx.moveTo(next.x, next.y);
            remoteStrokeRef.current.last = next;
          } else {
            const mid = midpoint(last, next);
            ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
            ctx.stroke();
            remoteStrokeRef.current.prev = last;
            remoteStrokeRef.current.last = next;
          }
        }
      }
    });

    channel.bind("canvas-clear", (data) => {
      if (!data?.matchId || data.matchId !== matchIdRef.current) return;
      if (data.player !== localPlayer && remoteCanvasRef.current && remoteCtxRef.current) {
        const canvas = remoteCanvasRef.current;
        const ctx = remoteCtxRef.current;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      }
    });

    channel.bind("round-complete", (data) => {
      if (!data?.matchId || data.matchId !== matchIdRef.current) return;
      if (data.player !== localPlayer) {
        // Do not transfer images over Pusher (payloads can be too large).
        // We snapshot the canvases locally once both players finish the round.
        setRemoteGameState(data.gameState);
        setRemoteRound(data.round);
      }
    });

    channel.bind("game-state", (data) => {
      if (!data?.matchId || data.matchId !== matchIdRef.current) return;
      if (data.player !== localPlayer) {
        setRemoteGameState(data.gameState);
        setRemoteRound(data.round);
      }
    });

    return () => {
      channel.unbind_all();
    };
  }, [channel, channelName, localPlayer, safeTrigger]);

  // Initialize canvases
  useEffect(() => {
    if (gameState === "playing") {
      const setup = (canvas, ctxDestRef) => {
        const dpr = clampDpr(typeof window !== "undefined" ? window.devicePixelRatio : 1);
        const cssWidth = canvas.offsetWidth;
        const cssHeight = canvas.offsetHeight;
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);

        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, cssWidth, cssHeight);
        ctxDestRef.current = ctx;
      };

      if (canvasRef.current) setup(canvasRef.current, ctxRef);
      if (remoteCanvasRef.current) setup(remoteCanvasRef.current, remoteCtxRef);
    }
  }, [gameState]);

  // Timer
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === "playing") {
      finishRound();
    }
  }, [timeLeft, gameState]);

  // Broadcast game state every 5 seconds
  useEffect(() => {
    if (gameState !== "lobby" && channel && matchId) {
      const interval = setInterval(async () => {
        await safeTrigger("game-state", {
          matchId,
          player: localPlayer,
          gameState,
          round,
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [gameState, round, channel, localPlayer, matchId, safeTrigger]);

  const resetToLobby = useCallback(async () => {
    setIsDrawing(false);
    localStrokeRef.current.prev = null;
    localStrokeRef.current.last = null;
    remoteStrokeRef.current.prev = null;
    remoteStrokeRef.current.last = null;

    matchIdRef.current = null;
    setMatchId(null);
    setCurrentPrompt("");
    setTimeLeft(60);
    setRound(1);
    setDrawings([]);
    setRemoteDrawings([]);
    setRemoteGameState("lobby");
    setRemoteRound(1);
    setLocalRoundComplete(false);
    setSelectedColor(COLORS[0]);
    setBrushSize(3);
    setGameState("lobby");

    setLocalReady(false);
    setRemoteReady(false);
    await safeTrigger("player-ready", { player: localPlayer, ready: false, ts: Date.now() });
  }, [localPlayer, safeTrigger]);

  const toggleReady = async () => {
    const next = !localReady;
    setLocalReady(next);
    await safeTrigger("player-ready", { player: localPlayer, ready: next, ts: Date.now() });
  };

  const hostStartGame = async () => {
    if (!isHost) return;
    if (!remotePlayer || !remoteConnected || !localReady || !remoteReady) return;
    if (gameState !== "lobby") return;

    const prompt = DRAWING_PROMPTS[Math.floor(Math.random() * DRAWING_PROMPTS.length)];
    const nextMatchId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    matchIdRef.current = nextMatchId;
    setMatchId(nextMatchId);
    setCurrentPrompt(prompt);
    setTimeLeft(60);
    setRound(1);
    setDrawings([]);
    setRemoteDrawings([]);
    setLocalRoundComplete(false);
    setSelectedColor(COLORS[0]);
    setBrushSize(3);
    setGameState("playing");
    setLocalReady(false);
    setRemoteReady(false);

    await safeTrigger("game-start", { matchId: nextMatchId, prompt, ts: Date.now() });

    setTimeout(() => {
      if (canvasRef.current) clearCanvas(nextMatchId);
      if (remoteCanvasRef.current && remoteCtxRef.current) {
        const canvas = remoteCanvasRef.current;
        const ctx = remoteCtxRef.current;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      }
    }, 100);
  };

  const triggerStroke = useCallback(
    (type, x, y) => {
      if (!channel || !matchIdRef.current) return;
      // Throttle network to keep drawing smooth.
      const now = performance.now();
      if (type === "draw" && now - lastSentAtRef.current < 16) return;
      lastSentAtRef.current = now;
      // Fire-and-forget (do not await).
      safeTrigger("drawing-stroke", {
        matchId: matchIdRef.current,
        player: localPlayer,
        type,
        x,
        y,
        color: selectedColor,
        size: brushSize,
      });
    },
    [brushSize, channel, localPlayer, safeTrigger, selectedColor]
  );

  const getPointFromClient = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const getPoint = (e) => getPointFromClient(e.clientX, e.clientY);

  const startStrokeAt = (p) => {
    if (!p) return;
    if (gameState !== "playing" || !ctxRef.current) return;
    if (!matchIdRef.current) return;
    if (localRoundComplete) return;

    localStrokeRef.current.prev = null;
    localStrokeRef.current.last = p;

    const ctx = ctxRef.current;
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);

    setIsDrawing(true);
    triggerStroke("start", p.x, p.y);
  };

  const continueStrokeAt = (next) => {
    if (!next) return;
    if (!isDrawing || !ctxRef.current) return;
    if (localRoundComplete) return;
    const last = localStrokeRef.current.last;
    const ctx = ctxRef.current;

    if (!last) {
      ctx.beginPath();
      ctx.moveTo(next.x, next.y);
      localStrokeRef.current.last = next;
      triggerStroke("start", next.x, next.y);
      return;
    }

    const mid = midpoint(last, next);
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
    ctx.stroke();

    localStrokeRef.current.prev = last;
    localStrokeRef.current.last = next;

    triggerStroke("draw", next.x, next.y);
  };

  const startStroke = (e) => startStrokeAt(getPoint(e));
  const continueStroke = (e) => continueStrokeAt(getPoint(e));

  const handleTouchStart = (e) => {
    if (!e.touches?.length) return;
    e.preventDefault();
    const touch = e.touches[0];
    startStrokeAt(getPointFromClient(touch.clientX, touch.clientY));
  };

  const handleTouchMove = (e) => {
    if (!e.touches?.length) return;
    e.preventDefault();
    const touch = e.touches[0];
    continueStrokeAt(getPointFromClient(touch.clientX, touch.clientY));
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    endStroke();
  };

  const endStroke = () => {
    setIsDrawing(false);
    localStrokeRef.current.prev = null;
    localStrokeRef.current.last = null;
  };

  const clearCanvas = async (overrideMatchId = null) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    const mid = overrideMatchId || matchIdRef.current;
    if (!mid) return;
    await safeTrigger("canvas-clear", { matchId: mid, player: localPlayer });
  };

  const snapshotCanvas = (canvas) => {
    if (!canvas) return null;
    try {
      // JPEG keeps payload small + loads fast.
      return canvas.toDataURL("image/jpeg", 0.75);
    } catch {
      return null;
    }
  };

  const remoteDoneThisRound =
    remoteRound >= round && (remoteGameState === "between" || remoteGameState === "finished");

  const finalizeRoundIfReady = useCallback(() => {
    if (gameState !== "playing") return;
    if (!localRoundComplete) return;
    if (!remoteDoneThisRound) return;
    if (!canvasRef.current || !remoteCanvasRef.current) return;

    const localImg = snapshotCanvas(canvasRef.current);
    const remoteImg = snapshotCanvas(remoteCanvasRef.current);

    if (localImg) {
      setDrawings((prev) => prev.concat({ prompt: currentPrompt, image: localImg, round }));
    }
    if (remoteImg) {
      setRemoteDrawings((prev) => prev.concat({ prompt: currentPrompt, image: remoteImg, round }));
    }

    setLocalRoundComplete(false);
    setGameState(round < 3 ? "between" : "finished");
  }, [currentPrompt, gameState, localRoundComplete, remoteDoneThisRound, round]);

  const finishRound = async () => {
    if (localRoundComplete) return;
    const newState = round < 3 ? "between" : "finished";

    setLocalRoundComplete(true);
    setIsDrawing(false);

    if (matchIdRef.current) {
      await safeTrigger("round-complete", {
        matchId: matchIdRef.current,
        player: localPlayer,
        prompt: currentPrompt,
        round,
        gameState: newState,
      });
    }

    // If the opponent already finished, transition immediately.
    setTimeout(() => {
      finalizeRoundIfReady();
    }, 0);
  };

  useEffect(() => {
    finalizeRoundIfReady();
  }, [finalizeRoundIfReady, remoteGameState, remoteRound]);

  const nextRound = async () => {
    const prompt = DRAWING_PROMPTS[Math.floor(Math.random() * DRAWING_PROMPTS.length)];
    setCurrentPrompt(prompt);
    setTimeLeft(60);
    setRound(round + 1);
    setGameState("playing");
    setLocalRoundComplete(false);

    // Sync prompt
    if (matchIdRef.current) {
      await safeTrigger("prompt-sync", {
        matchId: matchIdRef.current,
        player: localPlayer,
        prompt,
        round: round + 1,
      });
    }

    setTimeout(() => {
      clearCanvas();
      if (remoteCanvasRef.current) {
        const canvas = remoteCanvasRef.current;
        const ctx = remoteCtxRef.current;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      }
    }, 100);
  };

  const playerColors = {
    [PLAYER_IDS.ONE]: { border: "border-orange-500", bg: "bg-orange-500/20", text: "text-orange-500" },
    [PLAYER_IDS.TWO]: { border: "border-pink-500", bg: "bg-pink-500/20", text: "text-pink-500" },
  };

  const localColor = playerColors[localPlayer] || playerColors[PLAYER_IDS.ONE];
  const remoteColor = playerColors[remotePlayer] || playerColors[PLAYER_IDS.TWO];
  const remoteName = remotePlayer ? remotePlayerName : "Opponent";
  const bothFinishedMatch = drawings.length >= 3 && remoteDrawings.length >= 3;

  if (gameState === "lobby") {
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
            <CardTitle className="text-3xl text-center">
              <Pencil className="inline mr-2 mb-1" size={32} />
              Quick Draw Battle
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="text-6xl mb-4">✏️</div>
            <h2 className="text-2xl font-bold">Draw Together in Real-Time!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Both draw the same prompt and see each other's art unfold live. Compare your masterpieces at the end!
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
              <div className={`p-4 rounded-lg border-2 ${localColor.border} ${localColor.bg}`}>
                <p className={`font-bold ${localColor.text}`}>{localPlayerName} (You)</p>
                <p className={`text-xs mt-1 ${localReady ? "text-green-700 font-bold" : "text-muted-foreground"}`}>
                  {localReady ? "Ready" : "Not ready"}
                </p>
              </div>
              <div className={`p-4 rounded-lg border-2 ${remoteColor.border} ${remoteColor.bg} ${remoteConnected ? "" : "opacity-60"}`}>
                <p className={`font-bold ${remoteColor.text}`}>{remotePlayerName}</p>
                <p className={`text-xs mt-1 ${remoteConnected ? (remoteReady ? "text-green-700 font-bold" : "text-muted-foreground") : "text-muted-foreground"}`}>
                  {remoteConnected ? (remoteReady ? "Ready" : "Not ready") : "Waiting..."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="p-4 bg-muted rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-bold">60 seconds</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-bold">Real-time</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Crown className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-bold">3 rounds</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={toggleReady} variant={localReady ? "outline" : "default"}>
                {localReady ? "Unready" : "I'm Ready"}
              </Button>
              <Button
                onClick={hostStartGame}
                size="lg"
                className="text-lg px-8"
                disabled={!isHost || !remoteConnected || !localReady || !remoteReady}
              >
                {isHost ? "Start Drawing! ✏️" : "Waiting for host to start..."}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {remoteConnected ? "Both ready → host starts." : "Open this game on the other device."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === "playing") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Link href="/games">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2" size={16} />
            Back to Games
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">Round {round}/3</CardTitle>
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Clock className="h-6 w-6" />
                <span className={timeLeft < 10 ? "text-red-500 animate-pulse" : ""}>
                  {timeLeft}s
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prompt */}
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">DRAW THIS:</p>
              <p className="text-xl font-bold">{currentPrompt}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Local Player Canvas */}
              <div className={`p-4 rounded-lg border-2 ${localColor.border} ${localColor.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-bold ${localColor.text}`}>{localPlayerName} (You)</span>
                </div>

                {localRoundComplete && (
                  <div className="mb-3 p-3 rounded-lg bg-muted text-sm text-center">
                    Waiting for {remoteName} to finish this round...
                  </div>
                )}

                {/* Drawing Tools */}
                <div className="flex flex-wrap gap-2 items-center bg-muted p-2 rounded-lg mb-3">
                  {/* Colors */}
                  <div className="flex gap-1 flex-wrap">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          selectedColor === color ? "border-primary scale-110 ring-2 ring-primary/50" : "border-border"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  
                  {/* Brush Size */}
                  <div className="flex items-center gap-1 text-xs">
                    <span>Size:</span>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-16"
                    />
                    <span className="w-4">{brushSize}</span>
                  </div>

                  <Button variant="outline" onClick={clearCanvas} size="sm" className="text-xs h-7">
                    <RotateCcw className="mr-1" size={12} />
                    Clear
                  </Button>
                </div>

                {/* Canvas */}
                <div className="border-2 rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      startStroke(e);
                    }}
                    onPointerMove={continueStroke}
                    onPointerUp={endStroke}
                    onPointerCancel={endStroke}
                    onPointerLeave={endStroke}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="w-full cursor-crosshair touch-none"
                    style={{ height: "360px" }}
                  />
                </div>

                <Button onClick={finishRound} className="w-full mt-3" disabled={localRoundComplete}>
                  {localRoundComplete ? "Submitted" : "Done! →"}
                </Button>
              </div>

              {/* Remote Player Canvas */}
              <div className={`p-4 rounded-lg border-2 ${remoteColor.border} ${remoteColor.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-bold ${remoteColor.text}`}>{remotePlayerName}</span>
                  <span className="text-sm text-muted-foreground">
                    {remoteGameState === "playing" ? "Drawing..." : "Waiting..."}
                  </span>
                </div>

                <div className="h-[52px]"></div>

                <div className="border-2 rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={remoteCanvasRef}
                    className="w-full"
                    style={{ height: "360px" }}
                  />
                </div>

                <div className="h-[52px] flex items-center justify-center text-sm text-muted-foreground">
                  {remoteDoneThisRound
                    ? "Opponent finished — syncing results..."
                    : "Watch their art unfold! 🎨"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === "between") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="text-center space-y-6 py-8">
            <div className="text-6xl">🎨</div>
            <h2 className="text-2xl font-bold">Nice Work!</h2>
            <p className="text-lg text-muted-foreground">
              Round {round} complete! Ready for the next challenge?
            </p>
            {isHost ? (
              <>
                <Button onClick={nextRound} size="lg" disabled={!remoteDoneThisRound}>
                  Round {round + 1} - Let's Go! 🚀
                </Button>
                <p className="text-sm text-muted-foreground">
                  {remoteDoneThisRound ? "Both finished — start the next round." : `Waiting for ${remoteName} to finish...`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Waiting for host to start the next round...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === "finished") {
    if (!bothFinishedMatch) {
      return (
        <div className="container mx-auto px-4 py-8 max-w-2xl flex items-center justify-center min-h-screen">
          <Card>
            <CardContent className="text-center space-y-6 py-8">
              <div className="text-6xl">🏁</div>
              <h2 className="text-2xl font-bold">Waiting for {remoteName}...</h2>
              <p className="text-sm text-muted-foreground">
                You finished all rounds. We'll show the side-by-side battle once both are done.
              </p>
              <Button onClick={resetToLobby} variant="outline">
                Back to Start
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/games">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2" size={16} />
            Back to Games
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-center">
              🏆 Battle Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <p className="text-lg text-center text-muted-foreground">
              Check out both masterpieces side by side! 🎨
            </p>

            {/* Side by Side Comparison */}
            <div className="space-y-6">
              {drawings.map((localDrawing, idx) => {
                const remoteDrawing = remoteDrawings.find(d => d.round === localDrawing.round);
                return (
                  <div key={idx} className="space-y-2">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="font-bold">Round {localDrawing.round}</p>
                      <p className="text-sm text-muted-foreground">{localDrawing.prompt}</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Local Player Drawing */}
                      <div className={`p-4 rounded-lg border-2 ${localColor.border} ${localColor.bg}`}>
                        <p className={`text-sm font-bold mb-2 ${localColor.text}`}>{localPlayerName}</p>
                        <div className="bg-white border-2 rounded overflow-hidden">
                          <img src={localDrawing.image} alt={`${localPlayerName} Round ${localDrawing.round}`} className="w-full" />
                        </div>
                      </div>

                      {/* Remote Player Drawing */}
                      {remoteDrawing && (
                        <div className={`p-4 rounded-lg border-2 ${remoteColor.border} ${remoteColor.bg}`}>
                          <p className={`text-sm font-bold mb-2 ${remoteColor.text}`}>{remoteName}</p>
                          <div className="bg-white border-2 rounded overflow-hidden">
                            <img src={remoteDrawing.image} alt={`${remoteName} Round ${remoteDrawing.round}`} className="w-full" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 justify-center flex-wrap pt-4">
              <Button onClick={resetToLobby} size="lg">
                Play Again! 🔄
              </Button>
              <Link href="/games">
                <Button variant="outline" size="lg">
                  Back to Games
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

export default function QuickDrawBattle() {
  return (
    <LocalMultiplayerWrapper
      gameId="quick-draw"
      gameName="Quick Draw Battle"
      hunterColor="from-orange-500 to-red-600"
      riceeeColor="from-pink-500 to-purple-600"
    >
      {(props) => <QuickDrawGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
