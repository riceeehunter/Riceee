"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Calendar, Trophy, Flame } from "lucide-react";
import Link from "next/link";

const DAILY_DARES = [
  { id: 1, dare: "Write 3 things you're grateful for", emoji: "🙏", points: 10 },
  { id: 2, dare: "Drink 8 glasses of water today", emoji: "💧", points: 10 },
  { id: 3, dare: "Do 20 push-ups or squats", emoji: "💪", points: 15 },
  { id: 4, dare: "Read for 30 minutes", emoji: "📚", points: 15 },
  { id: 5, dare: "No social media for 2 hours", emoji: "📵", points: 20 },
  { id: 6, dare: "Meditate for 10 minutes", emoji: "🧘", points: 15 },
  { id: 7, dare: "Compliment 3 people today", emoji: "💝", points: 10 },
  { id: 8, dare: "Learn 5 new words", emoji: "📖", points: 15 },
  { id: 9, dare: "Take a 30-minute walk", emoji: "🚶", points: 15 },
  { id: 10, dare: "Try a new healthy recipe", emoji: "🥗", points: 20 },
  { id: 11, dare: "Journal about your day", emoji: "📝", points: 10 },
  { id: 12, dare: "No snacking after 8 PM", emoji: "🚫", points: 20 },
  { id: 13, dare: "Stretch for 15 minutes", emoji: "🤸", points: 10 },
  { id: 14, dare: "Call a friend or family", emoji: "📞", points: 15 },
  { id: 15, dare: "Clean one room completely", emoji: "🧹", points: 15 },
];

export default function DailyDare() {
  const [gameState, setGameState] = useState("menu");
  const [todaysDare, setTodaysDare] = useState(null);
  const [completedDares, setCompletedDares] = useState([]);
  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    // Load saved data from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dailyDareData");
      if (saved) {
        const data = JSON.parse(saved);
        setCompletedDares(data.completed || []);
        setStreak(data.streak || 0);
        setTotalPoints(data.points || 0);
      }
    }
  }, []);

  useEffect(() => {
    // Generate today's dare based on date
    const today = new Date().toDateString();
    const dayIndex = new Date().getDate() % DAILY_DARES.length;
    setTodaysDare({ ...DAILY_DARES[dayIndex], date: today });
  }, []);

  const saveData = (completed, streakVal, points) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "dailyDareData",
        JSON.stringify({
          completed,
          streak: streakVal,
          points,
        })
      );
    }
  };

  const startChallenge = () => {
    setGameState("challenge");
  };

  const completeDare = () => {
    const today = new Date().toDateString();
    
    // Check if already completed today
    if (completedDares.some(d => d.date === today)) {
      alert("You've already completed today's dare! Come back tomorrow! 🌟");
      return;
    }

    const newCompleted = [...completedDares, { date: today, dare: todaysDare }];
    const newStreak = streak + 1;
    const newPoints = totalPoints + todaysDare.points;

    setCompletedDares(newCompleted);
    setStreak(newStreak);
    setTotalPoints(newPoints);
    saveData(newCompleted, newStreak, newPoints);
    setGameState("completed");
  };

  const isCompletedToday = () => {
    const today = new Date().toDateString();
    return completedDares.some(d => d.date === today);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/games">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2" size={16} />
          Back to Games
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl text-center bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
            <Target className="inline mr-2 mb-1" size={32} />
            Daily Dare
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gameState === "menu" && (
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold">Build Better Habits!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Complete daily challenges to build healthy habits and earn points.
                Keep your streak alive and become the best version of yourself!
              </p>

              {/* Stats Dashboard */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto my-6">
                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-lg">
                  <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <p className="text-2xl font-bold text-orange-600">{streak}</p>
                  <p className="text-xs font-semibold text-muted-foreground">Day Streak</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-lg">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                  <p className="text-2xl font-bold text-yellow-600">{totalPoints}</p>
                  <p className="text-xs font-semibold text-muted-foreground">Total Points</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">{completedDares.length}</p>
                  <p className="text-xs font-semibold text-muted-foreground">Completed</p>
                </div>
              </div>

              {/* Today's Dare Preview */}
              {todaysDare && (
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-6 rounded-xl border-2 border-rose-200 max-w-md mx-auto">
                  <p className="text-sm text-rose-600 font-semibold mb-2">TODAY'S CHALLENGE</p>
                  <div className="text-4xl mb-3">{todaysDare.emoji}</div>
                  <p className="text-lg font-bold mb-2">{todaysDare.dare}</p>
                  <div className="flex items-center justify-center gap-2 text-sm text-pink-600">
                    <Star className="w-4 h-4" />
                    <span className="font-semibold">{todaysDare.points} points</span>
                  </div>
                </div>
              )}

              {isCompletedToday() ? (
                <div className="space-y-4">
                  <div className="text-green-600 font-bold">✅ Today's dare completed!</div>
                  <p className="text-sm text-muted-foreground">Come back tomorrow for a new challenge!</p>
                </div>
              ) : (
                <Button onClick={startChallenge} size="lg" className="text-lg px-8">
                  Accept Today&apos;s Dare! 🎯
                </Button>
              )}

              {/* Recent Completions */}
              {completedDares.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-bold mb-3">Recent Completions 🌟</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {completedDares.slice(-5).reverse().map((item, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <span>{item.dare.emoji}</span>
                          <span className="font-medium">{item.dare.dare}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{item.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {gameState === "challenge" && todaysDare && (
            <div className="text-center space-y-6">
              <div className="text-7xl mb-4">{todaysDare.emoji}</div>
              <h2 className="text-3xl font-bold">Today&apos;s Dare</h2>
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-8 rounded-xl border-2 border-rose-200 max-w-md mx-auto">
                <p className="text-2xl font-bold mb-4">{todaysDare.dare}</p>
                <div className="flex items-center justify-center gap-2 text-lg text-pink-600">
                  <Trophy className="w-5 h-5" />
                  <span className="font-semibold">Reward: {todaysDare.points} points</span>
                </div>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <p className="text-muted-foreground">
                  Complete this challenge today and click the button below to mark it as done!
                </p>
                
                <div className="flex gap-4 justify-center flex-wrap">
                  <Button onClick={completeDare} size="lg" className="bg-green-600 hover:bg-green-700">
                    ✓ I Did It!
                  </Button>
                  <Button variant="outline" onClick={() => setGameState("menu")} size="lg">
                    Maybe Later
                  </Button>
                </div>
              </div>
            </div>
          )}

          {gameState === "completed" && (
            <div className="text-center space-y-6">
              <div className="text-7xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold">Awesome Job!</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                You&apos;ve completed today&apos;s dare and earned {todaysDare?.points} points!
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="bg-orange-50 p-6 rounded-lg">
                  <Flame className="w-10 h-10 mx-auto mb-2 text-orange-500" />
                  <p className="text-3xl font-bold text-orange-600">{streak}</p>
                  <p className="text-sm font-semibold">Day Streak 🔥</p>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <Trophy className="w-10 h-10 mx-auto mb-2 text-yellow-600" />
                  <p className="text-3xl font-bold text-yellow-600">{totalPoints}</p>
                  <p className="text-sm font-semibold">Total Points</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Come back tomorrow for a new challenge! 💪
              </p>

              <div className="flex gap-4 justify-center flex-wrap">
                <Button onClick={() => setGameState("menu")} size="lg">
                  View Dashboard 📊
                </Button>
                <Link href="/games">
                  <Button variant="outline" size="lg">
                    Try Other Games
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Star({ className }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
