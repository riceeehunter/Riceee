"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getOrCreateUser } from "@/lib/auth";
import { PLAYER_IDS, normalizePlayerId } from "@/lib/constants/players";

export async function createNotification(data) {
  try {
    const user = await getOrCreateUser();
    const notification = await db.notification.create({
      data: {
        type: data.type,
        message: data.message,
        entryId: data.entryId,
        entryTitle: data.entryTitle,
        commentId: data.commentId,
        commentAuthor: data.commentAuthor,
        userId: user.id,
      },
    });

    return { success: true, data: notification };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getUnreadNotifications() {
  try {
    const user = await getOrCreateUser();
    const notifications = await db.notification.findMany({
      where: {
        userId: user.id,
        OR: [
          { hunterRead: false },
          { riceeeRead: false },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return notifications;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function markNotificationAsRead(notificationId, reader) {
  try {
    const user = await getOrCreateUser();
    const readerId = normalizePlayerId(reader) || PLAYER_IDS.ONE;
    const updateData =
      readerId === PLAYER_IDS.ONE
        ? { hunterRead: true }
        : { riceeeRead: true };

    // Scoped to the caller's space so other accounts can't mark/delete ours
    const notification = await db.notification.update({
      where: { id: notificationId, userId: user.id },
      data: updateData,
    });

    // If both have read, delete the notification
    if (notification.hunterRead && notification.riceeeRead) {
      await db.notification.delete({
        where: { id: notificationId },
      });
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
