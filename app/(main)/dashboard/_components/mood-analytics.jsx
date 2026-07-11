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
import { format, parseISO, isToday, subDays, isSameDay } from "date-fns";
import useFetch from "@/hooks/use-fetch";
import MoodAnalyticsSkeleton from "./analytics-loading";
import { useUser } from "@clerk/nextjs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import ReminderDialog from "./reminder-dialog";
import { Check, ChevronDown, MessageCircle, NotebookPen, HeartPulse, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { plusJakarta } from "@/lib/fonts";

const timeOptions = [
  { value: "7d", label: "Last 7 Days" },
  { value: "15d", label: "Last 15 Days" },
  { value: "30d", label: "Last 30 Days" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

// Eases a number from 0 to its real value; display-only
function CountUp({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const decimals = String(value).includes(".") ? 1 : 0;

  useEffect(() => {
    const target = Number(value) || 0;
    let raf;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * target);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display.toFixed(decimals)}</>;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return { text: "Still up", emoji: "🌙" };
  if (hour < 12) return { text: "Morning", emoji: "☀️" };
  if (hour < 17) return { text: "Hey there", emoji: "🌤️" };
  return { text: "Evening", emoji: "🌆" };
}

const MoodAnalytics = () => {
  const [period, setPeriod] = useState("7d");
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const scrollContainerRef = useRef(null);
  const { user: clerkUser } = useUser();

  const {
    loading,
    data: analytics,
    fn: fetchAnalytics,
  } = useFetch(getAnalytics);

  useEffect(() => {
    // Days must be bucketed in the reader's zone — the server runs on UTC,
    // which pushed post-midnight entries onto the previous day
    fetchAnalytics(period, Intl.DateTimeFormat().resolvedOptions().timeZone);
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

  // Last 7 days, oldest → today: did we write, and how did it feel?
  const weekStrip = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const match = timeline.find((point) => isSameDay(parseISO(point.date), day));
    const hasEntry = Boolean(match && match.entryCount > 0);
    return {
      key: day.toISOString(),
      label: format(day, "EEEEE"), // single letter: M T W T F S S
      isToday: isToday(day),
      hasEntry,
      emoji: hasEntry ? getMoodById(match.mostFrequentMood)?.emoji : null,
      entryCount: hasEntry ? match.entryCount : 0,
      moodCount: hasEntry ? match.moods?.length ?? 1 : 0,
    };
  });
  const wroteToday = weekStrip[weekStrip.length - 1]?.hasEntry;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const point = payload[0]?.payload ?? {};
    const moodValue = payload[0]?.value;
    const entriesValue = point.entryCount || 0;
    const dayMoods = point.moods ?? [];
    const titles = point.titles ?? [];
    const date = label && typeof label === "string" ? parseISO(label) : null;
    const leadMood = getMoodById(point.mostFrequentMood);

    return (
      <div className="w-[236px] overflow-hidden rounded-2xl border border-[#ffdfcf] bg-[#fffbff]/95 backdrop-blur-sm shadow-[0_16px_36px_rgba(57,56,50,0.16)]">
        <div className="px-4 pt-3 pb-2.5">
          {/* The day, and how it felt — named, not emoji-d */}
          <div className="flex items-baseline justify-between gap-2">
            <p className={`${plusJakarta.className} font-bold text-[#393832] leading-tight`}>
              {date ? (isToday(date) ? "Today" : format(date, "EEEE")) : "Day"}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#c3b5ab]">
              {date ? format(date, "MMM d") : ""}
            </p>
          </div>

          {leadMood?.label && (
            <p className="mt-1 text-[13px] font-semibold text-[#ab4400]">
              {leadMood.label}
              {dayMoods.length > 1 && (
                <span className="text-[#9d4867]/70 font-medium">
                  {" "}
                  + {dayMoods.slice(1).map((m) => getMoodById(m.mood)?.label ?? m.mood).join(", ")}
                </span>
              )}
            </p>
          )}
        </div>

        {/* What was actually written that day */}
        {titles.length > 0 && (
          <div className="px-4 pb-3 space-y-1">
            {titles.map((entry) => (
              <p
                key={entry.id}
                className="text-[13px] text-[#66645e] leading-5 line-clamp-1 border-l-2 border-[#ffdfcf] pl-2.5"
              >
                {entry.title}
              </p>
            ))}
            {entriesValue > titles.length && (
              <p className="text-[11px] text-[#9f8f83] italic pl-2.5">
                +{entriesValue - titles.length} more
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between bg-[#fff8f3] border-t border-[#ffede2] px-4 py-2 text-[11px]">
          <span className="font-bold uppercase tracking-wider text-[#9d4867]/70">
            {entriesValue} {entriesValue === 1 ? "entry" : "entries"}
          </span>
          {moodValue !== null && moodValue !== undefined && (
            <span className={`${plusJakarta.className} font-black text-[#ab4400]`}>
              {moodValue}
              <span className="text-[#ab4400]/50 font-bold">/10</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex flex-col md:flex-row justify-center md:justify-between items-center md:items-end gap-6 w-full text-center md:text-left mb-8"
      >
        <div className="space-y-1.5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#9d4867]/60">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h2 className={`${plusJakarta.className} text-[2rem] sm:text-4xl md:text-5xl font-extrabold text-[#ab4400] tracking-tight leading-tight whitespace-nowrap`}>
            {getGreeting().text}
            {clerkUser?.firstName ? `, ${clerkUser.firstName}` : ""}{" "}
            <span className="inline-block">{getGreeting().emoji}</span>
          </h2>
          <p className="text-sm text-[#66645e] font-medium">
            Here&apos;s how your story is going.
          </p>
        </div>

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
      </motion.div>

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
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 grid-cols-2 lg:grid-cols-3"
        >
          <motion.div variants={fadeUp}>
            <Card className="h-full relative overflow-hidden bg-white/70 border-[#ffae88]/25 rounded-3xl shadow-[0_10px_24px_rgba(57,56,50,0.08)] hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(171,68,0,0.12)] transition-all duration-300 group">
              <div className="animate-blob absolute -top-10 -right-10 w-28 h-28 rounded-full bg-[#ffae88]/15 blur-2xl pointer-events-none" />
              <CardHeader className="pb-2">
                <CardTitle className="text-[11px] sm:text-sm font-bold text-[#6a2700] uppercase tracking-wider flex items-center gap-2">
                  <span className="h-7 w-7 rounded-xl bg-gradient-to-br from-[#ab4400] to-[#ff9969] text-white flex items-center justify-center shadow-md shadow-[#ab4400]/20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                    <NotebookPen className="h-3.5 w-3.5" />
                  </span>
                  Entries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`${plusJakarta.className} text-[1.75rem] sm:text-3xl font-extrabold text-[#ab4400]`}>
                  <CountUp value={stats.totalEntries} />
                </div>
                <p className="text-[10px] sm:text-xs text-[#66645e] font-medium">
                  Total so far
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="h-full relative overflow-hidden bg-white/70 border-[#ffae88]/25 rounded-3xl shadow-[0_10px_24px_rgba(57,56,50,0.08)] hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(157,72,103,0.12)] transition-all duration-300 group">
              <div className="animate-blob absolute -top-10 -right-10 w-28 h-28 rounded-full bg-[#ffd9e2]/25 blur-2xl pointer-events-none" style={{ animationDelay: "2s" }} />
              <CardHeader className="pb-2">
                <CardTitle className="text-[11px] sm:text-sm font-bold text-[#6a2700] uppercase tracking-wider flex items-center gap-2">
                  <span className="h-7 w-7 rounded-xl bg-gradient-to-br from-[#9d4867] to-[#d3567f] text-white flex items-center justify-center shadow-md shadow-[#9d4867]/20 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
                    <HeartPulse className="h-3.5 w-3.5" />
                  </span>
                  Mood
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`${plusJakarta.className} text-[1.75rem] sm:text-3xl font-extrabold text-[#ab4400]`}>
                  {hasEntriesInPeriod ? (
                    <>
                      <CountUp value={stats.averageScore} />
                      <span className="text-lg text-[#ab4400]/60">/10</span>
                    </>
                  ) : (
                    averageMoodText
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-[#66645e] font-medium">
                  Avg. Score
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp} className="col-span-2 lg:col-span-1">
            <Card className="h-full relative overflow-hidden bg-white/70 border-[#ffae88]/25 rounded-3xl shadow-[0_10px_24px_rgba(57,56,50,0.08)] hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(57,56,50,0.1)] transition-all duration-300">
              <div className="animate-blob absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-[#fed07f]/20 blur-2xl pointer-events-none" style={{ animationDelay: "4s" }} />
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
          </motion.div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.15 }}>
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
              // Chart fills the card width; no horizontal scrolling
              <div className="px-4 sm:px-6">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={timeline}
                      margin={{ top: 56, right: 16, left: 16, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ab4400" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#ab4400" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke="#ab4400"
                        strokeOpacity={0.07}
                        strokeDasharray="4 6"
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={16}
                        tick={{ fontSize: 10, fontWeight: 700, fill: "#a8a29e" }}
                        tickFormatter={(value) => {
                          const date = parseISO(value);
                          return isToday(date) ? "TODAY" : format(date, "MMM d").toUpperCase();
                        }}
                      />
                      {/* Anchor the scale so the line sits in the middle of the card */}
                      <YAxis domain={[0, 10]} hide />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: "#ffae88", strokeWidth: 1, strokeDasharray: "4 4" }}
                        // Without this the box glides across the chart from its last spot
                        isAnimationActive={false}
                        // Pinned above the plot so it never covers neighbouring days
                        position={{ y: -12 }}
                        allowEscapeViewBox={{ x: false, y: true }}
                        offset={20}
                        wrapperStyle={{ outline: "none", zIndex: 30 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="averageScore"
                        stroke="#ab4400"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorMood)"
                        activeDot={{
                          r: 8,
                          fill: "#ab4400",
                          stroke: "#fff",
                          strokeWidth: 3,
                        }}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (!(payload.averageScore > 0)) return null;

                          // The one place emoji earns its keep: the day's mood on the line.
                          // Counts and extra moods live in the tooltip instead.
                          const emoji = getMoodById(payload.mostFrequentMood)?.emoji;

                          return (
                            <g key={payload.date}>
                              {/* Generous box so the bounce never clips the emoji */}
                              <foreignObject x={cx - 20} y={cy - 50} width="40" height="40" style={{ overflow: "visible" }}>
                                <div className="flex items-end justify-center h-full">
                                  <span className="text-lg leading-none animate-bounce-slow">{emoji}</span>
                                </div>
                              </foreignObject>
                              <circle cx={cx} cy={cy} r={4.5} fill="#ab4400" stroke="#fff" strokeWidth={2} />
                            </g>
                          );
                        }}
                        connectNulls={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
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

            {/* Week ritual strip: which days you showed up, and a nudge for today */}
            <div className="mt-3 px-4 sm:px-6 flex flex-wrap gap-4 justify-between items-center bg-[#fff8f3] py-3 border-t border-[#ffede2]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {weekStrip.map((day) => (
                    <div key={day.key} className="flex flex-col items-center gap-1">
                      <div
                        title={
                          day.hasEntry
                            ? `${day.entryCount} ${day.entryCount === 1 ? "entry" : "entries"}${
                                day.moodCount > 1 ? ` across ${day.moodCount} moods` : ""
                              }`
                            : day.isToday
                            ? "Nothing written today yet"
                            : "No entry"
                        }
                        className={`relative h-7 w-7 rounded-xl flex items-center justify-center transition-all ${
                          day.hasEntry
                            ? "bg-gradient-to-br from-[#ab4400] to-[#ff9969] shadow-sm shadow-[#ab4400]/25"
                            : day.isToday
                            ? "border-2 border-dashed border-[#ffae88]"
                            : "bg-[#ffece0]"
                        }`}
                      >
                        {day.hasEntry && (
                          <span className={`${plusJakarta.className} text-white text-[11px] font-black`}>
                            {day.entryCount > 1 ? day.entryCount : ""}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[8px] font-black uppercase tracking-tight ${
                          day.isToday ? "text-[#ab4400]" : "text-[#c3b5ab]"
                        }`}
                      >
                        {day.label}
                      </span>
                    </div>
                  ))}
                </div>

                {!wroteToday && (
                  <Link
                    href="/journal/write"
                    className="group flex items-center gap-1.5 rounded-full bg-[#ab4400] text-white px-3.5 py-2 text-[11px] font-bold shadow-md shadow-[#ab4400]/20 hover:bg-[#973b00] hover:-translate-y-0.5 transition-all"
                  >
                    <NotebookPen className="h-3.5 w-3.5 group-hover:rotate-6 transition-transform" />
                    Write today
                  </Link>
                )}
              </div>

              <div className="text-right">
                <p className="text-[8px] font-bold text-[#9d4867] uppercase tracking-widest opacity-60">
                  {period === "7d" ? "This week" : period === "15d" ? "Last 15 days" : "This month"}
                </p>
                <p className={`${plusJakarta.className} text-lg font-black text-[#ab4400] leading-tight`}>
                  {averageMoodText}
                </p>
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
        </motion.div>
      </div>
    </>
  );
};

export default MoodAnalytics;
