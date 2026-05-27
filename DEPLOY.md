# Deploy checklist (Netlify)

If the build says **"cannot find app or pages directory"**, GitHub is missing `src/app`.

## 1. Verify locally

```powershell
cd C:\Users\Christian\Projects\meg-field
git ls-files src/app
```

You should see `src/app/page.tsx`, `src/app/layout.tsx`, etc.

## 2. Verify on GitHub

Open your repo in the browser. You **must** see a folder:

```text
src/app/page.tsx
```

If you only see `package.json` and `README.md` (no `src`), Netlify will always fail.

## 3. Push the full project

```powershell
cd C:\Users\Christian\Projects\meg-field
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

(Use `git remote set-url origin ...` if `origin` already exists.)

If GitHub has an old incomplete commit:

```powershell
git push -u origin main --force
```

Only if you are sure nothing important is on GitHub already.

## 4. Netlify settings

| Setting | Value |
|---------|--------|
| Base directory | **empty** (unless repo is a parent folder → then `meg-field`) |
| Build command | `npm run build` |
| Publish directory | **empty** or `.next` |

## 5. Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Then: **Deploys → Trigger deploy → Clear cache and deploy**
