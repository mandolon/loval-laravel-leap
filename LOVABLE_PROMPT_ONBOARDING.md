# Lovable Prompt: Implement Team Onboarding Wizard

## Overview
Apply database migrations and wire up the new onboarding wizard for TEAM users. The UI has been updated to match the design specifications with a 3-step flow.

---

## Step 1: Apply Database Migrations

Run these TWO migrations in order:

### Migration 1: Add onboarding tracking
**File:** `supabase/migrations/20251107234000_add_onboarding_tracking.sql`

```sql
-- Add onboarding tracking to user_preferences table
-- Only TEAM users will go through onboarding flow

-- Add onboarding_completed column
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarding 
ON public.user_preferences(onboarding_completed) 
WHERE onboarding_completed = FALSE;

-- Backfill existing users to skip onboarding (they're already using the app)
UPDATE public.user_preferences 
SET onboarding_completed = TRUE 
WHERE onboarding_completed IS NULL;

-- Set default for future inserts
ALTER TABLE public.user_preferences 
ALTER COLUMN onboarding_completed SET DEFAULT FALSE;

COMMENT ON COLUMN public.user_preferences.onboarding_completed IS 'Whether user has completed the onboarding flow (TEAM users only)';
```

### Migration 2: Add title field to users
**Create new migration:**

```sql
-- Add title field to users table for job title (Architect, Designer, etc.)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN public.users.title IS 'User job title (e.g., Architect, Designer, Project Manager)';
```

---

## Step 2: Update Supabase Types

After migrations are applied, regenerate TypeScript types to include:
- `user_preferences.onboarding_completed` (boolean)
- `users.title` (string)

Update `src/integrations/supabase/types.ts` to reflect these changes.

---

## Step 3: Verify File Changes

The following files have been updated and should be working:

1. ✅ **`src/pages/OnboardingPage.tsx`**
   - New 3-step wizard UI matching auth page design
   - Step 1: Join workspace invitation
   - Step 2: Personalize (avatar color + job title)
   - Step 3: Completion confirmation

2. ✅ **`src/routers/TeamRouter.tsx`**
   - Checks `onboarding_completed` status
   - Shows OnboardingPage if not completed
   - Shows TeamApp if completed

3. ✅ **`src/contexts/UserContext.tsx`**
   - Added `title` field to UserProfile interface

4. ✅ **`src/constants/avatarColors.ts`**
   - Centralized avatar colors (11 colors)
   - Used across onboarding, profile pages

---

## How It Works

### For New TEAM Users:
1. User signs up → `handle_new_user` trigger creates user record
2. `user_preferences` created with `onboarding_completed = FALSE`
3. User logs in → TeamRouter checks onboarding status
4. Shows OnboardingPage with 3 steps:
   - **Step 1:** Welcome/invitation screen (join workspace)
   - **Step 2:** Personalize profile (choose avatar color + enter job title)
   - **Step 3:** Confirmation screen → Navigate to dashboard
5. After completion, `onboarding_completed` set to `TRUE`
6. User never sees onboarding again

### For Existing Users:
- Migration sets `onboarding_completed = TRUE` for all existing users
- They skip onboarding entirely and go directly to dashboard

### For Admin/Consultant/Client Roles:
- Different routers (AdminRouter, ConsultantRouter, ClientRouter)
- No onboarding check - they never see it

---

## Testing Checklist

After applying migrations:

### Test New TEAM User:
- [ ] Create new team user account via sign-up
- [ ] Verify onboarding Step 1 appears (join invitation)
- [ ] Click "Join PinerWorks" → proceeds to Step 2
- [ ] Enter job title (e.g., "Architect")
- [ ] Select avatar color from 11 options
- [ ] Click "Continue" → saves to database
- [ ] Step 3 confirmation appears
- [ ] Click "Go to dashboard" → navigates to team workspace
- [ ] Log out and log back in → should skip onboarding (go directly to dashboard)

### Test Existing TEAM User:
- [ ] Existing team users log in
- [ ] Should skip onboarding completely
- [ ] Go directly to team dashboard

### Test Other Roles:
- [ ] Admin users never see onboarding
- [ ] Consultant users never see onboarding
- [ ] Client users never see onboarding

### Verify Database:
- [ ] `user_preferences.onboarding_completed` column exists
- [ ] `users.title` column exists
- [ ] New users have `onboarding_completed = FALSE`
- [ ] Existing users have `onboarding_completed = TRUE`
- [ ] Avatar colors save correctly to `users.avatar_url`
- [ ] Job titles save correctly to `users.title`

---

## UI Design Notes

The onboarding wizard matches the auth page design:
- **Background:** Airy radial gradient (concentrated at top, fading to white)
- **Typography:** Slate color palette for text
- **Buttons:** 
  - Primary: `#00639b` (teal blue) with `#005480` hover
  - Secondary: `#202020` (dark) with `#111` hover
- **Inputs:** Slate borders with focus ring (`#9ecafc`)
- **Avatar Colors:** 11 solid colors (not gradients)
- **Layout:** Centered, responsive, clean spacing

---

## Important Notes

- ✅ **Only affects TEAM role users** - other roles bypass onboarding
- ✅ **Database-backed** - persists across sessions and devices
- ✅ **Non-breaking** - existing users automatically marked as completed
- ✅ **Graceful degradation** - works even if migration fails (warns in console)
- ✅ **Type-safe** - Full TypeScript support with updated types

---

## Rollback (if needed)

To disable onboarding for testing:
```sql
UPDATE user_preferences SET onboarding_completed = TRUE;
```

To reset a specific user's onboarding:
```sql
UPDATE user_preferences 
SET onboarding_completed = FALSE 
WHERE user_id = 'USER_ID_HERE';
```

---

## Summary

Please apply both migrations in order, regenerate types, and verify the onboarding flow works for new TEAM users while existing users skip it entirely.
