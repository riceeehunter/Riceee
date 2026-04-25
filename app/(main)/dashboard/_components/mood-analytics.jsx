"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getAnalytics } from "@/actions/analytics";
import { getMoodById, getMoodTrend } from "@/app/lib/moods";
import { format, parseISO } from "date-fns";
import useFetch from "@/hooks/use-fetch";
import MoodAnalyticsSkeleton from "./analytics-loading";
import { useUser } from "@clerk/nextjs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import ReminderDialog from "./reminder-dialog";
import { Check, ChevronDown, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { plusJakarta } from "@/lib/fonts";

const timeOptions = [
  { value: "7d", label: "Last 7 Days" },
  { value: "15d", label: "Last 15 Days" },
  { value: "30d", label: "Last 30 Days" },
];

const MoodAnalytics = () => {
  const [period, setPeriod] = useState("7d");
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const scrollContainerRef = useRef(null);

  const {
    loading,
    data: analytics,
    fn: fetchAnalytics,
  } = useFetch(getAnalytics);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  // Scroll to end on mount or when data changes
  useEffect(() => {
    if (scrollContainerRef.current && analytics?.data) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [analytics, period]);

  if (loading || !analytics?.data) {
    return <MoodAnalyticsSkeleton />;
  }

  if (!analytics) return null;

  const { timeline, stats } = analytics.data;
  const hasEntriesInPeriod = analytics.data.entries.length > 0;
  const hasAnyEntries = analytics.data.hasAnyEntries ?? hasEntriesInPeriod;
  const isNewUser = !hasAnyEntries;
  const isInactiveForSelectedPeriod = hasAnyEntries && !hasEntriesInPeriod;

  const averageMoodText = hasEntriesInPeriod ? `${stats.averageScore}/10` : "—";
  const moodSummaryText = hasEntriesInPeriod
    ? getMoodTrend(stats.averageScore)
    : "No mood pattern yet — your first entry will unlock insights.";
  const moodSummaryEmoji = hasEntriesInPeriod
    ? getMoodById(stats.mostFrequentMood)?.emoji
    : "✨";
  const selectedPeriodLabel =
    timeOptions.find((option) => option.value === period)?.label ?? "this period";

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      const moodValue = payload[0]?.value;
      const entriesValue = payload[0]?.payload?.entryCount;
      
      return (
        <div className="bg-[#fffbff] p-4 border border-[#ffae88]/35 rounded-xl shadow-[0_12px_24px_rgba(57,56,50,0.12)]">
          <p className="font-semibold text-[#6a2700]">
            {label && typeof label === "string" ? format(parseISO(label), "MMM d, yyyy") : "Date"}
          </p>
          {moodValue !== null && moodValue !== undefined && (
            <p className="text-[#ab4400]">Average Mood: {moodValue}</p>
          )}
          <p className="text-[#9d4867]">Entries: {entriesValue || 0}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-center md:justify-between items-center md:items-end gap-6 w-full text-center md:text-left mb-8">
        <h2 className={`${plusJakarta.className} text-4xl md:text-5xl font-extrabold text-[#ab4400] tracking-tight leading-tight text-center md:text-left whitespace-nowrap`}>
          Welcome Back
        </h2>

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-3 w-full">
          <Link href="/riceee-chat">
            <Button className="rounded-full bg-gradient-to-r from-[#ab4400] to-[#ff9969] hover:from-[#973b00] hover:to-[#ff8b57] text-white shadow-[0_8px_20px_rgba(171,68,0,0.22)] px-3 sm:px-4">
              <MessageCircle className="mr-1.5 sm:mr-2 h-4 w-4" />
              <span className="max-[431px]:hidden">Riceee AI</span>
              <span className="min-[432px]:hidden">AI Chat</span>
              <Sparkles className="ml-1.5 sm:ml-2 h-4 w-4" />
            </Button>
          </Link>
          <ReminderDialog />
          <Popover open={periodMenuOpen} onOpenChange={setPeriodMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="min-w-[110px] sm:min-w-[140px] w-auto h-10 rounded-full border border-[#ffae88]/45 bg-white/90 text-[#6a2700] px-3 sm:px-4 flex items-center justify-between hover:bg-[#fff4ec]"
              >
                <span className="font-medium truncate mr-1 sm:mr-2 text-sm sm:text-base">{selectedPeriodLabel}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[200px] p-2 bg-[#fffbff] border border-[#ffae88]/35 rounded-xl shadow-[0_10px_24px_rgba(57,56,50,0.14)]">
              <div className="space-y-1">
                {timeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setPeriod(option.value);
                      setPeriodMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-md text-left flex items-center justify-between transition-colors ${
                      period === option.value
                        ? "bg-[#f2f2f4] text-[#121118]"
                        : "text-[#1e1c24] hover:bg-[#f5efea]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {period === option.value && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isNewUser && (
        <Card className="bg-white/70 border-[#ffae88]/30 rounded-3xl shadow-[0_10px_28px_rgba(57,56,50,0.08)]">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <p className={`${plusJakarta.className} text-xl font-semibold text-[#393832]`}>
                No entries in {selectedPeriodLabel} yet.
              </p>
              <p className="text-sm text-[#66645e]">
                Start with one quick note and we’ll turn this into meaningful insights.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/journal/write">
                <Button className="rounded-full bg-[#ab4400] hover:bg-[#973b00] text-white">Write your first entry</Button>
              </Link>
              <Link href="/dashboard#collections">
                <Button variant="outline" className="rounded-full border-[#ffae88]/50 text-[#6a2700] hover:bg-[#fff0e8]">Create a collection</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {isInactiveForSelectedPeriod && (
        <Card className="bg-white/70 border-[#ffae88]/30 rounded-3xl shadow-[0_10px_28px_rgba(57,56,50,0.08)]">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <p className={`${plusJakarta.className} text-xl font-semibold text-[#393832]`}>
                Your journal’s been a little quiet — no entries in {selectedPeriodLabel}. 😭
              </p>
              <p className="text-sm text-[#66645e]">
                You’ve written before. Add one new entry to continue your mood streak.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/journal/write">
                <Button className="rounded-full bg-[#ab4400] hover:bg-[#973b00] text-white">Write a new entry</Button>
              </Link>
              <Link href="/dashboard#collections">
                <Button variant="outline" className="rounded-full border-[#ffae88]/50 text-[#6a2700] hover:bg-[#fff0e8]">Browse collections</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <Card className="bg-white/70 border-[#ffae88]/25 rounded-3xl shadow-[0_10px_24px_rgba(57,56,50,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] sm:text-sm font-bold text-[#6a2700] uppercase tracking-wider">
                Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`${plusJakarta.className} text-[1.75rem] sm:text-3xl font-extrabold text-[#ab4400]`}>{stats.totalEntries}</div>
              <p className="text-[10px] sm:text-xs text-[#66645e] font-medium">
                Total so far
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 border-[#ffae88]/25 rounded-3xl shadow-[0_10px_24px_rgba(57,56,50,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] sm:text-sm font-bold text-[#6a2700] uppercase tracking-wider">
                Mood
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`${plusJakarta.className} text-[1.75rem] sm:text-3xl font-extrabold text-[#ab4400]`}>{averageMoodText}</div>
              <p className="text-[10px] sm:text-xs text-[#66645e] font-medium">
                Avg. Score
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-2 lg:col-span-1 bg-white/70 border-[#ffae88]/25 rounded-3xl shadow-[0_10px_24px_rgba(57,56,50,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#6a2700]">
                Mood Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2">
                <span className="text-xl leading-none mt-0.5">{moodSummaryEmoji}</span>
                <p className={`${plusJakarta.className} text-base sm:text-lg md:text-xl font-semibold leading-snug tracking-tight text-balance text-[#393832]`}>
                  {moodSummaryText}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/75 border-[#ffae88]/28 rounded-3xl shadow-[0_12px_30px_rgba(57,56,50,0.08)] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className={`${plusJakarta.className} text-[#ab4400] text-xl font-extrabold tracking-tight flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#ffae88]" />
                Journey Tape
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#9d4867] uppercase tracking-widest bg-[#9d4867]/5 p-1.5 px-3 rounded-full">
                  {period === "7d" ? "Weekly" : period === "15d" ? "Bi-Weekly" : "Monthly"} Flow
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-4 px-0">
            {hasEntriesInPeriod || isInactiveForSelectedPeriod ? (
              <div className="relative group">
                {/* Scrollable Container */}
                <div 
                  ref={scrollContainerRef}
                  className="overflow-x-auto hide-scrollbar pb-6 px-6 scroll-smooth"
                >
                  <div 
                    style={{ 
                      width: `${Math.max(timeline.length * 60, 320)}px`,
                      height: '240px' 
                    }}
                    className="relative"
                  >
                    {/* Background Subtle Grid */}
                    <div className="absolute inset-0 flex flex-col justify-between py-6 pointer-events-none opacity-[0.03]">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-px w-full bg-[#ab4400]" />
                      ))}
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={timeline}
                        margin={{ top: 40, right: 20, left: 20, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ab4400" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#ab4400" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Tooltip 
                          content={<CustomTooltip />} 
                          cursor={{ stroke: '#ffae88', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="averageScore"
                          stroke="#ab4400"
                          strokeWidth={5}
                          fillOpacity={1}
                          fill="url(#colorMood)"
                          activeDot={{ 
                            r: 8, 
                            fill: "#ab4400", 
                            stroke: "#fff", 
                            strokeWidth: 3 
                          }}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            if (payload.averageScore > 0) {
                              const emoji = getMoodById(payload.mostFrequentMood)?.emoji;
                              return (
                                <g key={payload.date}>
                                  <foreignObject x={cx - 12} y={cy - 35} width="24" height="24">
                                    <div className="text-lg flex items-center justify-center animate-bounce-slow">
                                      {emoji}
                                    </div>
                                  </foreignObject>
                                  <circle cx={cx} cy={cy} r={4} fill="#ab4400" stroke="#fff" strokeWidth={2} />
                                </g>
                              );
                            }
                            return null;
                          }}
                          connectNulls={true}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    
                    {/* Date Tape */}
                    <div className="absolute bottom-0 left-0 w-full flex justify-between px-5 pointer-events-none">
                      {timeline.map((d, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 w-[60px]">
                          <div className="h-2 w-0.5 bg-stone-200 rounded-full" />
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-tighter">
                            {format(parseISO(d.date), "MMM d")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Scroll Indicator Overlay */}
                <div className="absolute top-1/2 right-2 -translate-y-1/2 w-8 h-12 bg-gradient-to-l from-white/80 to-transparent flex items-center justify-end pr-1 pointer-events-none group-hover:opacity-0 transition-opacity">
                   <div className="animate-pulse text-[#ab4400]/40">→</div>
                </div>
              </div>
            ) : (
              <div className="h-[240px] mx-6 rounded-2xl border border-dashed border-[#ffae88]/40 bg-[#fdf9f4] flex items-center justify-center px-4 text-center">
                <div className="space-y-1">
                  <p className={`${plusJakarta.className} font-semibold text-[#393832]`}>Your journey starts here.</p>
                  <p className="text-sm text-[#66645e]">
                    Write your first note to see your flow.
                  </p>
                </div>
              </div>
            )}
            
            <div className="mt-1 px-6 flex justify-between items-center bg-stone-50/50 py-2.5 border-t border-stone-100">
               <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-stone-100 flex items-center justify-center text-[10px] grayscale">
                        {i === 0 ? "✨" : i === 1 ? "📝" : "❤️"}
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] font-bold text-stone-500 max-w-[120px] leading-tight uppercase tracking-tight">
                    Journey recorded with love
                  </p>
               </div>
              
              <div className="text-right">
                <p className="text-[8px] font-bold text-[#9d4867] uppercase tracking-widest opacity-60">Current Vibe</p>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xl animate-pulse">{moodSummaryEmoji}</span>
                  <span className={`${plusJakarta.className} text-lg font-black text-[#ab4400]`}>
                    {averageMoodText}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>

          <style jsx global>{`
            .animate-bounce-slow {
              animation: bounce 3s infinite;
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
        </Card>
      </div>
    </>
  );
};

export default MoodAnalytics;
