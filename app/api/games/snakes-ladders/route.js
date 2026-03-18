import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function POST(req) {
  try {
    const body = await req.json();

    const channelName = body.sessionId
      ? `snakes-ladders-${body.sessionId}`
      : "snakes-ladders-game";

    if (body.reset) {
      await pusherServer.trigger(channelName, "game-reset", {
        matchId: body.matchId || null,
      });
      return NextResponse.json({ success: true });
    }

    await pusherServer.trigger(channelName, "game-move", {
      matchId: body.matchId || null,
      player: body.player,
      position: body.position,
      dice: body.dice,
      nextTurn: body.nextTurn,
      winner: body.winner,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Snakes & Ladders API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
