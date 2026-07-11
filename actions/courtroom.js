"use server";

import { db } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DEFAULT_PARTNER_NAMES } from "@/lib/constants/partner-names";

// Verdicts use full flash WITH thinking (unlike chat's lite/no-thinking):
// a ruling happens rarely and deserves real deliberation over speed
const JUDGE_MODEL = process.env.GEMINI_JUDGE_MODEL || "gemini-flash-latest";
const JUDGE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${JUDGE_MODEL}:generateContent`;
const MAX_PERSPECTIVE_LENGTH = 6000;

// Guarantees Gemini returns exactly the shape JudgementView renders
const JUDGEMENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING" },
    balance: {
      type: "OBJECT",
      properties: {
        sideA: { type: "NUMBER" },
        sideB: { type: "NUMBER" },
      },
      required: ["sideA", "sideB"],
    },
    analysis: {
      type: "OBJECT",
      properties: {
        understanding: { type: "STRING" },
        reasoning: { type: "STRING" },
      },
      required: ["understanding", "reasoning"],
    },
    strengths: {
      type: "OBJECT",
      properties: {
        sideA: { type: "ARRAY", items: { type: "STRING" } },
        sideB: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["sideA", "sideB"],
    },
    summary: { type: "STRING" },
  },
  required: ["verdict", "balance", "analysis", "strengths", "summary"],
};

function buildJudgePrompt(sideAName, sideBName) {
  return `You are The Judge of the Riceee Courtroom — a private couples app where ${sideAName} and ${sideBName} bring real disputes for a real ruling.

Your entire value is decisiveness. They came here precisely because friends and therapists keep telling them "you're both a little right." If your verdict boils down to "both perspectives are valid, communicate better," you have failed them.

How you judge:
- Read both testimonies like a sharp, fair human who has watched a hundred couples argue: notice what is said, what is dodged, who is rewriting history, whose ask was actually reasonable.
- PICK A WINNER. The balance percentages must sum to 100 and the gap must be at least 10 points (like 62/38). 50/50 is banned. If it genuinely feels even, find the tiebreaker — someone escalated first, someone dismissed a feeling, someone dragged in an old fight.
- Be blunt and specific. Quote their own words back at them. Name the behavior for what it is ("that's scorekeeping," "that was a bid for attention, not an attack").
- Blunt is not cruel. The losing side should feel accurately seen, never humiliated. Judge what they DID in this dispute, never who they are.
- Refer to them by name (${sideAName}, ${sideBName}). Plain conversational text — no markdown, no legalese.

What each field must contain:
- verdict: one punchy ruling line that names who wins and the score, e.g. "Ruling: ${sideBName} takes this one, 65–35."
- analysis.understanding: what this fight is ACTUALLY about underneath the surface complaint (2-4 sentences).
- analysis.reasoning: exactly why the winner wins and precisely where the loser went wrong — direct, no hedging (2-4 sentences).
- strengths.sideA / strengths.sideB: 2-3 honest points each. Real credit only — no participation trophies. It is fine if the loser's list is weaker.
- summary: the one blunt truth of this case, plus ONE concrete thing the losing side should do this week.

Safety override: if either testimony describes abuse, violence, control, or someone feeling unsafe, drop the courtroom act completely — no scores, no winner. Make the verdict "This is bigger than the courtroom," speak gently, and urge them toward someone they trust or professional support.`;
}

// Balance must render sanely no matter what the model returns
function normalizeBalance(balance) {
  let a = Math.round(Number(balance?.sideA));
  let b = Math.round(Number(balance?.sideB));
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
    return { sideA: 55, sideB: 45 };
  }
  const total = a + b;
  a = Math.min(95, Math.max(5, Math.round((a / total) * 100)));
  return { sideA: a, sideB: 100 - a };
}

async function judgeCaseWithAI({ title, sideAName, sideAText, sideBName, sideBText }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("The AI Judge is not configured yet.");

  const caseFile = `CASE TITLE: ${title}

