# In-App Guidance & Automation Platform

A SaaS platform that installs via a single script tag into a customer's web
application and layers four capabilities on top of it — guided onboarding,
reactive "you look stuck" help, hands-off task automation, and a knowledge-base
chatbot.

**This is not a document-chat RAG app.** RAG is one feature (the chatbot), not
the product.

## Who is who

- **Platform / Customer** — the company that signs up and installs our script
  into _their_ web app (an ERP vendor, a CRM, a SaaS). Our paying customer; a
  **tenant** in the database.
- **End user** — a person using the customer's app, who receives our
  guidance/automation. They never sign up with us directly.
- **Owner** — a person at the customer who configures us: records workflows,
  writes prompts, verifies automations.

## The four core features

### 1. Guided task completion (the on-screen agent cursor)

When an end user gets stuck on a slow, multi-step task, a separate agent cursor
appears on their screen and physically guides them — moving to the next element,
pointing at it, telling them what to do — until they reach their goal. This is
**show, don't do**: the agent points, the human clicks, the human stays in
control.

### 2. New-user onboarding

A proactive specialization of Feature 1. When a brand-new end user logs in for
the first time, we offer a complete guided tour of the key tasks using the same
agent-cursor mechanism — collapsing onboarding time from hours/days to minutes.

### 3. Task automation ("Take over")

For repetitive work. A task is **recorded** once by an owner, **analyzed** into a
structured parameterized workflow, and **verified**. Later an end user clicks
**"Take over"**, gives a prompt describing what they want done ("onboard employee
Ramesh, department Finance"), and our agent **performs the task itself** — moving
the cursor, filling fields, clicking — using the recorded workflow as its script.

This is **do, not show**. It is live browser automation of the end user's own
session and acts with their permissions, so it runs on its own execution engine
with step-level safety gates: destructive, data-bound, or ambiguous steps pause
for human confirmation mid-automation.

### 4. Knowledge-base chatbot (RAG)

A chatbot that answers end-user questions against the customer's own knowledge
base (docs, help articles, product content) — for quick answers when someone
just has a question. This is the classic RAG pipeline and the **only** feature
that calls an LLM live in the request path.

## How it works

All four features are powered by the same substrate:

1. **A stream of end-user interaction events** — what people click, type, and
   where they get stuck, captured by our SDK.
2. **A model of what the customer's app can do** — recorded workflows, a catalog
   of fingerprinted UI elements, and the knowledge base for the chatbot.

Workflows are created by recording: an owner opens our in-app widget, hits
**record**, performs a task once in their live app, hits **stop**, and types a
natural-language prompt describing the intent. That recording plus prompt becomes
a reusable **Workflow**.

## Key design principles

- **Guidance is never LLM-in-the-loop.** A stuck end user gets help in ~50ms via
  a cache lookup; the LLM generates guidance offline and writes it to the cache.
  Only the chatbot calls an LLM in the request path.
- **Store fingerprints, not selectors.** Selectors rot, so elements are captured
  by role + accessible name, aria-label, and text — resolved in priority order
  with confidence scores, so guidance survives UI changes.
- **Redaction happens in the browser, never on the server.** Passwords and
  sensitive fields are redacted before an event is ever queued.
- **Multi-tenant by construction.** `tenantId` is on every document and first in
  every index, enforced at runtime via tenant context.
- **Two execution engines.** Low-risk guidance (the human acts) is kept strictly
  separate from high-risk automation (the agent acts with real permissions and
  real safety gates).

## Stack

- **Express + TypeScript** (ESM), **pnpm** monorepo with TS path aliases
- **MongoDB + Mongoose** — primary data store
- **Redis** — cache + BullMQ job queues
- **Qdrant** — vector search for workflow retrieval and docs RAG
- **LangGraph** — offline guidance generation + chat orchestration
- **Playwright / CDP driver** — the "Take over" automation engine

## Status

Foundation and auth/multi-tenancy are in place; platform registration, the
recorder SDK, the compaction pipeline, guidance serving, chat, and the
automation engine follow in later phases. The automation engine (highest risk)
is built last, once workflows, fingerprint resolution, and safety
classification are all proven.
