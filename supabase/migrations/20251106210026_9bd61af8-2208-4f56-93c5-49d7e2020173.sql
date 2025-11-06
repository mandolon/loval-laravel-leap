-- Phase 1a: Add 'admin' to app_role enum
-- This must be in a separate transaction before it can be used

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';