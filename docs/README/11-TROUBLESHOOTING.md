# 11-TROUBLESHOOTING.md

## Troubleshooting Guide

Common issues and their solutions.

---

## Database Issues

### Error: No database connection string

**Problem:** `DATABASE_URL` is missing or incorrect.

**Solution:**
1. Check `.env` file has `DATABASE_URL`
2. Verify the connection string from Neon dashboard
3. Remove `&channel_binding=require` from the end
4. Restart dev server

### Migration errors

**Problem:** Database schema won't apply.

**Solution:**
```bash
# Reset and regenerate
bun run db:generate
bun run db:migrate
```

If still failing:
1. Check Neon dashboard - database exists?
2. Verify connection string is correct
3. Check for typos in schema files

---

## Image Loading Issues

### Templates not showing

**Problem:** Template images return 400 error or don't load.

**Solution:**
1. Update `next.config.js`:
```javascript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "*.ufs.sh", // Wildcard for all UploadThing subdomains
    },
  ],
}
```
2. Restart dev server
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Unsplash images not loading

**Problem:** Stock photos don't appear.

**Solution:**
1. Verify `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` in `.env`
2. Check Unsplash API quota in dashboard
3. Restart dev server

### Upload fails

**Problem:** Can't upload images.

**Solution:**
1. Check all three UploadThing keys are in `.env`:
   - `UPLOADTHING_SECRET`
   - `UPLOADTHING_APP_ID`
   - `UPLOADTHING_TOKEN`
2. Verify keys are correct in UploadThing dashboard
3. Check file size (free tier has limits)

---

## Authentication Issues

### Can't log in with OAuth

**Problem:** OAuth redirect fails or shows error.

**Solution:**

**GitHub:**
- Callback URL must be: `http://localhost:3000/api/auth/callback/github`
- No trailing slash
- Check `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`

**Google:**
- Callback URL must be: `http://localhost:3000/api/auth/callback/google`
- OAuth consent screen must be configured
- Check credentials are correct

### Can't use same email for different providers

**Problem:** "Email already in use" error.

**This is by design!** You cannot use the same email for:
- Email signup
- GitHub OAuth
- Google OAuth

**Solution:** Use different emails for each provider, or delete the existing account.

### AUTH_SECRET error

**Problem:** Authentication fails with JWT error.

**Solution:**
1. Generate new secret:
```bash
openssl rand -base64 32
```
2. Add to `.env` as `AUTH_SECRET`
3. Restart dev server

---

## Stripe Issues

### Webhooks not working locally

**Problem:** Subscription not activating.

**Solution:**
1. Ensure Stripe CLI is running:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
2. Copy webhook secret from output
3. Add to `.env` as `STRIPE_WEBHOOK_SECRET`
4. Keep terminal open!
5. Restart dev server in a **new** terminal

### Payment fails

**Problem:** Test payment doesn't work.

**Solution:**
- Use test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any 5-digit ZIP code
- Check you're in **test mode** (not live mode)

### Webhooks not working in production

**Problem:** Subscription works locally but not on Vercel.

**Solution:**
1. Create **new** webhook in Stripe dashboard
2. Use production URL: `https://your-app.vercel.app/api/webhooks/stripe`
3. Get **new** signing secret
4. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables
5. Redeploy

---

## AI Generation Issues

### Replicate API not working

**Problem:** AI generation fails.

**Solution:**
1. Verify `REPLICATE_API_TOKEN` in `.env`
2. Check billing - you need at least $2 credit
3. Ensure you have Pro subscription
4. Check API quota in Replicate dashboard

### "Insufficient credits" error

**Solution:** Add more funds to Replicate account at [replicate.com/account/billing](https://replicate.com/account/billing)

---

## Deployment Issues

### Vercel build fails

**Problem:** Deployment fails with build errors.

**Solution:**
1. Check build logs in Vercel dashboard
2. Ensure all dependencies in `package.json`
3. Verify all environment variables are set
4. Check for TypeScript errors locally first

### Environment variables not working

**Problem:** Features work locally but not in production.

**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Verify ALL variables from `.env` are added
3. Check for typos
4. Update `NEXT_PUBLIC_APP_URL` to Vercel domain
5. **Redeploy** after adding variables

### OAuth not working in production

**Problem:** OAuth works locally but not on Vercel.

**Solution:**
1. **GitHub:** Update callback URL to `https://your-app.vercel.app/api/auth/callback/github`
2. **Google:** Add `https://your-app.vercel.app/api/auth/callback/google` to authorized redirect URIs
3. Ensure production URLs use `https://` not `http://`
4. No trailing slashes
5. Redeploy on Vercel

---

## Performance Issues

### Slow loading

**Problem:** App loads slowly.

**Possible causes:**
- Large images (optimize before uploading)
- Too many API calls
- Slow database queries

**Solution:**
- Use image optimization
- Check Vercel analytics for bottlenecks
- Upgrade Neon plan if database is slow

### Port already in use

**Problem:** `Error: Port 3000 is already in use`

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
bun dev --port 3001
```

---

## General Issues

### Changes not reflecting

**Problem:** Code changes don't appear.

**Solution:**
1. Restart dev server
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear browser cache
4. Check you're editing the right file

### Module not found errors

**Problem:** Import errors or missing modules.

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
rm bun.lockb  # or package-lock.json
bun install
```

### TypeScript errors

**Problem:** Type errors preventing build.

**Solution:**
1. Check `tsconfig.json` is correct
2. Install missing type definitions
3. Fix type errors in code
4. Use `// @ts-ignore` as last resort (not recommended)

---

## Database Studio Issues

### Can't access Drizzle Studio

**Problem:** `https://local.drizzle.studio` doesn't load.

**Solution:**
1. Ensure `bun run db:studio` is running
2. Check port isn't blocked by firewall
3. Try accessing from different browser
4. Check console for errors

### Changes not saving

**Problem:** Database edits don't persist.

**Solution:**
1. Click **"Save"** button after editing
2. Refresh Drizzle Studio
3. Check Neon dashboard to verify changes
4. Verify database connection is active

---

## Still Having Issues?

1. **Check the logs:**
   - Local: Terminal console
   - Production: Vercel function logs
   
2. **Review your .env file:**
   - All variables present?
   - No trailing spaces?
   - Correct values?

3. **Compare with working example:**
   - Follow guides step-by-step
   - Don't skip steps
   - Match configurations exactly

4. **Create an issue:**
   - Include error messages
   - Share relevant code
   - Describe what you tried

---

**Need more help?** Check the main documentation or create a GitHub issue with:
- Error message
- Steps to reproduce
- What you've tried
- Screenshots if applicable

---

**Previous:** [10-DEPLOYMENT.md](./10-DEPLOYMENT.md)  
**Next:** [12-ENV-REFERENCE.md](./12-ENV-REFERENCE.md)

---
