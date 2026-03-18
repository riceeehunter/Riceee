"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { uploadToR2, deleteFromR2, generateR2Key } from "@/lib/r2";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";

/**
 * Upload a new memory (photo)
 * @param {FormData} formData - Contains file, caption, uploadedBy
 * @returns {Promise<Object>} - The created memory record
 */
export async function uploadMemory(formData) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Rate limiting
    const req = await request();
    const decision = await aj.protect(req, { userId, requested: 1 });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new Error("Too many uploads. Please try again later.");
      }
      throw new Error("Request blocked");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get form data
    const file = formData.get("file");
    const caption = formData.get("caption") || null;
    const uploadedBy = formData.get("uploadedBy") || "Hunter x Riceee";
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

    // Generate unique key and upload to R2
    const key = generateR2Key(file.name, user.id);
    const url = await uploadToR2(buffer, key, file.type);

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
        mimeType: file.type,
        width,
        height,
        createdAt: memoryDate, // Use the selected date instead of default
      },
    });

    revalidatePath("/memories");
    return memory;
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
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

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

    return memories;
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
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

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
 * Delete a memory
 * @param {string} memoryId - The memory ID to delete
 * @returns {Promise<void>}
 */
export async function deleteMemory(memoryId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get memory record
    const memory = await db.memory.findUnique({
      where: { id: memoryId },
    });

    if (!memory) throw new Error("Memory not found");
    if (memory.userId !== user.id) throw new Error("Unauthorized");

    // Delete from R2
    await deleteFromR2(memory.key);

    // Delete from database
    await db.memory.delete({
      where: { id: memoryId },
    });

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
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

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
