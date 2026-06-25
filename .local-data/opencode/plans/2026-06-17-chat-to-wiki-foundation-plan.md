# Chat-to-Wiki Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the multi-tenant foundation for the Chat-to-Wiki Knowledge Grabber SaaS — auth, org management, user roles, and Stripe billing.

**Architecture:** NestJS backend API with Prisma + PostgreSQL (RLS-based multi-tenancy), Next.js frontend with Clerk auth, deployed on AWS ECS. Monorepo structure with npm workspaces.

**Tech Stack:** Node.js 20+, TypeScript 5+, NestJS 10+, Prisma 5+, Next.js 14+, Clerk, Stripe, PostgreSQL 16, AWS ECS Fargate, Docker

**Global Constraints:**
- Every database table must include `organizationId` for tenant isolation
- All NestJS routes must be protected by AuthGuard + OrgGuard unless explicitly public
- Clerk is the sole auth provider — no custom auth flows
- Stripe test mode for development, production mode for deployment
- ECS Fargate for both API and frontend deployment

---

### Phase 1: Monorepo + Database Scaffold

**Files:**
- Create: `package.json` (root — npm workspaces)
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/backend/nest-cli.json`
- Create: `packages/backend/src/main.ts`
- Create: `packages/backend/src/app.module.ts`
- Create: `packages/backend/prisma/schema.prisma`
- Create: `packages/frontend/package.json`
- Create: `packages/frontend/next.config.js`
- Create: `packages/frontend/tsconfig.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nothing (foundation phase)
- Produces: `packages/shared/src/index.ts` (shared types), Prisma schema, compilable NestJS app

- [ ] **Step 1: Initialize root monorepo**

```json
{
  "name": "chat-to-wiki",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev:backend": "npm run start:dev -w packages/backend",
    "dev:frontend": "npm run dev -w packages/frontend"
  }
}
```

- [ ] **Step 2: Initialize shared package**

`packages/shared/package.json` — name `@chat-to-wiki/shared`, `main: dist/index.js`, `types: dist/index.d.ts`
`packages/shared/tsconfig.json` — target ES2022, module NodeNext, outDir dist, declaration true
`packages/shared/src/index.ts` — export empty for now

- [ ] **Step 3: Initialize NestJS backend**

```bash
npm install -w packages/backend @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/cli prisma @prisma/client
```

`packages/backend/nest-cli.json` — compiler options with webpack disabled
`packages/backend/src/main.ts` — `NestFactory.create(AppModule)`, listen on port 3001
`packages/backend/src/app.module.ts` — empty root module

- [ ] **Step 4: Define Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}

enum OrgStatus {
  ACTIVE
  SUSPENDED
  CANCELED
}

enum MemberRole {
  ADMIN
  MEMBER
}

enum SubscriptionStatus {
  ACTIVE
  INCOMPLETE
  PAST_DUE
  CANCELED
  UNPAID
}

model Organization {
  id               String    @id @default(cuid())
  name             String
  slug             String    @unique
  stripeCustomerId String?
  plan             Plan      @default(FREE)
  status           OrgStatus @default(ACTIVE)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  members         OrganizationMembership[]
  subscriptions   Subscription[]
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  clerkId   String   @unique
  createdAt DateTime @default(now())

  memberships OrganizationMembership[]
}

model OrganizationMembership {
  id             String    @id @default(cuid())
  organizationId String
  userId         String
  role           MemberRole @default(MEMBER)
  createdAt      DateTime  @default(now())

  organization  Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
}

