const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      email: true,
      followUp: true,
      status: true
    }
  });
  console.log(JSON.stringify(leads, null, 2));
  await prisma.$disconnect();
}

check();
