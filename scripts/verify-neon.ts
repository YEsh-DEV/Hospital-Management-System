import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({ select: { name: true } });
  const users = await prisma.user.findMany({
    select: { email: true, fullName: true, role: { select: { name: true } } },
  });
  const patients = await prisma.patient.findMany({
    select: { mrn: true, firstName: true, lastName: true },
  });
  const auditLogs = await prisma.auditLog.findMany({
    select: { action: true, auditableType: true, performedAt: true },
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ CONNECTED TO NEON POSTGRESQL SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 Roles in DB (${roles.length}):`, roles.map((r) => r.name).join(', '));
  console.log(`👥 Users in DB (${users.length}):`);
  users.forEach((u) => console.log(`   - ${u.fullName} (${u.email}) [${u.role.name}]`));
  console.log(`🏥 Patients in DB (${patients.length}):`);
  patients.forEach((p) => console.log(`   - ${p.mrn}: ${p.firstName} ${p.lastName}`));
  console.log(`🛡️ Audit Logs in DB (${auditLogs.length}):`);
  auditLogs.forEach((a) => console.log(`   - ${a.action} on ${a.auditableType}`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Error connecting to Neon:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
