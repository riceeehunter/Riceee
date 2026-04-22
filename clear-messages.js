const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.message.deleteMany({});
  console.log('Messages deleted');
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
