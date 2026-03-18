"use server";

import { revalidateTag, unstable_cache } from "next/cache";

export async function getPixabayImage(query) {
  try {
    const res = await fetch(
      `https://pixabay.com/api/?q=${query}&key=${process.env.PIXABAY_API_KEY}&min_width=1280&min_height=720&image_type=illustration&category=feelings`
    );
    const data = await res.json();
    return data.hits[0]?.largeImageURL || null;
  } catch (error) {
    console.error("Pixabay API Error:", error);
    return null;
  }
}

const personalMessages = [
  "You're doing better than you think. Keep going 💗",
  "Some days are tough, but you're tougher. Keep believing in yourself.",
  "Take a deep breath. You've got this, one step at a time.",
  "Your feelings are valid, your thoughts matter, and you are not alone.",
  "Progress isn't always visible, but you're still moving forward.",
  "It's okay to rest. You don't have to be perfect every day.",
  "Whatever is on your mind today, this is a safe space to share it.",
  "You're stronger than your worries and braver than you realize.",
  "Every entry you write is a step toward understanding yourself better.",
  "Some days you'll conquer the world. Other days, just existing is enough.",
];

export const getDailyPrompt = unstable_cache(
  async () => {
    // Get day of year to rotate through messages consistently each day
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // Use modulo to cycle through messages
    const messageIndex = dayOfYear % personalMessages.length;
    return personalMessages[messageIndex];
  },
  ["daily-prompt"],
  {
    revalidate: 86400,
    tags: ["daily-prompt"],
  }
);

// Optional: Function to force revalidate the cache
export async function revalidateDailyPrompt() {
  revalidateTag("daily-prompt");
}
