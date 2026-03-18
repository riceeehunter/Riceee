import { NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

export async function POST(req) {
  try {
    const { channel, event, data } = await req.json();

    console.log("📡 Pusher trigger request:", { channel, event, data });

    if (!channel || !event) {
      return NextResponse.json(
        { error: "Channel and event are required" },
        { status: 400 }
      );
    }

    const result = await pusher.trigger(channel, event, data);
    console.log("✅ Pusher trigger successful:", result);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Pusher trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger event", details: error.message },
      { status: 500 }
    );
  }
}
