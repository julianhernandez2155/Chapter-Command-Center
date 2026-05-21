-- Chapter Command Center — RLS Hardening Policies Patch
-- Execute this SQL patch to secure the database schema against privilege escalation.

-- ====================================================================
-- 1. HARDEN: public.members table
-- Ensure members cannot modify their own status or auth_user_id.
-- ====================================================================
DROP POLICY IF EXISTS members_update_admin_or_self_limited ON public.members;

CREATE POLICY members_update_admin ON public.members 
  FOR UPDATE 
  TO authenticated
  USING (public.has_position(array['president', 'secretary']))
  WITH CHECK (public.has_position(array['president', 'secretary']));

CREATE POLICY members_update_self_limited ON public.members 
  FOR UPDATE 
  TO authenticated
  USING (id = public.current_member_id())
  WITH CHECK (
    id = public.current_member_id() 
    AND status = status -- Prevent self-updating status
    AND auth_user_id = auth_user_id -- Prevent self-updating auth_user_id
    AND google_email = google_email -- Prevent self-updating google_email
  );

-- Standard SQL trigger to enforce column protection on self-update:
CREATE OR REPLACE FUNCTION public.check_member_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.id = public.current_member_id() AND NOT public.has_position(array['president', 'secretary'])) THEN
    -- Block modifications of administrative fields by non-admins
    IF (NEW.status IS DISTINCT FROM OLD.status OR 
        NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id OR
        NEW.google_email IS DISTINCT FROM OLD.google_email OR
        NEW.suid IS DISTINCT FROM OLD.suid) THEN
      RAISE EXCEPTION 'Access Denied: You cannot modify admin-only member fields (status, auth_user_id, google_email, SUID).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_member_self_update ON public.members;
CREATE TRIGGER tr_check_member_self_update
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_member_self_update();


-- ====================================================================
-- 2. HARDEN: public.event_attendees table
-- Disallow members from directly inserting attendance records.
-- Members must check in via a secure RPC that validates token/expiry.
-- ====================================================================
DROP POLICY IF EXISTS attendees_insert ON public.event_attendees;

-- Officers can insert manually or via CSV:
CREATE POLICY attendees_insert_officers ON public.event_attendees 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_officer());

-- Members cannot INSERT directly. They must use the check-in RPC function.


-- ====================================================================
-- 3. HARDEN: public.import_review_rows table
-- Restrict import review selection to verified officers only.
-- ====================================================================
DROP POLICY IF EXISTS import_review_rows_select_officers ON public.import_review_rows;

CREATE POLICY import_review_rows_select_officers ON public.import_review_rows
  FOR SELECT
  TO authenticated
  USING (public.is_officer());


-- ====================================================================
-- 4. HARDEN: public.chairman_reports table
-- Split single broad policy into separate SELECT, INSERT, UPDATE, and DELETE policies.
-- Enforce a draft-lock rule: once submitted, reports cannot be updated by the assignee.
-- ====================================================================
DROP POLICY IF EXISTS chairman_reports_policy ON public.chairman_reports;

-- SELECT: Assignees can read their own; officers/advisors can read all
CREATE POLICY chairman_reports_select ON public.chairman_reports
  FOR SELECT
  TO authenticated
  USING (submitted_by = public.current_member_id() OR public.is_officer());

-- INSERT: Assignees can insert their own reports
CREATE POLICY chairman_reports_insert ON public.chairman_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = public.current_member_id());

-- UPDATE: Assignee can update only if it is in 'draft' status. Officers can update any.
CREATE POLICY chairman_reports_update ON public.chairman_reports
  FOR UPDATE
  TO authenticated
  USING (
    (submitted_by = public.current_member_id() AND status = 'draft') 
    OR public.is_officer()
  )
  WITH CHECK (
    (submitted_by = public.current_member_id() AND status IN ('draft', 'submitted'))
    OR public.is_officer()
  );

-- DELETE: Only Secretary or President can delete reports
CREATE POLICY chairman_reports_delete ON public.chairman_reports
  FOR DELETE
  TO authenticated
  USING (public.has_position(array['president', 'secretary']));
