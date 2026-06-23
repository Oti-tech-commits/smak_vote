# Deployment CLI steps

Follow these commands locally to create the GitHub repo, provision Supabase, set secrets, and trigger a Cloudflare Pages deployment.

1) Create GitHub repository and push

```bash
# from repository root
git init
gh repo create YOUR_GITHUB_USERNAME/smak-vote --public --source=. --remote=origin --push
```

2) Create Supabase project (web UI recommended) or use CLI

```bash
# login
supabase login
# create project via web UI OR
supabase projects create --name smak-vote --org YOUR_ORG_ID
# link local folder to project
supabase link --project-ref YOUR_PROJECT_REF
# run migrations and seed
npm run supabase:migrate
npm run supabase:seed
```

3) Create Cloudflare Pages project (CLI or dashboard)

Using Cloudflare Dashboard (recommended):
- Pages → Create project → Connect GitHub → select `smak-vote` → build command `npm run build` → output `.next`

Using Wrangler (optional):

```bash
# install wrangler
npm install -g wrangler
# login
wrangler login
# create a Pages project (replace ACCOUNT_ID)
wrangler pages project create smak-vote --account-id YOUR_ACCOUNT_ID --production-branch main
```

4) Set secrets (GitHub and Cloudflare)

In GitHub repo settings → Secrets → Actions, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PROJECT_NAME`

In Cloudflare Pages (project settings) add the same environment variables for production.

5) Push to trigger CI/CD

```bash
git add .
git commit -m "chore: prepare CI/CD for Cloudflare Pages and Supabase"
git push origin main
```

After push, check GitHub Actions and Cloudflare Pages dashboard for deployment status.
