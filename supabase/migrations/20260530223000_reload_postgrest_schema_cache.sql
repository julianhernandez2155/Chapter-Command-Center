-- Force Supabase PostgREST to refresh newly added Attendance RPCs after deploy.
notify pgrst, 'reload schema';
