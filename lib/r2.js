import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 client configured for Cloudflare R2
export const r2Client = new S3Client({
  region: "auto", // R2 uses 'auto' region
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to R2
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} key - The object key (path/filename in R2)
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export async function uploadToR2(fileBuffer, key, contentType) {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await r2Client.send(command);

    // Return the public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    return publicUrl;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Delete a file from R2
 * @param {string} key - The object key to delete
 * @returns {Promise<void>}
 */
export async function deleteFromR2(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Generate a unique key for R2 storage
 * @param {string} originalFilename - The original filename
 * @param {string} userId - The user ID for organization
 * @returns {string} - A unique key like "memories/userId/timestamp-filename"
 */
export function generateR2Key(originalFilename, userId) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `memories/${userId}/${timestamp}-${randomString}-${sanitizedFilename}`;
}
