# 12-ENV-REFERENCE.md

## Environment Variables Reference

Complete list of all environment variables needed for the project.

---

## Quick Checklist

Copy this to your `.env` file and fill in the values:

```env
# Database
DATABASE_URL=

# Authentication
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=

# APIs
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=
UPLOADTHING_TOKEN=
REPLICATE_API_TOKEN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=

# OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Detailed Reference

### Database Variables

#### `DATABASE_URL`
- **Required:** Yes
- **Format:** `postgresql://user:password@host/database?sslmode=require`
- **Source:** Neon Dashboard → Your Project → Connect
- **Note:** Remove `&channel_binding=require` from the end
- **Setup Guide:** [02-DATABASE-SETUP.md](./02-DATABASE-SETUP.md)

---

### Authentication Variables

#### `AUTH_SECRET`
- **Required:** Yes
- **Format:** Base64 encoded string
- **Generate:** `openssl rand -base64 32`
- **Purpose:** Encrypts JWT tokens and session data
- **Setup Guide:** [02-DATABASE-SETUP.md](./02-DATABASE-SETUP.md)

#### `NEXT_PUBLIC_APP_URL`
- **Required:** Yes
- **Local:** `http://localhost:3000`
- **Production:** `https://your-app.vercel.app`
- **Note:** Update when deploying
- **Setup Guide:** [02-DATABASE-SETUP.md](./02-DATABASE-SETUP.md)

---

### API Variables

#### `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`
- **Required:** Yes
- **Format:** String (starts with letters/numbers)
- **Source:** Unsplash Dashboard → Your Apps → Access Key
- **Purpose:** Fetch stock photos
- **Setup Guide:** [03-UNSPLASH-API.md](./03-UNSPLASH-API.md)

#### `UPLOADTHING_SECRET`
- **Required:** Yes
- **Format:** String (starts with `sk_`)
- **Source:** UploadThing Dashboard → Your App → API Keys
- **Purpose:** File upload authentication
- **Setup Guide:** [04-UPLOADTHING-API.md](./04-UPLOADTHING-API.md)

#### `UPLOADTHING_APP_ID`
- **Required:** Yes
- **Format:** Random string
- **Source:** UploadThing Dashboard → Your App → API Keys
- **Purpose:** Identify your UploadThing app
- **Setup Guide:** [04-UPLOADTHING-API.md](./04-UPLOADTHING-API.md)

#### `UPLOADTHING_TOKEN`
- **Required:** Yes
- **Format:** Long string
- **Source:** UploadThing Dashboard → Your App → Legacy Token
- **Purpose:** Legacy API compatibility
- **Setup Guide:** [04-UPLOADTHING-API.md](./04-UPLOADTHING-API.md)

#### `REPLICATE_API_TOKEN`
- **Required:** Yes (for AI features)
- **Format:** String (starts with `r8_`)
- **Source:** Replicate Dashboard → API Tokens
- **Purpose:** AI image generation
- **Note:** Requires billing setup ($2 minimum)
- **Setup Guide:** [05-REPLICATE-API.md](./05-REPLICATE-API.md)

---

### Stripe Variables

#### `STRIPE_SECRET_KEY`
- **Required:** Yes
- **Format:** Starts with `sk_test_` (test) or `sk_live_` (production)
- **Source:** Stripe Dashboard → Developers → API Keys
- **Purpose:** Process payments
- **Setup Guide:** [06-STRIPE-SETUP.md](./06-STRIPE-SETUP.md)

#### `STRIPE_PRICE_ID`
- **Required:** Yes
- **Format:** Starts with `price_`
- **Source:** Stripe Dashboard → Products → Your Product → Price ID
- **Purpose:** Identify subscription plan
- **Setup Guide:** [06-STRIPE-SETUP.md](./06-STRIPE-SETUP.md)

#### `STRIPE_WEBHOOK_SECRET`
- **Required:** Yes
- **Format:** Starts with `whsec_`
- **Source Local:** Stripe CLI output when running `stripe listen`
- **Source Production:** Stripe Dashboard → Webhooks → Endpoint → Signing Secret
- **Purpose:** Verify webhook authenticity
- **Note:** Different values for local and production!
- **Setup Guide:** [06-STRIPE-SETUP.md](./06-STRIPE-SETUP.md)