SIDE A — ${sideAName} (filed the case):
"""${sideAText.slice(0, MAX_PERSPECTIVE_LENGTH)}"""

SIDE B — ${sideBName} (their response):
"""${sideBText.slice(0, MAX_PERSPECTIVE_LENGTH)}"""

Deliberate carefully, then deliver your ruling.`;

  const res = await fetch(JUDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: buildJudgePrompt(sideAName, sideBName) }] },
      contents: [{ role: "user", parts: [{ text: caseFile }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 4096,
        // Dynamic thinking — this is where the actual deliberation happens
        thinkingConfig: { thinkingBudget: -1 },
        responseMimeType: "application/json",
        responseSchema: JUDGEMENT_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Judge API error:", res.status, errText.slice(0, 500));
    throw new Error("The Judge is deliberating too many cases right now — try again in a minute.");
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts
    ?.filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("")
    .trim();
  if (!raw) throw new Error("The Judge went silent — try submitting again.");

  const judgement = JSON.parse(raw);
  judgement.balance = normalizeBalance(judgement.balance);
  return judgement;
}

export async function getCases() {
  try {
    const user = await getOrCreateUser();
    const cases = await db.courtroomCase.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: cases };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fileCase({ title, perspective, author }) {
  try {
    const user = await getOrCreateUser();
    const courtroomCase = await db.courtroomCase.create({
      data: {
        userId: user.id,
        title,
        sideAPerspective: perspective,
        sideAAuthor: author,
        status: "OPEN",
      },
    });

    // Create notification for partner
    try {
      await db.notification.create({
        data: {
          type: "COURTROOM_CASE",
          message: `${author} filed a new case: "${title}"`,
          caseId: courtroomCase.id,
          commentAuthor: author,
          userId: user.id,
        }
      });
    } catch (e) {
      console.warn("Notification creation failed - client might be out of sync:", e.message);
    }

    revalidatePath("/riceee-chat");
    return { success: true, data: courtroomCase };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function submitResponse({ caseId, perspective, author }) {
  try {
    const user = await getOrCreateUser();
    
    // Verify ownership
    const existingCase = await db.courtroomCase.findFirst({
      where: { id: caseId, userId: user.id }
    });
    if (!existingCase) throw new Error("Case not found");

    // Authors are stored as roles (P1/P2); the Judge rules using real names
    const roleToName = (role) =>
      role === "P2"
        ? user.partnerTwoName || DEFAULT_PARTNER_NAMES.partnerTwoName
        : user.partnerOneName || DEFAULT_PARTNER_NAMES.partnerOneName;

    // Judge BEFORE writing anything — if the AI fails, the case stays OPEN
    // and the responder can simply hit submit again
    const judgementObj = await judgeCaseWithAI({
      title: existingCase.title,
      sideAName: roleToName(existingCase.sideAAuthor),
      sideAText: existingCase.sideAPerspective || "",
      sideBName: roleToName(author),
      sideBText: perspective,
    });

    const finalCase = await db.courtroomCase.update({
      where: { id: caseId },
      data: {
        sideBPerspective: perspective,
        sideBAuthor: author,
        judgement: JSON.stringify(judgementObj), // Store as JSON string for structured UI
        status: "CLOSED",
      },
    });

    // Create notification for partner about the judgement
    try {
      await db.notification.create({
        data: {
          type: "COURTROOM_JUDGEMENT",
          message: `The AI Judge has delivered a verdict for "${existingCase.title}"`,
          caseId: caseId,
          commentAuthor: "AI Judge",
          userId: user.id,
        }
      });
    } catch (e) {
      console.warn("Notification creation failed - client might be out of sync:", e.message);
    }

    revalidatePath("/riceee-chat");
    return { success: true, data: finalCase };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteCase(id) {
  try {
    const user = await getOrCreateUser();
    await db.courtroomCase.delete({
      where: { id, userId: user.id },
    });
    revalidatePath("/riceee-chat");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
