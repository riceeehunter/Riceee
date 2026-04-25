"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GitCompare, Check } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";
import { PLAYER_IDS, getOtherPlayer } from "@/lib/constants/players";

const CHANNEL_NAME = "game-this-or-that";

const ALL_QUESTIONS = [
  { this: "Coffee ☕", that: "Tea 🍵" },
  { this: "Beach 🏖️", that: "Mountains ⛰️" },
  { this: "Dogs 🐕", that: "Cats 🐈" },
  { this: "Summer ☀️", that: "Winter ❄️" },
  { this: "Books 📚", that: "Movies 🎬" },
  { this: "Pizza 🍕", that: "Burgers 🍔" },
  { this: "Morning 🌅", that: "Night 🌙" },
  { this: "Text 💬", that: "Call 📞" },
  { this: "Chocolate 🍫", that: "Vanilla 🍦" },
  { this: "City 🏙️", that: "Countryside 🌾" },
  { this: "Netflix 📺", that: "Gaming 🎮" },
  { this: "Hot 🔥", that: "Cold 🧊" },
  { this: "Sweet 🍭", that: "Salty 🥨" },
  { this: "Early Bird 🐦", that: "Night Owl 🦉" },
  { this: "Singing 🎤", that: "Dancing 💃" },
  { this: "Android 🤖", that: "iOS 🍎" },
  { this: "Past 📜", that: "Future 🚀" },
  { this: "Invisibility 👻", that: "Flying 🦅" },
  { this: "Rich 💰", that: "Famous 🌟" },
  { this: "Adventure 🗺️", that: "Comfort 🛋️" },
];

