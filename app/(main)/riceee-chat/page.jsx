"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles, Clock3, Heart, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_BRAND } from "@/lib/constants/branding";

export default function RiceeeChat() {
  return (
    <div className="h-full overflow-hidden px-4 py-4 md:py-5">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
        <div className="mb-3 flex items-center gap-3 md:mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full border border-orange-200 bg-white/80">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm font-medium text-orange-700">Back to Dashboard</p>
        </div>

        <div className="relative flex flex-1 flex-col justify-center rounded-3xl border-2 border-orange-200/80 bg-white/85 p-4 shadow-xl backdrop-blur sm:p-6 md:p-8">
          <div className="pointer-events-none absolute -top-10 -left-8 h-40 w-40 rounded-full bg-orange-200/25 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-pink-200/25 blur-2xl" />
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 text-white shadow-lg md:mb-4 md:h-16 md:w-16">
            <WandSparkles className="h-7 w-7 md:h-8 md:w-8" />
          </div>

          <div className="text-center">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-pink-700 md:mb-3 md:px-4 md:text-xs">
              <Sparkles className="h-4 w-4" />
              FEATURE IN PROGRESS
            </p>

            <h1 className="text-3xl font-black tracking-tight text-slate-800 sm:text-4xl md:text-[3rem] md:leading-none">
              {APP_BRAND.aiName} is Coming Soon
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base md:mt-4 md:text-lg">
              We are crafting a sweet, supportive AI space for couples with better guidance, softer conversations, and a more lovable experience.
            </p>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-3 md:mt-6 md:gap-3">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center">
              <Clock3 className="mx-auto mb-1.5 h-4 w-4 text-orange-500 md:h-5 md:w-5" />
              <p className="text-xs font-semibold text-orange-700 md:text-sm">Smart Session Memory</p>
            </div>
            <div className="rounded-2xl border border-pink-200 bg-pink-50 p-4 text-center">
              <Heart className="mx-auto mb-1.5 h-4 w-4 text-pink-500 md:h-5 md:w-5" />
              <p className="text-xs font-semibold text-pink-700 md:text-sm">Gentle Conflict Support</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
              <Sparkles className="mx-auto mb-1.5 h-4 w-4 text-amber-500 md:h-5 md:w-5" />
              <p className="text-xs font-semibold text-amber-700 md:text-sm">Personalized Advice Flow</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center justify-center gap-2.5 sm:mt-6 sm:flex-row sm:gap-3">
            <Link href="/dashboard">
              <Button className="h-10 w-52 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 px-6 hover:from-orange-600 hover:to-pink-600 md:h-11 md:w-56">
                Explore Dashboard
              </Button>
            </Link>
            <Link href="/games">
              <Button variant="outline" className="h-10 w-52 rounded-2xl border-orange-300 bg-white px-6 text-orange-700 hover:bg-orange-50 md:h-11 md:w-56">
                Play Couple Games
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
