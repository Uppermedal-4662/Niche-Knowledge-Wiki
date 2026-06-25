# Chat-to-Wiki Knowledge Grabber — Master Plan

> **High-level roadmap** covering all 5 sub-projects. Each sub-project gets its own spec → plan → implementation cycle.

---

## Sub-Project 1: Multi-Tenant Foundation ✅ *(Complete)*

**Duration:** ~2 hours (7 phases)

| Phase | What | Time |
|---|---|---|
| 1 | Monorepo, NestJS, Prisma, Next.js scaffold | ~20 min |
| 2 | Clerk auth (guards, webhooks, frontend) | ~20 min |
| 3 | RLS / CLS tenant isolation middleware | ~20 min |
| 4 | Tenant + Member CRUD API | ~20 min |
| 5 | Stripe billing (checkout, portal, webhooks) | ~20 min |
| 6 | Dashboard UI pages (overview, members, settings, billing) | ~20 min |
| 7 | Docker, CI/CD, ECS task definitions | ~20 min |

**Deliverables:** Auth, org management, billing, dashboard base.

---

## Sub-Project 2: Chat Ingestion Engine *(Next)*

**Goal:** Discord and Slack bots that monitor channels, detect resolved threads, and extract payloads.

### Phases (~20-30 min each)

| Phase | What | Dependencies |
|---|---|---|
| 2a | **Discord bot** — OAuth flow, join guild, listen to messages | Foundation auth |
| 2b | **Slack bot** — OAuth flow, join workspace, listen to messages | Foundation auth |
| 2c | **Emoji trigger** — Detect 💾 reaction on parent message, flag thread for extraction | 2a, 2b |
| 2d | **Thread extraction** — Fetch all replies, package into JSON payload | 2a, 2b |
| 2e | **Queue system** — Bull/Redis queue for extracted payloads, dead-letter handling | 2d |
| 2f | **Channel mapping config** — Dashboard UI to map channels to wiki destinations | Foundation frontend |

**Deliverables:** Working bot with thread extraction → queued payloads.

---

## Sub-Project 3: AI Summarization Brain

**Goal:** LLM-powered processor that transforms raw thread payloads into structured Problem/Solution markdown.

### Phases (~20-30 min each)

| Phase | What | Dependencies |
|---|---|---|
| 3a | **OpenAI integration** — NestJS module, configurable model/prompt | Foundation backend |
| 3b | **Prompt pipeline** — Strip greetings/chatter, strict markdown output | 3a |
| 3c | **Queue consumer** — Process Bull queue items, call LLM, store result | 2e, 3b |
| 3d | **Title + tag generation** — Auto-generate searchable title and tags | 3c |
| 3e | **Error handling + retry** — LLM failures, rate limits, malformed output | 3c |

**Deliverables:** Raw thread → structured Problem/Solution + tags.

---

## Sub-Project 4: Approval Workflow Dashboard

**Goal:** Draft review queue where admins edit, approve, or reject AI summaries before publishing.

### Phases (~20-30 min each)

| Phase | What | Dependencies |
|---|---|---|
| 4a | **Draft model + migration** — `Draft` Prisma model, status enum | Foundation DB |
| 4b | **Drafts API** — CRUD endpoints for drafts (list, get, update, delete) | 4a |
| 4c | **Editor view** — Rich text editor for AI summary, manual edits | 4b, Foundation frontend |
| 4d | **Approval flow** — Approve/reject buttons, status transitions | 4c |
| 4e | **Draft queue UI** — Dashboard page listing drafts with filters | 4c |

**Deliverables:** Full review workflow with editor.

---

## Sub-Project 5: Publishing Engine

**Goal:** Push approved documents to external wikis (Notion MVP, extensible for Confluence/GitHub).

### Phases (~20-30 min each)

| Phase | What | Dependencies |
|---|---|---|
| 5a | **Notion integration** — OAuth, API client, page creation | 4d |
| 5b | **Publish pipeline** — On approval, format markdown → Notion blocks, push | 5a |
| 5c | **Extensible publisher interface** — Abstract `Publisher` class, adapters | 5b |
| 5d | **Confluence adapter** — (optional, future) | 5c |
| 5e | **GitHub Wiki adapter** — (optional, future) | 5c |

**Deliverables:** Approved draft → published Notion page.

---

## Dependency Graph

```
Foundation ──► Ingestion ──► AI Brain ──► Approval Dashboard ──► Publishing
    │                                              │
    └──────────────── Dashboard UI ◄────────────────┘
```

**Order:** Foundation → Ingestion → AI Brain → Approval Dashboard → Publishing.

Each sub-project's dashboard features build on the existing dashboard from Foundation sub-project.

---

## Project Structure (Monorepo)

```
packages/
  backend/
    src/
      prisma/          # Prisma service + RLS middleware
      auth/            # AuthGuard, OrgGuard
      webhooks/        # Clerk webhooks
      tenants/         # Organization CRUD ✅
      members/         # Member management ✅
      billing/         # Stripe integration ✅
      health/          # Health check
      ingestion/       # Sub-project 2: Discord/Slack bots
      ai/              # Sub-project 3: LLM summarization
      drafts/          # Sub-project 4: Approval workflow
      publishing/      # Sub-project 5: Notion/Confluence export
  frontend/
    src/
      app/
        dashboard/
          page.tsx           # Overview ✅
          members/           # Member management ✅
          settings/          # Org settings ✅
          billing/           # Billing ✅
          ingestion/         # Sub-project 2: Channel config UI
          drafts/            # Sub-project 4: Draft queue UI
  shared/
    src/
      index.ts         # Enums (Plan, OrgStatus, MemberRole, etc.)
```
