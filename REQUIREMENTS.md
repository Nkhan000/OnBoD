# Requirements — In-App Guidance & Automation Platform

> Living document. The source of truth for what this project is. Update it when a
> decision changes; never let the code and this file disagree.

---

## 1. One-sentence description

A SaaS platform that installs via a script tag into a customer's web application and
provides four capabilities on top of it: guided onboarding, reactive "you look stuck"
help, hands-off task automation, and a knowledge-base chatbot.

**We are not a document-chat RAG app.** RAG is one feature (the chatbot), not the product.

---

## 2. Who is who (terminology — use these words everywhere)

- **Platform / Customer** — the company that signs up for our service and installs our
  script into _their_ web app (e.g. an ERP vendor, a CRM, a big SaaS). They are our
  paying customer. In the database this is a **tenant**.
- **End user** — a person using the customer's app, who receives our guidance/automation.
  They never sign up with us directly; they just benefit from us being installed.
- **Owner** — a person at the customer who configures us: records workflows, writes
  prompts, verifies automations. An admin end-user, essentially.
- **Us / the platform (internal)** — our backend, the thing this repo builds.

Avoid the bare word "user" — always say **end user** or **owner**.

---

## 3. The four core features

### Feature 1 — Guided task completion (the on-screen agent cursor)

Some websites are slow and multi-step to get anything done: creating a profile, creating
an agent, setting up an account, configuring something with many stages. Text docs and
tooltips are not enough — people still get lost.

Our solution: **a separate agent cursor appears on the end user's screen**. When the end
user gets stuck, our agent cursor physically guides them — moving to the next element,
pointing at it, telling them what to do — until they complete their goal.

This is **show, don't do**. The agent points; the human clicks. The human stays in control.

### Feature 2 — New-user onboarding

A specialization of Feature 1, triggered proactively. When a brand-new end user logs in
for the first time, we offer a complete guided tour of the key tasks, using the same
agent-cursor mechanism. The goal is to collapse onboarding time from hours/days to minutes.

### Feature 3 — Task automation ("Take over") — _distinct execution engine_

For repetitive work. Example: an ERP where the same multi-step task must be performed for
hundreds of end users, one at a time, manually. It's tedious and slow.

Flow:

1. The task is **recorded** once (by an owner performing it).
2. It is **analyzed** into a structured, parameterized workflow.
3. It is **verified** by the owner.
4. Later, an end user clicks **"Take over"** and gives a prompt describing what they want
   done ("onboard employee Ramesh, department Finance").
5. Our agent **performs the task itself** — moving the cursor, filling fields, clicking —
   using the recorded workflow as its script and the prompt to fill in the specifics.

This is **do, not show**. The critical difference from Features 1/2. It is live browser
automation of the end user's own session, and it carries real risk (it acts with the end
user's permissions). It needs its own execution engine, its own safety gates, and its own
approval/verification flow. See §6.

### Feature 4 — Knowledge-base chatbot (RAG)

A chatbot that answers end-user questions against the customer's own knowledge base
(docs, help articles, product content). For quick answers when someone doesn't want a
tour or an automation — they just have a question. This is the classic RAG pipeline and
the **only** feature that calls an LLM live in the user's request path.

---

## 4. The unifying substrate

All four features are powered by the same two things:

1. **A stream of end-user interaction events** — what people click, type, where they get
   stuck. Captured by our SDK.
2. **A model of what the customer's app can do** — recorded workflows + a catalog of UI
   elements, plus the knowledge base for the chatbot.

Guidance, onboarding, automation, and search are four different consumers of this one
substrate.

---

## 5. How workflows are created (the recording mechanism)

**Decided. Do not re-litigate.**

An owner opens our in-app widget, hits **record**, performs a task once in their own live
app, hits **stop**, then types a natural-language prompt: _"this is the ideal way to
create an agent."_

That recording + prompt becomes a reusable **Workflow**.

### Rejected alternatives

- **Agentic crawler** (bot explores the app with Playwright + LLM): needs sandbox creds,
  seeded data, destructive-action guards. Expensive (~$1/workflow), flaky. Possible future
  enrichment only. Not the primary path.
- **Video recording**: gives pixels, not selectors. You can't derive a CSS selector from
  an image. More expensive AND the wrong artifact.

### Two capture streams (do not merge them)

- **rrweb** → fire-and-forget to object storage. For replay/audit ONLY. Never parsed by
  the pipeline. (Reconstructing elements from rrweb node IDs server-side is a trap.)
- **Our own semantic events** → element fingerprints captured **at click time, in the
  browser**, where the live DOM is in hand. THIS feeds the pipeline.

---

