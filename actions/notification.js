"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createNotification(data) {
  try {
    const notification = await db.notification.create({
      data: {
        type: data.type,
        message: data.message,
        entryId: data.entryId,
        entryTitle: data.entryTitle,
        commentId: data.commentId,
        commentAuthor: data.commentAuthor,
      },
    });

    return { success: true, data: notification };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getUnreadNotifications() {
  try {
    const notifications = await db.notification.findMany({
      where: {
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
    const updateData = reader === "Hunter" 
      ? { hunterRead: true } 
      : { riceeeRead: true };

    const notification = await db.notification.update({
      where: { id: notificationId },
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
