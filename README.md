# SwasthyaTrack AI - Industrial Track A Healthcare Monitoring Agent

React/Next.js implementation for Track A. It focuses on medication adherence, fitness tracking, wellness goals, reliable health lookup, safe AI guidance, role-based access, Google auth, password recovery, and privacy-first health records.

## Features

- Professional React dashboard with patient, doctor, and caregiver roles
- Supabase auth with email login, Google OAuth, forgot password, and reset password
- Supabase schema with row-level security policies
- Medication schedule and adherence logging
- Fitness and wellness trend charts
- MedlinePlus health topic search
- OpenFDA drug label lookup
- Optional Weatherstack outdoor wellness checks
- Optional Groq or Gemini AI assistant
- Markdown health report export

## Safety Scope

This project is for educational tracking only. It does not diagnose, prescribe, or replace professional medical advice. Use consented test accounts and avoid sensitive real patient data unless privacy controls are fully reviewed.

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Add your API keys to `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
WEATHERSTACK_API_KEY=...
GROQ_API_KEY=...
```

Supabase is required. The app no longer includes mock/demo health records.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Enable Email auth.
4. Enable Google provider in Authentication > Providers.
5. Add redirect URLs:
   - `http://localhost:3000`
   - `http://localhost:3001`
   - your deployed production URL
6. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`.
7. In Supabase, enable Realtime replication for:
   - `medications`
   - `medication_logs`
   - `fitness_metrics`
   - `health_goals`

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## Data Persistence

- Supabase-authenticated users read and write:
  - `medications`
  - `medication_logs`
  - `fitness_metrics`
  - `health_goals`
- New Supabase users get a `profiles` row automatically through the SQL trigger in `supabase/schema.sql`.
- Keep row-level security enabled before using real patient data.
- Realtime dashboard updates use Supabase Realtime subscriptions for patient records.

## Suggested Presentation Flow

1. Create or sign in to a real Supabase account.
2. Add two medications with different schedules.
2. Log one taken dose and one missed dose.
3. Add three fitness entries and show the dashboard chart.
4. Create a wellness goal and update progress.
5. Search a health topic through MedlinePlus.
6. Ask the AI assistant a medication-adherence question.
7. Export the health report.

## Deployment

Deploy the Next.js app on Vercel. Add the same environment variables in Vercel Project Settings.

## Track A Mapping

- 2+ health tools: medication tracker, fitness tracker, medical lookup
- Patient database: Supabase schema with RLS
- UI: React/Next.js dashboard
- Basic analytics: adherence rate, fitness charts, goal progress
- Medical safety: disclaimers, reliable sources, cautious assistant prompt
- Export: health report download

## API Recommendation

Use these for Track A:

- Required: Supabase, MedlinePlus, OpenFDA
- Useful: Weatherstack for outdoor wellness context, Groq or Gemini for safe assistant responses
- Optional later: Android Health Connect or Fitbit for real wearable sync

You do not need ExchangeRate API for this healthcare project.

Do not start a new Google Fit integration: Google has deprecated the Fit APIs in 2026 and recommends Health Connect as the migration path.

See [docs/API_REQUIREMENTS.md](docs/API_REQUIREMENTS.md) for the complete API table.
