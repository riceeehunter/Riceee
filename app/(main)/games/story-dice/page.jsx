"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dices, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { LocalMultiplayerWrapper } from "@/components/local-multiplayer-wrapper";
import Pusher from "pusher-js";

const STORY_ELEMENTS = {
  characters: ["🧙‍♂️ A wizard", "🦸‍♀️ A superhero", "🐉 A dragon", "👸 A princess", "🤖 A robot", "🧛‍♂️ A vampire", "🦊 A clever fox", "👻 A friendly ghost"],
  settings: ["🏰 in a castle", "🌋 on a volcano", "🏝️ on a desert island", "🚀 in space", "🌲 in an enchanted forest", "🏙️ in a futuristic city", "🏔️ on a mountain peak", "🌊 under the sea"],
  objects: ["💎 a magical gem", "📜 an ancient scroll", "⚔️ a legendary sword", "🔮 a crystal ball", "🗝️ a mysterious key", "📱 a time-traveling phone", "🎭 a cursed mask", "🌟 a shooting star"],
  twists: ["but everything was a dream", "and discovered a hidden power", "while time was running backwards", "as reality started glitching", "and made an unlikely friend", "but had to make a sacrifice", "and learned a valuable lesson", "while the world watched"],
};

function StoryDiceGame({ localPlayer, sessionId }) {
  const [gameState, setGameState] = useState("lobby");
  const [rolledStory, setRolledStory] = useState(null);
  const [userStory, setUserStory] = useState("");
  const [remoteStory, setRemoteStory] = useState("");
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [localFinished, setLocalFinished] = useState(false);
  const [remoteFinished, setRemoteFinished] = useState(false);
  const [matchId, setMatchId] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [pusher, setPusher] = useState(null);
  const [channel, setChannel] = useState(null);

  const matchIdRef = useRef(matchId);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const remotePlayer = localPlayer === "hunter" ? "riceee" : "hunter";
  const channelName = `game-story-dice-${sessionId}`;

  const safeTrigger = useCallback(
    async (event, data) => {
      try {
        await fetch("/api/pusher/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: channelName,
            event,
            data,
          }),
        });
      } catch (err) {
        console.error(`[${localPlayer}] Failed to trigger ${event}`, err);
      }
    },
    [channelName, localPlayer]
  );

  const resetToLobby = useCallback(() => {
    setGameState("lobby");
    setRolledStory(null);
    setUserStory("");
    setRemoteStory("");
    setLocalReady(false);
    setRemoteReady(false);
    setLocalFinished(false);
    setRemoteFinished(false);
    setMatchId(null);
    setIsRolling(false);
  }, []);

  // Initialize Pusher
  useEffect(() => {
    setRemoteConnected(false);
    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const gameChannel = pusherClient.subscribe(channelName);
    
    gameChannel.bind('pusher:subscription_succeeded', () => {
      console.log(`[${localPlayer}] ✅ Subscribed to ${channelName}`);
      // Announce presence
      safeTrigger("player-joined", { player: localPlayer });
    });

    // Listen for other player joining
    gameChannel.bind('player-joined', (data) => {
      if (data.player !== localPlayer) {
        console.log(`[${localPlayer}] ✅ Partner ${data.player} joined!`);
        setRemoteConnected(true);
      }
    });

    gameChannel.bind("player-ready", (data) => {
      if (data?.player === localPlayer) return;
      setRemoteConnected(true);
      setRemoteReady(Boolean(data?.ready));
    });

    gameChannel.bind("game-start", (data) => {
      if (!data?.matchId || !data?.elements) return;
      setMatchId(data.matchId);
      setRolledStory(data.elements);
      setIsRolling(false);
      setGameState("creating");
      setUserStory("");
      setRemoteStory("");
      setLocalFinished(false);
      setRemoteFinished(false);
      setLocalReady(false);
      setRemoteReady(false);
    });

    // Listen for story updates
    gameChannel.bind('story-update', (data) => {
      if (!data?.matchId || data.matchId !== matchIdRef.current) return;
      if (data.player !== localPlayer) {
        setRemoteStory(data.story || "");
        setRemoteConnected(true);
      }
    });

    gameChannel.bind("player-finished", (data) => {
      if (!data?.matchId || data.matchId !== matchIdRef.current) return;
      if (data?.player === localPlayer) return;
      setRemoteStory(typeof data?.story === "string" ? data.story : "");
      setRemoteFinished(Boolean(data?.finished));
    });

    gameChannel.bind("back-to-lobby", (data) => {
      if (data?.player === localPlayer) return;
      // Do not forcefully reset the other side mid-writing; only react if we are already in lobby.
      if (gameStateRef.current === "lobby") {
        setRemoteReady(false);
      }
    });

    setPusher(pusherClient);
    setChannel(gameChannel);

    return () => {
      gameChannel.unbind_all();
      pusherClient.unsubscribe(channelName);
      pusherClient.disconnect();
    };
  }, [channelName, localPlayer, safeTrigger]);

  // Broadcast story changes
  const broadcastStory = useCallback((story) => {
    if (!matchId) return;
    if (!channel) return;
    safeTrigger("story-update", {
      matchId,
      player: localPlayer,
      story,
      timestamp: Date.now(),
    });
  }, [channel, localPlayer, matchId, safeTrigger]);

  // Debounced story broadcast
  useEffect(() => {
    if (gameState === "creating") {
      const timer = setTimeout(() => {
        broadcastStory(userStory);
      }, 500); // Broadcast 500ms after user stops typing
      return () => clearTimeout(timer);
    }
  }, [userStory, gameState, broadcastStory]);

  const generateStoryElements = () => {
    const character = STORY_ELEMENTS.characters[Math.floor(Math.random() * STORY_ELEMENTS.characters.length)];
    const setting = STORY_ELEMENTS.settings[Math.floor(Math.random() * STORY_ELEMENTS.settings.length)];
    const object = STORY_ELEMENTS.objects[Math.floor(Math.random() * STORY_ELEMENTS.objects.length)];
    const twist = STORY_ELEMENTS.twists[Math.floor(Math.random() * STORY_ELEMENTS.twists.length)];
    return { character, setting, object, twist };
  };

  const toggleReady = async () => {
    const next = !localReady;
    setLocalReady(next);
    await safeTrigger("player-ready", {
      player: localPlayer,
      ready: next,
      timestamp: Date.now(),
    });
  };

  const startGame = async () => {
    if (!remoteConnected || !localReady || !remoteReady) return;
    if (gameState !== "lobby") return;

    setIsRolling(true);
    const nextMatchId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const elements = generateStoryElements();

    // Apply locally immediately.
    setMatchId(nextMatchId);
    setRolledStory(elements);
    setUserStory("");
    setRemoteStory("");
    setLocalFinished(false);
    setRemoteFinished(false);
    setLocalReady(false);
    setRemoteReady(false);
    setGameState("creating");
    setIsRolling(false);

    // Broadcast start once.
    await safeTrigger("game-start", {
      matchId: nextMatchId,
      elements,
      startedBy: localPlayer,
      timestamp: Date.now(),
    });
  };

  const finishMyStory = async () => {
    if (gameState !== "creating" || !matchId) return;
    setLocalFinished(true);
    await safeTrigger("player-finished", {
      matchId,
      player: localPlayer,
      finished: true,
      story: userStory,
      timestamp: Date.now(),
    });
  };

  // Auto-transition to finished when both done.
  useEffect(() => {
    if (gameState !== "creating") return;
    if (localFinished && remoteFinished) {
      setGameState("finished");
    }
  }, [gameState, localFinished, remoteFinished]);

  const playerColor = localPlayer === "hunter" ? "orange" : "pink";
  const remoteColor = remotePlayer === "hunter" ? "orange" : "pink";

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
          <CardTitle className="text-2xl sm:text-3xl text-center bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
            <Dices className="inline mr-2 mb-1" size={28} />
            Story Dice
          </CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Users size={16} className={remoteConnected ? "text-green-500" : "text-gray-400"} />
            <p className={`text-xs sm:text-sm ${remoteConnected ? "text-green-600 font-bold" : "text-muted-foreground"}`}>
              {remoteConnected ? "💚 Partner Connected!" : "⏳ Waiting for partner..."}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {gameState === "lobby" && (
            <div className="text-center space-y-4 sm:space-y-6">
              <div className="text-5xl sm:text-6xl mb-4">📖</div>
              <h2 className="text-xl sm:text-2xl font-bold px-2">Create Unique Stories Together!</h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-2">
                Wait for both players to connect, then get matching story elements and write together.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto my-4 sm:my-6">
                <div className={`p-3 sm:p-4 ${playerColor === "orange" ? "bg-orange-50 border-2 border-orange-300" : "bg-pink-50 border-2 border-pink-300"} rounded-lg`}>
                  <div className="text-2xl sm:text-3xl mb-2">{localPlayer === "hunter" ? "🦁" : "💗"}</div>
                  <p className="text-xs sm:text-sm font-bold">{localPlayer === "hunter" ? "Partner 1" : "Partner 2"}</p>
                  <p className={`mt-1 text-xs ${localReady ? "text-green-700 font-bold" : "text-muted-foreground"}`}>
                    {localReady ? "Ready" : "Not ready"}
                  </p>
                </div>
                <div className={`p-3 sm:p-4 ${remoteColor === "orange" ? "bg-orange-50 border-2 border-orange-300" : "bg-pink-50 border-2 border-pink-300"} rounded-lg ${!remoteConnected && "opacity-50"}`}>
                  <div className="text-2xl sm:text-3xl mb-2">{remotePlayer === "hunter" ? "🦁" : "💗"}</div>
                  <p className="text-xs sm:text-sm font-bold">{remotePlayer === "hunter" ? "Partner 1" : "Partner 2"}</p>
                  <p className={`mt-1 text-xs ${remoteReady ? "text-green-700 font-bold" : "text-muted-foreground"}`}>
                    {remoteConnected ? (remoteReady ? "Ready" : "Not ready") : "Not connected"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-center flex-wrap">
                <Button onClick={toggleReady} variant={localReady ? "outline" : "default"} size="lg">
                  {localReady ? "Unready" : "I'm Ready"}
                </Button>
                <Button
                  onClick={startGame}
                  size="lg"
                  className="text-base sm:text-lg px-6 sm:px-8"
                  disabled={!remoteConnected || !localReady || !remoteReady}
                >
                  Start Story 🎲
                </Button>
              </div>

              {!remoteConnected && (
                <p className="text-xs text-muted-foreground">
                  Open this game on the other phone using the same multiplayer session.
                </p>
              )}
            </div>
          )}

          {(gameState === "creating" || isRolling) && (
            <div className="space-y-4 sm:space-y-6">
              {isRolling ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-5xl sm:text-6xl mb-4 animate-bounce">🎲</div>
                  <p className="text-lg sm:text-xl font-bold">Rolling the dice...</p>
                </div>
              ) : (
                <>
                  {/* Story Elements */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-bold">Your Story Elements:</h3>
                      <div className="text-xs text-muted-foreground">
                        {remoteFinished ? "Partner finished ✅" : "Partner writing..."}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs text-purple-600 font-semibold mb-1">CHARACTER</p>
                        <p className="text-base sm:text-lg font-bold">{rolledStory?.character}</p>
                      </div>
                      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs text-blue-600 font-semibold mb-1">SETTING</p>
                        <p className="text-base sm:text-lg font-bold">{rolledStory?.setting}</p>
                      </div>
                      <div className="bg-amber-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs text-amber-600 font-semibold mb-1">OBJECT</p>
                        <p className="text-base sm:text-lg font-bold">{rolledStory?.object}</p>
                      </div>
                      <div className="bg-pink-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs text-pink-600 font-semibold mb-1">TWIST</p>
                        <p className="text-base sm:text-lg font-bold">{rolledStory?.twist}</p>
                      </div>
                    </div>
                  </div>

                  {/* Story Writing Area - Split Screen */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Local Player Story */}
                    <Card className={`border-4 ${playerColor === "orange" ? "border-orange-400" : "border-pink-400"}`}>
                      <CardHeader className={`${playerColor === "orange" ? "bg-orange-50" : "bg-pink-50"}`}>
                        <CardTitle className="flex items-center gap-2">
                          <span>{localPlayer === "hunter" ? "🦁 Partner 1" : "💗 Partner 2"}'s Story</span>
                          <Sparkles className="text-green-500" size={20} />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <textarea
                          value={userStory}
                          onChange={(e) => setUserStory(e.target.value)}
                          placeholder="Once upon a time... Use the elements above to craft your unique story!"
                          className="w-full h-64 p-4 rounded-lg border-2 border-green-200 focus:border-green-500 focus:outline-none resize-none"
                          autoFocus
                          disabled={localFinished}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          {userStory.length} characters | {userStory.split(/\s+/).filter(Boolean).length} words
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button onClick={finishMyStory} disabled={localFinished}>
                            {localFinished ? "Finished ✅" : "Finish my story"}
                          </Button>
                          <Button variant="outline" onClick={() => {
                            resetToLobby();
                            safeTrigger("back-to-lobby", { player: localPlayer, timestamp: Date.now() });
                          }}>
                            Back to Start
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Remote Player Story */}
                    <Card className={`border-4 ${remoteColor === "orange" ? "border-orange-400" : "border-pink-400"} ${!remoteConnected && "opacity-50"}`}>
                      <CardHeader className={`${remoteColor === "orange" ? "bg-orange-50" : "bg-pink-50"}`}>
                        <CardTitle className="flex items-center gap-2">
                          <span>{remotePlayer === "hunter" ? "🦁 Partner 1" : "💗 Partner 2"}'s Story</span>
                          <Sparkles className="text-green-500" size={20} />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {remoteConnected ? (
                          <>
                            <div className="w-full h-64 p-4 rounded-lg border-2 border-gray-200 bg-gray-50 overflow-y-auto whitespace-pre-wrap">
                              {remoteStory || (
                                <span className="text-muted-foreground italic">
                                  {remotePlayer === "hunter" ? "Partner 1" : "Partner 2"} is writing...
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              {remoteStory.length} characters | {remoteStory.split(/\s+/).filter(Boolean).length} words
                            </p>
                          </>
                        ) : (
                          <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                            <div className="text-center">
                              <div className="text-4xl mb-2">⏳</div>
                              <p className="font-bold">Waiting for partner...</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actions */}
                  <div className="text-center text-sm text-muted-foreground">
                    When both finish, you’ll see both stories together.
                  </div>
                </>
              )}
            </div>
          )}

          {gameState === "finished" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-5xl sm:text-6xl mb-2">🎉</div>
                <h2 className="text-xl sm:text-2xl font-bold">Both stories are finished!</h2>
                <p className="text-sm text-muted-foreground">Enjoy reading each other’s version.</p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-bold">Story Elements:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs text-purple-600 font-semibold mb-1">CHARACTER</p>
                    <p className="text-base sm:text-lg font-bold">{rolledStory?.character}</p>
                  </div>
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs text-blue-600 font-semibold mb-1">SETTING</p>
                    <p className="text-base sm:text-lg font-bold">{rolledStory?.setting}</p>
                  </div>
                  <div className="bg-amber-50 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs text-amber-600 font-semibold mb-1">OBJECT</p>
                    <p className="text-base sm:text-lg font-bold">{rolledStory?.object}</p>
                  </div>
                  <div className="bg-pink-50 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs text-pink-600 font-semibold mb-1">TWIST</p>
                    <p className="text-base sm:text-lg font-bold">{rolledStory?.twist}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={`border-4 ${playerColor === "orange" ? "border-orange-400" : "border-pink-400"}`}>
                  <CardHeader className={`${playerColor === "orange" ? "bg-orange-50" : "bg-pink-50"}`}>
                    <CardTitle>{localPlayer === "hunter" ? "🦁 Partner 1" : "💗 Partner 2"}'s Story</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="w-full min-h-64 p-4 rounded-lg border-2 border-gray-200 bg-gray-50 whitespace-pre-wrap">
                      {userStory || <span className="text-muted-foreground italic">(No story)</span>}
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-4 ${remoteColor === "orange" ? "border-orange-400" : "border-pink-400"}`}>
                  <CardHeader className={`${remoteColor === "orange" ? "bg-orange-50" : "bg-pink-50"}`}>
                    <CardTitle>{remotePlayer === "hunter" ? "🦁 Partner 1" : "💗 Partner 2"}'s Story</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="w-full min-h-64 p-4 rounded-lg border-2 border-gray-200 bg-gray-50 whitespace-pre-wrap">
                      {remoteStory || <span className="text-muted-foreground italic">(No story)</span>}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-3 justify-center flex-wrap">
                <Button onClick={resetToLobby} size="lg">
                  Back to Start
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StoryDice() {
  return (
    <LocalMultiplayerWrapper
      gameId="story-dice"
      gameName="Story Dice"
      hunterColor="from-orange-500 to-red-600"
      riceeeColor="from-pink-500 to-rose-600"
    >
      {(props) => <StoryDiceGame {...props} />}
    </LocalMultiplayerWrapper>
  );
}
