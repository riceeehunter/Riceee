import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { channelBelongsToSpace } from "@/lib/constants/channels";

export async function POST(req) {
  try {
    const user = await getOrCreateUser();

    const { channel, event, data } = await req.json();

    if (!channel || !event) {
      return NextResponse.json(
        { error: "Channel and event are required" },
        { status: 400 }
      );
    }

    // Only allow publishing to channels that belong to the caller's space
    if (!channelBelongsToSpace(channel, user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await pusherServer.trigger(channel, event, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pusher trigger error:", error);
    const status = /unauthorized/i.test(error?.message) ? 401 : 500;
    return NextResponse.json(
      { error: "Failed to trigger event", details: error.message },
      { status }
    );
  }
}
