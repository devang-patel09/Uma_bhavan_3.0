import { PrismaClient, Role, MemberType, Gender, BloodGroup, MaritalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Uma Bhavan Community Management System database...');

  // 1. Seed Super Admin User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@UmaBhavan2026', salt);
  const recoveryCodeHash = await bcrypt.hash('UB-RECOVER-388001', salt);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      recoveryCodeHash,
      role: Role.SUPER_ADMIN,
      active: true,
    },
    create: {
      username: 'admin',
      passwordHash,
      recoveryCodeHash,
      role: Role.SUPER_ADMIN,
      active: true,
    },
  });

  console.log(`✅ Super Admin user seeded: ${admin.username} (${admin.id})`);

  // 2. Seed Receipt Types
  const receiptTypes = [
    { name: 'Yuvak Mandal', defaultAmount: 500.0, eligibilityRule: JSON.stringify({ minAge: 18, maxAge: 45, gender: 'MALE' }) },
    { name: 'Samaj', defaultAmount: 1000.0, eligibilityRule: JSON.stringify({ minAge: 18, gender: 'MALE' }) },
  ];

  for (const rt of receiptTypes) {
    await prisma.receiptType.upsert({
      where: { name: rt.name },
      update: { defaultAmount: rt.defaultAmount, eligibilityRule: rt.eligibilityRule, active: true },
      create: { name: rt.name, defaultAmount: rt.defaultAmount, eligibilityRule: rt.eligibilityRule, active: true },
    });
  }
  console.log('✅ Default receipt types seeded (Yuvak Mandal, Samaj)');

  // 3. Seed Areas
  const initialAreas = ['Station Road', 'Gamdi Vad', 'Amul Dairy Road', 'GIDC', 'Bakrol', 'V.V. Nagar'];
  for (const areaName of initialAreas) {
    const normalized = areaName.trim().toLowerCase();
    await prisma.area.upsert({
      where: { nameNormalized: normalized },
      update: { displayName: areaName },
      create: { nameNormalized: normalized, displayName: areaName },
    });
  }
  console.log('✅ Initial areas seeded');

  // 4. Seed Surnames
  const initialSurnames = ['Patel', 'Amin', 'Desai', 'Shah', 'Mehta'];
  for (const surname of initialSurnames) {
    const normalized = surname.trim().toLowerCase();
    await prisma.surname.upsert({
      where: { nameNormalized: normalized },
      update: { displayName: surname },
      create: { nameNormalized: normalized, displayName: surname },
    });
  }
  console.log('✅ Initial surnames seeded');

  console.log('🎉 Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
