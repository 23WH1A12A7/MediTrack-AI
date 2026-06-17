# API Requirements

## Required For The Final Industrial Build

| API / Service | Why It Is Needed | Key Names |
| --- | --- | --- |
| Supabase Auth + Database | Role-based login, Google OAuth, password reset, patient records, row-level security | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| MedlinePlus Web Service | Reliable health topic lookup with citations | No key required |
| OpenFDA Drug Label API | Medication label and warning lookup | No key required |
| Groq or Gemini | Safe AI assistant responses for adherence and wellness questions | `GROQ_API_KEY` or `GEMINI_API_KEY` |

## Recommended Add-Ons

| API / Service | Use Case | Key Names |
| --- | --- | --- |
| Weatherstack | Outdoor wellness alerts for heat and UV risk | `WEATHERSTACK_API_KEY` |
| Resend | Caregiver email alerts, missed dose summaries, weekly reports | `RESEND_API_KEY` |
| Android Health Connect | Future wearable/phone health sync for steps, calories, sleep | Depends on Android app configuration |
| Fitbit Web API | Future wearable sync if the team wants a public web-based fitness integration | Fitbit OAuth client credentials |

## Not Recommended For This Project

| API | Reason |
| --- | --- |
| ExchangeRate API | Not relevant to healthcare monitoring requirements |
| SerpAPI | Avoid general web search for medical advice. Use reliable sources like MedlinePlus, OpenFDA, PubMed, or official health sites. |
| New Google Fit API integration | Google Fit APIs are deprecated in 2026. Use Health Connect for new health-data work. |

## Minimum API Set

For a strong Track A submission, use:

1. Supabase
2. MedlinePlus
3. OpenFDA
4. Groq or Gemini

Weatherstack is useful but optional.

## Realtime Requirement

The app uses Supabase Realtime for live patient dashboard updates. After running the schema, enable realtime replication for:

- `medications`
- `medication_logs`
- `fitness_metrics`
- `health_goals`

Without Supabase configuration, the app will show the login/configuration screen and will not use mock health records.
