"use server";

import { db } from "@/lib/prisma";
import { getOrCreateUser, getWritableSpace } from "@/lib/auth";

export async function getReminders() {
  try {
    const user = await getOrCreateUser();
    const reminders = await db.reminder.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    });
    return { success: true, data: reminders };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function addReminder({ date, title, note }) {
  try {
    const user = await getWritableSpace();

    if (!title?.trim()) throw new Error("Reminder title is required");
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) throw new Error("Invalid date");

    const reminder = await db.reminder.create({
      data: {
        userId: user.id,
        date: parsedDate,
        title: title.trim().slice(0, 200),
        note: note?.trim() ? note.trim().slice(0, 1000) : null,
      },
    });
    return { success: true, data: reminder };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteReminder(id) {
  try {
    const user = await getWritableSpace();
    // Scoped delete — nobody can remove another space's reminder
    await db.reminder.delete({
      where: { id, userId: user.id },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
