import React from "react";
import {
  Book,
  Sparkles,
  Lock,
  Calendar,
  ChevronRight,
  BarChart2,
  FileText,
  Gamepad2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { getDailyPrompt } from "@/actions/public";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/auth";
import { resolvePartnerNames } from "@/lib/constants/partner-names";

const features = [
  {
    icon: Book,
    title: "Express Yourself Freely",
    description:
      "This is where you get to be you write anything, everything, or even nothing at all. I'll still read it with a smile.",
  },
  {
    icon: Sparkles,
    title: "Daily Inspiration",
    description:
      "Every new day means one more story for us to look back on and laugh at later. So, go live it fully.",
  },
  {
    icon: Lock,
    title: "Your Safe Space",
    description:
      "When the world feels too loud, this is our quiet corner. Just you, your thoughts, and a trace of me beside them.",
  },
  {
    icon: Gamepad2,
    title: "Fun Mini Games",
    description:
      "Take a break and play! 9 addictive mini-games to spark joy, creativity, and laughter. Perfect for quick fun!",
  },
];

export default async function LandingPage() {
  const advice = await getDailyPrompt();
  const { userId } = await auth();
  const partnerNames = userId
    ? resolvePartnerNames(await getOrCreateUser())
    : null;
  const titleLineOne = partnerNames
    ? `For ${partnerNames.partnerOneName}, With Love 💗`
    : "For You, With Love 💗";
  const titleLineTwo = partnerNames ? partnerNames.bothLabel : "Built for Two Hearts";

  return (
    <div className="relative container mx-auto px-4 pt-16 pb-16 overflow-x-hidden">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto text-center space-y-8">
        {/* Title */}
        <div className="relative">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl gradient-title mb-6 break-words px-2">
            {titleLineOne}
            <br /> 
            {titleLineTwo}
          </h1>
        </div>
        <p className="text-base md:text-lg lg:text-xl text-orange-800 mb-8 px-4 max-w-3xl mx-auto">
          A little world where your words find peace, your moods find meaning, and your heart feels heard.
        </p>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-t from-orange-50 via-transparent to-transparent pointer-events-none z-10" />
          <div className="bg-white rounded-2xl  p-4 max-full mx-auto">
            <div className="border-b border-orange-100 pb-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <span className="text-orange-900 font-medium">
                  Today&rsquo;s Entry
                </span>
              </div>
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-200" />
                <div className="h-3 w-3 rounded-full bg-orange-300" />
                <div className="h-3 w-3 rounded-full bg-orange-400" />
              </div>
            </div>
            <div className="space-y-4 p-4">
              <h3 className="text-xl font-semibold text-orange-900">
                {advice ? advice : "My Thoughts Today"}
              </h3>
              <Skeleton className="h-4 bg-orange-100 rounded w-3/4" />
              <Skeleton className="h-4 bg-orange-100 rounded w-full" />
              <Skeleton className="h-4 bg-orange-100 rounded w-2/3" />
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <Link href="/dashboard">
            <Button
              variant="journal"
              className="px-8 py-6 rounded-full flex items-center gap-2"
            >
              Start Writing <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="#features">
            <Button
              variant="outline"
              className="px-8 py-6 rounded-full border-orange-600 text-orange-600 hover:bg-orange-100"
            >
              Learn More
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <section
        id="features"
        className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-8"
      >
        {features.map((feature, index) => (
          <Card key={index} className="shadow-lg h-full">
            <CardContent className="p-6 flex flex-col h-full">
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-xl text-orange-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-orange-700 flex-grow">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
