"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import ReminderDialog from "./reminder-dialog";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const timeOptions = [
  { value: "7d", label: "Last 7 Days" },
  { value: "15d", label: "Last 15 Days" },
  { value: "30d", label: "Last 30 Days" },
];

const MoodAnalytics = () => {
  const [period, setPeriod] = useState("7d");

  const {
    loading,
    data: analytics,
    fn: fetchAnalytics,
  } = useFetch(getAnalytics);

  const { isLoaded } = useUser();

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  if (loading || !analytics?.data || !isLoaded) {
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
      const entriesValue = payload[1]?.value;
      
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium">
            {format(parseISO(label), "MMM d, yyyy")}
          </p>
          {moodValue !== null && moodValue !== undefined && (
            <p className="text-orange-600">Average Mood: {moodValue}</p>
          )}
          <p className="text-blue-600">Entries: {entriesValue || 0}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-5xl font-bold gradient-title">Welcome Back 💗</h2>

        <div className="flex items-center gap-3">
          <Link href="/riceee-chat">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
              <MessageCircle className="mr-2 h-4 w-4" />
              Riceee AI
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <ReminderDialog />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isNewUser && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <p className="text-lg font-medium">
                No entries in {selectedPeriodLabel} yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Start with one quick note and we’ll turn this into meaningful insights.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/journal/write">
                <Button>Write your first entry</Button>
              </Link>
              <Link href="/dashboard#collections">
                <Button variant="outline">Create a collection</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {isInactiveForSelectedPeriod && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <p className="text-lg font-medium">
                Your journal’s been a little quiet — no entries in {selectedPeriodLabel}. 😭
              </p>
              <p className="text-sm text-muted-foreground">
                You’ve written before. Add one new entry to continue your mood streak.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/journal/write">
                <Button>Write a new entry</Button>
              </Link>
              <Link href="/dashboard#collections">
                <Button variant="outline">Browse collections</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEntries}</div>
              <p className="text-xs text-muted-foreground">
                ~{stats.dailyAverage} entries per day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Average Mood
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageMoodText}</div>
              <p className="text-xs text-muted-foreground">
                {hasEntriesInPeriod ? "Overall mood score" : "No mood score in selected period"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Mood Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2">
                <span className="text-xl leading-none mt-0.5">{moodSummaryEmoji}</span>
                <p className="text-lg md:text-xl font-semibold leading-snug tracking-tight text-balance">
                  {moodSummaryText}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mood Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {hasEntriesInPeriod || isInactiveForSelectedPeriod ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeline}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => format(parseISO(date), "MMM d")}
                    />
                    <YAxis yAxisId="left" domain={[0, 10]} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, "auto"]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="averageScore"
                      stroke="#f97316"
                      name="Average Mood"
                      strokeWidth={2}
                      connectNulls={true}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="entryCount"
                      stroke="#3b82f6"
                      name="Number of Entries"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] w-full rounded-md border border-dashed flex items-center justify-center px-4 text-center">
                <div className="space-y-1">
                  <p className="font-medium">Your mood timeline will appear here.</p>
                  <p className="text-sm text-muted-foreground">
                    Add your first entry to start tracking your emotional journey.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MoodAnalytics;
