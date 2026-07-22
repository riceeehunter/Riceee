"use server";

import { db } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getOrCreateUser, getWritableSpace } from "@/lib/auth";
import { PLAYER_IDS, getOtherPlayer, getPlayerSenderAliases, normalizePlayerId } from "@/lib/constants/players";
import { getSpaceChatChannel } from "@/lib/constants/channels";
import { getViewerSlot } from "@/lib/space-identity";

function getOppositeSenderAliases(player) {
  const playerId = normalizePlayerId(player);
  const oppositeId = playerId ? getOtherPlayer(playerId) : PLAYER_IDS.ONE;
  return getPlayerSenderAliases(oppositeId);
}

export async function sendMessage(data) {
  try {
    const user = await getWritableSpace();
    // Server-derived identity wins; client value is only a legacy fallback
    const senderId =
      (await getViewerSlot(user.id)) ||
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
