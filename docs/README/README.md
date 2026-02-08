# Setup Guides

Step-by-step guides for setting up the Canva Clone project. Follow them in order.

---

## Guides

| # | File | Topic | Time |
|---|------|-------|------|
| 00 | [00-PREREQUISITES.md](./00-PREREQUISITES.md) | Software requirements and account creation | 2 min |
| 01 | [01-INSTALLATION.md](./01-INSTALLATION.md) | Clone repository and install dependencies | 5 min |
| 02 | [02-DATABASE-SETUP.md](./02-DATABASE-SETUP.md) | Neon PostgreSQL, migrations, Drizzle Studio | 10 min |
| 03 | [03-UNSPLASH-API.md](./03-UNSPLASH-API.md) | Unsplash stock photo API integration | 5 min |
| 04 | [04-UPLOADTHING-API.md](./04-UPLOADTHING-API.md) | UploadThing file upload service (3 keys) | 5 min |
| 05 | [05-REPLICATE-API.md](./05-REPLICATE-API.md) | Replicate AI image generation (paid, min $2) | 10 min |
| 06 | [06-STRIPE-SETUP.md](./06-STRIPE-SETUP.md) | Stripe payments, subscriptions, webhooks | 20 min |
| 07 | [07-TEMPLATES-SETUP.md](./07-TEMPLATES-SETUP.md) | Upload and configure design templates | 15 min |
| 08 | [08-GITHUB-OAUTH.md](./08-GITHUB-OAUTH.md) | GitHub OAuth authentication | 5 min |
| 09 | [09-GOOGLE-OAUTH.md](./09-GOOGLE-OAUTH.md) | Google OAuth authentication | 10 min |
| 10 | [10-DEPLOYMENT.md](./10-DEPLOYMENT.md) | Deploy to Vercel with production config | 15 min |

## Reference

| File | Description |
|------|-------------|
| [11-TROUBLESHOOTING.md](./11-TROUBLESHOOTING.md) | Common issues organized by category with solutions |
| [12-ENV-REFERENCE.md](./12-ENV-REFERENCE.md) | All 13 environment variables with formats and sources |

---

## Setup Order

```
00 Prerequisites
 |
01 Installation
 |
02 Database Setup  <-- Required for everything below
 |
 +-- 03 Unsplash API
 +-- 04 UploadThing API
 +-- 05 Replicate API
 |
06 Stripe Setup  <-- Required for Pro/AI features
 |
07 Templates Setup
 |
 +-- 08 GitHub OAuth
 +-- 09 Google OAuth
 |
10 Deployment
```

---

## Back to Docs

- [Documentation Hub](../README.md)
- [Full Reference (NOTE.md)](../NOTE.md)
- [Project README](../../README.md)
