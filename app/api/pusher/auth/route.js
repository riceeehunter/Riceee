import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { channelBelongsToSpace } from "@/lib/constants/channels";

export async function POST(req) {
  try {
    const user = await getOrCreateUser();

    const data = await req.text();
    const params = new URLSearchParams(data);
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "socket_id and channel_name are required" },
        { status: 400 }
      );
    }

    // Only allow subscribing to channels that belong to the caller's space
    if (!channelBelongsToSpace(channelName, user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channelName);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}
