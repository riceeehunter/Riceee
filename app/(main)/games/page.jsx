"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowUpRight,
} from "lucide-react";

const games = [
  {
    id: "word-duel",
    title: "Word Duel Arena",
    description: "Race your partner to guess the word first!",
    icon: Swords,
    color: "from-red-500 to-orange-500",
    path: "/games/word-duel",
    isNew: true,
  },
  {
    id: "speed-stacker",
    title: "Speed Stacker",
    description: "Stack blocks faster than your partner!",
    icon: Layers,
    color: "from-blue-500 to-cyan-500",
    path: "/games/speed-stacker",
    isNew: true,
  },
  {
    id: "daily-dare",
    title: "Daily Dare",
    description: "One dare a day — do you accept?",
    icon: Flame,
    color: "from-orange-500 to-red-600",
    path: "/games/daily-dare",
    isNew: true,
  },
  {
    id: "treasure-hunt",
    title: "Treasure Hunt Race",
    description: "Race through the clues to the hidden treasure!",
    icon: Package,
    color: "from-yellow-500 to-amber-600",
    path: "/games/treasure-hunt",
  },
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    description: "The classic showdown, live on both screens!",
    icon: Grid3x3,
    color: "from-purple-500 to-pink-500",
    path: "/games/tic-tac-toe",
    isNew: true,
  },
  {
    id: "story-dice",
    title: "Story Dice",
    description: "Roll the dice, write a story together!",
    icon: Dices,
    color: "from-green-500 to-emerald-500",
    path: "/games/story-dice",
    isNew: true,
  },
  {
    id: "this-or-that",
    title: "This or That",
    description: "Would you rather...? Learn each other fast.",
    icon: GitCompare,
    color: "from-indigo-500 to-blue-500",
    path: "/games/this-or-that",
  },
  {
    id: "snakes-ladders",
    title: "Snakes & Ladders",
    description: "Climb, slide, and race to square 100!",
    icon: Target,
    color: "from-rose-500 to-pink-600",
    path: "/games/snakes-ladders",
    isNew: true,
  },
  {
    id: "truth-or-dare",
    title: "Truth or Dare",
    description: "Spill secrets, take dares, get closer.",
    icon: MessageCircle,
    color: "from-violet-500 to-purple-600",
    path: "/games/truth-or-dare",
  },
  {
    id: "quick-draw",
    title: "Quick Draw Battle",
    description: "Draw together & watch art unfold live!",
    icon: Pencil,
    color: "from-teal-500 to-cyan-600",
    path: "/games/quick-draw",
    isNew: true,
  },
];

const gridStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardPop = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function GamesHub() {
  return (
    <div className={`${manrope.className} page-shell py-8 md:py-10`}>
      <div className="mb-7 md:mb-8">
        <h1 className={`${plusJakarta.className} text-3xl md:text-5xl font-extrabold tracking-tight text-[#ab4400]`}>
          Mini Games Arena
        </h1>
        <p className="mt-2 text-sm md:text-base text-[#66645e] max-w-2xl">
          Quick, playful challenges for two. Jump in, play fast, and keep the vibe fun.
        </p>
      </div>

      <motion.div
        variants={gridStagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-4.5"
      >
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <motion.div key={game.id} variants={cardPop}>
              <Link href={game.path}>
                <Card className="h-full bg-white/70 border border-[#ffdfcf] rounded-3xl overflow-hidden hover:shadow-[0_18px_38px_rgba(171,68,0,0.14)] hover:border-[#ffba99] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 group">
                  <CardContent className="p-3 md:p-3.5">
                    <div className="relative rounded-2xl bg-gradient-to-br from-[#fff4ec] to-[#fff1f6] border border-[#ffe5d6] h-28 md:h-32 flex items-center justify-center mb-3 overflow-hidden">
                      <div className={`icon-wiggle w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-[0_8px_20px_rgba(57,56,50,0.18)]`}>
                        <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>

                      {game.isNew && (
                        <span className="absolute top-2 left-2 rounded-full bg-[#ab4400] text-white text-[9px] font-bold px-2 py-0.5 tracking-wide">
                          NEW
                        </span>
                      )}

                      <span className="absolute right-2.5 bottom-2.5 text-[#ab4400]/60 group-hover:text-[#ab4400] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    </div>

                    <h3 className={`${plusJakarta.className} text-sm md:text-base font-bold text-[#393832] leading-tight line-clamp-1`}>
                      {game.title}
                    </h3>
                    <p className="mt-1 text-[11px] md:text-xs text-[#66645e] leading-snug line-clamp-1">
                      {game.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-6 text-center">
        <p className="text-xs md:text-sm text-[#66645e]">
          New game drops coming soon. 🎁
        </p>
      </div>
    </div>
  );
}
