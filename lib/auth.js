"use server";

import { db } from "./prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { forkSpace, isArchived, isCoolingDown, isForkDue } from "./space-closure";

/**
 * Nothing in this app runs on a schedule, so the day-14 fork happens here: any
 * authenticated request into a space whose cooldown has lapsed does the split
 * before returning the row. Hanging it off getOrCreateUser rather than one page
 * is what stops half the app believing a space is still live while the rest has
 * moved on — everything funnels through here.
 *
 * The cost on the hot path is a date comparison against fields already on the
 * row we just read. Only an actually-due fork touches the database further.
 */
async function settleClosure(space, viewerClerkUserId) {
  if (!isForkDue(space)) return space;

  try {
    await forkSpace(space.id);
  } catch (error) {
    // A failed fork must not take the app down with it. The space stays
    // cooling-down and the next request tries again; nothing is lost either way.
    console.error("Failed to fork space", space.id, error);
    return space;
  }

  // This viewer may be the partner whose identity just moved onto the new
  // archive row, so re-resolve which space is theirs instead of assuming it's
  // still the one we walked in with.
  const identity = await db.userIdentity.findUnique({
    where: { clerkUserId: viewerClerkUserId },
    include: { user: true },
  });

  return identity?.user || db.user.findUnique({ where: { id: space.id } });
}

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
 * The space, but only if it can still be written to.
 *
 * Closed to new writes from the moment someone ends it, not just once it forks.
 * The alternative — leaving it fully live through the cooldown — keeps a
 * notification-generating channel open between two people for a fortnight
 * after one of them has said it's over, which is the window where a shared
 * space is most likely to be used to get at someone.
 *
 * This costs the other partner nothing they actually had: everything stays
 * visible, browsable and exportable. It only stops *new* things landing in a
 * container that is closing. And an archive has to be immutable regardless —
 * it's a record of something that already happened, and the copy in the other
 * person's archive would never match if either side could still be edited.
 */
export async function getWritableSpace() {
  const space = await getCurrentUser();

  if (isArchived(space)) {
    throw new Error(
      "This space is archived. You can read and export everything in it, but not add anything new."
    );
  }

  if (isCoolingDown(space)) {
    throw new Error(
      "This space is closing, so nothing new can be added. Everything already here stays readable, and you can download all of it from Settings."
    );
  }

  return space;
}

/**
 * The space, unless it has already closed.
 *
 * Looser than getWritableSpace by design, and Solo Vent is the only thing that
 * uses it. Shared writing stops the moment someone ends the space, because it
 * lands in front of the other person. Venting to the AI doesn't — it's private,
 * it isn't copied into either archive, and the fortnight after a relationship
 * ends is precisely when someone might need somewhere to put it. Taking that
 * away on day one would be the app punishing them for the timing.
 *
 * An archive is still off limits: at that point it's a finished record.
 */
export async function getUnarchivedSpace() {
  const space = await getCurrentUser();

  if (isArchived(space)) {
    throw new Error(
      "This space is archived. You can read and export everything in it, but not add anything new."
    );
  }

  return space;
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
    return settleClosure(existingIdentity.user, clerkUserId);
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
    return settleClosure(legacyUser, clerkUserId);
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
