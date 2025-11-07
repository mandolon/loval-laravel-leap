# Lovable Prompt: Fix Workspace Loading Issue

## Problem
Workspaces are not loading in the application. Users cannot see or access their workspaces after pulling the latest code.

## Root Cause
Row Level Security (RLS) was enabled on the `workspaces` and `workspace_members` tables without proper policies, causing all queries to return empty results. The application architecture uses UI-based access control instead of database-level RLS.

## Solution Required

### 1. Create a Database Migration
Create a new migration file in `supabase/migrations/` that:
- Disables RLS on all tables (matching the working state from commit `20251031234845`)
- Drops any existing RLS policies that might be blocking queries

### 2. Tables to Fix
The migration should disable RLS on these critical tables:
- `workspaces`
- `workspace_members`
- `users`
- `projects`
- `tasks`
- `files`
- `folders`
- And all other application tables

### 3. Migration File Format
- Use timestamp format: `YYYYMMDDHHMMSS_description.sql`
- Include comments explaining this restores the working state
- Use `DISABLE ROW LEVEL SECURITY` for each table
- Use `DROP POLICY IF EXISTS` to clean up any existing policies

### 4. Reference
The working state matches migration `20251031234845_cd59acb1-74a1-4ab2-8eef-a2f4dcd153e3.sql` which disabled RLS on all tables.

## Expected Outcome
After applying this migration:
- Workspaces should load correctly
- Users can see their workspace memberships
- All database queries work without RLS blocking access
- The app functions as it did in the working version (commit `44b5b40`)

## Testing
After the migration is applied:
1. Clear browser cache/localStorage
2. Log out and log back in
3. Verify workspaces appear in the UI
4. Check browser console for any errors

## Important Notes
- Do NOT create new RLS policies - the app uses application-level access control
- Do NOT enable RLS on any tables - this breaks the current architecture
- The migration should be idempotent (safe to run multiple times)

