"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "./prisma";
import { AUTHOR_SLOTS, PLAYER_IDS, normalizeAuthorSlot } from "./constants/players";

/**
 * Which partner slot the signed-in account occupies in this space.
 *
 * Ordering is by identity creation: whoever made the space is partner one, the
 * partner who joined is partner two. Every caller must agree on this or the two
 * halves of the app disagree about who you are -- getCurrentGameSetup and chat
 * both derive it exactly this way.
 *
 * Returns null when the viewer can't be placed (signed out, or a legacy space
 * with no UserIdentity rows yet).
 */
export async function getViewerSlot(spaceId) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;

    const identities = await db.userIdentity.findMany({
      where: { userId: spaceId },
      select: { clerkUserId: true },
      orderBy: { createdAt: "asc" },
    });

    const index = identities.findIndex((identity) => identity.clerkUserId === clerkUserId);
    if (index === -1) return null;

    return index % 2 === 0 ? PLAYER_IDS.ONE : PLAYER_IDS.TWO;
  } catch {
    return null;
  }
}

/**
 * The slot to stamp on something the viewer is creating.
 *
 * An explicit choice from the "Written by" picker wins: the space is private and
 * shared, so attributing an entry to your partner (or to both of you) is a real
 * thing couples do, not an attack.
 *
 * The viewer's own slot is only a fallback for when nothing was chosen -- which
 * is what stops an unspecified write from silently landing on partner one.
 */
export async function resolveAuthorSlotForWrite(spaceId, clientIntent) {
  const intent = normalizeAuthorSlot(clientIntent);
  if (intent) return intent;

  const viewerSlot = await getViewerSlot(spaceId);
  return viewerSlot || AUTHOR_SLOTS.BOTH;
}
