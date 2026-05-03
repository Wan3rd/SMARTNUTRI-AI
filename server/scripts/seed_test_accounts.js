import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 1. Create Nutritionist
  const nutritionist = await prisma.users.upsert({
    where: { email: 'nutritionist@test.com' },
    update: {},
    create: {
      email: 'nutritionist@test.com',
      password_hash: passwordHash,
      full_name: 'Dr. Jane Smith (Nutritionist)',
      role: 'nutritionist',
      professional_id: 'NUTRI-12345'
    }
  });

  // 2. Create Parent
  const parent = await prisma.users.upsert({
    where: { email: 'parent@test.com' },
    update: {},
    create: {
      email: 'parent@test.com',
      password_hash: passwordHash,
      full_name: 'Sarah Doe (Parent)',
      role: 'parent'
    }
  });

  console.log('Test Accounts Created:');
  console.log('Nutritionist: nutritionist@test.com / password123');
  console.log('Parent: parent@test.com / password123');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
