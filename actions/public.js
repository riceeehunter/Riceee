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
  "Hey Riceee, remember: you're doing better than you think. Keep going 💗",
  "Some days are tough, but you're tougher. I believe in you, always.",
  "Take a deep breath, Riceee. You've got this, one step at a time.",
  "Your feelings are valid, your thoughts matter, and you're never alone in this.",
  "Even on hard days, you're still the Riceee I care about most.",
  "Progress isn't always visible, but you're moving forward. Trust the process.",
  "It's okay to rest, Riceee. You don't have to be perfect every single day.",
  "Your smile makes my day brighter, even through a screen 💗",
  "Whatever's on your mind today, know that I'm here, listening.",
  "You're stronger than your worries and braver than you realize.",
  "Every entry you write is a step toward understanding yourself better.",
  "Bad days don't define you, Riceee. You're so much more than a moment.",
  "Sometimes the bravest thing is just showing up. And you did. Proud of you.",
  "Your thoughts are safe here, your feelings are heard, and you matter.",
  "Life gets messy, but that's what makes your story real and beautiful.",
  "You don't have to have it all figured out today. Just be you.",
  "I see your effort, even when you don't. You're doing amazing.",
  "This is your space to be real, be messy, be you. No judgment, ever.",
  "Some days you'll conquer the world. Other days, just existing is enough.",
  "You're not alone in this journey, Riceee. We're in it together 💗",
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
