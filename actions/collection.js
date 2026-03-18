"use server";

import aj from "@/lib/arcjet";
import { db } from "@/lib/prisma";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUserId, getOrCreateUser } from "@/lib/auth";

export async function getCollections() {
  const user = await getOrCreateUser();

  const collections = await db.collection.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return collections;
}

export async function createCollection(data) {
  try {
    const userId = await getAuthenticatedUserId();

    // Get request data for ArcJet
    const req = await request();

    // Check rate limit
    const decision = await aj.protect(req, {
      userId,
      requested: 1, // Specify how many tokens to consume
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }

    const user = await getOrCreateUser();

    const collection = await db.collection.create({
      data: {
        name: data.name,
        description: data.description,
        userId: user.id,
      },
    });

    revalidatePath("/dashboard");
    return collection;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function deleteCollection(id) {
  try {
    const user = await getOrCreateUser();

    // Check if collection exists and belongs to user
    const collection = await db.collection.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!collection) throw new Error("Collection not found");

    // Delete the collection (entries will be cascade deleted)
    await db.collection.delete({
      where: { id },
    });

    return true;
  } catch (error) {
    throw new Error(error.message);
  }
}
