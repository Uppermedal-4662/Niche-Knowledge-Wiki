# Chat-to-Wiki Knowledge Grabber — Foundation Sub-Project Design

**Date:** 2026-06-17
**Project:** Multi-Tenant SaaS — Multi-Tenant Foundation

---

## Overview

The Foundation sub-project provides the base layer for a B2B SaaS application that extracts resolved chat threads, summarizes them via AI, and publishes to company wikis. This sub-project covers authentication, multi-tenant organization management, user roles, and billing — all other sub-projects (ingestion, AI, dashboard, publishing) depend on it.

---

## Architecture

**Stack:** Node.js + TypeScript (monorepo)

| Layer | Technology |
|---|---|
| Backend API | NestJS (Express platform) |
| Frontend | Next.js (App Router) |
| Auth | Clerk (org/team management) |
| Database | PostgreSQL + Prisma ORM |
| Billing | Stripe (subscriptions, per-seat) |
| Deploy | AWS ECS Fargate (API) + Vercel or ECS (frontend) |

### Monorepo Structure

```
packages/
  backend/     # NestJS REST API
  frontend/    # Next.js dashboard
  shared/      # Shared TypeScript types, constants, utilities
```

---

## Data Model

### Prisma Schema

```prisma
model Organization {
  id               String   @id @default(cuid())
  name             String
  slug             String   @unique
  stripeCustomerId String?
  plan             Plan     @default(FREE)
  status           OrgStatus @default(ACTIVE)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  members          OrganizationMembership[]
  subscriptions    Subscription[]
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
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           MemberRole   @default(MEMBER)
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])

  @@unique([organizationId, userId])
}

model Subscription {
  id                   String          @id @default(cuid())
  organizationId       String          @unique
  stripeSubscriptionId String          @unique
  status               SubscriptionStatus @default(INCOMPLETE)
  seats                Int             @default(1)
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt

  organization         Organization    @relation(fields: [organizationId], references: [id])
}

enum Plan { FREE PRO ENTERPRISE }
enum OrgStatus { ACTIVE SUSPENDED CANCELED }
enum MemberRole { ADMIN MEMBER }
enum SubscriptionStatus { ACTIVE INCOMPLETE PAST_DUE CANCELED UNPAID }
```

### Multi-Tenant Strategy: Row-Level Security (RLS)

Every business table includes an `organizationId` column. NestJS middleware injects `organizationId` into the Prisma client context on every request (extracted from the Clerk JWT org claim). Prisma middleware intercepts all queries and appends `organizationId` filters. This ensures tenant isolation at the database level even if a developer forgets to add the filter manually.

---

## Authentication Flow (Clerk)

1. User signs in via Clerk UI (`<SignIn/>` / `<SignUp/>`)
2. Clerk issues JWT with org claim (`org_id` in token)
3. Frontend passes token to NestJS via `Authorization: Bearer` header
4. NestJS `AuthGuard` verifies token against Clerk JWKS endpoint
5. `OrgGuard` extracts `org_id` from token, sets `ClsService` (CLS) context
6. Prisma middleware reads CLS context, auto-filters queries

### Clerk Webhooks (svix-verified)

| Webhook Event | Backend Action |
|---|---|
| `organization.created` | Create `Organization` row in DB |
| `organization.updated` | Sync org name/slug |
| `organization.deleted` | Mark org as SUSPENDED |
| `user.created` | Create `User` row in DB |
| `organizationMembership.created` | Create `OrganizationMembership` |
| `organizationMembership.deleted` | Remove membership |
| `organizationMembership.updated` | Sync role changes |

---

## API Design (NestJS Modules)

### Module Structure

```
src/
  auth/          # AuthGuard, OrgGuard, Clerk webhooks
  tenants/       # Org CRUD, settings
  users/         # Members, invitations, roles
  billing/       # Stripe Checkout, webhooks, subscription
  prisma/        # Prisma service, RLS middleware
  common/        # Decorators, filters, interceptors
```

### Endpoints

```
POST   /api/tenants              → Create org workspace
GET    /api/tenants/:id          → Get org details
PATCH  /api/tenants/:id          → Update org settings

GET    /api/members              → List org members
POST   /api/members/invite       → Invite user by email
DELETE /api/members/:id          → Remove member
PATCH  /api/members/:id/role     → Change member role

GET    /api/billing/subscription → Current plan & status
POST   /api/billing/checkout     → Create Stripe Checkout session
GET    /api/billing/portal       → Stripe Customer Portal URL
POST   /api/billing/webhook      → Stripe webhook receiver
```

---

## Billing Flow

1. Org admin clicks "Upgrade" → backend creates Stripe Checkout session (with `client_reference_id = org.id`, `mode: subscription`, `quantity = seat count`)
2. Customer completes Checkout → Stripe sends `checkout.session.completed` webhook
3. Backend creates `Subscription` row, activates plan
4. On member add/remove → Stripe API updates subscription quantity (prorated)
5. `invoice.payment_succeeded` → sync seat count
6. `customer.subscription.updated/deleted` → sync status
7. Org admin can access Stripe Customer Portal for payment method changes

### Pricing Model (configurable)

- **Free:** 5 seats, limited history
- **Pro:** $29/mo per seat, unlimited history
- **Enterprise:** Custom pricing, dedicated support

---

## Frontend Pages (Next.js App Router)

```
/sign-in[/[[...path]]]   → Clerk <SignIn/>
/sign-up[/[[...path]]]   → Clerk <SignUp/>

/dashboard                → Protected layout (org switcher in sidebar)
/dashboard/               → Overview: org info, member count, plan
/dashboard/settings       → Org name, slug, branding
/dashboard/billing        → Plan card, usage, manage subscription button
/dashboard/billing/checkout → Stripe Checkout redirect page
/dashboard/members        → Member table, invite dialog, role dropdowns
```

- Server components for data fetching
- Client components for interactivity (invite dialog, role change)
- Clerk `<OrganizationSwitcher/>` for multi-org support
- Stripe Elements for embedded checkout (if needed)

---

## Deployment (AWS ECS)

| Component | Service | Scaling |
|---|---|---|
| NestJS API | ECS Fargate | 2+ tasks, auto-scale |
| Next.js Frontend | ECS Fargate | Auto-scaled |
| PostgreSQL | RDS (db.t3.medium) | Multi-AZ for production |
| Redis | ElastiCache (cache.t3.micro) | Session cache, Bull queue |

### CI/CD (GitHub Actions)

1. Push to `main` → trigger build
2. Docker build (NestJS) + `npm run build` (Next.js)
3. Push images to ECR
4. Deploy to ECS (rolling update)
5. Run migrations (`prisma migrate deploy`)

Environment variables stored in AWS Secrets Manager, injected at deploy time.

---

## Error Handling & Observability

- **Global exception filter** (NestJS) — consistent error response shape
- **Structured logging** — Pino logger, JSON format
- **Sentry** — error tracking
- **Health check endpoint** — `GET /api/health`

---

## Future-Proofing

- NestJS module design allows plugging in ChatModule, AIModule, PublishingModule as independent modules
- Prisma schema can be extended with thread/ summary/ draft models without migration conflicts
- Clerk org structure allows Chat/Discord/Slack workspace connections as org metadata
