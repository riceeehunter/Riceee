"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Swords, 
  Layers, 
  Package, 
  Grid3x3, 
  Dices, 
  GitCompare, 
  Target, 
  MessageCircle, 
  Pencil
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-pink-500 via-rose-400 to-purple-600 bg-clip-text text-transparent">
          🎮 Mini Games Arena
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Take a break and have some fun! Choose from our collection of quick, addictive games.
        </p>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <Link key={game.id} href={game.path}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <CardHeader>
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    {game.isNew && (
                      <span className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl">{game.title}</CardTitle>
                  <CardDescription className="text-base">
                    {game.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    Play Now →
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          More games coming soon! Each game is designed for quick fun and maximum enjoyment. 🎯
        </p>
      </div>
    </div>
  );
}
