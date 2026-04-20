"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";
import { resolvePartnerNames } from "@/lib/constants/partner-names";
import { PLAYER_IDS } from "@/lib/constants/players";

export async function getCurrentPartnerNames() {
  const user = await getOrCreateUser();
  return resolvePartnerNames(user);
}

export async function getCurrentGameSetup() {
  const user = await getOrCreateUser();
  const names = resolvePartnerNames(user);
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return {
      partnerNames: names,
      assignedPlayerId: null,
    };
  }

  const identities = await db.userIdentity.findMany({
    where: { userId: user.id },
    select: { clerkUserId: true },
    orderBy: { createdAt: "asc" },
  });

  const identityIndex = identities.findIndex((identity) => identity.clerkUserId === clerkUserId);

  let assignedPlayerId = null;
  if (identityIndex === 0) {
    assignedPlayerId = PLAYER_IDS.ONE;
  } else if (identityIndex === 1) {
    assignedPlayerId = PLAYER_IDS.TWO;
  } else if (identityIndex > 1) {
    assignedPlayerId = identityIndex % 2 === 0 ? PLAYER_IDS.ONE : PLAYER_IDS.TWO;
  }

  return {
    partnerNames: names,
    assignedPlayerId,
  };
}

export async function savePartnerNames(data) {
  const user = await getOrCreateUser();
  const partnerOneName = data.partnerOneName?.trim();
  const partnerTwoName = data.partnerTwoName?.trim();

  if (!partnerOneName || !partnerTwoName) {
    throw new Error("Both partner names are required.");
  }

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: {
      partnerOneName,
      partnerTwoName,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/journal/write");
  revalidatePath("/memories");

  return resolvePartnerNames(updatedUser);
}
