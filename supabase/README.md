# Supabase

`migrations/20261125120000_initial_archive_schema.sql` defines the initial PostgreSQL schema for folders, archive furniture, locations, movement history, and archive reports. It enables Row Level Security and grants access only to authenticated users who own each row.

## Apply the migration

1. Sign in to the Supabase Dashboard and create a project.
2. Open **SQL Editor**, create a query, paste the migration, and run it.
3. Configure Supabase Auth before connecting the app. Each row is scoped to the signed-in user's `auth.uid()`.

This migration creates an empty Supabase schema. The running app still uses its Express/SQLite API; applying this SQL does not copy local data or switch the app to Supabase.

For browser or APK builds, use only the project URL and publishable key. Never put a Supabase secret/service-role key in frontend or mobile code. Keep RLS enabled and test the policies before exposing data.