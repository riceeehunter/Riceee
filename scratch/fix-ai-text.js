const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cases = await prisma.courtroomCase.findMany();

  for (const c of cases) {
    let j = {};
    try {
      j = JSON.parse(c.judgement || "{}");
    } catch (e) { continue; }

    // Replace old names in the AI text
    if (j.analysis) {
      j.analysis.understanding = j.analysis.understanding.replace(/Riceee/g, "Praneeth").replace(/Partner/g, "Mahek");
      j.analysis.reasoning = j.analysis.reasoning.replace(/Riceee/g, "Praneeth").replace(/Partner/g, "Mahek");
    }
    if (j.strengths) {
      // Logic for strengths if needed
    }

    await prisma.courtroomCase.update({
      where: { id: c.id },
      data: {
        judgement: JSON.stringify(j)
      }
    });
  }
  console.log("Updated AI text to use dynamic names.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
