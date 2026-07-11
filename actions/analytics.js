"use server";

import { db } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";

// Which calendar day an instant falls on, in the reader's timezone.
// Using UTC here silently shifted late-night entries to the previous day
// (an 00:30 IST entry is still the day before in UTC).
function dayKeyInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function getAnalytics(period = "30d", timeZone = "UTC") {
  const user = await getOrCreateUser();

  // Reject a bogus timezone rather than crashing the dashboard
  let zone = timeZone;
  try {
    dayKeyInTimeZone(new Date(), zone);
  } catch {
    zone = "UTC";
  }

  const daysInPeriod = period === "7d" ? 7 : period === "15d" ? 15 : 30;

  // Build the calendar days of the period, oldest → today, in the reader's zone.
  // Anchor at noon UTC so adding/subtracting days can't drift across a boundary.
  const todayKey = dayKeyInTimeZone(new Date(), zone);
  const anchor = new Date(`${todayKey}T12:00:00Z`);
  const allDates = [];
  for (let i = daysInPeriod - 1; i >= 0; i--) {
    const day = new Date(anchor);
    day.setUTCDate(day.getUTCDate() - i);
    allDates.push(day.toISOString().split("T")[0]);
  }
  const periodDays = new Set(allDates);

  // Over-fetch by a day on each side (no timezone is more than ~14h from UTC),
  // then keep only the entries whose local day actually falls in the period.
  const fetchFrom = new Date(`${allDates[0]}T00:00:00Z`);
  fetchFrom.setUTCDate(fetchFrom.getUTCDate() - 1);

  const candidates = await db.entry.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: fetchFrom },
    },
    orderBy: { createdAt: "asc" },
  });

  const entries = candidates.filter((entry) =>
    periodDays.has(dayKeyInTimeZone(entry.createdAt, zone))
  );

  const allTimeEntriesCount = await db.entry.count({
    where: {
      userId: user.id,
    },
  });

  // Process entries for analytics
  const moodData = entries.reduce((acc, entry) => {
    const date = dayKeyInTimeZone(entry.createdAt, zone);
    if (!acc[date]) {
      acc[date] = {
        totalScore: 0,
        count: 0,
        entries: [],
      };
    }
    acc[date].totalScore += entry.moodScore;
    acc[date].count += 1;
    acc[date].entries.push(entry);
    return acc;
  }, {});

  // Calculate averages and format data for charts with all dates
  const analyticsData = allDates.map((date) => {
    const data = moodData[date];

    // Every mood felt that day (most frequent first) — a day can hold several
    let moods = [];
    if (data) {
      const counts = data.entries.reduce((acc, entry) => {
        acc[entry.mood] = (acc[entry.mood] || 0) + 1;
        return acc;
      }, {});
      moods = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([mood, count]) => ({ mood, count }));
    }

    return {
      date,
      averageScore: data ? Number((data.totalScore / data.count).toFixed(1)) : null,
      entryCount: data ? data.count : 0,
      moods,
      mostFrequentMood: moods[0]?.mood ?? null,
      // What was actually written that day — makes the chart personal, not statistical
      titles: data
        ? data.entries.slice(0, 3).map((entry) => ({
            id: entry.id,
            title: entry.title,
            mood: entry.mood,
            author: entry.author,
          }))
        : [],
    };
  });

  const totalEntries = entries.length;
  const totalScore = entries.reduce((acc, entry) => acc + entry.moodScore, 0);
  const moodCounts = entries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {});

  // Calculate overall statistics
  const overallStats = {
    totalEntries,
    averageScore: totalEntries > 0 ? Number((totalScore / totalEntries).toFixed(1)) : 0,
    mostFrequentMood:
      totalEntries > 0
        ? Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        : null,
    dailyAverage: Number((totalEntries / daysInPeriod).toFixed(1)),
  };

  return {
    success: true,
    data: {
      timeline: analyticsData,
      stats: overallStats,
      entries,
      hasAnyEntries: allTimeEntriesCount > 0,
    },
  };
}
