"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { getAuthenticatedUserId, getCurrentUser } from "@/lib/auth";
import { SPACE_STATUS, isArchived } from "@/lib/space-closure";

/**
 * Moving between spaces.
 *
 * A login is *in* exactly one space (UserIdentity) but may be allowed to open
 * several (SpaceAccess) — normally just the one, and after a breakup also the
 * archive it came from. Switching repoints the identity, which is why every
 * read path keeps working untouched: they all resolve "my space" the same way
 * and simply get a different answer.
 */

/** Every space this login can open, with the current one marked. */
export async function getMySpaces() {
  const clerkUserId = await getAuthenticatedUserId();
  const current = await getCurrentUser();

  const access = await db.spaceAccess.findMany({
    where: { clerkUserId },
    include: {
      user: {
        select: {
          id: true,
          partnerOneName: true,
          partnerTwoName: true,
          spaceStatus: true,
          archivedAt: true,
          createdAt: true,
          _count: { select: { entries: true, memories: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const spaces = access.map(({ user }) => ({
    id: user.id,
    title: spaceTitle(user),
    status: user.spaceStatus || SPACE_STATUS.ACTIVE,
    archivedAt: user.archivedAt,
    since: user.createdAt,
    entries: user._count.entries,
    memories: user._count.memories,
    isCurrent: user.id === current.id,
  }));

  // The space they're in right now may predate SpaceAccess (nothing has forked
  // yet), so make sure it's always in the list rather than showing them a set
  // that doesn't include where they are.
  if (!spaces.some((space) => space.isCurrent)) {
    spaces.unshift({
      id: current.id,
      title: spaceTitle(current),
      status: current.spaceStatus || SPACE_STATUS.ACTIVE,
      archivedAt: current.archivedAt,
      since: current.createdAt,
      entries: null,
      memories: null,
      isCurrent: true,
    });
  }

  return { spaces, canStartFresh: isArchived(current) };
}

function spaceTitle(space) {
  const one = space?.partnerOneName?.trim();
  const two = space?.partnerTwoName?.trim();
  if (one && two) return `${one} & ${two}`;
  return space?.name?.trim() || "Your space";
}

/** Open a different space this login already has access to. */
export async function switchToSpace(spaceId) {
  const clerkUserId = await getAuthenticatedUserId();

  const access = await db.spaceAccess.findUnique({
    where: { clerkUserId_userId: { clerkUserId, userId: spaceId } },
  });

  if (!access) {
    throw new Error("You don't have access to that space.");
  }

  await db.userIdentity.upsert({
    where: { clerkUserId },
    create: { clerkUserId, userId: spaceId },
    update: { userId: spaceId },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Leave an archive behind and begin again.
 *
 * Only offered from an archive: while a space is live this would silently
 * strand a journal someone is still writing in. The archive isn't touched —
 * SpaceAccess keeps it openable and downloadable — so this costs nothing to
 * take back, which is the point. Someone whose relationship ended shouldn't
 * have to abandon their Google account to use the app again.
 */
export async function startFreshSpace() {
  const clerkUserId = await getAuthenticatedUserId();
  const current = await getCurrentUser();

  if (!isArchived(current)) {
    throw new Error("You can only start a new space from an archive.");
  }

  const profile = await currentUser();
  const email = profile?.emailAddresses?.[0]?.emailAddress;
  const name =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "User";

  // User.email is unique and the archive is still holding their real address,
  // so the new space gets a scoped one. Nothing user-facing reads it.
  const freshEmail = await freeEmail(clerkUserId, email);

  const space = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        clerkUserId,
        email: freshEmail,
        name,
        imageUrl: profile?.imageUrl || null,
        spaceStatus: SPACE_STATUS.ACTIVE,
      },
    });

    await tx.userIdentity.upsert({
      where: { clerkUserId },
      create: { clerkUserId, userId: created.id },
      update: { userId: created.id },
    });

    // Keep the archive reachable, and make the new space switchable back to.
    await tx.spaceAccess.createMany({
      data: [
        { clerkUserId, userId: current.id },
        { clerkUserId, userId: created.id },
      ],
      skipDuplicates: true,
    });

    return created;
  });

  revalidatePath("/", "layout");
  return { ok: true, spaceId: space.id };
}

async function freeEmail(clerkUserId, preferred) {
  const candidates = [
    preferred,
    `${clerkUserId}@riceee.local`,
    `fresh-${Date.now()}-${clerkUserId}@riceee.local`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const taken = await db.user.findUnique({
      where: { email: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  return `fresh-${Date.now()}-${clerkUserId}@riceee.local`;
}
