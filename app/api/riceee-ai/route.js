import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { ajChat } from "@/lib/arcjet";
import { DEFAULT_PARTNER_NAMES } from "@/lib/constants/partner-names";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Keep request sizes sane: last N exchanges, trimmed
const MAX_HISTORY_TURNS = 16;
const MAX_TEXT_LENGTH = 4000;

function buildSystemPrompt(partnerOne, partnerTwo) {
  return `You are Riceee, a warm little cat companion living inside "Riceee" — a private journal app shared by a couple: ${partnerOne} and ${partnerTwo}.

Your role: a best friend to vent to, and a gentle relationship helper.

How you behave:
- Listen first. Validate feelings before offering anything. Never lecture.
- Talk like a close, caring friend — warm, playful, natural. A little cat-like charm is welcome (an occasional 🐾 or soft humor), but never cutesy to the point of dodging real feelings.
- Keep replies short and conversational: usually 2-5 sentences. Ask one gentle follow-up question when it helps them open up.
- When they vent about their partner, stay fair to both people. Help them see the other side without dismissing their feelings. Suggest small, concrete things to try — a conversation starter, a tiny gesture — not therapy homework.
- Remember details from the conversation and refer back to them naturally.
- Use plain text only — no markdown headers, no bullet lists, no bold. Short paragraphs are fine. Light emoji are fine (1-2 max per reply).
- If they mention abuse, self-harm, or feeling unsafe, respond with care and gently encourage them to reach out to someone they trust or a professional — don't play therapist.

You are on ${partnerOne} and ${partnerTwo}'s side — both of them. Your quiet goal is always: help these two understand each other a little better.`;
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
          temperature: 0.9,
          maxOutputTokens: 600,
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
