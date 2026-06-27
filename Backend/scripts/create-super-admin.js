const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'hamdanahmad0006@gmail.com';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists. Updating role to SUPER_ADMIN...');
    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' },
    });
    console.log(`Done. ${updated.firstName} ${updated.lastName} is now SUPER_ADMIN.`);
    return;
  }

  const hashedPassword = await bcrypt.hash('hamdanak2005', 10);

  const user = await prisma.user.create({
    data: {
      firstName: 'Hamdan',
      lastName: 'Ahmad',
      email,
      username: 'hamdan0006',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isVerified: true,
    },
  });

  console.log(`Super admin created: ${user.firstName} ${user.lastName} (${user.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
