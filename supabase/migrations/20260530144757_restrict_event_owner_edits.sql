-- Restrict event writes so broad event-capable roles can create events,
-- but only creators can update/archive their own events. President and
-- Secretary retain cross-event edit authority.

create or replace function public.can_create_events()
returns boolean
language sql
stable
as $$
  select public.is_officer()
    or exists (
      select 1
      from unnest(public.user_positions()) as position_slug(slug)
      where position_slug.slug like '%\_chairman' escape '\'
        or position_slug.slug like '%\_chair' escape '\'
        or position_slug.slug like '%\_captain' escape '\'
    )
$$;

create or replace function public.can_administer_events()
returns boolean
language sql
stable
as $$
  select public.has_position(array['president', 'secretary'])
$$;

create or replace function public.can_update_event(event_creator uuid)
returns boolean
language sql
stable
as $$
  select public.can_administer_events()
    or (
      event_creator = public.current_member_id()
      and public.can_create_events()
    )
$$;

-- Preserve the existing function name for any callers, but narrow its meaning
-- to event creation capability. Row ownership is enforced by the policies below.
create or replace function public.can_manage_events()
returns boolean
language sql
stable
as $$
  select public.can_create_events()
$$;

drop policy if exists events_write_officers on public.events;
drop policy if exists events_insert_creators on public.events;
drop policy if exists events_update_owner_or_admin on public.events;
drop policy if exists events_delete_admin on public.events;

create policy events_insert_creators
  on public.events
  for insert
  to authenticated
  with check (
    public.can_create_events()
    and created_by = public.current_member_id()
  );

create policy events_update_owner_or_admin
  on public.events
  for update
  to authenticated
  using (public.can_update_event(created_by))
  with check (
    public.can_administer_events()
    or (
      created_by = public.current_member_id()
      and public.can_create_events()
    )
  );

create policy events_delete_admin
  on public.events
  for delete
  to authenticated
  using (public.can_administer_events());
