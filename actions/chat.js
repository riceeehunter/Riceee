"use server";

import { db } from "@/lib/prisma";
import { getOrCreateUser, getUnarchivedSpace } from "@/lib/auth";
import { getViewerSlot } from "@/lib/space-identity";
import { PLAYER_IDS } from "@/lib/constants/players";
import { revalidatePath } from "next/cache";

/**
 * Which partner is asking.
 *
 * Everything else in a space is shared on purpose; Solo Vent is the exception,
 * so every query in this file is scoped by this rather than by the space alone.
 *
 * A space with no identity rows can only have one person in it, so falling back
 * to partner one there scopes to the only reader who exists.
 */
async function viewerSlot(spaceId) {
  return (await getViewerSlot(spaceId)) || PLAYER_IDS.ONE;
}

export async function getConversations() {
  try {
    const user = await getOrCreateUser();
    const slot = await viewerSlot(user.id);
    const conversations = await db.chatConversation.findMany({
      where: { userId: user.id, ownerSlot: slot },
      orderBy: { updatedAt: "desc" },
    });
    return { success: true, data: conversations };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getConversation(id) {
  try {
    const user = await getOrCreateUser();
    const slot = await viewerSlot(user.id);
    // The AI route takes its history from whatever the client sends, and the
    // client can only get history from here — so this filter is what actually
    // keeps one partner's venting out of the other's prompt.
    const conversation = await db.chatConversation.findFirst({
      where: { id, userId: user.id, ownerSlot: slot },
      include: {
        cells: {
          orderBy: { order: "asc" },
        },
      },
    });
    return { success: true, data: conversation };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createConversation(title = "New Conversation") {
  try {
    // Stays open through the cooldown, closed once archived.
    const user = await getUnarchivedSpace();
    const slot = await viewerSlot(user.id);
    const conversation = await db.chatConversation.create({
      data: {
        userId: user.id,
        ownerSlot: slot,
        title,
      },
    });
    return { success: true, data: conversation };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveChatCell({ conversationId, content, response, order }) {
  try {
    if (!conversationId) {
      console.warn("Attempted to save chat cell without conversationId");
      return { success: false, error: "No conversation ID" };
    }
    const user = await getUnarchivedSpace();
    const slot = await viewerSlot(user.id);

    // Ownership is per partner, not per space — writing into the other
    // partner's private thread has to fail the same way reading it does.
    const conversation = await db.chatConversation.findFirst({
      where: { id: conversationId, userId: user.id, ownerSlot: slot }
    });
    if (!conversation) throw new Error("Conversation not found");

    const cell = await db.chatCell.create({
      data: {
        conversationId,
        content,
        response,
        order,
      },
    });

    // Update conversation timestamp
    await db.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return { success: true, data: cell };
  } catch (error) {
    console.error("Save chat cell error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteConversation(id) {
  try {
    // Deliberately unguarded: taking down something you wrote about yourself
    // stays available even in an archive, same as removing your own photo.
    // Nothing new is created by it, and nobody else can see it either way.
    const user = await getOrCreateUser();
    const slot = await viewerSlot(user.id);
    // deleteMany so the ownership filter is part of the match itself: a miss
    // deletes nothing rather than falling back to matching on id alone.
    const { count } = await db.chatConversation.deleteMany({
      where: { id, userId: user.id, ownerSlot: slot },
    });
    if (count === 0) throw new Error("Conversation not found");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateConversationTitle(id, title) {
  try {
    const user = await getUnarchivedSpace();
    const slot = await viewerSlot(user.id);
    const { count } = await db.chatConversation.updateMany({
      where: { id, userId: user.id, ownerSlot: slot },
      data: { title },
    });
    if (count === 0) throw new Error("Conversation not found");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
