"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { uploadToR2, deleteFromR2, generateR2Key, getSignedR2Url } from "@/lib/r2";
import { resolveAuthorSlotForWrite } from "@/lib/space-identity";

// Verify the file really is an image by its magic bytes — the MIME type
// alone is client-supplied and can be faked
function sniffImageType(buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return "image/gif";
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return "image/webp";
  return null;
}
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";
import {
  getAuthenticatedUserId,
  getCurrentUser,
  getOrCreateUser,
  getWritableSpace,
} from "@/lib/auth";
import { isArchived, isCoolingDown, releaseMemoryObject } from "@/lib/space-closure";
import { getViewerSlot } from "@/lib/space-identity";

/**
 * Upload a new memory (photo)
 * @param {FormData} formData - Contains file, caption, uploadedBy
 * @returns {Promise<Object>} - The created memory record
 */
export async function uploadMemory(formData) {
  try {
    const userId = await getAuthenticatedUserId();

    // Rate limiting
    const req = await request();
    const decision = await aj.protect(req, { userId, requested: 1 });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new Error("Too many uploads. Please try again later.");
      }
      throw new Error("Request blocked");
    }

    const user = await getWritableSpace();

    // Get form data
    const file = formData.get("file");
    const caption = formData.get("caption") || null;
    // Slot, not name -- see resolveAuthorSlotForWrite. Photos outlive nicknames.
    const uploadedBy = await resolveAuthorSlotForWrite(user.id, formData.get("uploadedBy"));
    const memoryDateString = formData.get("memoryDate");
    
    // Parse the memory date, default to now if not provided
    const memoryDate = memoryDateString ? new Date(memoryDateString) : new Date();

    if (!file) throw new Error("No file provided");

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only images are allowed.");
    }

    // Validate file size (max 10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error("File too large. Maximum size is 10MB.");
    }

    // Check total storage quota (9.5GB limit to stay safe)
    const totalSizeResult = await db.memory.aggregate({
      where: { userId: user.id },
      _sum: {
        fileSize: true,
      },
    });

    const currentUsage = totalSizeResult._sum.fileSize || 0;
    const quotaLimit = 9.5 * 1024 * 1024 * 1024; // 9.5GB

    if (currentUsage + file.size > quotaLimit) {
      throw new Error("Storage quota exceeded. Please delete some memories to free up space.");
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // The declared MIME type must match what the bytes actually are
    const sniffedType = sniffImageType(buffer);
    if (!sniffedType) {
      throw new Error("File content is not a valid image.");
    }

    // Generate unique key and upload to R2 (store the *verified* content type)
    const key = generateR2Key(file.name, user.id);
    const url = await uploadToR2(buffer, key, sniffedType);

    // Get image dimensions (optional, for better UI)
    let width = null;
    let height = null;
    // You could use sharp library here to get dimensions, but skipping for now

    // Create memory record in database
    const memory = await db.memory.create({
      data: {
        url,
        key,
        caption,
        uploadedBy,
        userId: user.id,
        fileSize: file.size,
        mimeType: sniffedType,
        width,
        height,
        createdAt: memoryDate, // Use the selected date instead of default
      },
    });

    revalidatePath("/memories");
    // Hand back a short-lived signed URL, never the permanent one
    return { ...memory, url: await getSignedR2Url(memory.key) };
  } catch (error) {
    console.error("Upload memory error:", error);
    throw new Error(error.message);
  }
}

/**
 * Get all memories with optional filters
 * @param {Object} filters - { uploadedBy, search }
 * @returns {Promise<Array>} - Array of memories
 */
export async function getMemories(filters = {}) {
  try {
    const user = await getOrCreateUser();

    const where = { userId: user.id };

    // Filter by uploader
    if (filters.uploadedBy && filters.uploadedBy !== "all") {
      where.uploadedBy = filters.uploadedBy;
    }

    // Search in captions
    if (filters.search) {
      where.caption = {
        contains: filters.search,
        mode: "insensitive",
      };
    }

    const memories = await db.memory.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Replace stored URLs with short-lived signed ones — the bucket can stay
    // private and a leaked link expires on its own
    return Promise.all(
      memories.map(async (memory) => ({
        ...memory,
        url: await getSignedR2Url(memory.key),
      }))
    );
  } catch (error) {
    console.error("Get memories error:", error);
    throw new Error(error.message);
  }
}

