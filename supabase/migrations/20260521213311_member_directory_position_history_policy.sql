-- Allow authenticated members to read directory-safe position history.
-- This exposes position title and tenure metadata only through existing table
-- grants/RLS, so current and past positions can appear in member profile drawers.

drop policy if exists member_positions_select_directory on public.member_positions;
create policy member_positions_select_directory
  on public.member_positions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.members m
      where m.id = member_positions.member_id
        and m.status in ('active', 'new_member', 'alumni')
    )
    or member_id = public.current_member_id()
    or public.has_position(array['president', 'secretary'])
  );

notify pgrst, 'reload schema';