function ThisOrThatGame({ localPlayer, sessionId, getPlayerName }) {

  const [gameState, setGameState] = useState("menu");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [localAnswers, setLocalAnswers] = useState([]);
  const [remoteAnswers, setRemoteAnswers] = useState([]);
  const [localFinished, setLocalFinished] = useState(false);
  const [remoteFinished, setRemoteFinished] = useState(false);
  const [pusherClient, setPusherClient] = useState(null);
  const [channel, setChannel] = useState(null);

  const remotePlayerId = getOtherPlayer(localPlayer);
  const localPlayerName = getPlayerName(localPlayer);
  const remotePlayerName = getPlayerName(remotePlayerId);

  // Initialize Pusher
  useEffect(() => {
    if (!localPlayer) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const gameChannel = pusher.subscribe(CHANNEL_NAME);
    setPusherClient(pusher);
    setChannel(gameChannel);

    return () => {
      gameChannel.unsubscribe();
      pusher.disconnect();
    };
  }, [localPlayer]);

  // Listen for game events
  useEffect(() => {
    if (!channel) return;

    channel.bind("game-start", (data) => {
      setQuestions(data.questions);
      setCurrentQuestion(0);
      setLocalAnswers([]);
      setRemoteAnswers([]);
      setLocalFinished(false);
      setRemoteFinished(false);
      setGameState("playing");
    });

    channel.bind("answer-submitted", (data) => {
      if (data.player !== localPlayer) {
        setRemoteAnswers(data.answers);
        if (data.finished) {
          setRemoteFinished(true);
        }
      }
    });

    return () => {
      channel.unbind("game-start");
      channel.unbind("answer-submitted");
    };
  }, [channel, localPlayer]);

  // Check if both finished
  useEffect(() => {
    if (localFinished && remoteFinished && gameState === "playing") {
      setGameState("finished");
    }
  }, [localFinished, remoteFinished, gameState]);

  const startGame = async () => {
    if (!channel) return;

    // Shuffle and pick 10 questions
    const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);

    await fetch("/api/pusher/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: "game-start",
        data: { questions: shuffled },
      }),
    });

    setCurrentQuestion(0);
    setLocalAnswers([]);
    setRemoteAnswers([]);
    setLocalFinished(false);
    setRemoteFinished(false);
    setGameState("playing");
  };

  const handleChoice = async (choice) => {
    const newAnswers = [...localAnswers, choice];
    setLocalAnswers(newAnswers);

    const isFinished = currentQuestion >= questions.length - 1;

    if (isFinished) {
      setLocalFinished(true);
    }

    await fetch("/api/pusher/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: CHANNEL_NAME,
        event: "answer-submitted",
        data: {
          player: localPlayer,
          answers: newAnswers,
          finished: isFinished,
        },
      }),
    });

    if (!isFinished) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const getMatchCount = () => {
    let matches = 0;
    for (let i = 0; i < Math.min(localAnswers.length, remoteAnswers.length); i++) {
      if (localAnswers[i] === remoteAnswers[i]) {
        matches++;
      }
    }
    return matches;
  };

  const playerColors = {
    [PLAYER_IDS.ONE]: { border: "border-orange-500", bg: "bg-orange-500/20", text: "text-orange-500" },
    [PLAYER_IDS.TWO]: { border: "border-pink-500", bg: "bg-pink-500/20", text: "text-pink-500" },
  };

  const localColor = playerColors[localPlayer] || playerColors[PLAYER_IDS.ONE];
  const remoteColor = playerColors[remotePlayerId] || playerColors[PLAYER_IDS.TWO];

  if (questions.length === 0 && gameState === "playing") {
    return <div className="flex items-center justify-center min-h-dvh">Loading questions...</div>;
  }

  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
      <Link href="/games">
        <Button variant="ghost" className="mb-4 sm:mb-6">
          <ArrowLeft className="mr-2" size={16} />
          Back to Games
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl text-center">
            <GitCompare className="inline mr-2 mb-1" size={28} />
            This or That
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gameState === "menu" && (
            <div className="text-center space-y-4 sm:space-y-6">
              <div className="text-5xl sm:text-6xl mb-4">🤔</div>
              <h2 className="text-xl sm:text-2xl font-bold">Quick Choices, Compare Preferences!</h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-4">
                Both answer 10 fun questions and see how your choices compare with {remotePlayerName}!
              </p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm mx-auto px-4">
                <div className="p-4 sm:p-6 bg-muted rounded-lg">
                  <div className="text-3xl sm:text-4xl mb-2">⚡</div>
                  <p className="text-xs sm:text-sm font-bold">Quick & Fun</p>
                </div>
                <div className="p-4 sm:p-6 bg-muted rounded-lg">
                  <div className="text-3xl sm:text-4xl mb-2">🎯</div>
                  <p className="text-xs sm:text-sm font-bold">Compare Choices</p>
                </div>
              </div>
              <Button onClick={startGame} size="lg" className="text-base sm:text-lg px-6 sm:px-8">
                Start Choosing! 🤔
              </Button>
            </div>
          )}

          {gameState === "playing" && !localFinished && (
            <div className="space-y-4 sm:space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                  <span>Question {currentQuestion + 1} of {questions.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Status indicators */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className={`p-2 sm:p-3 rounded-lg border-2 ${localColor.border} ${localColor.bg}`}>
                  <span className="font-bold">{localPlayerName}</span>
                  <span className="ml-2">{localAnswers.length}/{questions.length}</span>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg border-2 ${remoteColor.border} ${remoteColor.bg}`}>
                  <span className="font-bold">{remotePlayerName}</span>
                  <span className="ml-2">{remoteAnswers.length}/{questions.length}</span>
                  {remoteFinished && <Check className="inline ml-1 w-4 h-4 text-green-600" />}
                </div>
              </div>

              {/* Question */}
              <div className="text-center py-4 sm:py-8">
                <h3 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-8 px-2">Which do you prefer?</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 max-w-2xl mx-auto px-2">
                  {/* This */}
                  <button
                    onClick={() => handleChoice("this")}
                    className="p-6 sm:p-8 bg-muted hover:bg-muted/80 rounded-xl border-2 hover:border-primary transition-all transform active:scale-95 sm:hover:scale-105"
                  >
                    <div className="text-4xl sm:text-5xl mb-2 sm:mb-4">
                      {questions[currentQuestion].this.split(" ").pop()}
                    </div>
                    <p className="text-base sm:text-xl font-bold">
                      {questions[currentQuestion].this.split(" ").slice(0, -1).join(" ")}
                    </p>
                  </button>

                  {/* That */}
                  <button
                    onClick={() => handleChoice("that")}
                    className="p-6 sm:p-8 bg-muted hover:bg-muted/80 rounded-xl border-2 hover:border-primary transition-all transform active:scale-95 sm:hover:scale-105"
                  >
                    <div className="text-4xl sm:text-5xl mb-2 sm:mb-4">
                      {questions[currentQuestion].that.split(" ").pop()}
                    </div>
                    <p className="text-base sm:text-xl font-bold">
                      {questions[currentQuestion].that.split(" ").slice(0, -1).join(" ")}
                    </p>
                  </button>
                </div>
              </div>

              <p className="text-center text-xs sm:text-sm text-muted-foreground px-4">
                Choose quickly - go with your gut feeling! 💭
              </p>
            </div>
          )}

          {gameState === "playing" && localFinished && !remoteFinished && (
            <div className="text-center space-y-4 sm:space-y-6 py-8">
              <div className="text-5xl sm:text-6xl mb-4">⏳</div>
              <h2 className="text-xl sm:text-2xl font-bold">You're Done!</h2>
              <p className="text-sm sm:text-base text-muted-foreground px-4">
                Waiting for {remotePlayerName} to finish answering...
              </p>
              <div className="animate-pulse">
                <div className={`inline-block p-3 sm:p-4 rounded-lg border-2 ${remoteColor.border} ${remoteColor.bg}`}>
                  <span className="font-bold capitalize">{remotePlayerName}</span>
                  <span className="ml-2">{remoteAnswers.length}/{questions.length}</span>
                </div>
              </div>
            </div>
          )}

          {gameState === "finished" && (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <div className="text-5xl sm:text-6xl mb-4">🎉</div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Results Are In!</h2>
                <p className="text-sm sm:text-base text-muted-foreground px-4">
                  You matched on {getMatchCount()} out of {questions.length} questions!
                </p>
              </div>

              {/* Match percentage */}
              <div className="max-w-md mx-auto p-4 sm:p-6 bg-muted rounded-xl text-center">
                <div className="text-4xl sm:text-5xl font-bold mb-2">
                  {Math.round((getMatchCount() / questions.length) * 100)}%
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {getMatchCount() >= 7 ? "Amazing match! 🤝" : getMatchCount() >= 5 ? "Pretty similar! 👍" : "Opposites attract! 💫"}
                </p>
              </div>

              {/* Comparison Table */}
              <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto px-1">
                {questions.map((q, index) => {
                  const localChoice = localAnswers[index];
                  const remoteChoice = remoteAnswers[index];
                  const matched = localChoice === remoteChoice;

                  return (
                    <div
                      key={index}
                      className={`p-3 sm:p-4 rounded-lg border-2 ${
                        matched ? "border-green-500 bg-green-500/10" : "border-border bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                          Q{index + 1}
                        </span>
                        {matched && (
                          <span className="text-xs sm:text-sm font-bold text-green-600">
                            ✓ Match!
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                        <div className={`p-2 sm:p-3 rounded-lg border ${localColor.border} ${localColor.bg}`}>
                          <div className="font-bold mb-1">{localPlayerName}</div>
                          <div className="truncate">
                            {localChoice === "this" ? q.this : q.that}
                          </div>
                        </div>
                        <div className={`p-2 sm:p-3 rounded-lg border ${remoteColor.border} ${remoteColor.bg}`}>
                          <div className="font-bold mb-1">{remotePlayerName}</div>
                          <div className="truncate">
                            {remoteChoice === "this" ? q.this : q.that}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 sm:gap-4 justify-center flex-wrap px-2">
                <Button onClick={startGame} size="lg" className="text-sm sm:text-base">
                  Play Again 🔄
                </Button>
                <Link href="/games">
                  <Button variant="outline" size="lg" className="text-sm sm:text-base">
                    Choose Another Game
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

export default function ThisOrThat() {
  return (
    <LocalMultiplayerWrapper gameId="this-or-that" gameName="This or That">
      {(props) => <ThisOrThatGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
