# NEXOVERSE'26 LOGO HUNT – FIXED STARTER

## What was fixed
- Missing organiser routes: Participants, Live Game and Scoreboard.
- Dashboard/Questions no longer crash during module import when Supabase variables are absent.
- Clear Supabase configuration error message.
- Participant page no longer asks for the game code; it uses `DEFAULT_GAME_CODE` (default `NEXO26`).
- Round creation UI added.
- Start Game automatically selects the first question.
- Current buzzer attempt is handled correctly after reopening.
- Organiser can judge answers Correct/Wrong and scores are updated.

## IMPORTANT: Supabase is required
This project cannot store participants/questions/live game state without a Supabase project.

1. Create a Supabase project.
2. Open SQL Editor and run the complete `supabase/schema.sql` file.
3. Copy `.env.example` to `.env.local`.
4. In Supabase Project Settings > API, copy the Project URL and keys.
5. Fill `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ORGANISER_EMAIL=organiser@nexoverse26.in
ORGANISER_PASSWORD=aamec@nexoverse26
SESSION_SECRET=use-a-long-random-secret
DEFAULT_GAME_CODE=NEXO26
```

6. Stop the server with Ctrl+C and run `npm run dev` again.
7. Login as organiser and add rounds/questions.

Never share or publish the service role key.
