# Meg Field

Mobile-friendly daily planner for Orthofix territory — replaces the Google Sheet.

- **Home base:** 8100 S Congress Ave, Austin, TX
- **No login** — private URL only (don’t share the Netlify link)
- **Backend:** Supabase (Postgres)

## Local dev

```bash
cd C:\Users\Christian\Projects\meg-field
npm install
cp .env.example .env.local
# Fill in Supabase URL + service role key
npm run dev
```

Open http://localhost:3000

## Supabase setup (one time)

1. Create a free project at [supabase.com](https://supabase.com)
2. **SQL Editor** → paste and run `supabase/schema.sql`
3. **Project Settings → API** → copy URL and **service_role** key (not anon) into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The service role key stays server-only (Netlify env vars). Never commit `.env.local`.

## Deploy to Netlify

Meg Field is **Next.js** with server routes (visit logging). It must be **built** on Netlify.

**Drag-and-drop does not work** for this project. Netlify only uploads files as-is (static hosting). There is no build step, no `npm run build`, and you will not see proper build settings until the site is connected to Git or you use the CLI.

### Option A — GitHub + Netlify (easiest long-term)

1. Push the project to GitHub:
   ```powershell
   cd C:\Users\Christian\Projects\meg-field
   git init
   git add .
   git commit -m "Initial Meg Field app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/meg-field.git
   git push -u origin main
   ```
2. Netlify → **Add new site → Import an existing project** → GitHub → select `meg-field`.
3. Netlify reads `netlify.toml` (build + Next.js plugin). You will then have **Build settings** under Site configuration.
4. **Environment variables:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy → bookmark URL → **Add to Home Screen** on Meg’s phone.

### Option B — Netlify CLI (no GitHub)

```powershell
cd C:\Users\Christian\Projects\meg-field
npm install
npx netlify-cli login
npx netlify-cli init
```

Follow prompts (create new site). Then set secrets and deploy with a remote build:

```powershell
npx netlify-cli env:set NEXT_PUBLIC_SUPABASE_URL "https://bythqmajzcssmfrvlgfl.supabase.co"
npx netlify-cli env:set SUPABASE_SERVICE_ROLE_KEY "your-key-here"
npx netlify-cli deploy --build --prod
```

`--build` uploads your source and runs `npm run build` on Netlify (same as Git deploy).

### If you already used drag-and-drop

Delete that site or stop using manual deploys for this app. Create a new site via **Option A** or **Option B** above.

Optional: **Access control → Password** on the Netlify site for privacy without an in-app login.

## Import from Google Sheet

### Prospecting (doctors)

**Import** tab in the app, or:

```powershell
python scripts/import_real_csv.py path\to\Prospecting.csv
```

### Sales & Goals

Run migrations in Supabase SQL Editor (in order), including:

- `supabase/migrations/2026-05-29_sales_goals_pipeline.sql`
- `supabase/migrations/2026-05-30_sales_goals_sheet_model.sql`

Export CSVs from **Meg AI Dash**:

```powershell
# Paid 3PP rows only (wholesale skipped for now)
python scripts/import_sales_csv.py path\to\Sales.csv

# AS + PS monthly goals
python scripts/import_goals_csv.py path\to\Goals.csv 2026
```

In the app: **Sales** tab → set AS/PS goals, move orders through pipeline, enter **My Sales $** per order when marking paid, or use **+ Add paid sale**.

Commission logic: monthly **Q** from that month’s tier; **R** true-up on Mar/Jun/Sep (quarter) and Dec (year). My Sales $ can be **0** for comp/giveaway units.

## App screens

| Route | Purpose |
|-------|---------|
| `/` | **Today** — zone-aware plan, lunches, suggested visits |
| `/doctors` | All doctors, sorted by days since visit |
| `/lunches` | Upcoming / past lunches |
| `/sales` | Goals, commission, order pipeline, paid sales |
| `/search` | Search doctors and lunches |
