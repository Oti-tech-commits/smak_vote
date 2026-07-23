# DEPLOYMENT GUIDE

## Pre-Deployment Checklist

### Code Quality

- [ ] `npm run lint` passes without errors
- [ ] `npm run typecheck` passes without errors
- [ ] `npm run test` passes with 80%+ coverage
- [ ] No console.log statements in production code
- [ ] All secrets in environment variables only
- [ ] No hardcoded API keys or credentials

### Securit

- [ ] CSP headers configured
- [ ] CORS properly configured
- [ ] HTTPS enforced
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] RLS policies enforced on all tables
- [ ] Supabase service role key never committed
- [ ] Audit logging working

### Database

- [ ] Migrations up to date
- [ ] Foreign key constraints in place
- [ ] Indexes optimized
- [ ] RLS policies tested
- [ ] Backup strategy documented
- [ ] Connection pooling configured

### Features

- [ ] Authentication flows working
- [ ] Voting flows working
- [ ] Admin CRUD operations working
- [ ] Report generation working
- [ ] File uploads working
- [ ] PWA offline support working
- [ ] Email notifications working (if implemented)

## Deployment to Cloudflare Pages

### Step 1: Prepare Repository

1. Initialize Git (if not done):
```bash
git init
git add .
git commit -m "Initial commit: St. Mark's Voting System"
```

2. Push to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/smak-vote.git
git push -u origin main
```

### Step 2: Connect to Cloudflare Pages

1. Log into Cloudflare Dashboard
2. Go to Pages → Create Project
3. Select "Connect to Git"
4. Authorize GitHub
5. Select `smak-vote` repository
6. Configure build settings:
   - **Framework preset:** Next.js (Static HTML Export)
   - **Build command:** `npm run cf:build`
   - **Build output directory:** `.open-next`
   - **Node version:** 22

### Step 3: Set Environment Variables

In Cloudflare Pages project settings → Environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_URL=https://[your-project].supabase.co
```

⚠️ **IMPORTANT:** 
- Only commit public keys to repository
- Service role key must be in environment variables only
- Never commit `.env.local`

### Step 4: Custom Domain

1. In Cloudflare Pages project → Custom domains
2. Click "Add custom domain"
3. Enter your domain (e.g., `voting.stmark.edu.ng`)
4. Follow DNS configuration steps
5. Wait for SSL certificate (5-30 minutes)

### Step 5: Deploy

Push to main branch triggers automatic deployment:

```bash
git add .
git commit -m "Feature: Add voting token management"
git push origin main
```

Monitor deployment in Cloudflare Dashboard → Pages → Deployments

## Deployment to Supabase (Database)

### Migrations

All migrations should be applied before deployment:

```bash
# Connect to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### Monitoring Deployment

1. **Check Migration Status:**
   - Go to Supabase Dashboard → SQL Editor
   - Query: `SELECT * FROM pg_migrations;`

2. **Verify RLS Policies:**
   - Go to Authentication → Policies
   - Verify all tables have correct policies enabled

3. **Test Public Access:**
   - Try login: `npm run dev` on local machine pointing to production Supabase
   - Create test election
   - Submit test vote

## Post-Deployment

### Verification

1. **Test Production Access:**
   - Visit your domain (https://voting.stmark.edu.ng)
   - Test admin login
   - Test student registration
   - Test voting flow

2. **Monitor Logs:**
   - Cloudflare Pages → Analytics
   - Supabase → Logs → API Logs
   - Check for 4xx/5xx errors

3. **Database Health:**
   - Supabase → Database → Monitoring
   - Check connection count
   - Monitor query performance
   - Check storage usage

4. **Security Check:**
   - Verify CSP headers: `curl -I https://voting.stmark.edu.ng | grep Content-Security`
   - Check SSL: https://www.ssllabs.com/ssltest/
   - Run security audit: `npm audit`

### Rollback Plan

If deployment fails:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Cloudflare automatically redeploys from previous version
```

### Health Monitoring

Set up basic monitoring:

1. **Log Aggregation:** Use Cloudflare Workers to aggregate logs
2. **Error Tracking:** Monitor failed votes and auth failures
3. **Performance:** Track response times on voting endpoint
4. **Uptime:** Set up monitoring with UptimeRobot

## Ongoing Maintenance

### Weekly
- [ ] Review error logs
- [ ] Check storage usage
- [ ] Verify backups

### Monthly
- [ ] Security audit
- [ ] Performance review
- [ ] Update dependencies (`npm update`)
- [ ] Review audit logs for suspicious activity

### Quarterly
- [ ] Full security audit
- [ ] Disaster recovery test
- [ ] Capacity planning
- [ ] Update documentation

## Troubleshooting Deployment

### Build Fails

```bash
# Clean and rebuild
rm -rf node_modules .next .open-next
npm install
npm run cf:build
```

### Environment Variables Not Loading

- Verify exact variable names in Cloudflare
- Check case sensitivity
- Restart deployment after adding variables

### Voting Endpoint Errors

- Check Supabase connection status
- Verify RLS policies on votes table
- Review audit logs in Supabase
- Test with Supabase API directly

### Storage Upload Fails

- Verify bucket exists: `candidate-photos`
- Check bucket policies
- Ensure service role key has storage permissions

## Support

- Cloudflare Support: https://support.cloudflare.com
- Supabase Support: https://supabase.com/support
- GitHub Issues: Create issue in repository
