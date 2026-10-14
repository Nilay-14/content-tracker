# Content Tracker

A private, phone-first app for tracking daily social media posts across brands.
The full spec is in [CLAUDE.md](CLAUDE.md) and the build order is in [BUILD_PROMPTS.md](BUILD_PROMPTS.md).

Live: https://content-tracker-five-plum.vercel.app (auto-deploys from `main`; runs in Vercel's Mumbai region, `bom1`).

## Run it locally

1. Copy `.env.local.example` to `.env.local` and fill in the Supabase values.
2. `npm install`
3. `npm run dev`, then open http://localhost:3000 (or the "Network" address on your phone, same Wi-Fi).

## Checks before calling a step done

```bash
npm run lint
npx tsc --noEmit
npm run build
```
