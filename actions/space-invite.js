"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { getAuthenticatedUserId, getOrCreateUser } from "@/lib/auth";
import { CODE_ALPHABET, CODE_LENGTH, normalizeCode } from "@/lib/pairing";

const INVITE_EXPIRY_DAYS = 7;

// Everything that makes a space "somebody's journal" rather than an empty shell
// that a stray sign-in created. Drafts and notifications don't count — they can
// appear without the user ever writing anything.
const CONTENT_COUNTS = {
  entries: true,
  memories: true,
  collections: true,
  messages: true,
  courtroomCases: true,
  comments: true,
  reminders: true,
  conversations: true,
};

function getExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + INVITE_EXPIRY_DAYS);
  return date;
}

function generateCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

function isSpaceEmpty(counts) {
  return Object.keys(CONTENT_COUNTS).every((key) => (counts?.[key] ?? 0) === 0);
}

/**
 * Look up an invite by pairing code. Also accepts the long random tokens issued
 * by the old link-only system, so invites created before this change still work.
 */
async function findInvite(rawCode) {
  const code = normalizeCode(rawCode);
  const legacy = String(rawCode || "").trim();
  if (!code && !legacy) return null;

  return db.spaceInvite.findFirst({
    where: { OR: [{ token: code }, { token: legacy }] },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          clerkUserId: true,
          partnerOneName: true,
          partnerTwoName: true,
          createdAt: true,
          _count: { select: CONTENT_COUNTS },
        },
      },
    },
  });
}

/** The space this Clerk account currently belongs to, or null if it has none yet. */
async function findCurrentSpace(clerkUserId) {
  const identity = await db.userIdentity.findUnique({
    where: { clerkUserId },
    include: {
      user: {
        include: {
          _count: { select: { ...CONTENT_COUNTS, identities: true } },
        },
      },
    },
  });

  if (identity?.user) return identity.user;

  // Spaces created before UserIdentity existed point at the owner directly.
  return db.user.findUnique({
    where: { clerkUserId },
    include: { _count: { select: { ...CONTENT_COUNTS, identities: true } } },
  });
}

/**
 * A space is "disposable" when this account is its only member and nothing has
 * ever been written in it. That is exactly what a stray sign-in leaves behind:
 * land on the dashboard before opening an invite and you get an empty space you
 * never asked for, which used to lock you out of joining your partner forever.
 * Reclaiming it lets the join go through instead of dead-ending.
 */
function isDisposableSpace(space, clerkUserId) {
  if (!space) return false;
  if (space.clerkUserId !== clerkUserId) return false;
  if ((space._count?.identities ?? 0) > 1) return false;
  return isSpaceEmpty(space._count);
}

/**
 * Whether this account can move into a different space, and what has to happen
 * to its current one first.
 *
 *   "free"       nothing to leave behind
 *   "disposable" an empty shell a stray sign-in created; delete it
 *   "archived"   a closed space. Moving on doesn't lose it — SpaceAccess keeps
 *                it openable and downloadable — so this must be allowed, or
 *                anyone who has been through a breakup is locked out of pairing
 *                with anybody, permanently, for as long as they keep the login.
 *
 * Anything else is a live journal with real writing in it, and joining would
 * strand it. That's the one case worth refusing.
 */
function leaveMode(space, clerkUserId) {
  if (!space) return "free";
  if (space.spaceStatus === "ARCHIVED") return "archived";
  if (isDisposableSpace(space, clerkUserId)) return "disposable";
  return "blocked";
}

function spaceTitle(space) {
  const one = space?.partnerOneName?.trim();
  const two = space?.partnerTwoName?.trim();
  if (one && two) return `${one} & ${two}`;
  return space?.name?.trim() || "Your partner's space";
}

