"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import {
  LobbyScreen,
  ResultScreen,
  GameFrame,
  BackToArena,
  TurnPill,
  PlayerDisc,
} from "../_components/game-ui";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

const BOARD_SIZE = 100;
// Lane-disciplined: short elements stay inside a single column; each column
// holds at most one climb and one drop in non-overlapping rows. Two "hero"
// pieces get their own channels — the long snake down columns 4–5, the long
// ladder up column 3 — so nothing clusters or crosses. Snake heads sit high in
// the left columns (98, 82, 81) to fill what used to be a sparse top-left.
const SNAKES = {
  95: 25, // long hero snake, drops the length of the board
  87: 54, // medium
  98: 78, 91: 71, 88: 68, 82: 62, 81: 61, 32: 12, // short
};
const LADDERS = {
  4: 84, // long hero ladder, climbs the full left side
  10: 31, 18: 38, 28: 48, 7: 27, 52: 72, 20: 40, 2: 22, // short
};

const P1 = "#ab4400"; // terracotta
const P2 = "#9d4867"; // rose
const HOP_MS = 120; // per-cell hop while stepping
const WIN_HOLD_MS = 1300; // let the winning token land before the result screen

/* Boustrophedon board: cell 1 bottom-left, 100 top-left. Returns the centre of
   a cell in a 0–100 square viewBox (x → right, y → down). */
function cellCenter(n) {
  const idx = Math.max(1, Math.min(BOARD_SIZE, n)) - 1;
  const row = Math.floor(idx / 10); // 0 = bottom
  const inRow = idx % 10;
  const col = row % 2 === 0 ? inRow : 9 - inRow;
  return { x: col * 10 + 5, y: (9 - row) * 10 + 5 };
}

/* Two rails + evenly spaced rungs between two cell centres. */
function ladderShapes(fromN, toN) {
  const a = cellCenter(fromN);
  const b = cellCenter(toN);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * 1.28; // perpendicular offset (rail half-width)
  const py = (dx / len) * 1.28;
  const rungs = Math.max(3, Math.round(len / 3.4)); // fine, evenly spaced rungs
  const lines = [];
  for (let i = 0; i <= rungs; i++) {
    const t = i / rungs;
    const cx = a.x + dx * t;
    const cy = a.y + dy * t;
    lines.push({ x1: cx + px, y1: cy + py, x2: cx - px, y2: cy - py });
  }
  return {
    rail1: { x1: a.x + px, y1: a.y + py, x2: b.x + px, y2: b.y + py },
    rail2: { x1: a.x - px, y1: a.y - py, x2: b.x - px, y2: b.y - py },
    rungs: lines,
    head: b,
  };
}

/* A real snake: a wavy centreline from head (high cell) to tail (low cell),
   turned into a filled body that is fat at the head and tapers to a point, plus
   the head orientation so we can add eyes and a forked tongue. */
function snakeBody(headN, tailN, girth = 1) {
  const h = cellCenter(headN);
  const t = cellCenter(tailN);
  const dx = t.x - h.x;
  const dy = t.y - h.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -(dy / len);
  const ny = dx / len;
  const waves = Math.max(2, Math.round(len / 16));
  const steps = 48;
  const amp = 1.05 + Math.min(0.85, len * 0.012); // longer snakes weave a little more

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const off = Math.sin(s * Math.PI * waves) * amp * (1 - s * 0.12);
    pts.push({ x: h.x + dx * s + nx * off, y: h.y + dy * s + ny * off, s });
  }

  const widthAt = (s) => (0.24 + 1.02 * Math.pow(1 - s, 1.3)) * girth; // slim, girth varies per snake
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const px = -(b.y - a.y) / tl;
    const py = (b.x - a.x) / tl;
    const w = widthAt(pts[i].s);
    left.push({ x: pts[i].x + px * w, y: pts[i].y + py * w });
    right.push({ x: pts[i].x - px * w, y: pts[i].y - py * w });
  }

  let d = `M ${left[0].x.toFixed(2)} ${left[0].y.toFixed(2)}`;
  for (let i = 1; i < left.length; i++) d += ` L ${left[i].x.toFixed(2)} ${left[i].y.toFixed(2)}`;
  for (let i = right.length - 1; i >= 0; i--) d += ` L ${right[i].x.toFixed(2)} ${right[i].y.toFixed(2)}`;
  d += " Z";

  const hlen = Math.hypot(pts[1].x - h.x, pts[1].y - h.y) || 1;
  const hdir = { x: (pts[1].x - h.x) / hlen, y: (pts[1].y - h.y) / hlen };
  return { d, head: h, hdir };
}

