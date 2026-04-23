const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cases = await prisma.courtroomCase.findMany({
    where: { status: 'OPEN' }
  });

  console.log(`Found ${cases.length} open cases to resolve.`);

  for (const c of cases) {
    const judgementObj = {
      verdict: `Recommendation: Balanced Communication`,
      balance: { sideA: 45, sideB: 55 },
      analysis: {
        understanding: `The core of this dispute lies in the disconnect between ${c.sideAAuthor}'s need for immediate emotional reassurance and the partner's focus on external responsibilities. ${c.sideAAuthor} feels neglected when calls aren't answered, while the partner feels overwhelmed by the pressure to be constantly available during busy hours.`,
        reasoning: `While ${c.sideAAuthor}'s feelings of being secondary are valid, the partner's perspective highlights that their lack of response isn't a lack of love, but a high-pressure work environment. The AI recognizes 'emotional commingling' where work stress is being interpreted as relationship neglect.`,
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

    await prisma.courtroomCase.update({
      where: { id: c.id },
      data: {
        sideBPerspective: "I've been extremely busy with back-to-back meetings lately. It's not that I don't want to talk, I just literally can't pick up the phone without being unprofessional. I wish they understood that my silence is about work, not about them.",
        sideBAuthor: "Partner",
        judgement: JSON.stringify(judgementObj),
        status: 'CLOSED'
      }
    });
    console.log(`Resolved case: ${c.title}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