## 6. Two execution engines (the most important architectural split)

|              | Features 1 & 2 (Guide)            | Feature 3 (Take over)                       |
| ------------ | --------------------------------- | ------------------------------------------- |
| Who acts     | The human                         | Our agent                                   |
| Cursor       | Points / highlights               | Moves, clicks, types                        |
| Risk         | Low (human confirms every action) | **High (acts with end-user's permissions)** |
| Safety model | Can't do harm — just suggests     | Must gate destructive/irreversible steps    |
| Failure mode | End user ignores the hint         | Agent does the wrong thing to real data     |

**Consequence:** Feature 3 needs step-level safety classification and, for anything
destructive or ambiguous, a human confirmation checkpoint mid-automation. A step is
**auto-executable** only if it is navigation or a click on stable "chrome" with no user
data and no destructive verb. Anything `parameterized`, anything data-bound, anything
matching delete/remove/archive → the agent pauses and asks the human.

Example: a 9-step "create record" automation might auto-run steps 1–3 (navigate, open
panel, click New), then stop: _"I've filled the form — review and confirm before I save."_

---

## 7. Hard constraints

### 7.1 Latency — guidance is never LLM-in-the-loop

A stuck end user needs help within ~200ms. An LLM call is 800ms–3s. Therefore:

- **Hot path:** stuck signal → cache lookup (Redis) → directive. <50ms. No LLM.
- **Cold path:** LLM generates guidance offline, writes it to the cache.
- **Prefetch:** on screen entry, push likely guidance to the client before they're stuck.
- Only **Feature 4 (chat)** calls an LLM in the request path.

### 7.2 Three escalating tiers of help

1. Proactive tour (onboarding) — free
2. Reactive nudge (cached tooltip / cursor on stuck) — ~50ms
3. Chat + RAG (end user explicitly asks) — the only live-LLM tier

Escalate only when the cheaper tier fails.

### 7.3 Selectors rot — store fingerprints, not selectors

Real-SPA audit (14 interactive elements): `data-testid` 0/14, `id` 0/14, `aria-label`
1/14, text 13/14. **Role + accessible name carries the product.**

Store every strategy; resolve in priority order with confidence:

1. `data-testid` (0.95)
2. **role + accessibleName (0.9) — the workhorse**
3. `aria-label` (0.85)
4. text content (0.7)
5. domPath (0.4 — brittle; a hit here is a re-record signal)

Reject auto-generated ids/classes: React `useId()` (`:r0:`), Radix (`radix-:`),
MUI (`mui-1`), Emotion (`css-1x9k2j`). They change per render and poison the data.
Compute accessible names with `dom-accessibility-api` — never naive `textContent`
(which yields debris like `"bjbkjActive0msgs"`).
`nearbyText` (nearest heading/label) disambiguates multiple identical buttons.

### 7.4 Chrome vs data-bound elements

- **Chrome** = app furniture written by developers (`New`, `Save`, `View →`). Stable
  text. Fingerprint by role + name.
- **Data-bound** = user data rendered as UI (`onesActive16queries` = an agent name + a
  live counter). **Never fingerprint by text.** Fingerprint the container and highlight
  the region: _"select the agent you want"_, not _"click ones"_.

### 7.5 Self-healing

On an unresolvable fingerprint, the SDK POSTs a resolution-miss report. When one step's
miss rate crosses ~20%, flag **that single step** stale and prompt a re-record of just
that step — not the whole workflow.

### 7.6 Redaction in the browser, never on the server

`type=password`, `autocomplete=cc-*`, or name/id matching
`/password|pin|ssn|card|cvv|secret|token/i` → `[REDACTED]` before the event is queued.
A password reaching the server even once is a disclosable breach.

### 7.7 Multi-tenancy

Each customer platform is a tenant. `tenantId` is on every document and **first in every
compound index** (Mongo reads indexes left-to-right, so `{tenantId, status}` serves
tenant-filtered queries). Every query starts with tenant. Enforced at runtime via
`AsyncLocalStorage` tenant context, not by threading `tenantId` through function args.

---

## 8. The compaction pipeline (recording → workflow)

A 2-min rrweb trace is 2–8MB and must reach the LLM as 2–5KB.

```
raw events → filter to interactions → denoise → compact → ONE LLM call → Workflow
```

All steps before the LLM are deterministic code.

**Five denoise rules:**

1. Collapse typing (15 input events on one field → 1, final value)
2. Drop repeat clicks <500ms apart (but log separately — rage-click = stuck signal)
3. Drop dead clicks (hit nothing interactive — also a stuck signal)
4. Drop no-ops (click caused no DOM mutation / no navigation within 500ms)
5. Excise backtracks (`/a → /b → /a` in ~10s with no action = owner got lost)

**The one LLM pass outputs, per step:** `elementKind` (chrome|data-bound),
`parameterized` (owner-specific value the end user must replace?), `instruction`
(2nd-person tooltip, never referencing the recorded value — _"Give your agent a name"_
not _"Type Support Bot"_), `automatable`. Plus inferred `entryConditions`.

**Evolution:** once the SDK observes all end users, workflows can be _mined_ from real
usage with nobody recording ("47 users completed this sequence"). Explicit recording is
the cold start; passive mining is the steady state. **Build the pipeline so the trigger
is a parameter, not hardcoded to "owner pressed stop."**

---

## 9. Where RAG genuinely earns its place

Two roles:

1. **Workflow retrieval (Features 1–3):** the owner's prompt is the _retrieval key_, not
   a label. At runtime, embed the end user's context (route, recent actions, search
   input) → match against workflow-intent embeddings in Qdrant → filter by
   `entryConditions` → rank by similarity → pick the workflow to offer.
