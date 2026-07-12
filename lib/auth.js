"use server";

import { db } from "./prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

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

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
  const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || "User";

  // Same person, brand-new Clerk account. Deleting a login and signing back in
  // with the same Google account mints a fresh clerkUserId, but their space is
  // still keyed to the old one — and User.email is unique, so creating a second
  // row throws P2002 and 500s every page in the app (this layout calls us).
  //
  // Clerk allows exactly one account per email and it verified this one through
  // the OAuth provider, so whoever is signing in demonstrably owns that address:
  // the space behind it is theirs. Hand it back rather than stranding them next
  // to it, and repoint ownership at the account that's actually alive.
  if (email) {
    const spaceByEmail = await db.user.findUnique({ where: { email } });

    if (spaceByEmail) {
      const staleClerkUserId = spaceByEmail.clerkUserId;

      await db.$transaction(async (tx) => {
        if (identityModelAvailable && staleClerkUserId !== clerkUserId) {
          await tx.userIdentity.deleteMany({ where: { clerkUserId: staleClerkUserId } });
        }

        await tx.user.update({
          where: { id: spaceByEmail.id },
          data: {
            clerkUserId,
            imageUrl: clerkUser?.imageUrl || spaceByEmail.imageUrl,
          },
        });

        if (identityModelAvailable) {
          await tx.userIdentity.upsert({
            where: { clerkUserId },
            create: { clerkUserId, userId: spaceByEmail.id },
            update: { userId: spaceByEmail.id },
          });
        }
      });

      return db.user.findUnique({ where: { id: spaceByEmail.id } });
    }
  }

  // Genuinely new: auto-create a space (first-time login with no invite).
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

  try {
    return await db.user.create({ data: createData });
  } catch (error) {
    // Two requests raced to create the same first-time user; whoever lost just
    // reads back the winner's row instead of surfacing a constraint error.
    if (error?.code === "P2002") {
      const existing = await db.user.findUnique({ where: { clerkUserId } });
      if (existing) return existing;
    }
    throw error;
  }
}
