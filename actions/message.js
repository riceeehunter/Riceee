"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getOrCreateUser } from "@/lib/auth";

export async function sendMessage(data) {
  try {
    console.log("📤 Sending message:", data);
    
    const user = await getOrCreateUser();
    console.log("👤 User found:", user?.id);

    const message = await db.message.create({
      data: {
        content: data.content,
        sender: data.sender,
        userId: user.id,
        replyTo: data.replyTo || null,
        replyToContent: data.replyToContent || null,
        replyToSender: data.replyToSender || null,
      },
    });
    console.log("💾 Message saved to DB:", message.id);

    // Trigger Pusher event for real-time delivery
    await pusherServer.trigger("riceee-chat", "new-message", {
      id: message.id,
      content: message.content,
      sender: message.sender,
      replyTo: message.replyTo,
      replyToContent: message.replyToContent,
      replyToSender: message.replyToSender,
      createdAt: message.createdAt,
    });
    console.log("📡 Pusher event sent");

    return { success: true, data: message };
  } catch (error) {
    console.error("❌ Send message error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMessages() {
  try {
    console.log("📥 Fetching messages...");
    const messages = await db.message.findMany({
      orderBy: { createdAt: "desc" }, // Get newest first
      take: 100, // Last 100 messages
    });
    console.log(`✅ Fetched ${messages.length} messages`);

    // Reverse to show oldest to newest in chat
    return { success: true, data: messages.reverse() };
  } catch (error) {
    console.error("❌ Get messages error:", error);
    return { success: false, error: error.message };
  }
}

export async function markMessagesAsRead(sender) {
  try {
    await db.message.updateMany({
      where: {
        sender: sender === "Hunter" ? "Riceee" : "Hunter",
        read: false,
      },
      data: {
        read: true,
      },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getUnreadCount(forUser) {
  try {
    const count = await db.message.count({
      where: {
        sender: forUser === "Hunter" ? "Riceee" : "Hunter",
        read: false,
      },
    });

    return { success: true, data: count };
  } catch (error) {
    return { success: true, data: 0 };
  }
}