---

### OAuth Variables

#### `GITHUB_CLIENT_ID`
- **Required:** Yes (for GitHub login)
- **Format:** 20-character alphanumeric string
- **Source:** GitHub → Settings → Developer Settings → OAuth Apps → Your App
- **Purpose:** GitHub OAuth authentication
- **Setup Guide:** [08-GITHUB-OAUTH.md](./08-GITHUB-OAUTH.md)

#### `GITHUB_CLIENT_SECRET`
- **Required:** Yes (for GitHub login)
- **Format:** 40-character alphanumeric string
- **Source:** GitHub → Settings → Developer Settings → OAuth Apps → Your App → Generate Secret
- **Purpose:** GitHub OAuth authentication
- **Note:** Only shown once - save it!
- **Setup Guide:** [08-GITHUB-OAUTH.md](./08-GITHUB-OAUTH.md)

#### `GOOGLE_CLIENT_ID`
- **Required:** Yes (for Google login)
- **Format:** Long string ending in `.apps.googleusercontent.com`
- **Source:** Google Cloud Console → APIs & Services → Credentials → OAuth Client
- **Purpose:** Google OAuth authentication
- **Setup Guide:** [09-GOOGLE-OAUTH.md](./09-GOOGLE-OAUTH.md)

#### `GOOGLE_CLIENT_SECRET`
- **Required:** Yes (for Google login)
- **Format:** String with letters, numbers, and special characters
- **Source:** Google Cloud Console → APIs & Services → Credentials → OAuth Client
- **Purpose:** Google OAuth authentication
- **Setup Guide:** [09-GOOGLE-OAUTH.md](./09-GOOGLE-OAUTH.md)

---

## Common Mistakes

### ❌ Trailing spaces
```env
# Wrong
DATABASE_URL=postgresql://...     

# Correct
DATABASE_URL=postgresql://...
```

### ❌ Quotes around values
```env
# Wrong
AUTH_SECRET="your_secret_here"

# Correct
AUTH_SECRET=your_secret_here
```

### ❌ Missing variables
Make sure ALL variables are present, even if you're not using certain features yet.

### ❌ Wrong URLs for production
```env
# Wrong (in production)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Correct (in production)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### ❌ Using same webhook secret locally and in production
Local and production Stripe webhook secrets are **different**!

---

## Security Best Practices

1. ✅ Never commit `.env` to Git
2. ✅ Add `.env` to `.gitignore`
3. ✅ Use different secrets for development and production
4. ✅ Rotate secrets periodically
5. ✅ Don't share secrets in public channels
6. ✅ Use environment variables in Vercel for production

---

## Verification Commands

Check if environment variables are loading:

```bash
# In your code, temporarily add:
console.log('DB Connected:', !!process.env.DATABASE_URL);
console.log('Auth Secret:', !!process.env.AUTH_SECRET);
```

Don't log the actual values - just check if they exist!

---

## Local vs Production

Some variables need different values:

| Variable | Local | Production |
|----------|-------|------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://your-app.vercel.app` |
| `STRIPE_WEBHOOK_SECRET` | From Stripe CLI | From Stripe Dashboard |
| OAuth Callbacks | Use `localhost:3000` | Use Vercel domain |

Make sure to update OAuth callback URLs when deploying!

---

## Quick Setup Order

1. ✅ `DATABASE_URL` - Can't proceed without this
2. ✅ `AUTH_SECRET` - Generate immediately
3. ✅ `NEXT_PUBLIC_APP_URL` - Set to localhost first
4. ✅ API keys as you integrate each service
5. ✅ OAuth credentials when setting up login
6. ✅ Update for production when deploying

---

**Need help with a specific variable?** Check the corresponding setup guide linked in each section.

---

**Previous:** [11-TROUBLESHOOTING.md](./11-TROUBLESHOOTING.md)  
**Back to:** [README.md](../../README.md)

---