/**
 * Get storage usage statistics
 * @returns {Promise<Object>} - { totalSize, totalCount, usagePercentage }
 */
export async function getStorageStats() {
  try {
    const user = await getOrCreateUser();

    // Get count and sum separately
    const totalCount = await db.memory.count({
      where: { userId: user.id },
    });

    const sumResult = await db.memory.aggregate({
      where: { userId: user.id },
      _sum: {
        fileSize: true,
      },
    });

    const totalSize = sumResult._sum.fileSize || 0;
    const quotaLimit = 10 * 1024 * 1024 * 1024; // 10GB
    const usagePercentage = ((totalSize / quotaLimit) * 100).toFixed(2);

    return {
      totalSize,
      totalCount,
      usagePercentage,
      quotaLimit,
      remainingSpace: quotaLimit - totalSize,
    };
  } catch (error) {
    console.error("Get storage stats error:", error);
    throw new Error(error.message);
  }
}

/**
 * Whether this viewer may take a photo down, given what state the space is in.
 *
 * Deliberately more permissive than the blanket read-only rule. Withdrawing a
 * photo of yourself is a consent decision, not a write — treating it like one
 * would mean the moment a relationship ends is the exact moment you lose the
 * ability to take your own face out of it, which is backwards.
 *
 *   active       anyone in the space, as before
 *   cooling down only what you uploaded — there's still one shared copy, so a
 *                delete here removes it for both of you and can't be undone.
 *                Joint photos wait for per-archive redaction, which can do it
 *                properly once there are two copies to tell apart.
 *   archived     anything in your own archive. It's your copy alone; the other
 *                archive keeps its own row, and the stored file survives until
 *                the last reference to it goes.
 */
async function assertCanRemoveMemory(space, memory) {
  if (isArchived(space)) return;
  if (!isCoolingDown(space)) return;

  const slot = await getViewerSlot(space.id);
  if (slot && memory.uploadedBy === slot) return;

  throw new Error(
    "This space is closing, so only photos you added yourself can be removed right now."
  );
}

/**
 * Delete a memory
 * @param {string} memoryId - The memory ID to delete
 * @returns {Promise<void>}
 */
export async function deleteMemory(memoryId) {
  try {
    // Not getWritableSpace: taking a photo down stays available after a space
    // stops accepting new content. assertCanRemoveMemory decides instead.
    const user = await getCurrentUser();

    // Get memory record
    const memory = await db.memory.findUnique({
      where: { id: memoryId },
    });

    if (!memory) throw new Error("Memory not found");
    if (memory.userId !== user.id) throw new Error("Unauthorized");

    await assertCanRemoveMemory(user, memory);

    // Row first, file second. When a space is forked both archives point at the
    // same stored object rather than paying to duplicate every photo, so the
    // file may only go once nothing references it — otherwise deleting a photo
    // here would blank the same photo out of the other person's archive.
    await db.memory.delete({
      where: { id: memoryId },
    });

    if (await releaseMemoryObject(memory.key)) {
      await deleteFromR2(memory.key);
    }

    revalidatePath("/memories");
  } catch (error) {
    console.error("Delete memory error:", error);
    throw new Error(error.message);
  }
}

/**
 * Update memory caption
 * @param {string} memoryId - The memory ID
 * @param {string} caption - New caption
 * @returns {Promise<Object>} - Updated memory
 */
export async function updateMemoryCaption(memoryId, caption) {
  try {
    const user = await getWritableSpace();

    const memory = await db.memory.findUnique({
      where: { id: memoryId },
    });

    if (!memory) throw new Error("Memory not found");
    if (memory.userId !== user.id) throw new Error("Unauthorized");

    const updated = await db.memory.update({
      where: { id: memoryId },
      data: { caption },
    });

    revalidatePath("/memories");
    return updated;
  } catch (error) {
    console.error("Update memory error:", error);
    throw new Error(error.message);
  }
}
