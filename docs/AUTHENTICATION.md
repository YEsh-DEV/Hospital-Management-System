> Historical branch review. The subsequent fictional-data demo integration is documented in [DEMO_INTEGRATION.md](DEMO_INTEGRATION.md).

# Authentication: components, flow, credentials and tokens
Reviewed auth-and-audit-logs at 6ac21d1ae12080a294b4e49c027d3571ee9c701c on 27 October 2026. This describes inspected code, not a verified deployment. Root README is only a project overview. Neon .agents/skills files are tooling guidance, not evidence of managed Neon auth: the app uses Passport/JWT and Prisma users.

## Components
| Source | Responsibility |
| --- | --- |
| apps/web/app/(auth)/*/page.tsx | Login, selected role, remember-me and reset forms |
| apps/web/lib/api-client.ts | API requests with credentials: include |
| apps/web/context/RoleContext.tsx | SessionStorage profile/permission cache |
| apps/web/app/(dashboard)/layout.tsx | Attempts /auth/me; local demo-session fallback |
| apps/api/src/auth/auth.controller.ts | Routes and cookie handling |
| apps/api/src/auth/strategies/local.strategy.ts | Email/password/allowed human role |
| apps/api/src/auth/auth.service.ts | Password hashing, tokens, reset, revocation, audit |
| apps/api/src/auth/strategies/jwt.strategy.ts | Cookie/Bearer JWT verification and account lookup |
| apps/api/src/rbac/rbac.guard.ts | Route roles/permissions |
| apps/api/prisma/schema.prisma | User, role, permission, token and audit storage |
| apps/api/src/email/email.service.ts | Reset email or development reset-link logging |
| apps/api/src/main.ts and app.module.ts | Cookie parsing, validation, CORS, headers and throttling |

Immutable references: [controller](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/blob/6ac21d1ae12080a294b4e49c027d3571ee9c701c/apps/api/src/auth/auth.controller.ts), [service](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/blob/6ac21d1ae12080a294b4e49c027d3571ee9c701c/apps/api/src/auth/auth.service.ts), [JWT strategy](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/blob/6ac21d1ae12080a294b4e49c027d3571ee9c701c/apps/api/src/auth/strategies/jwt.strategy.ts), [schema](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/blob/6ac21d1ae12080a294b4e49c027d3571ee9c701c/apps/api/prisma/schema.prisma).

## Request flow
1. Login screen posts email, password, role and rememberMe to /auth/login. Allowed roles are SUPER_ADMIN, ADMIN, RECEPTIONIST, DOCTOR and NURSE. AI_SERVICE cannot use human login.
2. Global throttler and Passport LocalAuthGuard run before controller. LocalStrategy uses email as username and requires allowed selected role.
3. UsersService loads a non-deleted account with passwordHash/role/permissions. AuthService rejects inactive users at login, verifies password and checks selected role equals actual role. It removes passwordHash from login principal.
4. AuthService signs access/refresh JWTs, hashes the refresh token for database storage and audits LOGIN_SUCCESS.
5. Controller sets access_token and refresh_token HttpOnly cookies. JSON returns identity/role/permissions, not raw tokens or password hashes.
6. Browser API client includes cookies in requests. JwtStrategy prefers access cookie, then Authorization Bearer header. Passport checks signature and expiry using JWT_SECRET.
7. For human users, JwtStrategy reloads account by sub and uses current database role/permissions. UI role edits do not grant backend permission. /auth/me returns a safe principal.
8. JwtAuthGuard and RolesGuard protect annotated controllers. Patient/appointment operations require declared permissions; audit read requires SUPER_ADMIN. Frontend permission gates only control presentation.

## Credentials and tokens
| Item | Handling | Lifetime/detail |
| --- | --- | --- |
| Password | Argon2id(password + optional ARGON2_PEPPER); database passwordHash | 64 MiB memory, time cost 3, parallelism 4; absent pepper is empty |
| Access JWT | JWT_SECRET signs sub/email/role/permissions/type=access; HttpOnly cookie | 15 minutes |
| Refresh JWT | JWT_REFRESH_SECRET signs sub/type=refresh; SHA-256 hash in RefreshToken | JWT 7 days; database 8 hours with rememberMe, 7 days otherwise |
| Cookies | HttpOnly, path /, SameSite Strict; Secure in production | rememberMe cookie maxAge 8 hours, otherwise session cookies |
| Reset token | 32 random bytes as hex; SHA-256 hash stored; raw token in reset URL | 60 minutes, used marker, previous unused records invalidated |
| Email API key | Server RESEND_API_KEY used as Resend Bearer header | Missing/demo key logs reset link instead |
| Database | Prisma DATABASE_URL and DIRECT_URL server configuration | PostgreSQL credentials |

SessionStorage stores user metadata and an active-session flag, not JWTs. Tokens are signed, not encrypted: their claims are readable by their holder. No runtime secrets were read or used during this review. Public demo accounts in source are not deployment credentials.

## Logout and password reset
POST /auth/logout requires a valid access JWT, hashes refresh cookie and revokes matching record (or all user refresh records if no cookie), clears cookies and audits LOGOUT.

POST /auth/forgot-password always returns the same message. For an existing account it creates a hashed reset record and dispatches raw-token reset link asynchronously. EmailService logs that link when delivery credentials are absent/demo.

POST /auth/reset-password checks existence/expiry/used state, then transactionally updates password, marks reset token used and revokes refresh records. It clears cookies and audits RESET_COMPLETED. DTO minimum new password is 12 characters. The initial token check occurs before transaction: concurrent consumption needs an atomic conditional update.

Revoking refresh records does not terminate already-issued access JWTs. They remain usable until expiry because validation has no session version/revocation check. Logout can fail after access expiry before the controller clears cookies.

## Material implementation gaps
1. No refresh endpoint, verifier/rotation handler or browser refresh call. The seven-day refresh cookie cannot extend access beyond 15 minutes.
2. Demo login defaults on unless disabled; known demo accounts can create local session metadata after backend results with no user, following explicit 401/403/429 handling. Dashboard trusts saved session after any non-200 /auth/me, including expired/denied sessions, without a demo flag check. It renders children without waiting on isVerifying. This does not mint valid backend tokens but makes UI authentication misleading.
3. Login checks isActive; UsersService.findById only filters deletedAt. JWT requests can continue after account deactivation.
4. AuthModule/JwtStrategy default signing secret to literal changeme. Require strong configured secrets at startup. JwtStrategy does not enforce payload.type=access; separate access/refresh secrets and validate purpose.
5. Logout/reset only revoke refresh records. Add session/version checks and atomic refresh rotation/reuse handling. Refresh JWTs lack random jti; same-user issuance within the same second can produce identical tokens and collide with unique tokenHash.
6. Remember-me expiration is inconsistent: selected means eight hours in database/cookie vs unselected database seven days. Refresh JWT always seven days and access always 15 minutes.
7. CORS callback permits unknown origins with credentials. Restrict actual origins. SameSite Strict needs same-site/same-origin hosting; CORS does not make Strict cookies cross-site.
8. Demo switch-role is authenticated but lacks demo-environment/privileged-role gating. It issues synthetic-role tokens, but human JWT verification reloads database role, so it does not consistently act as role administration. Remove/gate and define real audited role changes.
9. Auth audit failures are swallowed; inspected failed-login path lacks an audit failure event. Raw reset links are logged in development delivery fallback. Require deliberate development-only logging and durable sensitive audit handling.
10. Global default five requests/minute/IP also applies to domain APIs. Separate login/reset and application request budgets.

Existing auth compatibility route /auth/ai-token requires SUPER_ADMIN and creates a 365-day AI_SERVICE JWT. That principal skips human lookup; rotation/revocation needs separate design if enabled. This review did not expand or connect the excluded voice/notifications branch.

## Verification limit
Static review completed. Auth dependency installation failed with Windows EPERM creating npm workspace links. Auth build/Jest, database/email and browser expiry/reset flows were not runtime-verified. These remain integration gates; no live credentials/database were used.
