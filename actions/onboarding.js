"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";
import { resolvePartnerNames } from "@/lib/constants/partner-names";

export async function getCurrentPartnerNames() {
  const user = await getOrCreateUser();
  return resolvePartnerNames(user);
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
