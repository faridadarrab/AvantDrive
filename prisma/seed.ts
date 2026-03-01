import { PrismaClient, RoleName } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
    const email = 'faridadarrab@gmail.com';
    const password = 'Admin1234!';
    const nombre = 'Farid Ada';
    const companyScope = 'avantservice';

    console.log('🌱 Seeding database...');

    // 1. Hash password with argon2 (must match auth.service.ts)
    const passwordHash = await argon2.hash(password);

    // 2. Upsert user
    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash, nombre, companyScope },
        create: { email, passwordHash, nombre, companyScope },
    });

    console.log(`✅ User created/updated: ${user.email} (id: ${user.id})`);

    // 3. Ensure the ADMINISTRADOR role exists
    const role = await prisma.role.upsert({
        where: { nombre: RoleName.ADMINISTRADOR },
        update: {},
        create: { nombre: RoleName.ADMINISTRADOR },
    });

    console.log(`✅ Role ensured: ${role.nombre} (id: ${role.id})`);

    // 4. Assign role to user (idempotent)
    const userRole = await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
    });

    console.log(`✅ Role assigned to user: UserRole id=${userRole.id}`);

    console.log('\n� Seed complete!');
    console.log(`   email:        ${email}`);
    console.log(`   password:     ${password}`);
    console.log(`   nombre:       ${nombre}`);
    console.log(`   companyScope: ${companyScope}`);
    console.log(`   rol:          ADMINISTRADOR`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
