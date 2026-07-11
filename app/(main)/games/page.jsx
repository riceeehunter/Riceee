"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { plusJakarta, manrope } from "@/lib/fonts";
import {
  Swords,
  Layers,
  Package,
  Grid3x3,
  Dices,
  GitCompare,
  Target,
  MessageCircle,
  Pencil,
  Flame,
  ArrowRight,
  Shuffle,
} from "lucide-react";

// Category accents stay inside the app palette — no rainbow
const CATEGORIES = {
  duel: { label: "Live Duel", accent: "#ab4400", wash: "#fff4ec", edge: "#ffdfcf" },
  talk: { label: "Table Talk", accent: "#9d4867", wash: "#fff1f6", edge: "#ffd9e2" },
  daily: { label: "Daily Ritual", accent: "#8a6d00", wash: "#fff8e8", edge: "#fbe9b7" },
};

const games = [
  {
    id: "word-duel",
    title: "Word Duel",
    line: "Same word. Two brains. First to crack it gloats forever.",
    icon: Swords,
    category: "duel",
    path: "/games/word-duel",
    featured: true,
    tag: "Crowd favourite",
  },
  {
    id: "quick-draw",
    title: "Quick Draw",
    line: "One canvas, two pens, zero artistic dignity.",
    icon: Pencil,
    category: "duel",
    path: "/games/quick-draw",
    featured: true,
    tag: "Play it live",
  },
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    line: "Three in a row, live on both screens.",
    icon: Grid3x3,
    category: "duel",
    path: "/games/tic-tac-toe",
  },
  {
    id: "speed-stacker",
    title: "Speed Stacker",
    line: "Stack fast, stack clean. Gravity plays for the other side.",
    icon: Layers,
    category: "duel",
    path: "/games/speed-stacker",
  },
  {
    id: "snakes-ladders",
    title: "Snakes & Ladders",
    line: "Climb. Slide. Scream. Square 100 settles everything.",
    icon: Target,
    category: "duel",
    path: "/games/snakes-ladders",
  },
  {
    id: "treasure-hunt",
    title: "Treasure Hunt",
    line: "Follow the clues. Get to the X before they do.",
    icon: Package,
    category: "duel",
    path: "/games/treasure-hunt",
  },
  {
    id: "this-or-that",
    title: "This or That",
    line: "Impossible choices. Suspiciously revealing answers.",
    icon: GitCompare,
    category: "talk",
    path: "/games/this-or-that",
  },
  {
    id: "truth-or-dare",
    title: "Truth or Dare",
    line: "The classic that starts better conversations.",
    icon: MessageCircle,
    category: "talk",
    path: "/games/truth-or-dare",
  },
  {
    id: "story-dice",
    title: "Story Dice",
    line: "Roll five dice, write one ridiculous story together.",
    icon: Dices,
    category: "talk",
    path: "/games/story-dice",
  },
  {
    id: "daily-dare",
    title: "Daily Dare",
    line: "One dare a day. Streaks don't forgive absences.",
    icon: Flame,
    category: "daily",
    path: "/games/daily-dare",
  },
];

const TICKER_ITEMS = [
  "loser makes chai",
  "best of three",
  "no mercy clause in effect",
  "winner picks the movie",
  "rematch is a right, not a favour",
  "trash talk encouraged",
];

const gridStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardPop = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function FeaturedCard({ game, index }) {
  const cat = CATEGORIES[game.category];
  const Icon = game.icon;
  return (
    <motion.div variants={cardPop} className="lg:col-span-6">
      <Link href={game.path} className="group block h-full">
        <div
          className="relative h-full min-h-[220px] overflow-hidden rounded-[2rem] border p-7 md:p-9 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_48px_rgba(57,56,50,0.13)]"
          style={{ backgroundColor: cat.wash, borderColor: cat.edge }}
        >
          {/* Oversized ghost icon */}
          <Icon
            className="absolute -right-8 -bottom-10 h-52 w-52 rotate-12 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105"
            style={{ color: cat.accent, opacity: 0.07 }}
            strokeWidth={1.2}
          />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2.5">
              <span
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                style={{ backgroundColor: cat.accent }}
              >
                {game.tag}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: cat.accent, opacity: 0.65 }}>
                {cat.label}
              </span>
            </div>

            <h2 className={`${plusJakarta.className} mt-5 text-4xl md:text-5xl font-extrabold tracking-tight text-[#393832]`}>
              {game.title}
            </h2>
            <p className="mt-2.5 max-w-sm text-sm md:text-[15px] leading-relaxed text-[#66645e]">
              {game.line}
            </p>

            <div className="mt-auto flex items-center gap-2 pt-6 text-sm font-bold" style={{ color: cat.accent }}>
              <span className="uppercase tracking-[0.14em] text-[11px]">Enter</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function GameCard({ game, index }) {
  const cat = CATEGORIES[game.category];
  const Icon = game.icon;
  const number = String(index + 1).padStart(2, "0");
  return (
    <motion.div variants={cardPop} className="lg:col-span-3">
      <Link href={game.path} className="group block h-full">
        <div className="relative flex h-full min-h-[190px] flex-col overflow-hidden rounded-[1.6rem] border border-[#efe9e2] bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(57,56,50,0.11)]"
          style={{ "--accent": cat.accent }}
        >
          {/* Ghost index number */}
          <span
            className={`${plusJakarta.className} pointer-events-none absolute -top-4 right-3 text-[5.5rem] font-extrabold leading-none tracking-tighter transition-colors duration-300`}
            style={{ color: cat.wash }}
          >
            {number}
          </span>

          <div className="relative flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
              style={{ backgroundColor: cat.wash, color: cat.accent }}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: cat.accent, opacity: 0.7 }}>
              {cat.label}
            </span>
          </div>

          <h3 className={`${plusJakarta.className} relative mt-4 text-xl font-bold tracking-tight text-[#393832]`}>
            {game.title}
          </h3>
          <p className="relative mt-1.5 text-xs leading-relaxed text-[#66645e]">
            {game.line}
          </p>

          <div className="relative mt-auto flex items-center gap-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] opacity-0 transition-all duration-300 group-hover:opacity-100" style={{ color: cat.accent }}>
            Play
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function GamesHub() {
  const router = useRouter();
  const featured = games.filter((g) => g.featured);
  const rest = games.filter((g) => !g.featured);

  const pickForUs = () => {
    const game = games[Math.floor(Math.random() * games.length)];
    router.push(game.path);
  };

  return (
    <div className={`${manrope.className} page-shell py-8 md:py-12`}>
      {/* Masthead */}
      <div className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#9d4867]/70">
            Riceee Arcade
          </p>
          <h1 className={`${plusJakarta.className} mt-2 text-5xl md:text-7xl font-extrabold tracking-tighter text-[#393832]`}>
            Game <span className="text-[#ab4400]">Night.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm md:text-base text-[#66645e]">
            Ten ways to ruin a perfectly peaceful evening. Pick your poison.
          </p>
        </div>

        <button
          onClick={pickForUs}
          className="group flex w-fit items-center gap-3 rounded-full border border-[#ffdfcf] bg-white px-6 py-3.5 text-sm font-bold text-[#6a2700] shadow-sm transition-all hover:border-[#ffba99] hover:bg-[#fff5ef] hover:-translate-y-0.5 active:scale-95"
        >
          <Shuffle className="h-4 w-4 text-[#ab4400] transition-transform duration-500 group-hover:rotate-180" />
          Can&apos;t decide? Pick for us
        </button>
      </div>

      {/* Ticker */}
      <div className="relative mb-8 overflow-hidden rounded-full border border-[#ffdfcf] bg-[#fff5ef] py-2.5 md:mb-10">
        <div className="flex w-max animate-[ticker_28s_linear_infinite] gap-0">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-4 whitespace-nowrap pr-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#ab4400]/70"
            >
              {item}
              <span className="text-[#ffae88]">✦</span>
            </span>
          ))}
        </div>
        <style>{`
          @keyframes ticker {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {/* Cards */}
      <motion.div
        variants={gridStagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12"
      >
        {featured.map((game, i) => (
          <FeaturedCard key={game.id} game={game} index={i} />
        ))}
        {rest.map((game, i) => (
          <GameCard key={game.id} game={game} index={i} />
        ))}
      </motion.div>

      <p className="mt-10 text-center text-[11px] font-medium uppercase tracking-[0.24em] text-[#a09d95]">
        New tables open soon
      </p>
    </div>
  );
}
