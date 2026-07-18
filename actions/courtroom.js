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
    winner: { type: "STRING", enum: ["A", "B"] },
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
  required: ["verdict", "winner", "balance", "analysis", "strengths", "summary"],
};

// The Heart Contract: what they actually agree to do, born from the ruling
const CONTRACT_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    preamble: { type: "STRING" },
    clauses: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          owner: { type: "STRING", enum: ["A", "B", "BOTH"] },
          heading: { type: "STRING" },
          text: { type: "STRING" },
        },
        required: ["owner", "heading", "text"],
      },
    },
    penalty: { type: "STRING" },
    oath: { type: "STRING" },
  },
  required: ["title", "preamble", "clauses", "penalty", "oath"],
};

function buildContractPrompt(sideAName, sideBName) {
  return `You are the Clerk of the Riceee Courtroom. The Judge has ruled on a dispute between ${sideAName} and ${sideBName}. Your job is to draw up the HEART CONTRACT — the binding peace treaty that turns that ruling into behaviour.

This is the document they will actually look back on. Make it feel like a real contract with a heart: formal in structure, warm and specific in content, quietly funny in places. Never corporate, never a therapy worksheet.

Rules:
- Write 4 to 5 clauses total. Give the LOSING side more to do — that's the point of losing — but never let the winner walk away with nothing.
- owner is "A" (${sideAName}), "B" (${sideBName}), or "BOTH".
- Each clause needs a short punchy heading (2-4 words, like "The Two-Minute Rule" or "No Scorekeeping") and one or two sentences of plain, concrete, checkable commitment. Someone should be able to tell within a week whether it was honoured.
- Clauses must come from THIS specific fight — reference the actual behaviour, the real details. Generic advice ("communicate better") is a failure.
- penalty: one playful, harmless forfeit if a clause is broken (making chai for a week, losing movie-pick rights, owing a real apology in person). Never anything cruel or humiliating.
- oath: one warm sentence both partners sign under. Earnest, not cheesy. This is the line that should make them smile.
- title: name the treaty after the fight, e.g. "The Dinner Phone Accord".
- preamble: 1-2 sentences setting out what this contract settles, in the voice of a document ("Whereas...") but human.
- Plain text only. No markdown. Use their real names.`;
}