2. **Knowledge-base chat (Feature 4):** classic RAG over the customer's docs corpus.

---

## 10. Stack

- **Express + TypeScript** (not NestJS — see the wiring first; migrate later)
- **ESM** (`"type": "module"`)
- **MongoDB + Mongoose** (native `mongod` on host)
- **Redis** (Docker, 6379) — cache + BullMQ
- **Qdrant** (Docker, 6333/6334) — vectors
- **BullMQ** — job queues (a library living inside Redis, not a service)
- **LangGraph** — offline guidance generation + chat orchestration
- **Playwright or CDP-based driver** — Feature 3 "take over" execution engine (TBD phase)
- **pnpm** — single root `package.json`, TS path aliases (`@rag/*`), no per-package files
- **No Docker for the app itself.** Local-first; every URL in `.env` so containerizing
  later changes zero code.

---

## 11. Data model (target)

Replaces the old doc-chat schemas. Every collection has `tenantId` first.

- `organizations` — one per customer/tenant
- `users` — owners (and any internal accounts)
- `platforms` / app registration — the customer's app: base URL, allowed origins, config
- `recordings` — raw captured sessions (semantic events + pointer to rrweb blob)
- `workflows` — analyzed, parameterized, verified task definitions (+ intent embedding)
- `ui_elements` — catalog of fingerprinted elements (chrome vs data-bound)
- `events` — the live end-user interaction stream (high volume, append-only)
- `sessions` — hot per-session state (lives in Redis, not Mongo)
- `stuck_patterns` — mined signals of where end users get stuck
- `guidance` — precomputed directives, mirrored into Redis for the hot path
- `task_patterns` — mined repetitive sequences (automation candidates)
- `automation_runs` — audit log of every "take over" execution, step by step
- `kb_documents` / `kb_chunks` — knowledge base corpus for Feature 4
- `refresh_tokens` — auth (hashed, TTL-indexed)

---

## 12. Roadmap

| Phase | Build                                                                              | Status      |
| ----- | ---------------------------------------------------------------------------------- | ----------- |
| 1     | Foundation — config, Mongo, Redis, health                                          | ✅ done     |
| 2     | Auth + multi-tenancy (JWT, argon2, refresh rotation, AsyncLocalStorage)            | in progress |
| 3     | Platform registration + new data model                                             |             |
| 4     | Recorder SDK — semantic capture, fingerprinting, redaction                         |             |
| 5     | Compaction pipeline — filter → denoise → compact → LLM → Workflow                  |             |
| 6     | Event ingestion + session state (Redis ring buffer)                                |             |
| 7     | Stuck detection (idle, rage-click, dead-click, backtrack, form-abandon)            |             |
| 8     | Guidance generation (LangGraph, offline) + cache + 50ms serving + agent cursor     |             |
| 9     | Knowledge-base chat + docs RAG (Feature 4)                                         |             |
| 10    | Task pattern mining + **"take over" automation engine** (Feature 3) + safety gates |             |

**Ordering principle: automate data acquisition LAST.** Prove the data is valuable before
building the machine that produces it. The "take over" engine (highest risk) comes last,
once workflows, fingerprint resolution, and safety classification are all proven.

---

## 13. Working agreement (how the build is done)

- Learn deeply, then ship — **not** build-and-ship. No boilerplate dumps.
- Each phase: file by file, dependency order. **Concept before code**, every file.
- Implementation written inline in chat, not as downloadable files.
- Comment only where something non-obvious happens.
- Every phase ends with a **hard, testable exit criterion**.
- Push back on wrong proposals directly.
