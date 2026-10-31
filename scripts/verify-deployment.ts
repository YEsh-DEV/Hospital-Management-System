import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrap } from '../apps/api/dist/main';

async function verifyDeployment() {
  console.log('====================================================');
  console.log('🚀 HMS FULL-STACK DEPLOYMENT & VERIFICATION SUITE');
  console.log('====================================================');

  const app: INestApplication = await bootstrap();
  const server = app.getHttpServer();

  try {
    // 1. CORS Preflight Check
    console.log('\n[1/5] Testing CORS Headers...');
    const corsRes = await request(server)
      .options('/auth/login')
      .set('Origin', 'https://hms-web.vercel.app')
      .set('Access-Control-Request-Method', 'POST');

    console.log(`  - Status: ${corsRes.status}`);
    console.log(`  - Access-Control-Allow-Origin: ${corsRes.headers['access-control-allow-origin']}`);
    console.log(`  - Access-Control-Allow-Credentials: ${corsRes.headers['access-control-allow-credentials']}`);
    if (corsRes.headers['access-control-allow-origin'] !== 'https://hms-web.vercel.app') {
      throw new Error('CORS Access-Control-Allow-Origin mismatch');
    }

    // 2. Super Admin Login & Cookie Security Check
    console.log('\n[2/5] Testing Super Admin Login & Cookie Security...');
    const loginRes = await request(server)
      .post('/auth/login')
      .set('Origin', 'https://hms-web.vercel.app')
      .send({
        email: 'superadmin@hospital.com',
        password: 'SuperSecret123#',
        rememberMe: false,
      });

    console.log(`  - Status: ${loginRes.status}`);
    console.log(`  - User: ${loginRes.body.user?.fullName} (${loginRes.body.user?.role})`);
    
    const setCookie = loginRes.headers['set-cookie'] || [];
    console.log('  - Set-Cookie headers:', setCookie);

    const hasAccessToken = setCookie.some((c: string) => c.includes('access_token=') && c.includes('HttpOnly') && c.includes('SameSite=Strict'));
    const hasRefreshToken = setCookie.some((c: string) => c.includes('refresh_token=') && c.includes('HttpOnly') && c.includes('SameSite=Strict'));
    
    if (!hasAccessToken || !hasRefreshToken) {
      throw new Error('Missing expected HttpOnly and SameSite=Strict cookies');
    }
    console.log('  ✓ Verified HttpOnly and SameSite=Strict cookies present');

    const adminCookies = setCookie.map((c: string) => c.split(';')[0]).join('; ');

    // 3. Super Admin Audit Logs Access Check
    console.log('\n[3/5] Testing Super Admin Audit Logs Access (GET /api/audit-logs)...');
    const auditRes = await request(server)
      .get('/api/audit-logs')
      .set('Cookie', adminCookies);

    console.log(`  - Status: ${auditRes.status}`);
    console.log(`  - Audit logs count: ${auditRes.body.data?.length ?? 0}`);
    if (auditRes.status !== 200) {
      throw new Error(`Expected HTTP 200 for Super Admin on /api/audit-logs, got ${auditRes.status}`);
    }
    console.log('  ✓ Super Admin successfully authorized for /api/audit-logs');

    // 4. Receptionist Login & RBAC Boundary Check
    console.log('\n[4/5] Testing Receptionist Login & RBAC Boundary Check...');
    const recepLoginRes = await request(server)
      .post('/auth/login')
      .set('Origin', 'https://hms-web.vercel.app')
      .send({
        email: 'reception@hospital.com',
        password: 'SuperSecret123#',
        rememberMe: false,
      });

    console.log(`  - Status: ${recepLoginRes.status}`);
    console.log(`  - User: ${recepLoginRes.body.user?.fullName} (${recepLoginRes.body.user?.role})`);

    const recepCookies = (recepLoginRes.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]).join('; ');

    const recepAuditRes = await request(server)
      .get('/api/audit-logs')
      .set('Cookie', recepCookies);

    console.log(`  - Status for Receptionist on /api/audit-logs: ${recepAuditRes.status}`);
    if (recepAuditRes.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden for Receptionist on /api/audit-logs, got ${recepAuditRes.status}`);
    }
    console.log('  ✓ Non-admin role strictly blocked with HTTP 403 Forbidden');

    // 5. Audit Log Immutability Check (DELETE 405)
    console.log('\n[5/5] Testing Audit Log Immutability (DELETE /api/audit-logs/1)...');
    const deleteRes = await request(server)
      .delete('/api/audit-logs/1')
      .set('Cookie', adminCookies);

    console.log(`  - Status: ${deleteRes.status}`);
    if (deleteRes.status !== 405) {
      throw new Error(`Expected HTTP 405 Method Not Allowed on DELETE /api/audit-logs/:id, got ${deleteRes.status}`);
    }
    console.log('  ✓ Immutability verified: DELETE is permanently HTTP 405 Method Not Allowed');

    console.log('\n====================================================');
    console.log('🎉 ALL INTEGRATION & SECURITY CHECKS PASSED PERFECTLY!');
    console.log('====================================================');
  } finally {
    await app.close();
  }
}

verifyDeployment().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
