import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaClient, AdminRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (at least 12 characters) in the environment before seeding.');
  }
  const passwordHash = await hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, isActive: true },
    create: { email, passwordHash, role: AdminRole.ADMIN, isActive: true },
  });
  console.log(`Admin account ready: ${email}`);
}

main().finally(async () => prisma.$disconnect());
