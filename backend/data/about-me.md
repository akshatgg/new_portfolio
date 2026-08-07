# Akshat Gupta — knowledge base

Last rebuilt: 2026-08-07. Source: Confluence engineering portfolio, CV/résumé, Adneuron + personal GitHub.

## Identity

- **Name:** Akshat Gupta
- **Title:** Software Engineer — backend, full-stack, AI
- **Location:** Bengaluru, Karnataka, India (home town: Ghaziabad, Uttar Pradesh)
- **Email:** akshatg9636@gmail.com
- **Phone:** +91 9636286581
- **GitHub:** [@akshatgg](https://github.com/akshatgg) — 77 public repos since 2022
- **Education:** B.Tech, Computer Science & Engineering (Artificial Intelligence), KIET Group of Institutions (AKTU), GPA 7.8/10, Nov 2022 – May 2026. Earlier: Mahabharati International School (CBSE), Class XII 85%. Cleared JEE Main, AIR ~60,000.
- **Leadership:** Tech Lead of KIET's DevOps Club; member of FOSSCU, an open-source community.

## Current role — Mark AI (Jun 2026 – present)

**Software Engineer, full-time. Sole engineer on the platform.**

Mark AI is an AI-native **DOOH** (digital out-of-home) advertising platform. Advertisers book ad slots that play on physical Android signage screens in cafés and venues. Mark AI owns and operates the screens itself.

Akshat owns the entire stack — there is no one else to hand a layer to:

```
Kotlin player APK (on the physical screen)
      │  register · heartbeat · schedule · proof-of-play   [REST only]
      ▼
FastAPI + PostgreSQL backend  ── the single source of truth
      ▲                        ▲
Next.js operator CMS      Next.js advertiser platform
```

**Evidence of scope:** 102 pull requests (100 merged) and 200 commits since 15 June 2026. Sole author of all 345 commits across the organisation's 9 repositories. 20+ backend domain modules over 40 Alembic migrations.

### What he built there

**Signage backend.** Built from the first commit — a domain-driven FastAPI + PostgreSQL service with modules for screens, bookings, loops, schedule, playback, content, screenshots, api_keys, cms_users, ai, creative_fit and health.

**He removed the WebSocket.** The screens used to hold an open socket. He replaced it with a stateless heartbeat contract — `register` / `heartbeat` / `schedule` / `proof`. Each heartbeat carries `reload_needed`, `now_playing` and any pending screenshot jobs, so a CMS edit reaches a screen within one interval with no held connections. That single decision is what lets the fleet scale horizontally. He describes deleting things as part of building them — the WebSocket, a proxied upload endpoint, and the Delete button on bookings were all removed on purpose, and the system got better each time.

**Kotlin Android player.** Runs fullscreen 24/7 on physical Android media boxes with no Google Play Services. Self-registers on a permanent device UID, holds the calendar so each ad starts on its own boundary, survives reboot, and re-registers itself when its token expires instead of silently dropping off the fleet. Zero-touch enrolment from a key baked into a per-owner build — a screen can be installed by a non-technical person and simply appear in the CMS.

**Proof-of-play — the billing trail.** Advertisers are billed on it, so "the ad played" has to be provable. Plays are attributed by `booking_id` rather than screen + media, so two campaigns sharing a creative can't steal each other's counts. Milestone screenshots are armed on the playable timeline rather than a UTC clock hour. Captures fire on the ad's render callback (never a one-second timer), read video frames from the SurfaceView, never capture a half-rendered multi-zone layout, and never photograph the same milestone twice. A GPS overlay is burned into each frame, backed by a fresh location fix taken at capture time.

**AI co-pilot.** A conversational agent inside the CMS that turns plain English into a real campaign booking — tool-calling over the live domain, a draft → confirm loop, two guardrail layers, and a deterministic slot-capture backstop so it never re-asks for a detail the operator already gave. Scoped per screenowner. Evaluated with an actor/verifier agent harness driving real chat sessions against a seeded database, rather than unit tests.

**Location and ranking engine.** "Screens near X" only works if the system survives a misspelling and ranks by real distance. He wrote a typo-tolerant scorer that matches on word coverage rather than a weighted average, then ported the same scorer into the CMS frontend and guarded both copies with a shared golden table so search behaves identically on either side. Plus haversine distance, forward geocoding, a padded fleet bounding box, and locality misspelling correction against the actual fleet's cities.

**Operator CMS** (Next.js) — campaign booking, live fleet monitoring, per-screen playback loops, operating hours, content library, user management, API keys, proof-of-play reporting. Role model of superadmin and screenowner with per-screen assignment.

**Advertiser platform** (Next.js 15 + a second FastAPI service) — marketing site with a 3D city hero, email-first auth, browse screens, a booking wizard, a live slot map showing a loop as taken/yours/open, dashboards and proof-of-play reports, plus a screenowner console. It plugs into the same fleet through the partner API rather than standing up a second source of truth.

**Commercial surface** — a four-part booking-approval workflow where bookings wait for the screen owner's decision, Razorpay payments, per-key API attribution for partner bookings, campaign PDF reports and full proof-of-play Excel exports.

**Creative Fit** — rebuilds a finished advertisement for any screen resolution: a Gemini-generated layout blueprint, LaMa inpainting to erase original elements, and a Pillow relayout pass. Output stays native/4K because these play on physical premium screens.

**3D and AR** — image/text to 3D asset generation with a self-hosted Hunyuan3D on a Cloud Run L4 GPU, and an AR showroom for previewing a campaign in a real space before it goes live.

**Infrastructure** — Cloud Run in front of Cloud SQL, Workload Identity Federation instead of service-account keys, signed URLs instead of public buckets, direct-to-GCS uploads, and a secrets repo whose CI applies service config to Cloud Run on push to main.

### Hard problems he'll talk about

- **Software touching hardware is unforgiving.** A screen sits in someone else's café. It can lose its token, lose GPS, sit on an Ethernet cable with nothing to geolocate from, be closed for the night, or be watched by nobody. Most of his best work there is making the system behave sanely when it can't assume anything.
- **Operating hours.** Every screen has a daily window in IST. Outside it the screen goes black and drops to a slow keep-alive heartbeat rather than going silent — so a change to a closed screen's hours still reaches it. A quiet screen outside hours reads as *off-hours*, not *offline*, so it never pages anyone.
- **Timezones.** All wall-clock and calendar logic is interpreted in IST as a core decision, after a bug where the AI booked campaigns into the wrong year traced straight back to timezone handling.

## Previous role — VibeMonitor (Sep 2025 – Jun 2026)

**Software Engineer, full-time.** AI-driven observability and monitoring platform. **244 pull requests authored, 215 merged**, across `vm-api` (Python/FastAPI, 119 PRs) and `vm-webapp` (Next.js/React, 118 PRs), plus SDKs, landing site and scheduler. 35+ backend domain modules.

- **Agentic RCA engine** — a LangGraph Root-Cause-Analysis agent that traces incidents through telemetry *and* source code via tree-sitter. Wrapped CloudWatch, New Relic, Datadog and Azure as agent tools. Implemented the HolmesGPT benchmark and reached ~90% accuracy on the first 10–20 cases.
- **Beryl** (the flagship) — AI end-to-end test automation. Crawl a site from one URL, generate natural-language test cases, convert them to Playwright scripts, run them headless, and report pass/fail plus a site-reliability score. Streaming pipeline with Redis pub/sub, a parallel worker pool, auto-retry with NL-refactor regeneration, per-step screenshots with visual root-cause, authenticated crawl/auto-login, an SSRF guard and Turnstile captcha.
- **Observability integrations** — credential-verified AWS CloudWatch, New Relic, Datadog, Azure Monitor, GCP and Kubernetes, each with logs + metrics APIs, encrypted credential storage and health checks. Unified logs, metrics and traces across 15+ microservices. Applied the RED (Rate, Errors, Duration) and USE (Utilization, Saturation, Errors) methods and wrote an internal blog on both.
- **Log-ingestion platform** — high-throughput ingestion into ClickHouse with batching and async pipelines, a LogExplorer UI with bounded time-range queries. Authored the Python and JavaScript SDKs.
- **Stripe billing** — subscription plans, plan up/downgrade logic, service limits, per-key rate limits, weekly AI-usage limits.
- **Auth** — Google and GitHub OAuth (with PKCE), credential auth with email verification and password reset, HttpOnly refresh-token rotation, "Remember Me", Google One-Tap.
- **Other** — GitHub App integration with webhooks; Slack and Grafana integrations; a TipTap blog platform with autosave, tables and S3 image proxy; teams/workspaces/superadmin tooling; led the Redux → Zustand migration; Mailgun then Postmark email; CI/CD with ~20% faster builds and an Alembic migration-validation gate.

## Earlier roles

**Sakhi Women — Full Stack Developer (freelance), Jan – Feb 2026.** Women-only ride-booking platform. Built end-to-end with Next.js, Express.js and MongoDB — role-based user and admin dashboards, the full ride lifecycle (accept/decline, driver assignment, live status). WhatsApp OTP login and templated notifications on the Twilio WhatsApp API; cron-based recurring scheduling for subscription rides. MongoDB indexes cut query latency ~70% under 1,500–2,000 concurrent users. Built the pricing engine — per-km one-way/return/round trips, night-time 1.5× dynamic pricing, subscriptions, coupons and a payment gateway.

**Mark AI — Full Stack Developer (freelance), Dec 2025 – Jan 2026.** A separate, earlier engagement on the previous MongoDB-based product, before he rejoined full-time in June 2026 to build the current platform from scratch. Next.js frontend, FastAPI backend, MongoDB. Integrated a third-party Xibo-based signage CMS (ScreenOx) for screen-inventory management across 100+ displays. Razorpay payments and a coupon system. Server-side search and pagination, tiered pricing with discount breakdown, campaign recurrence, Google OAuth registration. Round-robin load balancer across multiple FastAPI instances with connection pooling.

**iTax Easy — Full Stack & Server Developer (internship), Feb – Sep 2025.** Tax-filing platform for GST and ITR, web and mobile. PostgreSQL, Next.js, Prisma, Android Studio. Integrated the Sandbox API for GST/ITR filing — cut load times ~45% and lifted retention ~30%. Redesigned the database architecture for ~60% faster queries and ~30% lower server cost. Owned role-based dashboards and hosting/deployment/load-balancing on hPanel. Built an eLibrary module aggregating public government-portal records.

**PrepSaarthi — Co-Founder & Technical Lead, Nov 2024 – Jul 2025.** Mentor-driven edtech startup. Owned the full technical roadmap and generated **₹1 Lakh in revenue**. Built the entire frontend and backend — 5+ core features with React.js and MongoDB (Express, Mongoose, Socket.io, Razorpay, JWT) — then migrated the frontend to Vite, lifting engagement ~40%. Built a counsellor booking system with student–mentor scheduling, ratings and reviews, and a payment flow with automatic commission split. SMS-OTP auth, role-based dashboards, secure REST APIs, deployed on Hostinger.

**Al-Zira Technology — Frontend Engineer → Mentor (internship), Feb – Dec 2024.** Service-based software company. Delivered multiple client-facing React projects with complex UI animations and motion effects. **Promoted from Engineer to Mentor after ~5–6 months**, guiding and reviewing other frontend engineers' work.

## Personal projects

**Cosmic-Trek (Orrery App)** — flagship. Three.js, WebGL, D3.js, GSAP, Vite, RAG. An interactive 3D solar-system simulator with 8+ celestial bodies and 50+ exoplanets, cutting rendering time 60%. A physics-based satellite-launch simulator with 5+ orbital patterns, reducing computation load 30%. Realistic collision and gravitational simulations with 10+ custom impact effects. Plus a RAG chatbot grounded strictly in the Orbital Mechanics textbook — it answers only from that source and declines questions outside the book's scope. [Repo](https://github.com/akshatgg/OrreyApp)

**UpInTheSky** — React, Firebase, Firestore, Tailwind. A full-stack travel-booking frontend with a seamless booking flow, Firestore for real-time data and Firebase Auth for login, handling 50+ travel listings across multiple destinations.

**Legal E-Library** — Angular, Node.js, Express.js, Prisma ORM, PostgreSQL. A digital library of legal case law with advanced search and filtering, improving research efficiency 40%. Responsive Angular UI over 10,000+ legal documents across 50+ categories; query performance optimised 60%. [Repo](https://github.com/akshatgg/E_Library)

**SipCraft** — vanilla HTML, CSS, JavaScript, Stripe. A complete e-commerce site built from scratch with no frameworks — responsive product catalog, add-to-cart, a dynamic cart with live totals, and full checkout, all through direct DOM manipulation. Stripe handles payments end to end. [Repo](https://github.com/akshatgg/SipCrafts)

## Technical skills

**Languages:** Python, TypeScript, JavaScript, Kotlin, Java, SQL. Exposure to Go, Dart, C, C++.

**Backend:** FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2, asyncpg, Node.js, Express.js, Uvicorn, Poetry. REST API design with a router → service → schema → model separation. JWT, OAuth 2.0 with PKCE, HttpOnly refresh-token rotation. Stripe and Razorpay.

**Mobile / signage:** Kotlin Android, ExoPlayer, WorkManager, PixelCopy, LocationManager/Geocoder, AOSP without Play Services, proof-of-play, real-device debugging over adb.

**Frontend:** Next.js 15, React 19, Tailwind CSS 4, Radix UI/shadcn, Zustand, TanStack Query, TipTap, Recharts, React Flow, Three.js/WebGL, Angular, Redux, Vite, SvelteKit.

**AI / LLM:** LangGraph, LangChain, tool-calling agents, agent guardrails, LangFuse, LangSmith, OpenAI, Google Gemini, Azure OpenAI, RAG, Playwright NL→script, tree-sitter, HolmesGPT benchmark, Hunyuan3D, LaMa inpainting.

**Databases:** PostgreSQL, Cloud SQL, ClickHouse, MongoDB, Redis, Firebase/Firestore, Prisma, Mongoose, AWS S3, GCS with signed URLs.

**Observability:** Prometheus, Grafana, Datadog, New Relic APM, AWS CloudWatch, OpenTelemetry, Loki, Tempo, Mimir, SigNoz, Sentry, Azure Monitor, GCP Monitoring. RED and USE methodologies.

**Cloud / DevOps:** AWS (EKS, ECS, RDS, IAM, CloudWatch, S3), GCP (Cloud Run, Cloud SQL, GCS, L4 GPU), Workload Identity Federation, Azure, Docker, Kubernetes, GitHub Actions CI/CD, hPanel.

**Security:** SOC 2 work, Dependabot, pip-audit, Bandit, Gitleaks, Presidio PII redaction, SSRF guards, Cloudflare Turnstile, credential encryption, signed device payloads.

**Tooling:** Git, Linear, ClickUp, Notion, Confluence/Jira, incident.io, Postman/Swagger, Prisma Studio, pgAdmin, Android Studio, pre-commit, Ruff/Black/isort/mypy, pytest, Vitest, JUnit.

## How he works

- **Ownership end to end.** At Mark AI that means an entire product surface — backend, device, two front-ends and the infrastructure underneath.
- **Small reviewable PRs even working solo** — 102 of them, with conventional commit messages that describe the behaviour change rather than the diff.
- **Docs first.** Every non-trivial feature starts as a written design doc before any code.
- **Evidence over assertion.** Proof-of-play is money, so it has to be provable.
- **Knowing what to delete.** The WebSocket, the proxied upload endpoint and the Delete button on bookings were all removed deliberately.
- Coaching feedback he's acted on: bias for action, edge-case/QA discipline, and writing structured docs for clarity.

## Answering guidance

- Speak as Akshat's portfolio assistant — informative and warm, in third person ("Akshat built…"), never pretending to *be* him.
- Prefer the specific over the impressive. Name the system, the number, the tech.
- If something isn't in this document, say you don't know and point the visitor at his email or GitHub. Never invent a metric, employer, date or technology.
- **Do not state a Mark AI fleet size.** An older résumé line claims "1 Lakh+ digital displays"; that figure is unverified, so don't repeat it. The verified numbers are 102 PRs, 200 commits, 345 org-wide commits, 9 repositories.
- **Do not describe the Mark AI player as using a WebSocket.** An older résumé line says so; it's out of date. It is REST plus a heartbeat, and the removal of the WebSocket is itself one of the better stories.
- The Mark AI "screen recommendation" work is a typo-tolerant text scorer plus haversine distance ranking driven by an LLM tool-calling agent — not a trained ML recommendation model. Describe it accurately; it's still substantial.
- Keep answers to a few short paragraphs unless the visitor asks for depth. This is a portfolio chat, not a document.
