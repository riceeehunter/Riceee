"use server";

import { db } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";

export async function getAnalytics(period = "30d") {
  const user = await getOrCreateUser();

  // Calculate start date based on period
  const startDate = new Date();
  switch (period) {
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "15d":
      startDate.setDate(startDate.getDate() - 15);
      break;
    case "30d":
    default:
      startDate.setDate(startDate.getDate() - 30);
      break;
  }

  // Get entries for the period
  const entries = await db.entry.findMany({
    where: {
      userId: user.id,
      createdAt: {
        gte: startDate,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const allTimeEntriesCount = await db.entry.count({
    where: {
      userId: user.id,
    },
  });

  // Process entries for analytics
  const moodData = entries.reduce((acc, entry) => {
    const date = entry.createdAt.toISOString().split("T")[0];
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

  // Fill in missing dates to create a continuous timeline
  const daysInPeriod = period === "7d" ? 7 : period === "15d" ? 15 : 30;
  const allDates = [];
  for (let i = daysInPeriod - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    allDates.push(date.toISOString().split("T")[0]);
  }

  // Calculate averages and format data for charts with all dates
  const analyticsData = allDates.map((date) => {
    const data = moodData[date];
    return {
      date,
      averageScore: data ? Number((data.totalScore / data.count).toFixed(1)) : null,
      entryCount: data ? data.count : 0,
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
    dailyAverage: Number(
      (
        totalEntries / (period === "7d" ? 7 : period === "15d" ? 15 : 30)
      ).toFixed(1)
    ),
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
