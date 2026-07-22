"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { getAuthenticatedUserId, getCurrentUser } from "@/lib/auth";
import {
  COOLDOWN_DAYS,
  SPACE_STATUS,
  cooldownEndDate,
  daysUntilClose,
  forkSpace,
  isArchived,
  isCoolingDown,
} from "@/lib/space-closure";

/** What the settings UI needs to render every state of the closure flow. */
export async function getClosureState() {
  const clerkUserId = await getAuthenticatedUserId();
  const space = await getCurrentUser();

  const memberCount = await db.userIdentity.count({ where: { userId: space.id } });

  return {
    status: space.spaceStatus || SPACE_STATUS.ACTIVE,
    isArchived: isArchived(space),
    isCoolingDown: isCoolingDown(space),
    // Only the person who started it can call it off, so "am I the initiator"
    // decides whether this viewer sees Cancel or Close now.
    isInitiator: space.closureInitiatedBy === clerkUserId,
    daysRemaining: daysUntilClose(space),
    closesAt: space.closesAt,
    archivedAt: space.archivedAt,
    cooldownDays: COOLDOWN_DAYS,
    hasPartner: memberCount >= 2,
    // Typed to confirm — enough friction that it can't happen by accident.
    confirmationPhrase: confirmationPhraseFor(space),
  };
}

/** The phrase the initiator has to type. Their own space name, nothing cryptic. */
function confirmationPhraseFor(space) {
  const one = space?.partnerOneName?.trim();
  const two = space?.partnerTwoName?.trim();
  if (one && two) return `${one} & ${two}`;
  return "end this space";
}

export async function beginClosure(typedPhrase) {
  const clerkUserId = await getAuthenticatedUserId();
  const space = await getCurrentUser();

  if (isArchived(space)) {
    throw new Error("This space is already archived.");
  }
  if (isCoolingDown(space)) {
    throw new Error("This space is already closing.");
  }

  const expected = confirmationPhraseFor(space);
  if (String(typedPhrase || "").trim().toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`Type "${expected}" exactly to confirm.`);
  }

  const closesAt = cooldownEndDate();

  await db.user.update({
    where: { id: space.id },
    data: {
      spaceStatus: SPACE_STATUS.COOLING_DOWN,
      closureInitiatedBy: clerkUserId,
      closureStartedAt: new Date(),
      closesAt,
    },
  });

  // The partner finds out from the product, not by noticing things went quiet.
  // Stated plainly, with no blame and no reason attached — the initiator is
  // never asked to justify this, so there's nothing here to relay.
  await notifySpace(
    space.id,
    "SPACE_CLOSING",
    `This space will close in ${COOLDOWN_DAYS} days. Everything in it stays readable and it's all yours — you can download it from Settings at any time.`
  );

  revalidatePath("/", "layout");
  return { ok: true, closesAt };
}

/**
 * Call off a closure. Initiator only, and that restriction is the whole point:
 * if either partner could cancel, the one who wants to leave could be held in
 * the space indefinitely by the other one cancelling every time.
 */
export async function cancelClosure() {
  const clerkUserId = await getAuthenticatedUserId();
  const space = await getCurrentUser();

  if (!isCoolingDown(space)) {
    throw new Error("This space isn't closing.");
  }
  if (space.closureInitiatedBy !== clerkUserId) {
    throw new Error(
      "Only the person who started this can call it off. You can close the space now instead."
    );
  }

  await db.user.update({
    where: { id: space.id },
    data: {
      spaceStatus: SPACE_STATUS.ACTIVE,
      closureInitiatedBy: null,
      closureStartedAt: null,
      closesAt: null,
    },
  });

  await notifySpace(
    space.id,
    "SPACE_REOPENED",
    "This space is no longer closing. Everything is back to normal."
  );

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Skip the rest of the cooldown. Available to the partner who *didn't* start
 * it: waiting out two weeks you never asked for is its own kind of stuck, so
 * the flow can always be moved forward — just never backward against someone.
 */
export async function closeSpaceNow() {
  const clerkUserId = await getAuthenticatedUserId();
  const space = await getCurrentUser();

  if (!isCoolingDown(space)) {
    throw new Error("This space isn't closing.");
  }

  const isMember = await db.userIdentity.findFirst({
    where: { userId: space.id, clerkUserId },
    select: { id: true },
  });
  if (!isMember) {
    throw new Error("You're not a member of this space.");
  }

  // Bring the deadline forward and let the normal path do the work, so there's
  // exactly one implementation of the fork rather than two that can drift.
  await db.user.update({
    where: { id: space.id },
    data: { closesAt: new Date(Date.now() - 1000) },
  });

  await forkSpace(space.id);

  revalidatePath("/", "layout");
  return { ok: true };
}

async function notifySpace(spaceId, type, message) {
  try {
    await db.notification.create({
      data: { type, message, userId: spaceId },
    });
  } catch (error) {
    // A missed notification is not a reason to fail the closure itself.
    console.warn("Closure notification failed:", error.message);
  }
}