function SnakeArt({ body, seed = 0 }) {
  const { d, head, hdir } = body;
  // hdir points from the head down into the body; the face looks the other way,
  // out of the mouth and away from the body.
  const fx = -hdir.x;
  const fy = -hdir.y;
  const sx = -hdir.y; // sideways
  const sy = hdir.x;
  const eye = (dir) => ({ cx: head.x + fx * 0.3 + sx * 0.75 * dir, cy: head.y + fy * 0.3 + sy * 0.75 * dir });
  const e1 = eye(1);
  const e2 = eye(-1);
  const forkx = head.x + fx * 1.5;
  const forky = head.y + fy * 1.5;
  const tipx = head.x + fx * 2.6;
  const tipy = head.y + fy * 2.6;

  return (
    <g>
      {/* forked tongue */}
      <path
        d={`M ${forkx} ${forky} L ${tipx} ${tipy} M ${tipx} ${tipy} L ${tipx + sx * 0.55 + fx * 0.4} ${tipy + sy * 0.55 + fy * 0.4} M ${tipx} ${tipy} L ${tipx - sx * 0.55 + fx * 0.4} ${tipy - sy * 0.55 + fy * 0.4}`}
        stroke="#d1433f"
        strokeWidth="0.35"
        strokeLinecap="round"
        fill="none"
      />
      {/* body */}
      <path d={d} fill="#3f9163" stroke="#2c6b46" strokeWidth="0.35" strokeLinejoin="round" />
      {/* belly seam — suggests scales without noise */}
      <path
        d={d}
        fill="none"
        stroke="#bfe6c9"
        strokeWidth="0.3"
        strokeDasharray="0.9 1.7"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* head — small, bulged toward the mouth */}
      <ellipse cx={head.x + fx * 0.4} cy={head.y + fy * 0.4} rx="1.7" ry="1.4" fill="#357a52" stroke="#2c6b46" strokeWidth="0.35" />
      {/* eyes — occasionally blink, each snake on its own rhythm */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
        transition={{ duration: 0.5, times: [0, 0.4, 0.5, 0.6, 1], repeat: Infinity, repeatDelay: 2.6 + (seed % 5) * 0.9 }}
      >
        <circle cx={e1.cx} cy={e1.cy} r="0.48" fill="#fff" />
        <circle cx={e2.cx} cy={e2.cy} r="0.48" fill="#fff" />
        <circle cx={e1.cx} cy={e1.cy} r="0.26" fill="#20402e" />
        <circle cx={e2.cx} cy={e2.cy} r="0.26" fill="#20402e" />
      </motion.g>
    </g>
  );
}