/** Names/emails for the space members. Clerk holds these; our DB only has IDs. */
async function hydrateMembers(identities, space) {
  const profiles = new Map();

  if (identities.length) {
    try {
      const client = await clerkClient();
      const { data } = await client.users.getUserList({
        userId: identities.map((identity) => identity.clerkUserId),
        limit: 10,
      });
      for (const profile of data) profiles.set(profile.id, profile);
    } catch {
      // Clerk being unreachable shouldn't take the settings page down; fall
      // through to whatever names we already have in our own DB.
    }
  }

  return identities.map((identity) => {
    const profile = profiles.get(identity.clerkUserId);
    const isOwner = identity.clerkUserId === space.clerkUserId;
    const clerkName = profile
      ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username
      : null;

    return {
      clerkUserId: identity.clerkUserId,
      name: clerkName || (isOwner ? space.name : null) || "Partner",
      email: profile?.emailAddresses?.[0]?.emailAddress || null,
      isOwner,
      joinedAt: identity.createdAt,
    };
  });
}

export async function getSpaceStatus() {
  const clerkUserId = await getAuthenticatedUserId();
  const space = await getOrCreateUser();
  const now = new Date();

  const [identities, pendingInvite] = await Promise.all([
    db.userIdentity.findMany({
      where: { userId: space.id },
      orderBy: { createdAt: "asc" },
    }),
    db.spaceInvite.findFirst({
      where: { userId: space.id, status: "PENDING", expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const members = await hydrateMembers(identities, space);

  return {
    memberCount: identities.length,
    isConnected: identities.length >= 2,
    isOwner: space.clerkUserId === clerkUserId,
    viewerClerkId: clerkUserId,
    members,
    invite: pendingInvite
      ? { code: pendingInvite.token, expiresAt: pendingInvite.expiresAt }
      : null,
  };
}

export async function createSpaceInvite() {
  const clerkUserId = await getAuthenticatedUserId();
  const space = await getOrCreateUser();

  const memberCount = await db.userIdentity.count({ where: { userId: space.id } });
  if (memberCount >= 2) {
    throw new Error("Both partners are already connected to this space.");
  }

  // Only one code can be live at a time — a partner should never have to guess
  // which of several codes is the current one.
  await db.spaceInvite.updateMany({
    where: { userId: space.id, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const invite = await db.spaceInvite.create({
        data: {
          token: generateCode(),
          userId: space.id,
          status: "PENDING",
          createdByClerkId: clerkUserId,
          expiresAt: getExpiryDate(),
        },
      });

      revalidatePath("/settings");
      return { code: invite.token, expiresAt: invite.expiresAt };
    } catch (error) {
      if (error?.code === "P2002") continue; // code already taken, roll another
      throw error;
    }
  }

  throw new Error("Couldn't generate a code. Please try again.");
}

export async function revokeSpaceInvite() {
  const space = await getOrCreateUser();

  await db.spaceInvite.updateMany({
    where: { userId: space.id, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Everything joinSpaceWithCode would check, without joining. Lets the UI show
 * "you're about to join Praneeth & Toasty" — and surface any blocker — before
 * the user commits to anything.
 */
export async function previewSpaceInvite(rawCode) {
  const clerkUserId = await getAuthenticatedUserId();
  const now = new Date();

  const invite = await findInvite(rawCode);

  if (!invite) {
    return { ok: false, blocker: "That code doesn't match any invite. Check it with your partner." };
  }
  if (invite.status === "ACCEPTED") {
    return { ok: false, blocker: "This code has already been used." };
  }
  if (invite.status !== "PENDING") {
    return { ok: false, blocker: "This code is no longer active. Ask your partner for a new one." };
  }
  if (invite.expiresAt <= now) {
    return { ok: false, blocker: "This code has expired. Ask your partner for a new one." };
  }

  const target = invite.user;
  const currentSpace = await findCurrentSpace(clerkUserId);

  if (currentSpace?.id === target.id) {
    return { ok: false, blocker: "You're already in this space." };
  }
  if (target.clerkUserId === clerkUserId) {
    return { ok: false, blocker: "That's your own code — send it to your partner instead." };
  }

  const memberCount = await db.userIdentity.count({ where: { userId: target.id } });
  if (memberCount >= 2) {
    return { ok: false, blocker: "That space already has both partners connected." };
  }

  // The one case we genuinely can't resolve for them: this account has its own
  // live journal with real writing in it. Joining would strand that content.
  // An archive is fine to leave — it stays reachable either way.
  if (leaveMode(currentSpace, clerkUserId) === "blocked") {
    return {
      ok: false,
      blocker:
        "This account already has its own journal with entries in it. Sign in with the account you want to connect, or start fresh.",
    };
  }

  return {
    ok: true,
    space: {
      title: spaceTitle(target),
      entries: target._count.entries,
      memories: target._count.memories,
      since: target.createdAt,
    },
  };
}

export async function joinSpaceWithCode(rawCode) {
  const clerkUserId = await getAuthenticatedUserId();
  const now = new Date();

  const invite = await findInvite(rawCode);

  if (!invite) throw new Error("That code doesn't match any invite. Check it with your partner.");

  if (invite.status !== "PENDING") {
    if (invite.status === "ACCEPTED" && invite.acceptedByClerkId === clerkUserId) {
      return { ok: true, message: "You're already connected." };
    }
    throw new Error("This code is no longer active. Ask your partner for a new one.");
  }

  if (invite.expiresAt <= now) {
    await db.spaceInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("This code has expired. Ask your partner for a new one.");
  }

  const target = invite.user;
  const currentSpace = await findCurrentSpace(clerkUserId);

  if (currentSpace?.id === target.id) {
    return { ok: true, message: "You're already in this space." };
  }
  if (target.clerkUserId === clerkUserId) {
    throw new Error("That's your own code — send it to your partner instead.");
  }

  const memberCount = await db.userIdentity.count({ where: { userId: target.id } });
  if (memberCount >= 2) {
    throw new Error("That space already has both partners connected.");
  }

  const mode = leaveMode(currentSpace, clerkUserId);
  if (mode === "blocked") {
    throw new Error(
      "This account already has its own journal with entries in it. Sign in with the account you want to connect, or start fresh."
    );
  }

  const operations = [];

  if (mode === "disposable") {
    // Drop the empty shell first — it holds this account's unique clerkUserId
    // on both User and UserIdentity, so the new identity can't exist alongside
    // it. Deleting the User cascades the identity away with it.
    operations.push(db.user.delete({ where: { id: currentSpace.id } }));
  } else if (mode === "archived") {
    // Keep the archive and everything in it; only stop being *in* it. Recorded
    // first so the right to reopen it exists before we point away.
    operations.push(
      db.spaceAccess.createMany({
        data: [{ clerkUserId, userId: currentSpace.id }],
        skipDuplicates: true,
      })
    );
  }

  operations.push(
    // Upsert rather than create: leaving an archive keeps the existing identity
    // row, so there is one to move instead of one to add.
    db.userIdentity.upsert({
      where: { clerkUserId },
      create: { clerkUserId, userId: target.id },
      update: { userId: target.id },
    }),
    db.spaceInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: now,
        acceptedByClerkId: clerkUserId,
      },
    })
  );

  await db.$transaction(operations);

  revalidatePath("/", "layout");

  return { ok: true, message: `You're connected to ${spaceTitle(target)}.` };
}

/** Kept so invite links minted by the old system still resolve. */
export async function acceptSpaceInvite(token) {
  return joinSpaceWithCode(token);
}

export async function removePartner(targetClerkUserId) {
  const clerkUserId = await getAuthenticatedUserId();
  const space = await getOrCreateUser();

  if (space.clerkUserId !== clerkUserId) {
    throw new Error("Only the person who created this space can remove a partner.");
  }
  if (targetClerkUserId === clerkUserId) {
    throw new Error("You can't remove yourself from a space you created.");
  }

  const identity = await db.userIdentity.findUnique({
    where: { clerkUserId: targetClerkUserId },
  });

  if (!identity || identity.userId !== space.id) {
    throw new Error("That partner isn't connected to this space.");
  }

  // Only the membership goes. Anything they wrote belongs to the shared journal
  // and stays exactly where it is.
  await db.userIdentity.delete({ where: { clerkUserId: targetClerkUserId } });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function leaveSpace() {
  const clerkUserId = await getAuthenticatedUserId();
  const space = await getOrCreateUser();

  if (space.clerkUserId === clerkUserId) {
    throw new Error(
      "You created this space, so you can't leave it — remove your partner instead."
    );
  }

  await db.userIdentity.delete({ where: { clerkUserId } });

  // No space left to belong to; the next page load hands them a fresh one.
  revalidatePath("/", "layout");
  return { ok: true };
}
