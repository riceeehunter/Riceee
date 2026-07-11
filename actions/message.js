"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getOrCreateUser } from "@/lib/auth";
import { PLAYER_IDS, getOtherPlayer, getPlayerSenderAliases, normalizePlayerId } from "@/lib/constants/players";
import { getSpaceChatChannel } from "@/lib/constants/channels";

function getOppositeSenderAliases(player) {
  const playerId = normalizePlayerId(player);
  const oppositeId = playerId ? getOtherPlayer(playerId) : PLAYER_IDS.ONE;
  return getPlayerSenderAliases(oppositeId);
}

// Derive the sender identity server-side (same ordering as getCurrentGameSetup),
// so one partner can't send messages pretending to be the other
async function getServerSenderId(user) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;

    const identities = await db.userIdentity.findMany({
      where: { userId: user.id },
      select: { clerkUserId: true },
      orderBy: { createdAt: "asc" },
    });

    const index = identities.findIndex((identity) => identity.clerkUserId === clerkUserId);
    if (index === -1) return null;
    return index % 2 === 0 ? PLAYER_IDS.ONE : PLAYER_IDS.TWO;
  } catch {
    return null;
  }
}

export async function sendMessage(data) {
  try {
    const user = await getOrCreateUser();
    // Server-derived identity wins; client value is only a legacy fallback
    const senderId =
      (await getServerSenderId(user)) ||
      normalizePlayerId(data.sender) ||
      PLAYER_IDS.ONE;

    const message = await db.message.create({
      data: {
        content: data.content,
        sender: senderId,
        userId: user.id,
        replyTo: data.replyTo || null,
        replyToContent: data.replyToContent || null,
        replyToSender: data.replyToSender || null,
      },
    });
    // Real-time delivery, scoped to this couple's private channel
    await pusherServer.trigger(getSpaceChatChannel(user.id), "new-message", {
      id: message.id,
      content: message.content,
      sender: message.sender,
      replyTo: message.replyTo,
      replyToContent: message.replyToContent,
      replyToSender: message.replyToSender,
      createdAt: message.createdAt,
    });

    return { success: true, data: message };
  } catch (error) {
    console.error("❌ Send message error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMessages() {
  try {
    const user = await getOrCreateUser();
    const messages = await db.message.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }, // Get newest first
      take: 100, // Last 100 messages
    });

    // Reverse to show oldest to newest in chat
    return { success: true, data: messages.reverse() };
  } catch (error) {
    console.error("❌ Get messages error:", error);
    return { success: false, error: error.message };
  }
}

export async function markMessagesAsRead(sender) {
  try {
    const user = await getOrCreateUser();
    await db.message.updateMany({
      where: {
        userId: user.id,
        sender: { in: getOppositeSenderAliases(sender) },
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
    const user = await getOrCreateUser();
    const count = await db.message.count({
      where: {
        userId: user.id,
        sender: { in: getOppositeSenderAliases(forUser) },
        read: false,
      },
    });

    return { success: true, data: count };
  } catch (error) {
    return { success: true, data: 0 };
  }
}