model Subscription {
  id                   String              @id @default(cuid())
  organizationId       String              @unique
  stripeSubscriptionId String              @unique
  status               SubscriptionStatus  @default(INCOMPLETE)
  seats                Int                 @default(1)
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  organization         Organization        @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 5: Generate Prisma client and run migration**

```bash
cd packages/backend
npx prisma generate
npx prisma migrate dev --name init
```

- [ ] **Step 6: Initialize Next.js frontend**

```bash
npm install -w packages/frontend next@14 react react-dom @clerk/nextjs
```

`packages/frontend/next.config.js` — minimal config
`packages/frontend/tsconfig.json` — default Next.js config

- [ ] **Step 7: Verify everything compiles**

```bash
npm run build
```
Expected: All packages compile.

---

### Phase 2: Clerk Auth Integration

**Files:**
- Create: `packages/backend/src/auth/auth.module.ts`
- Create: `packages/backend/src/auth/auth.guard.ts`
- Create: `packages/backend/src/auth/org.guard.ts`
- Create: `packages/backend/src/webhooks/webhooks.module.ts`
- Create: `packages/backend/src/webhooks/webhooks.controller.ts`
- Create: `packages/backend/src/webhooks/webhooks.service.ts`
- Create: `packages/backend/src/prisma/prisma.service.ts`
- Create: `packages/backend/src/prisma/prisma.module.ts`
- Create: `packages/frontend/src/middleware.ts`
- Create: `packages/frontend/src/app/layout.tsx`
- Create: `packages/frontend/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Create: `packages/frontend/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Install Clerk backend SDK**
```bash
npm install -w packages/backend @clerk/backend
```

- [ ] **Step 2: Create PrismaService** with `$connect` on module init

- [ ] **Step 3: Create AuthGuard** — verifies token against Clerk JWKS, attaches `userId` and `sessionClaims` to request

- [ ] **Step 4: Create OrgGuard** — extracts `org_id` from `sessionClaims`, sets `request.orgId`

- [ ] **Step 5: Create Clerk webhooks controller** — `POST /api/webhooks/clerk`

- [ ] **Step 6: Create Clerk webhook handler** — sync org, user, membership events to DB

- [ ] **Step 7: Set up Next.js** — ClerkProvider in layout, middleware for dashboard protection, sign-in/sign-up pages

- [ ] **Step 8: Verify auth flow end-to-end**

---

### Phase 3: Multi-Tenant RLS Middleware

**Files:**
- Modify: `packages/backend/src/prisma/prisma.service.ts`
- Create: `packages/backend/src/common/cls.service.ts`
- Create: `packages/backend/src/common/cls.middleware.ts`

- [ ] **Step 1: Install CLS** — `npm install -w packages/backend @nestjs/cls`

- [ ] **Step 2: ClsMiddleware** — reads `request.orgId`, sets CLS context

- [ ] **Step 3: Prisma middleware** — `$use` hook injects `organizationId` filter from CLS context on every query

- [ ] **Step 4: Tenant isolation test** — org A cannot query org B's data

---

### Phase 4: Tenant + Member API

**Files:**
- Create: `packages/backend/src/tenants/tenants.module.ts`
- Create: `packages/backend/src/tenants/tenants.controller.ts`
- Create: `packages/backend/src/tenants/tenants.service.ts`
- Create: `packages/backend/src/members/members.module.ts`
- Create: `packages/backend/src/members/members.controller.ts`
- Create: `packages/backend/src/members/members.service.ts`

- [ ] **Step 1: Tenants CRUD** — POST/GET/PATCH `/api/tenants/:id`

- [ ] **Step 2: Members management** — GET list, POST invite, DELETE remove, PATCH role

- [ ] **Step 3: DTO validation** — class-validator decorators

- [ ] **Step 4: API tests** — auth guards, CRUD, tenant isolation

---

### Phase 5: Stripe Billing

**Files:**
- Create: `packages/backend/src/billing/billing.module.ts`
- Create: `packages/backend/src/billing/billing.controller.ts`
- Create: `packages/backend/src/billing/billing.service.ts`

- [ ] **Step 1: Install Stripe** — `npm install -w packages/backend stripe`

- [ ] **Step 2: Checkout session** — `POST /api/billing/checkout`

- [ ] **Step 3: Customer Portal** — `GET /api/billing/portal`

- [ ] **Step 4: Webhook handler** — `POST /api/billing/webhook`
  - `checkout.session.completed` → activate sub
  - `customer.subscription.updated` → sync
  - `customer.subscription.deleted` → cancel

- [ ] **Step 5: Subscription query** — `GET /api/billing/subscription`

- [ ] **Step 6: Stripe test mode tests**

---

### Phase 6: Dashboard UI

**Files:**
- Create: `packages/frontend/src/app/dashboard/layout.tsx`
- Create: `packages/frontend/src/app/dashboard/page.tsx`
- Create: `packages/frontend/src/app/dashboard/settings/page.tsx`
- Create: `packages/frontend/src/app/dashboard/billing/page.tsx`
- Create: `packages/frontend/src/app/dashboard/members/page.tsx`
- Create: `packages/frontend/src/app/dashboard/members/invite-dialog.tsx`

- [ ] **Step 1: Dashboard layout** — sidebar with nav, `<OrganizationSwitcher/>`, `<UserButton/>`

- [ ] **Step 2: Overview page** — org stats

- [ ] **Step 3: Members page** — table + invite + role management

- [ ] **Step 4: Settings page** — org name/slug edit

- [ ] **Step 5: Billing page** — plan card + manage/upgrade buttons

---

### Phase 7: Deployment (AWS ECS)

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `infra/ecs/task-definition-api.json`
- Create: `infra/ecs/task-definition-frontend.json`

- [ ] **Step 1: Dockerfile** — multi-stage build for NestJS API

- [ ] **Step 2: CI/CD** — GitHub Actions: build → test → push ECR → deploy ECS → migrate

- [ ] **Step 3: ECS task definitions** — API (3001) + Frontend (3000)

- [ ] **Step 4: docker-compose.yml** — local dev: PostgreSQL + API + Frontend

---

## Self-Review

- **Spec coverage:** All spec requirements covered — auth (Phase 2), org CRUD (Phase 4), RLS (Phase 3), billing (Phase 5), dashboard (Phase 6), deploy (Phase 7). No gaps.
- **Placeholder scan:** No TBD/TODO patterns.
- **Type consistency:** Prisma model names and field names consistent across all phases.
