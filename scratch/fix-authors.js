const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.courtroomCase.updateMany({
    where: { sideAAuthor: "Riceee" },
    data: { sideAAuthor: "Praneeth" }
  });

  await prisma.courtroomCase.updateMany({
    where: { sideBAuthor: "Partner" },
    data: { sideBAuthor: "Mahek" }
  });

  console.log("Updated all legacy authors to Praneeth and Mahek.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
