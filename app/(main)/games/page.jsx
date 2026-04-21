"use client";

import React from "react";
import Link from "next/link";
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
  ArrowUpRight
} from "lucide-react";

const games = [
  {
    id: "word-duel",
    title: "Word Duel Arena",
    description: "Race to guess words in real-time multiplayer!",
    icon: Swords,
    color: "from-red-500 to-orange-500",
    path: "/games/word-duel",
    isNew: true,
  },
  {
    id: "speed-stacker",
    title: "Speed Stacker",
    description: "Real-time multiplayer block stacking!",
    icon: Layers,
    color: "from-blue-500 to-cyan-500",
    path: "/games/speed-stacker",
    isNew: true,
  },
  {
    id: "treasure-hunt",
    title: "Treasure Hunt Race",
    description: "Variety king - find treasures fast!",
    icon: Package,
    color: "from-yellow-500 to-amber-600",
    path: "/games/treasure-hunt",
  },
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    description: "Classic strategy in real-time multiplayer!",
    icon: Grid3x3,
    color: "from-purple-500 to-pink-500",
    path: "/games/tic-tac-toe",
    isNew: true,
  },
  {
    id: "story-dice",
    title: "Story Dice",
    description: "Write stories together in real-time!",
    icon: Dices,
    color: "from-green-500 to-emerald-500",
    path: "/games/story-dice",
    isNew: true,
  },
  {
    id: "this-or-that",
    title: "This or That",
    description: "Quick to build, instant value",
    icon: GitCompare,
    color: "from-indigo-500 to-blue-500",
    path: "/games/this-or-that",
  },
  {
    id: "snakes-ladders",
    title: "Snakes & Ladders",
    description: "Classic board game in real-time multiplayer!",
    icon: Target,
    color: "from-rose-500 to-pink-600",
    path: "/games/snakes-ladders",
    isNew: true,
  },
  {
    id: "truth-or-dare",
    title: "Truth or Dare",
    description: "Emotional connection game",
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-4.5">
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <Link key={game.id} href={game.path}>
              <Card className="h-full bg-white/70 border border-[#ffdfcf] rounded-3xl overflow-hidden hover:shadow-[0_14px_30px_rgba(57,56,50,0.12)] hover:-translate-y-0.5 transition-all duration-300 group">
                <CardContent className="p-3 md:p-3.5">
                  <div className="relative rounded-2xl bg-gradient-to-br from-[#fff4ec] to-[#fff1f6] border border-[#ffe5d6] h-28 md:h-32 flex items-center justify-center mb-3">
                    <div className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-[0_8px_20px_rgba(57,56,50,0.18)]`}>
                      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>

                    {game.isNew && (
                      <span className="absolute top-2 left-2 rounded-full bg-[#ab4400] text-white text-[9px] font-bold px-2 py-0.5 tracking-wide">
                        NEW
                      </span>
                    )}

                    <span className="absolute right-2.5 bottom-2.5 text-[#ab4400]/60">
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
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs md:text-sm text-[#66645e]">
          New game drops coming soon.
        </p>
      </div>
    </div>
  );
}
