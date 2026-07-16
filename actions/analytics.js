"use server";

import { db } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";
import { resolveAuthorName } from "@/lib/constants/players";
import { resolvePartnerNames } from "@/lib/constants/partner-names";

// Which calendar day an instant falls on, in the reader's timezone.
// Using UTC here silently shifted late-night entries to the previous day
// (an 00:30 IST entry is still the day before in UTC).
/**
 * Consecutive days ending today that have at least one entry.
 *
 * Computed from every entry the space has, never from the chart's timeline: the
 * timeline stops at the selected period, so a 40-day streak would read as "7"
 * on the 7d view.
 *
 * Today counts as grace, not a miss. Writing yesterday but not yet today keeps
 * the streak standing until midnight -- breaking it at 00:01 for a day the user
 * still has 23 hours to fill is just cruel.
 */
function computeStreak(dayKeys, zone) {
  const have = new Set(dayKeys);
  const todayKey = dayKeyInTimeZone(new Date(), zone);
  // Noon anchor so stepping back a day can't drift across a DST boundary.
  const anchor = new Date(`${todayKey}T12:00:00Z`);

  const keyAt = (daysAgo) => {
    const day = new Date(anchor);
    day.setUTCDate(day.getUTCDate() - daysAgo);
    return day.toISOString().split("T")[0];
  };

  const wroteToday = have.has(keyAt(0));

  let offset = wroteToday ? 0 : 1;
  let current = 0;
  while (have.has(keyAt(offset))) {
    current += 1;
    offset += 1;
  }

  // Longest run anywhere in the history, for the "your best was N" nudge.
  const sorted = [...have].sort();
  let longest = 0;
  let run = 0;
  let previous = null;
  for (const key of sorted) {
    if (previous) {
      const gap = (new Date(`${key}T12:00:00Z`) - new Date(`${previous}T12:00:00Z`)) / 86400000;
      run = Math.round(gap) === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    previous = key;
  }

  return { current, longest, wroteToday };
}

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
  const partnerNames = resolvePartnerNames(user);

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

  // Every entry's timestamp, not just this period's -- the streak has to be able
  // to run past the edge of the chart. Only createdAt is selected, so this stays
  // cheap as a journal grows.
  const allEntryDates = await db.entry.findMany({
    where: { userId: user.id },
    select: { createdAt: true },
  });

  const allTimeEntriesCount = allEntryDates.length;
  const streak = computeStreak(
    allEntryDates.map((entry) => dayKeyInTimeZone(entry.createdAt, zone)),
    zone
  );

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
            author: resolveAuthorName(entry.author, partnerNames),
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
      streak,
      hasAnyEntries: allTimeEntriesCount > 0,
    },
  };
}
