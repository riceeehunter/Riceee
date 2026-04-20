"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { getAuthenticatedUserId, getOrCreateUser } from "@/lib/auth";

const INVITE_EXPIRY_DAYS = 7;

function getExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + INVITE_EXPIRY_DAYS);
  return date;
}

export async function getCurrentSpaceInvite() {
  const user = await getOrCreateUser();

  const now = new Date();

  const invite = await db.spaceInvite.findFirst({
    where: {
      userId: user.id,
      status: "PENDING",
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return invite;
}

export async function getSpaceStatus() {
  const user = await getOrCreateUser();
  const now = new Date();

  const [memberCount, pendingInvite] = await Promise.all([
    db.userIdentity.count({
      where: { userId: user.id },
    }),
    db.spaceInvite.findFirst({
      where: {
        userId: user.id,
        status: "PENDING",
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return {
    memberCount,
    isConnected: memberCount >= 2,
    hasPendingInvite: Boolean(pendingInvite),
    pendingInviteExpiry: pendingInvite?.expiresAt || null,
  };
}

export async function createSpaceInvite() {
  const clerkUserId = await getAuthenticatedUserId();
  const user = await getOrCreateUser();

  await db.spaceInvite.updateMany({
    where: {
      userId: user.id,
      status: "PENDING",
    },
    data: {
      status: "REVOKED",
    },
  });

  const token = crypto.randomUUID().replace(/-/g, "");

  const invite = await db.spaceInvite.create({
    data: {
      token,
      userId: user.id,
      status: "PENDING",
      createdByClerkId: clerkUserId,
      expiresAt: getExpiryDate(),
    },
  });

  revalidatePath("/settings");

  return invite;
}

export async function acceptSpaceInvite(token) {
  if (!token) {
    throw new Error("Invalid invite link.");
  }

  const clerkUserId = await getAuthenticatedUserId();
  const now = new Date();

  const invite = await db.spaceInvite.findUnique({
    where: { token },
  });

  if (!invite) {
    throw new Error("Invite not found.");
  }

  if (invite.status !== "PENDING") {
    if (invite.status === "ACCEPTED") {
      return { ok: true, message: "Invite already accepted." };
    }
    throw new Error("This invite is no longer active.");
  }

  if (invite.expiresAt <= now) {
    await db.spaceInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("This invite has expired.");
  }

  const existingIdentity = await db.userIdentity.findUnique({
    where: { clerkUserId },
  });

  if (existingIdentity) {
    if (existingIdentity.userId === invite.userId) {
      return { ok: true, message: "You are already in this space." };
    }
    throw new Error("This account already belongs to another space.");
  }

  const legacyUser = await db.user.findUnique({
    where: { clerkUserId },
  });

  if (legacyUser && legacyUser.id !== invite.userId) {
    throw new Error("This account already belongs to another space.");
  }

  await db.$transaction([
    db.userIdentity.create({
      data: {
        clerkUserId,
        userId: invite.userId,
      },
    }),
    db.spaceInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: now,
        acceptedByClerkId: clerkUserId,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return { ok: true, message: "Joined space successfully." };
}
