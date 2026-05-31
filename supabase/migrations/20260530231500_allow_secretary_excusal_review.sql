-- Sprint 4 excusals: Secretary reviews normal excusal requests before weekly attendance close.
drop policy if exists excusals_review on public.excusals;

create policy excusals_review
  on public.excusals
  for update
  to authenticated
  using (public.has_position(array['president','secretary','saa']))
  with check (public.has_position(array['president','secretary','saa']));

notify pgrst, 'reload schema';
