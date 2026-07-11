"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notification";
import { getOrCreateUser } from "@/lib/auth";

export async function addComment(data) {
  try {
    const user = await getOrCreateUser();

    // Only allow commenting on entries in the caller's own space
    const entry = await db.entry.findFirst({
      where: { id: data.entryId, userId: user.id },
      select: { title: true },
    });
    if (!entry) throw new Error("Entry not found");

    const comment = await db.comment.create({
      data: {
        content: data.content,
        author: data.author,
        entryId: data.entryId,
        userId: user.id,
      },
    });

    // Create notification
    await createNotification({
      type: "comment",
      message: `${data.author} commented on "${entry?.title}"`,
      entryId: data.entryId,
      entryTitle: entry?.title || "an entry",
      commentId: comment.id,
      commentAuthor: data.author,
    });

    revalidatePath(`/journal/${data.entryId}`);
    return { success: true, data: comment };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getComments(entryId) {
  try {
    const user = await getOrCreateUser();

    // Only return comments for entries in the caller's own space
    const entry = await db.entry.findFirst({
      where: { id: entryId, userId: user.id },
      select: { id: true },
    });
    if (!entry) throw new Error("Entry not found");

    const comments = await db.comment.findMany({
      where: { entryId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    return comments;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function deleteComment(commentId) {
  try {
    const user = await getOrCreateUser();

    // Check if comment belongs to user
    const comment = await db.comment.findFirst({
      where: {
        id: commentId,
        userId: user.id,
      },
    });

    if (!comment) throw new Error("Comment not found");

    await db.comment.delete({
      where: { id: commentId },
    });

    revalidatePath(`/journal/${comment.entryId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
