# Canva Clone - Complete Documentation Reference

> Full project documentation index with context for every section. Use this as your single source of truth for navigating the entire docs.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Setup Guides (Step-by-Step)](#setup-guides-step-by-step)
  - [00 - Prerequisites](#00---prerequisites)
  - [01 - Installation](#01---installation)
  - [02 - Database Setup](#02---database-setup)
  - [03 - Unsplash API](#03---unsplash-api)
  - [04 - UploadThing API](#04---uploadthing-api)
  - [05 - Replicate API](#05---replicate-api)
  - [06 - Stripe Setup](#06---stripe-setup)
  - [07 - Templates Setup](#07---templates-setup)
  - [08 - GitHub OAuth](#08---github-oauth)
  - [09 - Google OAuth](#09---google-oauth)
  - [10 - Deployment](#10---deployment)
- [Reference Documents](#reference-documents)
  - [11 - Troubleshooting](#11---troubleshooting)
  - [12 - Environment Variables Reference](#12---environment-variables-reference)
- [Setup Flow & Dependencies](#setup-flow--dependencies)
- [Quick Commands](#quick-commands)
- [Key Notes & Gotchas](#key-notes--gotchas)

---

## Project Overview

A production-ready graphic design SaaS platform featuring a drag-and-drop editor, AI-powered image tools, multi-provider authentication, and Stripe subscription management. Built as a full-stack Next.js application.

**Core Features:**
- Professional canvas editor (Fabric.js) with templates, text, shapes, drawing, and layers
- AI image generation and background removal (Replicate)
- Multi-auth: Google, GitHub, Email/Password (Auth.js)
- Stripe subscription billing (Free + Pro tiers)
- File uploads and image management (UploadThing)
- Stock photo search (Unsplash)
- Export to PNG, JPG, SVG, JSON
- Responsive design for all devices

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS, Shadcn UI |
| **Canvas Engine** | Fabric.js |
| **Backend / API** | Hono.js (API routes) |
| **Database** | Neon PostgreSQL, Drizzle ORM |
| **Authentication** | Auth.js (NextAuth v5) |
| **AI & Media** | Replicate AI, Unsplash API, UploadThing |
| **Payments** | Stripe (Subscriptions + Webhooks) |
| **State Management** | Zustand, TanStack Query |
| **Deployment** | Vercel |

---

## Setup Guides (Step-by-Step)

**Estimated total setup time: ~90 minutes**

All guides are located in [`./README/`](./README/) and should be followed in order.

---

### 00 - Prerequisites

> **File:** [`README/00-PREREQUISITES.md`](./README/00-PREREQUISITES.md) | **Time:** ~2 min

**What you need before starting:**
- **Software:** Node.js v18+ (or Bun v1.3+), Git, code editor (VS Code recommended)
- **Accounts (all free tier):** Neon, Unsplash, UploadThing, Replicate, Stripe, GitHub, Google Cloud
- Estimated ~15 minutes to create all accounts

---

### 01 - Installation

> **File:** [`README/01-INSTALLATION.md`](./README/01-INSTALLATION.md) | **Time:** ~5 min

**Steps covered:**
1. Clone the repository (`git clone`)
2. Copy environment file (`.env.example` -> `.env`)
3. Verify package manager (Bun or Node)
4. Install dependencies (`bun install` or `npm install`)
5. Test run - expects a DATABASE_URL error (this is normal at this stage)

**Key files touched:** `.env`

---

### 02 - Database Setup

> **File:** [`README/02-DATABASE-SETUP.md`](./README/02-DATABASE-SETUP.md) | **Time:** ~10 min

**Steps covered:**
1. Create free Neon account at [neon.tech](https://neon.tech)
2. Create a new project and get the connection string
3. **Important:** Remove `&channel_binding=require` from the connection string
4. Add `DATABASE_URL` to `.env`
5. Generate `AUTH_SECRET` using `openssl rand -base64 32`
6. Run migrations: `bun run db:generate && bun run db:migrate`
7. Verify with Drizzle Studio: `bun run db:studio` (opens at local.drizzle.studio)
8. Test the app at `localhost:3000` and create your first account

**Environment variables set:** `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`

---

### 03 - Unsplash API

> **File:** [`README/03-UNSPLASH-API.md`](./README/03-UNSPLASH-API.md) | **Time:** ~5 min

**Steps covered:**
1. Create Unsplash account at [unsplash.com](https://unsplash.com)
2. Navigate to Product -> Developers/API
3. Create a new application (accept terms)
4. Copy the Access Key
5. Add `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` to `.env`
6. Restart dev server and test image search in the editor sidebar

**Note:** `NEXT_PUBLIC_` prefix means this key is exposed to the client (required for client-side API calls). If you have connection issues, try using Tor Browser for sign-up.

**Environment variables set:** `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`

---

### 04 - UploadThing API

> **File:** [`README/04-UPLOADTHING-API.md`](./README/04-UPLOADTHING-API.md) | **Time:** ~5 min

**Steps covered:**
1. Create free UploadThing account at [uploadthing.com](https://uploadthing.com)
2. Create a new app (select Free plan)
3. Get **3 separate API keys:** `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID`, `UPLOADTHING_TOKEN`
4. Add all three to `.env`
5. Restart dev server and test the "Upload Image" feature

**Important:** You need all 3 keys (SDK v7+ keys + Legacy Token). Missing any one will cause upload failures.

**Environment variables set:** `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID`, `UPLOADTHING_TOKEN`

---

### 05 - Replicate API

> **File:** [`README/05-REPLICATE-API.md`](./README/05-REPLICATE-API.md) | **Time:** ~10 min

**Steps covered:**
1. Create Replicate account at [replicate.com](https://replicate.com)
2. **Add billing with minimum $2** (no free tier for API usage)
3. Generate an API token
4. Add `REPLICATE_API_TOKEN` to `.env`
5. Restart dev server

**Important:** This is a **paid service** - there is no free tier. AI features (image generation, background removal) also require a Pro subscription via Stripe (set up in step 06).

**Environment variables set:** `REPLICATE_API_TOKEN`

---

### 06 - Stripe Setup

> **File:** [`README/06-STRIPE-SETUP.md`](./README/06-STRIPE-SETUP.md) | **Time:** ~20 min

This is the most complex setup. It has 5 parts:

**Part 1 - Stripe Account & API Key:**
1. Create account at [dashboard.stripe.com](https://dashboard.stripe.com)
2. Get Secret Key (starts with `sk_test_`)
3. Add `STRIPE_SECRET_KEY` to `.env`

**Part 2 - Create Subscription Product:**
1. Create a monthly recurring subscription product
2. Copy the Price ID (starts with `price_`)
3. Add `STRIPE_PRICE_ID` to `.env`

**Part 3 - Local Webhook Setup:**
1. Download and install Stripe CLI in the project root
2. Login: `stripe login`
3. Start listener: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Copy the webhook secret (starts with `whsec_`)
5. Add `STRIPE_WEBHOOK_SECRET` to `.env`

**Part 4 - Test Payment:**
1. Use test card: `4242 4242 4242 4242` (any future date, any CVC)
2. Verify subscription in Stripe dashboard

**Part 5 - Test AI Features:**
1. After Pro subscription, test AI image generation
2. Test background removal

**Important:** You need **3 terminal windows** running simultaneously: dev server, Stripe CLI webhook listener, and your main terminal. The webhook secret is **different** for local vs production.

**Environment variables set:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`

---

### 07 - Templates Setup

> **File:** [`README/07-TEMPLATES-SETUP.md`](./README/07-TEMPLATES-SETUP.md) | **Time:** ~15 min

**Steps covered:**

**Part 1 - Upload Template Images:**
1. Upload PNG template images from `public/` folder to UploadThing dashboard

**Part 2 - Configure Templates in Database:**
1. Open Drizzle Studio (`bun run db:studio`)
2. Navigate to the `templates` table
3. Add template records with fields: `name`, `json`, `width`, `height`, `thumbnailUrl`, `isTemplate`, `isPro`
4. Copy image URLs from UploadThing

**Part 3 - Fix Image Loading:**
1. **Critical:** Update `next.config.js` to add `*.ufs.sh` wildcard in `remotePatterns`
2. Restart dev server
3. Verify templates appear in "Start from a template" section

**Important:** Use `*.ufs.sh` wildcard (not specific subdomains) for `remotePatterns` in `next.config.js`. Templates must have `isTemplate=TRUE`. Use `isPro` to differentiate free vs Pro templates.

---

### 08 - GitHub OAuth

> **File:** [`README/08-GITHUB-OAUTH.md`](./README/08-GITHUB-OAUTH.md) | **Time:** ~5 min

**Steps covered:**
1. Go to GitHub Settings -> Developer Settings -> OAuth Apps
2. Create New OAuth App
3. Set Homepage URL: `http://localhost:3000`
4. Set Callback URL: `http://localhost:3000/api/auth/callback/github`
5. Copy Client ID and generate Client Secret
6. Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to `.env`
7. Test "Sign in with GitHub"

**Important:** Callback URL must be exact (no trailing slash). Client Secret is only shown once - copy it immediately. Same email cannot be used across multiple OAuth providers (by design in Auth.js).

**Environment variables set:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

---

### 09 - Google OAuth

> **File:** [`README/09-GOOGLE-OAUTH.md`](./README/09-GOOGLE-OAUTH.md) | **Time:** ~10 min

**Steps covered:**

**Part 1 - Create Google Cloud Project:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project and select it

**Part 2 - OAuth Consent Screen:**
1. Configure as "External" user type
2. Fill required fields: app name, support email, developer email
3. Skip through scopes and test users pages

**Part 3 - Create Credentials:**
1. Create OAuth Client ID (Web application type)
2. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy Client ID (ends in `.apps.googleusercontent.com`) and Client Secret
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`

**Important:** More complex than GitHub due to OAuth consent screen setup. Same email limitation applies across OAuth providers.

**Environment variables set:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

### 10 - Deployment

> **File:** [`README/10-DEPLOYMENT.md`](./README/10-DEPLOYMENT.md) | **Time:** ~15 min

**Steps covered:**

**Part 1 - Push to GitHub:**
1. Initialize git, add files, commit, create remote repo, push

**Part 2 - Deploy to Vercel:**
1. Import repository at [vercel.com](https://vercel.com)
2. Vercel auto-detects Next.js configuration

**Part 3 - Environment Variables:**
1. Add ALL `.env` variables to Vercel Settings -> Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` to your Vercel domain

**Part 4 - Production Stripe Webhook:**
1. Create a **new** production webhook endpoint in Stripe Dashboard
2. Endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select 4 events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Get the **new** webhook secret and update in Vercel

**Part 5 - Update OAuth Callbacks:**
1. GitHub: Update callback to `https://your-app.vercel.app/api/auth/callback/github`
2. Google: Add `https://your-app.vercel.app/api/auth/callback/google` to authorized redirect URIs

**Part 6 - Redeploy and test all features**

**Critical:** Production webhook secret is **different** from local. All OAuth URLs must use `https://` in production.

---

## Reference Documents

### 11 - Troubleshooting

> **File:** [`README/11-TROUBLESHOOTING.md`](./README/11-TROUBLESHOOTING.md)

Comprehensive solutions organized by category:

| Category | Common Issues |
|----------|--------------|
| **Database** | Missing DATABASE_URL, migration errors |
| **Images** | Templates not showing, Unsplash not loading, upload failures |
| **Authentication** | OAuth redirect failures, same-email conflicts, AUTH_SECRET errors |
| **Stripe** | Webhooks not working (local/production), payment failures |
| **AI Features** | Replicate token issues, billing/quota problems, Pro subscription required |
| **Deployment** | Vercel build failures, env vars not applied, OAuth in production |
| **Performance** | Slow loading, port conflicts (`lsof -ti:3000 \| xargs kill -9`) |
| **General** | Cache issues (Ctrl+Shift+R), module not found, TypeScript errors |
| **Database Studio** | Access issues, changes not saving |

---

### 12 - Environment Variables Reference

> **File:** [`README/12-ENV-REFERENCE.md`](./README/12-ENV-REFERENCE.md)

Complete reference for all 13 environment variables:

| Variable | Source | Format |
|----------|--------|--------|
| `DATABASE_URL` | Neon Dashboard | `postgresql://...` (remove `channel_binding`) |
| `AUTH_SECRET` | `openssl rand -base64 32` | Base64 string |
| `NEXT_PUBLIC_APP_URL` | Manual | `http://localhost:3000` or production URL |
| `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` | Unsplash Dashboard | Alphanumeric string |
| `UPLOADTHING_SECRET` | UploadThing Dashboard | `sk_live_...` |
| `UPLOADTHING_APP_ID` | UploadThing Dashboard | Alphanumeric string |
| `UPLOADTHING_TOKEN` | UploadThing Dashboard | Long token string |
| `REPLICATE_API_TOKEN` | Replicate Dashboard | `r8_...` |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | `sk_test_...` or `sk_live_...` |
| `STRIPE_PRICE_ID` | Stripe Dashboard | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI / Dashboard | `whsec_...` |
| `GITHUB_CLIENT_ID` | GitHub Developer Settings | Alphanumeric string |
| `GITHUB_CLIENT_SECRET` | GitHub Developer Settings | Alphanumeric string |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | `GOCSPX-...` |

**Common mistakes:** Trailing spaces, quotes around values, using same webhook secret for local and production.

---

## Setup Flow & Dependencies

```
Prerequisites (00)
    |
Installation (01)
    |
Database Setup (02)  <-- Everything depends on this
    |
    +---> Unsplash API (03)  ----+
    |                            |
    +---> UploadThing API (04) --+--> Templates Setup (07)
    |                            |
    +---> Replicate API (05) ----+
    |
Stripe Setup (06)  <-- Pro features (AI) require this
    |
    +---> GitHub OAuth (08)  --+
    |                          |
    +---> Google OAuth (09)  --+--> Deployment (10)
```

**Parallel steps:** After Database Setup, you can set up Unsplash, UploadThing, and Replicate simultaneously. GitHub and Google OAuth can also be done in parallel.

---

## Quick Commands

```bash
# Install dependencies
bun install

# Database operations
bun run db:generate        # Generate migrations
bun run db:migrate         # Apply migrations
bun run db:studio          # Open Drizzle Studio (local.drizzle.studio)

# Development
bun dev                    # Start dev server (localhost:3000)

# Stripe CLI (separate terminal)
stripe login               # Authenticate with Stripe
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Generate AUTH_SECRET
openssl rand -base64 32
```

---

## Key Notes & Gotchas

1. **Neon connection string:** Always remove `&channel_binding=require` from the URL
2. **UploadThing needs 3 keys:** `SECRET`, `APP_ID`, and `TOKEN` - missing any one breaks uploads
3. **Replicate is paid:** Minimum $2 billing required, no free API tier
4. **Stripe needs 3 terminals:** Dev server + Stripe CLI listener + main terminal
5. **Webhook secrets differ:** Local (from CLI) vs Production (from Stripe Dashboard) are different
6. **OAuth email conflict:** Same email cannot be used with multiple OAuth providers (Auth.js design)
7. **GitHub Client Secret:** Only shown once during creation - copy immediately
8. **next.config.js:** Use `*.ufs.sh` wildcard for UploadThing image domains
9. **Production OAuth:** All callback URLs must use `https://` (not `http://`)
10. **Test card:** `4242 4242 4242 4242` with any future expiry and any CVC

---

## Images Reference

All setup screenshots are stored in [`./images/`](./images/) with the naming convention `fig{guide_number}_{step_number}.png`:

| Prefix | Guide |
|--------|-------|
| `fig1_*` | Installation |
| `fig2_*` | Database Setup |
| `fig3_*` | Unsplash API |
| `fig4_*` | UploadThing API |
| `fig5_*` | Replicate API |
| `fig6_*` | Stripe Setup |
| `fig7_*` | Templates Setup |
| `fig8_*` | GitHub OAuth |
| `fig9_*` | Google OAuth |
| `fig10_*` | Deployment |

---

*This document serves as the master reference for the Canva Clone project documentation. For detailed step-by-step instructions, follow the individual guides in the [`./README/`](./README/) folder.*