function BoardArt() {
  const ladders = useMemo(() => Object.entries(LADDERS).map(([f, t]) => ladderShapes(+f, +t)), []);
  const snakes = useMemo(
    () =>
      Object.entries(SNAKES).map(([f, t]) => {
        const a = cellCenter(+f);
        const b = cellCenter(+t);
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        // Longer snakes are a touch thicker, plus a small per-snake variation so
        // no two feel identical.
        const girth = 0.9 + Math.min(0.3, len * 0.005) + (+f % 3) * 0.06;
        return { body: snakeBody(+f, +t, girth), seed: +f };
      }),
    []
  );

  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        {/* A whisper of a drop shadow so the art lifts off the board without weight */}
        <filter id="artShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.35" stdDeviation="0.4" floodColor="#6b4a26" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Snakes first, so ladder rails read as sitting in front of them (depth) */}
      <g filter="url(#artShadow)">
        {snakes.map((s, i) => (
          <SnakeArt key={`snk-${i}`} body={s.body} seed={s.seed} />
        ))}
      </g>

      {/* Ladders — warm rails with fine rungs, on top */}
      <g filter="url(#artShadow)">
        {ladders.map((l, i) => (
          <g key={`lad-${i}`} strokeLinecap="round">
            <line {...l.rail1} stroke="#b9772f" strokeWidth="1.02" />
            <line {...l.rail2} stroke="#b9772f" strokeWidth="1.02" />
            {l.rungs.map((r, j) => (
              <line key={j} {...r} stroke="#e2aa63" strokeWidth="0.75" />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}

/* Pip die that tumbles while rolling, then settles on its face. */
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
function Dice({ value, rolling }) {
  const [face, setFace] = useState(value || 1);
  useEffect(() => {
    if (!rolling) {
      if (value) setFace(value);
      return;
    }
    const id = setInterval(() => setFace(Math.floor(Math.random() * 6) + 1), 90);
    return () => clearInterval(id);
  }, [rolling, value]);

  const pips = PIPS[face] || [];
  return (
    <motion.div
      animate={rolling ? { rotate: [0, -14, 12, -8, 0], scale: [1, 1.08, 0.96, 1.04, 1] } : { rotate: 0, scale: [1.28, 0.86, 1.08, 0.97, 1] }}
      transition={rolling ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" } : { duration: 0.55, ease: "easeOut" }}
      className="grid h-16 w-16 grid-cols-3 grid-rows-3 gap-1 rounded-2xl border border-[#f0e2c8] bg-gradient-to-br from-white to-[#fff6ea] p-2.5 shadow-[0_8px_20px_rgba(171,68,0,0.15)]"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="flex items-center justify-center">
          {pips.includes(i) && <span className="h-2.5 w-2.5 rounded-full bg-[#ab4400]" />}
        </span>
      ))}
    </motion.div>
  );
}

/* A player's pawn, positioned by board percentage and animated between cells. */
const PAWN_PCT = 8;
const PAWN_HALF = PAWN_PCT / 2;

function Pawn({ index, color, initial, offsetX }) {
  const onBoard = index >= 1;
  const c = cellCenter(onBoard ? index : 1);
  // Pawns center on their own tile. offsetX is only non-zero when BOTH pawns
  // share a tile (e.g. the start) — then they sit side by side instead of
  // stacking. Clamp so the whole disc always stays inside the board: corner
  // cells sit only half a cell from the edge.
  const clamp = (v) => Math.max(PAWN_HALF + 0.5, Math.min(100 - PAWN_HALF - 0.5, v));
  const x = clamp(c.x + offsetX);
  const y = clamp(c.y);
  return (
    <motion.div
      className="pointer-events-none absolute z-20"
      style={{ width: `${PAWN_PCT}%`, height: `${PAWN_PCT}%`, marginLeft: `-${PAWN_HALF}%`, marginTop: `-${PAWN_HALF}%` }}
      initial={false}
      animate={{ left: `${x}%`, top: `${y}%` }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-full border-2 border-white text-[10px] font-black text-white shadow-[0_2px_6px_rgba(57,56,50,0.35)]"
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>
    </motion.div>
  );
}

/* A little burst of warm sparks at the top of a climbed ladder. */
function Sparkles({ cell }) {
  const c = cellCenter(cell);
  const bits = Array.from({ length: 8 });
  return (
    <div className="pointer-events-none absolute z-30" style={{ left: `${c.x}%`, top: `${c.y}%`, width: 0, height: 0 }}>
      {bits.map((_, i) => {
        const ang = (i / bits.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: 6, height: 6, marginLeft: -3, marginTop: -3, backgroundColor: i % 2 ? "#ffd27a" : "#ffae88" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(ang) * 22, y: Math.sin(ang) * 22, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

function SnakesAndLaddersGame({ localPlayer, sessionId, getPlayerName }) {
  const CHANNEL_NAME = sessionId;
  const [gameState, setGameState] = useState("menu");
  const [player1Pos, setPlayer1Pos] = useState(0);
  const [player2Pos, setPlayer2Pos] = useState(0);
  const [p1Display, setP1Display] = useState(0);
  const [p2Display, setP2Display] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(PLAYER_IDS.ONE);
  const [diceValue, setDiceValue] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [lastEvent, setLastEvent] = useState(null); // { type: 'ladder'|'snake', delta }
  const [highlightCell, setHighlightCell] = useState(null); // destination flash
  const [sparkle, setSparkle] = useState(null); // { cell, id } — ladder-climb sparkles
  const boardShake = useAnimationControls();
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [winner, setWinner] = useState(null);
  const [channel, setChannel] = useState(null);

  const localReadyRef = useRef(localReady);
  const p1DisplayRef = useRef(0);
  const p2DisplayRef = useRef(0);
  const timersRef = useRef([]);

  useEffect(() => { localReadyRef.current = localReady; }, [localReady]);
  useEffect(() => { p1DisplayRef.current = p1Display; }, [p1Display]);
  useEffect(() => { p2DisplayRef.current = p2Display; }, [p2Display]);
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const remotePlayer = getOtherPlayer(localPlayer);
  const localPlayerName = getPlayerName(localPlayer);
  const remotePlayerName = getPlayerName(remotePlayer);

  // Walk a pawn from its current cell to the dice landing, one hop at a time,
  // then slide it down a snake or up a ladder — purely visual, on top of the
  // already-final logical position.
  const animateMove = useCallback((player, fromIdx, dice, finalIdx) => {
    const setDisplay = player === PLAYER_IDS.ONE ? setP1Display : setP2Display;
    const landing = fromIdx + dice > BOARD_SIZE ? fromIdx : fromIdx + dice;

    // Flash the destination tile so the move is easy to follow.
    setHighlightCell(finalIdx);
    timersRef.current.push(setTimeout(() => setHighlightCell(null), 1900));

    let t = 0;
    for (let i = fromIdx + 1; i <= landing; i++) {
      const step = i;
      t += HOP_MS;
      timersRef.current.push(setTimeout(() => setDisplay(step), t));
    }

    if (finalIdx !== landing) {
      timersRef.current.push(
        setTimeout(() => {
          setDisplay(finalIdx);
          const climbed = finalIdx > landing;
          setLastEvent({ type: climbed ? "ladder" : "snake", delta: Math.abs(finalIdx - landing) });
          if (climbed) {
            setSparkle({ cell: finalIdx, id: Date.now() }); // burst at the top of the ladder
            timersRef.current.push(setTimeout(() => setSparkle(null), 950));
          } else {
            boardShake.start({ x: [0, -5, 5, -4, 3, -2, 0], transition: { duration: 0.42 } }); // snakebite jolt
          }
          timersRef.current.push(setTimeout(() => setLastEvent(null), 2600));
        }, t + 260)
      );
    } else {
      timersRef.current.push(setTimeout(() => setDisplay(landing), t + 10));
    }
  }, [boardShake]);

  const resetBoard = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPlayer1Pos(0);
    setPlayer2Pos(0);
    setP1Display(0);
    setP2Display(0);
    setCurrentTurn(PLAYER_IDS.ONE);
    setDiceValue(null);
    setLastEvent(null);
    setHighlightCell(null);
    setSparkle(null);
    setWinner(null);
  }, []);

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const gameChannel = pusher.subscribe(CHANNEL_NAME);
    setChannel(gameChannel);

    gameChannel.bind("pusher:subscription_succeeded", () => {
      fetch("/api/pusher/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: CHANNEL_NAME,
          event: "player-joined",
          data: { player: localPlayer, ready: localReadyRef.current },
        }),
      });
    });

    gameChannel.bind("player-joined", (data) => {
      if (data.player !== localPlayer) {
        setRemoteConnected(true);
        setRemoteReady(data.ready);
        fetch("/api/pusher/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: CHANNEL_NAME,
            event: "presence-check",
            data: { player: localPlayer, ready: localReadyRef.current },
          }),
        });
      }
    });

    gameChannel.bind("presence-check", (data) => {
      if (data.player !== localPlayer) {
        setRemoteConnected(true);
        setRemoteReady(data.ready);
      }
    });

    gameChannel.bind("player-ready", (data) => {
      if (data.player !== localPlayer) setRemoteReady(data.ready);
    });

    gameChannel.bind("game-start", () => {
      resetBoard();
      setGameState("playing");
    });

    gameChannel.bind("game-move", (data) => {
      if (data.player !== localPlayer) {
        const from = data.player === PLAYER_IDS.ONE ? p1DisplayRef.current : p2DisplayRef.current;
        if (data.player === PLAYER_IDS.ONE) setPlayer1Pos(data.position);
        else setPlayer2Pos(data.position);
        setDiceValue(data.dice);
        animateMove(data.player, from, data.dice, data.position);
        if (data.winner) {
          setWinner(data.winner);
          timersRef.current.push(setTimeout(() => setGameState("finished"), WIN_HOLD_MS));
        } else {
          setCurrentTurn(data.nextTurn);
        }
      }
    });

    return () => {
      gameChannel.unbind_all();
      pusher.unsubscribe(CHANNEL_NAME);
      pusher.disconnect();
    };
  }, [localPlayer, animateMove, resetBoard]);

  const handleReady = () => {
    const nextReady = !localReady;
    setLocalReady(nextReady);
    fetch("/api/pusher/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: "player-ready",
        data: { player: localPlayer, ready: nextReady },
      }),
    });
  };

  useEffect(() => {
    if (localReady && remoteReady && localPlayer === PLAYER_IDS.ONE && gameState === "menu") {
      fetch("/api/pusher/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: CHANNEL_NAME, event: "game-start", data: {} }),
      });
    }
  }, [localReady, remoteReady, localPlayer, gameState]);

  const rollDice = async () => {
    if (gameState !== "playing" || currentTurn !== localPlayer || isRolling || winner) return;

    setIsRolling(true);
    setLastEvent(null);
    const dice = Math.floor(Math.random() * 6) + 1;
    setDiceValue(dice);

    await new Promise((resolve) => setTimeout(resolve, 750));

    const currentPos = localPlayer === PLAYER_IDS.ONE ? player1Pos : player2Pos;
    let newPos = currentPos + dice;
    if (newPos > BOARD_SIZE) newPos = currentPos;
    if (SNAKES[newPos]) newPos = SNAKES[newPos];
    if (LADDERS[newPos]) newPos = LADDERS[newPos];

    const gameWinner = newPos === BOARD_SIZE ? localPlayer : null;

    if (localPlayer === PLAYER_IDS.ONE) setPlayer1Pos(newPos);
    else setPlayer2Pos(newPos);

    animateMove(localPlayer, currentPos, dice, newPos);

    const nextTurn = localPlayer === PLAYER_IDS.ONE ? PLAYER_IDS.TWO : PLAYER_IDS.ONE;

    if (gameWinner) {
      setWinner(gameWinner);
      timersRef.current.push(setTimeout(() => setGameState("finished"), WIN_HOLD_MS));
    } else {
      setCurrentTurn(nextTurn);
    }

    fetch("/api/pusher/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: "game-move",
        data: { player: localPlayer, position: newPos, dice, nextTurn, winner: gameWinner },
      }),
    });

    setIsRolling(false);
  };

  // Cells in DOM order: top row (100..91) first, bottom row (1..10) last.
  const cells = [];
  for (let row = 9; row >= 0; row--) {
    for (let col = 0; col < 10; col++) {
      const num = row % 2 === 1 ? row * 10 + (10 - col) : row * 10 + col + 1;
      cells.push({ num, shaded: (row + col) % 2 === 0 });
    }
  }

  if (gameState === "menu") {
    return (
      <LobbyScreen
        gameTitle="Snakes & Ladders"
        tagline="Climb. Slide. Scream. Square 100 settles everything."
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
    const myTurn = currentTurn === localPlayer;
    return (
      <GameFrame size="max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <BackToArena />
          <TurnPill isLocalTurn={myTurn} remoteName={remotePlayerName} />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
          {/* Position strip */}
          <div className="flex items-stretch gap-3 border-b border-[#f5f2ee] p-4">
            {[
              { pid: PLAYER_IDS.ONE, pos: p1Display, color: P1, wash: "#fff4ec", ring: "#ab4400" },
              { pid: PLAYER_IDS.TWO, pos: p2Display, color: P2, wash: "#fff1f6", ring: "#9d4867" },
            ].map(({ pid, pos, color, wash, ring }) => {
              const isLocal = localPlayer === pid;
              const active = currentTurn === pid;
              return (
                <motion.div
                  key={pid}
                  className="flex flex-1 items-center justify-between rounded-2xl border px-4 py-3 transition-colors"
                  style={{
                    borderColor: active ? ring : "#efe9e2",
                    backgroundColor: active ? wash : "#fff",
                    opacity: active ? 1 : 0.55,
                  }}
                  animate={
                    active
                      ? { boxShadow: [`0 0 0 0 ${ring}00`, `0 0 16px 1px ${ring}40`, `0 0 0 0 ${ring}00`] }
                      : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
                  }
                  transition={active ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
                >
                  <div className="leading-tight">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: `${ring}b3` }}>
                      {isLocal ? "You" : (isLocal ? localPlayerName : remotePlayerName).split(" ")[0]}
                    </p>
                    <p className={`${plusJakarta.className} text-xl font-extrabold`} style={{ color }}>{pos}</p>
                  </div>
                  <PlayerDisc
                    name={isLocal ? localPlayerName : remotePlayerName}
                    kind={isLocal ? "local" : "remote"}
                    size="sm"
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Board */}
          <div className="bg-[#fdfaf3] p-3 sm:p-4">
            <motion.div
              animate={boardShake}
              className="relative mx-auto aspect-square w-full overflow-hidden rounded-2xl border border-[#e4d4b2]"
            >
              {/* cells — light checker, clearer grid lines, readable numbers */}
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
                {cells.map(({ num, shaded }) => (
                  <div
                    key={num}
                    className="relative border-[0.5px] border-[#e6d6b6]"
                    style={{ backgroundColor: shaded ? "#fffdf9" : "#fdf7ec" }}
                  >
                    <span className="absolute left-[3px] top-[2px] text-[8px] font-bold text-[#a2895f]">{num}</span>
                    {num === 1 && <span className="absolute bottom-[2px] right-[3px] text-[6px] font-black uppercase tracking-tight text-[#ab4400]/70">start</span>}
                    {num === 100 && <span className="absolute bottom-[1px] right-[2px] text-[10px]">🏁</span>}
                  </div>
                ))}
              </div>

              {/* snakes + ladders */}
              <BoardArt />

              {/* destination flash */}
              {highlightCell != null && (
                <motion.div
                  key={`hl-${highlightCell}`}
                  className="pointer-events-none absolute z-10"
                  style={{
                    width: "9.4%",
                    height: "9.4%",
                    marginLeft: "-4.7%",
                    marginTop: "-4.7%",
                    left: `${cellCenter(highlightCell).x}%`,
                    top: `${cellCenter(highlightCell).y}%`,
                  }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <motion.div
                    className="h-full w-full rounded-lg"
                    style={{ boxShadow: "inset 0 0 0 2px #ab4400", backgroundColor: "#ab440016" }}
                    animate={{ opacity: [1, 0.35, 1] }}
                    transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
              )}

              {/* pawns — only split apart when they share a tile */}
              <Pawn
                index={p1Display}
                color={P1}
                initial={localPlayerName.charAt(0).toUpperCase()}
                offsetX={p1Display === p2Display ? -2.6 : 0}
              />
              <Pawn
                index={p2Display}
                color={P2}
                initial={remotePlayerName.charAt(0).toUpperCase()}
                offsetX={p1Display === p2Display ? 2.6 : 0}
              />

              {/* ladder-climb sparkles */}
              {sparkle && <Sparkles key={sparkle.id} cell={sparkle.cell} />}
            </motion.div>
          </div>

          {/* Dice + event banner */}
          <div className="border-t border-[#f5f2ee] p-4">
            <div className="flex items-center justify-center gap-4">
              <Dice value={diceValue} rolling={isRolling} />
              <button
                onClick={rollDice}
                disabled={!myTurn || isRolling || Boolean(winner)}
                className="rounded-2xl bg-[#ab4400] px-8 py-4 text-base font-extrabold tracking-tight text-white shadow-[0_14px_30px_rgba(171,68,0,0.28)] transition-all hover:bg-[#973b00] active:scale-[0.97] disabled:opacity-40 disabled:shadow-none"
              >
                {isRolling ? "Rolling…" : myTurn ? "Roll the dice" : "Their turn"}
              </button>
            </div>

            <div className="mt-3 flex h-6 items-center justify-center">
              {lastEvent && (
                <motion.span
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide"
                  style={
                    lastEvent.type === "ladder"
                      ? { backgroundColor: "#fff3e2", color: "#a85f1a" }
                      : { backgroundColor: "#fff0f5", color: "#9d4867" }
                  }
                >
                  {lastEvent.type === "ladder" ? `🪜 Climbed +${lastEvent.delta}` : `🐍 Bitten −${lastEvent.delta}`}
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </GameFrame>
    );
  }

  if (gameState === "finished") {
    return (
      <ResultScreen
        outcome={winner === localPlayer ? "win" : "lose"}
        localName={localPlayerName}
        remoteName={remotePlayerName}
        onRematch={() => window.location.reload()}
        rematchLabel="Race again"
        subline={
          winner === localPlayer
            ? "First to 100. The snakes couldn't save them."
            : "The board betrayed you. Demand a rematch."
        }
      />
    );
  }

  return null;
}

export default function SnakesAndLadders() {
  return (
    <LocalMultiplayerWrapper gameId="snakes-ladders" gameName="Snakes & Ladders">
      {(props) => <SnakesAndLaddersGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
