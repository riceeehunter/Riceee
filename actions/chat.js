"use server";

import { db } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getConversations() {
  try {
    const user = await getOrCreateUser();
    const conversations = await db.chatConversation.findMany({
      where: { userId: user.id },
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
    const conversation = await db.chatConversation.findFirst({
      where: { id, userId: user.id },
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
    const user = await getOrCreateUser();
    const conversation = await db.chatConversation.create({
      data: {
        userId: user.id,
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
    const user = await getOrCreateUser();
    
    // Verify ownership
    const conversation = await db.chatConversation.findFirst({
      where: { id: conversationId, userId: user.id }
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
    const user = await getOrCreateUser();
    await db.chatConversation.delete({
      where: { id, userId: user.id },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateConversationTitle(id, title) {
  try {
    const user = await getOrCreateUser();
    await db.chatConversation.update({
      where: { id, userId: user.id },
      data: { title },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
