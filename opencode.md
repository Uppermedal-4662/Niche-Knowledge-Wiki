# SYSTEM DIRECTIVE FOR OPENCODE AI

**CRITICAL INSTRUCTION:** Before writing any code or initializing any files, you must FIRST act in "Plan" mode. You must map out every move, present a complete architecture, and provide a step-by-step execution plan for my approval. Utilize your **"superpower skill"** to anticipate edge cases, optimize the multi-tenant architecture, and suggest best practices. Wait for my confirmation and any extra requirements I will add before proceeding to build.

---

# Project Overview: Chat-to-Wiki Knowledge Grabber

**Type:** B2B Paid SaaS Application
**Target Audience:** Remote teams, startups, and agencies using Slack or Discord.
**The Problem:** High-value company knowledge, bug fixes, and operational answers get lost in fast-moving chat threads. New employees waste time asking the same questions.
**The Solution:** A bot that monitors specific channels. When a thread is marked as "resolved" (via emoji reaction or AI intent detection), the system extracts the entire thread, strips out small talk, uses an LLM to summarize it into a structured Problem/Solution format, and pushes it to a centralized company wiki (e.g., Notion, Confluence).

---

# Core Features Required

## 1. Multi-Tenant SaaS Foundation
* **Authentication:** Secure user and organization login.
* **Team Workspaces:** Data must be strictly isolated per organization.
* **Billing Integration:** Stripe integration for per-seat or tiered subscription plans. The core functionality must be locked behind an active subscription.

## 2. Chat Ingestion Engine (The Listeners)
* **Platform Integrations:** Discord and Slack.
* **OAuth Flow:** Clean onboarding for organizations to authorize the bot in their workspaces.
* **Triggers:** * *Manual:* A user reacts to the parent message of a thread with a specific emoji (e.g., 💾).
* **Payload Extraction:** Once triggered, the engine must fetch the parent message and all chronological replies within that specific thread, package it into a JSON payload, and queue it for processing.

## 3. AI Summarization Brain (The Processor)
* **LLM Integration:** Connect to OpenAI (or similar) to process the raw thread payloads.
* **Prompt Engineering Structure:** The system must instruct the LLM to ignore greetings/chatter and output a strict markdown structure:
    * **Title:** Concise and searchable.
    * **Tags:** Automatically generated categories.
    * **The Problem:** What was the initial question/issue?
    * **The Solution:** The definitive answer derived from the thread.

## 4. Web Dashboard & Approval Workflow
* **User Interface:** A clean, modern web dashboard for users to manage their workspace.
* **Draft Review:** AI summaries should not go live instantly. They must land in a "Drafts" queue on the dashboard where admins can edit, approve, or reject the documentation.
* **Configuration:** Settings to map specific Discord/Slack channels to specific Wiki folders or databases.

## 5. Publishing Engine (The Exporter)
* **Wiki Integrations:** Push approved Markdown documents to Notion (MVP priority), with an extensible architecture to add Confluence and GitHub Wikis later.

---

# Implementation Strategy & Architecture

To ensure a smooth build process, the architecture must be highly modular. Keep the ingestion layer (bots/webhooks) cleanly separated from the processing layer (AI) and the publishing layer (API exporters). 

First Create a full plan that is in different phases taking roughly 20 o 30 mintues each adn work phase by phase 

To make this project Folow these Instructions :
  
# INSTRUCTIONS
    1) Use Superpower-Skill brainstorming to get all the info of the project and use it before every prompt
    2) After that use writing-plan skill of superpower to write iplementation plans and present me 
    3) After the approval of the implementation plan - work like this 
        - Create subphases of the phase
        - Create a team of agent for the phase you are working (superpower:dispatching-parallel-agents) 
        - The agent create three subagents for each sub-phase (superpower:subagent-driven-development) one for planning ( superpower:writing-plans), other for working (superpower: executing-plans), last one for verification (superpower: requesting-code-review)
        - And every agent uses (superpower: verification-before-completion) for checking the work done by the subagents 
        -Every Agent for evry sub-phases should be in parallel
        -subagents should work in order 
