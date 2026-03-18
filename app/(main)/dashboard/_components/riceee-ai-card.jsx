"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";

export default function RiceeeAICard() {
  return (
    <Link href="/riceee-chat">
      <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-purple-400/10 animate-pulse" />
        
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Riceee AI
                </h3>
                <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
              </div>
              
              <p className="text-sm text-muted-foreground">
                Your wise elder sibling for relationship advice
              </p>
              
              <div className="flex items-center gap-2 pt-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-full group-hover:scale-105 transition-transform">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  AI Powered
                </span>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  Click to chat →
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
