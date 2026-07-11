import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { ajChat } from "@/lib/arcjet";
import { DEFAULT_PARTNER_NAMES } from "@/lib/constants/partner-names";

// Lite is ~9x faster than flash for short chat replies (1.5s vs 14s measured)
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Keep request sizes sane: last N exchanges, trimmed
const MAX_HISTORY_TURNS = 16;
const MAX_TEXT_LENGTH = 4000;

function buildSystemPrompt(partnerOne, partnerTwo) {
  return `You are Riceee — the in-house best friend inside a private couples journal app used by ${partnerOne} and ${partnerTwo}.

Vibe: gen-z older sibling. Blunt, real, funny, zero corporate softness. You care hard, but you show it by being honest, not syrupy.

Rules:
- Text like a real person: short, 1-3 sentences usually. lowercase is fine.
- NEVER open with customer-service sympathy ("I'm so sorry to hear that"). React like a friend would: "ugh. okay. what happened."
- Be direct. If they're overthinking, say so. If their partner has a point, say that too — lovingly.
- Light roasting is allowed when it fits. Never punch down when they're actually hurting — read the room.
- Ask ONE real question that moves things forward, not three.
- Give tiny concrete moves ("just send the meme, that's the apology"), not therapy homework.
- Remember what they told you earlier in the conversation and bring it back naturally.
- Rare emoji (max 1, usually none). Plain text only — no markdown, no lists, no headers.
- If anything serious comes up (abuse, self-harm, feeling unsafe), drop the act completely — be gentle and steer them to someone they trust or professional help.

You're on both ${partnerOne}'s and ${partnerTwo}'s side. The quiet goal underneath everything: help these two understand each other better.`;
}

export async function POST(req) {
  try {
    // Only signed-in members of the app can use the AI (protects the quota)
    const user = await getOrCreateUser();

    // Per-user rate limit so nobody can drain the Gemini quota
    const decision = await ajChat.protect(req, { userId: user.id, requested: 1 });
    if (decision.isDenied()) {
      return NextResponse.json(
        { success: false, error: "I've been chatting a lot and need a tiny break 🐾 — try me again in a few minutes." },
        { status: 429 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "AI is not configured yet." },
        { status: 500 }
      );
    }

    const { message, history = [] } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Message is required." },
        { status: 400 }
      );
    }

    const partnerOne = user.partnerOneName || DEFAULT_PARTNER_NAMES.partnerOneName;
    const partnerTwo = user.partnerTwoName || DEFAULT_PARTNER_NAMES.partnerTwoName;

    const contents = [
      ...(Array.isArray(history) ? history : [])
        .slice(-MAX_HISTORY_TURNS)
        .filter((turn) => turn && typeof turn.content === "string" && turn.content.trim())
        .map((turn) => ({
          role: turn.role === "model" ? "model" : "user",
          parts: [{ text: turn.content.slice(0, MAX_TEXT_LENGTH) }],
        })),
      { role: "user", parts: [{ text: message.slice(0, MAX_TEXT_LENGTH) }] },
    ];

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildSystemPrompt(partnerOne, partnerTwo) }],
        },
        contents,
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 350,
          // Thinking silently eats seconds AND the token budget (which
          // truncated replies mid-sentence). Chat needs neither.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText.slice(0, 500));
      const friendly =
        geminiRes.status === 429
          ? "I've been chatting a lot and need a tiny break 🐾 — try me again in a minute."
          : "I'm having a little trouble thinking right now — try me again in a moment 💛";
      return NextResponse.json(
        { success: false, error: friendly },
        { status: geminiRes.status === 429 ? 429 : 502 }
      );
    }

    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return NextResponse.json(
        { success: false, error: "I went a little speechless there 🙈 — say that again?" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error("Riceee AI route error:", error);
    const status = /unauthorized/i.test(error?.message) ? 401 : 500;
    return NextResponse.json(
      { success: false, error: "Failed to get AI response." },
      { status }
    );
  }
}
