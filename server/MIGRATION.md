# Migrating from db.json to Supabase

## 1. Create the table in Supabase

1. Open your Supabase project → **SQL Editor**.
2. Copy the contents of `server/supabase_schema.sql` and run it.
3. Verify the `quizzes` table exists in **Table Editor**.

## 2. Migrate existing data

From the `server` folder run:

```bash
node scripts/migrate-to-supabase.js
```

This reads `server/data/db.json` and upserts every quiz into the `quizzes` table.

## 3. Verify

- Restart the server: `npm start`
- Visit the admin dashboard — your existing quizzes should appear.
- Edit a quiz title, save, refresh: change persists across deploys.

## 4. Why this matters

`server/data/db.json` is now in `.gitignore`. Render's filesystem is recreated on every deploy, so previously each push wiped your live data. With Supabase, the data lives in Postgres and is persistent.
