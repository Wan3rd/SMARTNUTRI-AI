const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.meal_logs.findMany({
    orderBy: { logged_at: 'desc' },
    take: 1
  });
  console.log(JSON.stringify(logs[0].ai_analysis, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