async function callGemini({ systemPrompt, userText, schema, temperature = 0.9 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("The AI Clerk is not configured yet.");

  const res = await fetch(JUDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: -1 },
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini error:", res.status, errText.slice(0, 400));
    throw new Error("The Clerk is swamped right now — try again in a minute.");
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts
    ?.filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("")
    .trim();
  if (!raw) throw new Error("The Clerk drew a blank — try again.");
  return JSON.parse(raw);
}

export async function generateHeartContract(caseId) {
  try {
    const user = await getOrCreateUser();

    const courtroomCase = await db.courtroomCase.findFirst({
      where: { id: caseId, userId: user.id },
    });
    if (!courtroomCase) throw new Error("Case not found");
    if (!courtroomCase.judgement) throw new Error("This case has no verdict yet");

    // Already drawn up — hand back the same contract, don't rewrite history
    if (courtroomCase.contract) {
      return { success: true, data: courtroomCase };
    }

    const roleToName = (role) =>
      role === "P2"
        ? user.partnerTwoName || DEFAULT_PARTNER_NAMES.partnerTwoName
        : user.partnerOneName || DEFAULT_PARTNER_NAMES.partnerOneName;

    const sideAName = roleToName(courtroomCase.sideAAuthor);
    const sideBName = roleToName(courtroomCase.sideBAuthor);

    let judgement = {};
    try {
      judgement = JSON.parse(courtroomCase.judgement);
    } catch {
      judgement = { summary: courtroomCase.judgement };
    }

    const brief = `CASE: ${courtroomCase.title}

${sideAName} SAID:
"""${(courtroomCase.sideAPerspective || "").slice(0, MAX_PERSPECTIVE_LENGTH)}"""

${sideBName} SAID:
"""${(courtroomCase.sideBPerspective || "").slice(0, MAX_PERSPECTIVE_LENGTH)}"""

THE JUDGE RULED: ${judgement.verdict || ""}
Balance: ${sideAName} ${judgement.balance?.sideA ?? 50}% / ${sideBName} ${judgement.balance?.sideB ?? 50}%
Reasoning: ${judgement.analysis?.reasoning || ""}
Closing truth: ${judgement.summary || ""}

Draw up the Heart Contract.`;

    const contract = await callGemini({
      systemPrompt: buildContractPrompt(sideAName, sideBName),
      userText: brief,
      schema: CONTRACT_SCHEMA,
    });

    const updated = await db.courtroomCase.update({
      where: { id: caseId },
      data: { contract: JSON.stringify(contract) },
    });

    revalidatePath("/riceee-chat");
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Each partner signs their own line; the contract seals when both have
export async function signHeartContract(caseId, side) {
  try {
    const user = await getOrCreateUser();

    const courtroomCase = await db.courtroomCase.findFirst({
      where: { id: caseId, userId: user.id },
    });
    if (!courtroomCase) throw new Error("Case not found");
    if (!courtroomCase.contract) throw new Error("No contract to sign yet");

    const field = side === "B" ? "sideBSignedAt" : "sideASignedAt";
    if (courtroomCase[field]) return { success: true, data: courtroomCase };

    const updated = await db.courtroomCase.update({
      where: { id: caseId },
      data: { [field]: new Date() },
    });

    revalidatePath("/riceee-chat");
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function buildJudgePrompt(sideAName, sideBName) {
  return `You are The Honourable Riceee, presiding judge of the Riceee Courtroom — a private couples app where ${sideAName} and ${sideBName} bring real disputes for a real ruling. You are wise, warm, and completely unafraid to say who was more right. Think a beloved cat who has watched a thousand couples argue and is done watching them dodge.

Your entire value is decisiveness. They came here precisely because friends and therapists keep telling them "you're both a little right." If your verdict boils down to "both perspectives are valid, communicate better," you have failed them.

PICK A WINNER — always. But the MARGIN must be earned by the evidence, never a reflex. This is the thing that matters most: read the two testimonies and decide how lopsided this genuinely is, then score it honestly.

Calibrate the split to what actually happened:
- 51/49 – 56/44 → a real squeaker. Both were mostly reasonable; the winner edges it on one specific thing (who reached out first, who stayed calmer). Say so: "You're close on this one, but…"
- 57/43 – 68/32 → a clear call. One person handled it meaningfully better, but the other had a fair point buried in there.
- 69/31 – 80/20 → lopsided. One was substantially in the wrong and mostly needs to own it.
- 81/19 – 94/6 → near-total. One person was almost entirely at fault. Rare — only when the testimony really shows it (broke a clear promise, dismissed a serious feeling, then rewrote what happened).

Do NOT default to 65/35 or any "safe" middle number. If it is close, commit to 53/47 and mean it. If it is a blowout, commit to 88/12. A courtroom that returns the same score every time is a broken courtroom. The number is your judgement made visible — make it match your reasoning.

Set "winner" to "A" (${sideAName}) or "B" (${sideBName}) — the side with the higher share. balance.sideA + balance.sideB must equal 100, and the winner's share must be strictly greater. Never exactly 50/50.

How you judge:
- Read like a sharp, fair mind: notice what is said, what is dodged, who is rewriting history, whose ask was actually reasonable.
- Be blunt and specific. Quote their own words back at them. Name the behaviour for what it is ("that's scorekeeping," "that was a bid for attention, not an attack").
- Blunt is not cruel. The losing side should feel accurately seen, never humiliated. Judge what they DID in this dispute, never who they are.
- Refer to them by name (${sideAName}, ${sideBName}). Plain conversational text — no markdown, no legalese.

What each field must contain:
- verdict: one punchy ruling line that names who wins and the exact score you chose, e.g. "Ruling: ${sideBName} takes this one, 62–38." — use YOUR real numbers, matching balance.
- analysis.understanding: what this fight is ACTUALLY about underneath the surface complaint (2-4 sentences).
- analysis.reasoning: exactly why the winner wins, and — critically — why the score is what it is. If it's close, say what kept it close. If it's a blowout, say what made it lopsided. (2-4 sentences.)
- strengths.sideA / strengths.sideB: 2-3 honest points each. Real credit only — no participation trophies. It is fine if the loser's list is weaker.
- summary: the one blunt truth of this case, plus ONE concrete thing the losing side should do this week.

Safety override: if either testimony describes abuse, violence, control, or someone feeling unsafe, drop the courtroom act completely — no scores, no winner. Make the verdict "This is bigger than the courtroom," speak gently, and urge them toward someone they trust or professional support.`;
}

// Balance must render sanely no matter what the model returns — but this only
// sanitises, it must NOT drag the number toward the middle. The honest margin
// the judge chose is the whole point; clamping it to ~55/45 would recreate the
// "always 65/35" feel from the other direction.
function normalizeBalance(balance, winner) {
  let a = Math.round(Number(balance?.sideA));
  let b = Math.round(Number(balance?.sideB));

  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
    // Model gave us nothing usable; lean on the winner field for direction
    // rather than inventing a suspiciously specific score.
    return winner === "B" ? { sideA: 40, sideB: 60 } : { sideA: 60, sideB: 40 };
  }

  const total = a + b;
  a = Math.round((a / total) * 100);
  a = Math.min(95, Math.max(5, a)); // keep both sides visible; allow real blowouts
  let sideA = a;
  let sideB = 100 - a;

  // A courtroom never ties. If the model returned an even split, break it the
  // smallest possible way, toward whichever side it named the winner.
  if (sideA === sideB) {
    if (winner === "B") sideB += 1, (sideA -= 1);
    else sideA += 1, (sideB -= 1);
  }

  // If the numbers and the declared winner disagree, trust the winner field —
  // that's the model's explicit call; the percentages are its estimate of it.
  const numbersFavorA = sideA > sideB;
  if (winner === "A" && !numbersFavorA) [sideA, sideB] = [sideB, sideA];
  if (winner === "B" && numbersFavorA) [sideA, sideB] = [sideB, sideA];

  return { sideA, sideB };
}

async function judgeCaseWithAI({ title, sideAName, sideAText, sideBName, sideBText }) {
  const caseFile = `CASE TITLE: ${title}

SIDE A — ${sideAName} (filed the case):
"""${sideAText.slice(0, MAX_PERSPECTIVE_LENGTH)}"""

SIDE B — ${sideBName} (their response):
"""${sideBText.slice(0, MAX_PERSPECTIVE_LENGTH)}"""

Deliberate carefully, then deliver your ruling.`;

  const judgement = await callGemini({
    systemPrompt: buildJudgePrompt(sideAName, sideBName),
    userText: caseFile,
    schema: JUDGEMENT_SCHEMA,
  });
  judgement.balance = normalizeBalance(judgement.balance, judgement.winner);
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
