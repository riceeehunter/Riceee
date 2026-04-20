"use server";

import { db } from "./prisma";
import { auth } from "@clerk/nextjs/server";

function isUserIdentityUnavailable(error) {
  if (!error) return false;
  const message = String(error?.message || "");
  return (
    error?.code === "P2021" ||
    error?.code === "P2022" ||
    /UserIdentity/i.test(message)
  );
}

export async function getAuthenticatedUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

export async function getCurrentUser() {
  const user = await getOrCreateUser();

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
  const clerkUserId = await getAuthenticatedUserId();

  let identityModelAvailable = true;
  let existingIdentity = null;

  try {
    existingIdentity = await db.userIdentity.findUnique({
      where: { clerkUserId },
      include: { user: true },
    });
  } catch (error) {
    if (isUserIdentityUnavailable(error)) {
      identityModelAvailable = false;
    } else {
      throw error;
    }
  }

  if (existingIdentity?.user) {
    return existingIdentity.user;
  }

  // Legacy compatibility: existing space owner stored directly on User.clerkUserId
  const legacyUser = await db.user.findUnique({
    where: { clerkUserId },
  });

  if (legacyUser) {
    if (identityModelAvailable) {
      try {
        await db.userIdentity.upsert({
          where: { clerkUserId },
          create: {
            clerkUserId,
            userId: legacyUser.id,
          },
          update: {},
        });
      } catch (error) {
        if (!isUserIdentityUnavailable(error)) {
          throw error;
        }
      }
    }
    return legacyUser;
  }

  // Auto-create a new space (first-time login with no invite)
  const { user: clerkUser } = await auth();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
  const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || "User";

  const createData = {
    clerkUserId,
    email: email || `${clerkUserId}@riceee.local`,
    name,
    imageUrl: clerkUser?.imageUrl || null,
  };

  if (identityModelAvailable) {
    createData.identities = {
      create: {
        clerkUserId,
      },
    };
  }

  const created = await db.user.create({
    data: createData,
  });

  return created;
}
