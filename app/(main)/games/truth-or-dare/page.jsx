"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Heart } from "lucide-react";
import Link from "next/link";

const TRUTH_QUESTIONS = [
  "What's your biggest fear? 😨",
  "Who was your first crush? 💕",
  "What's your most embarrassing moment? 😳",
  "What's a secret you've never told anyone? 🤫",
  "What's your biggest regret? 💭",
  "Who do you secretly admire? ⭐",
  "What's the last lie you told? 🤥",
  "What's your guilty pleasure? 😅",
  "If you could change one thing about yourself, what would it be? 🔄",
  "What's the meanest thing you've ever done? 😔",
  "Who was the last person you stalked online? 👀",
  "What's something you're glad your parents don't know? 🙈",
  "What's your biggest insecurity? 💔",
  "Have you ever broken someone's heart? 💔",
  "What's the most childish thing you still do? 🧸",
];

const DARE_CHALLENGES = [
  "Do 20 jumping jacks right now! 🤸",
  "Send a silly selfie to someone 🤳",
  "Speak in an accent for the next 3 minutes 🗣️",
  "Do your best animal impression 🐶",
  "Dance with no music for 30 seconds 💃",
  "Tell a joke (it can be bad!) 😄",
  "Do 10 pushups 💪",
  "Sing your favorite song loudly 🎤",
  "Call someone and tell them a compliment 📞",
  "Post something embarrassing on your story 📱",
  "Talk without closing your mouth for 1 minute 😮",
  "Do a cartwheel or attempt one 🤸",
  "Let someone go through your photos for 30 seconds 📸",
  "Eat something without using your hands 🍽️",
  "Do your best celebrity impression 🌟",
];

export default function TruthOrDare() {
  const [gameState, setGameState] = useState("menu");
  const [currentType, setCurrentType] = useState(null);
  const [currentChallenge, setCurrentChallenge] = useState("");
  const [score, setScore] = useState({ truths: 0, dares: 0 });

  const startGame = () => {
    setGameState("choosing");
    setScore({ truths: 0, dares: 0 });
  };

  const chooseType = (type) => {
    setCurrentType(type);
    
    if (type === "truth") {
      const question = TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)];
      setCurrentChallenge(question);
    } else {
      const dare = DARE_CHALLENGES[Math.floor(Math.random() * DARE_CHALLENGES.length)];
      setCurrentChallenge(dare);
    }
    
    setGameState("challenge");
  };

  const completeChallenge = () => {
    if (currentType === "truth") {
      setScore({ ...score, truths: score.truths + 1 });
    } else {
      setScore({ ...score, dares: score.dares + 1 });
    }
    setGameState("choosing");
    setCurrentType(null);
    setCurrentChallenge("");
  };

  const skipChallenge = () => {
    setGameState("choosing");
    setCurrentType(null);
    setCurrentChallenge("");
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
          <CardTitle className="text-3xl text-center bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">
            <MessageCircle className="inline mr-2 mb-1" size={32} />
            Truth or Dare
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gameState === "menu" && (
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">🎭</div>
              <h2 className="text-2xl font-bold">Build Deeper Connections!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                The classic game of Truth or Dare! Share secrets, take on challenges,
                and create memorable moments with friends. Perfect for building emotional connections!
              </p>

              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto my-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
                  <div className="text-4xl mb-3">💭</div>
                  <p className="text-lg font-bold text-blue-700">Truth</p>
                  <p className="text-sm text-muted-foreground mt-2">Answer honestly</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
                  <div className="text-4xl mb-3">⚡</div>
                  <p className="text-lg font-bold text-purple-700">Dare</p>
                  <p className="text-sm text-muted-foreground mt-2">Take the challenge</p>
                </div>
              </div>

              <Button onClick={startGame} size="lg" className="text-lg px-8">
                Start Playing! 🎭
              </Button>
            </div>
          )}

          {gameState === "choosing" && (
            <div className="text-center space-y-6">
              {/* Score Display */}
              <div className="flex justify-center gap-4 mb-8">
                <div className="bg-blue-50 px-6 py-3 rounded-lg">
                  <p className="text-sm text-blue-600 font-semibold">Truths</p>
                  <p className="text-2xl font-bold text-blue-700">{score.truths}</p>
                </div>
                <div className="bg-purple-50 px-6 py-3 rounded-lg">
                  <p className="text-sm text-purple-600 font-semibold">Dares</p>
                  <p className="text-2xl font-bold text-purple-700">{score.dares}</p>
                </div>
              </div>

              <h2 className="text-3xl font-bold mb-8">Choose Wisely...</h2>

              {/* Choice Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <button
                  onClick={() => chooseType("truth")}
                  className="group relative p-12 bg-gradient-to-br from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 rounded-2xl border-4 border-blue-300 hover:border-blue-400 transition-all transform hover:scale-105"
                >
                  <div className="text-7xl mb-4">💭</div>
                  <p className="text-3xl font-bold text-blue-700">TRUTH</p>
                  <p className="text-sm text-blue-600 mt-2">Answer a question honestly</p>
                </button>

                <button
                  onClick={() => chooseType("dare")}
                  className="group relative p-12 bg-gradient-to-br from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 rounded-2xl border-4 border-purple-300 hover:border-purple-400 transition-all transform hover:scale-105"
                >
                  <div className="text-7xl mb-4">⚡</div>
                  <p className="text-3xl font-bold text-purple-700">DARE</p>
                  <p className="text-sm text-purple-600 mt-2">Complete a challenge</p>
                </button>
              </div>

              <Button variant="outline" onClick={() => setGameState("menu")} className="mt-6">
                End Game
              </Button>
            </div>
          )}

          {gameState === "challenge" && (
            <div className="text-center space-y-6">
              <div className={`inline-block px-6 py-2 rounded-full text-sm font-bold ${
                currentType === "truth" 
                  ? "bg-blue-100 text-blue-700" 
                  : "bg-purple-100 text-purple-700"
              }`}>
                {currentType === "truth" ? "💭 TRUTH" : "⚡ DARE"}
              </div>

              <div className={`bg-gradient-to-br ${
                currentType === "truth"
                  ? "from-blue-50 to-indigo-50 border-blue-200"
                  : "from-purple-50 to-pink-50 border-purple-200"
              } p-8 md:p-12 rounded-2xl border-4 max-w-2xl mx-auto min-h-[300px] flex flex-col justify-center`}>
                <div className="text-6xl mb-6">
                  {currentType === "truth" ? "🤔" : "🎯"}
                </div>
                <p className="text-2xl md:text-3xl font-bold leading-relaxed">
                  {currentChallenge}
                </p>
              </div>

              {currentType === "truth" ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Answer this question honestly with your group!
                  </p>
                  <div className="flex gap-4 justify-center flex-wrap">
                    <Button onClick={completeChallenge} size="lg" className="bg-blue-600 hover:bg-blue-700">
                      <Heart className="mr-2" size={18} />
                      I Answered Honestly
                    </Button>
                    <Button variant="outline" onClick={skipChallenge} size="lg">
                      Skip This One
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Complete this dare to earn points!
                  </p>
                  <div className="flex gap-4 justify-center flex-wrap">
                    <Button onClick={completeChallenge} size="lg" className="bg-purple-600 hover:bg-purple-700">
                      ✓ I Did It!
                    </Button>
                    <Button variant="outline" onClick={skipChallenge} size="lg">
                      Too Scary! Skip
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
