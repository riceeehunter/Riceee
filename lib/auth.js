"use server";

import { db } from "./prisma";
import { auth } from "@clerk/nextjs/server";

export async function getAuthenticatedUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

export async function getCurrentUser() {
  const userId = await getAuthenticatedUserId();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Get or create a user based on their Clerk ID
 * Automatically creates user record on first login
 */
export async function getOrCreateUser() {
  const userId = await getAuthenticatedUserId();

  let user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  // Auto-create user if they don't exist (first time login)
  if (!user) {
    const { user: clerkUser } = await auth();
    user = await db.user.create({
      data: {
        clerkUserId: userId,
        email: clerkUser?.emailAddresses?.[0]?.emailAddress || "unknown@email.com",
        name: clerkUser?.firstName || "User",
        imageUrl: clerkUser?.imageUrl || null,
      },
    });
  }

  return user;
}
