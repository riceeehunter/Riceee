"use server";

import { db } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

    const courtroomCase = await db.courtroomCase.update({
      where: { id: caseId },
      data: {
        sideBPerspective: perspective,
        sideBAuthor: author,
        status: "PENDING",
      },
    });

    // Simulate High-Fidelity Structured AI Judgement using Placeholders
    const judgementObj = {
      verdict: `Recommendation: Balanced Communication`,
      balance: { sideA: 45, sideB: 55 },
      analysis: {
        understanding: `The core of this dispute lies in the disconnect between {{P1}}'s need for immediate emotional reassurance and {{P2}}'s focus on external responsibilities. {{P1}} feels neglected when calls aren't answered, while {{P2}} feels overwhelmed by the pressure to be constantly available during busy hours.`,
        reasoning: `While {{P1}}'s feelings of being secondary are valid, {{P2}}'s perspective highlights that their lack of response isn't a lack of love, but a high-pressure work environment. The AI recognizes 'emotional commingling' where work stress is being interpreted as relationship neglect.`,
      },
      strengths: {
        sideA: [
          "Clear expression of emotional needs.",
          "Vulnerability about feeling de-prioritized.",
        ],
        sideB: [
          "Strong focus on professional boundaries.",
          "Logical explanation of time constraints.",
        ]
      },
      summary: `Both partners are prioritizing different, yet valid, aspects of their life. The breakdown is not in intent, but in expectation-setting.`
    };

    const finalCase = await db.courtroomCase.update({
      where: { id: caseId },
      data: {
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
