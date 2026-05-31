import { supabase } from './supabase';

export interface ServiceReportSummary {
  member_count: number;
  approved_service_hours: number;
  community_floor_met: number;
  community_floor_missing: number;
  external_hours_approved: number;
  missed_external_commitments: number;
  reportable_events: number;
}

export interface ServiceReportTerm {
  name: string;
  starts_on: string;
  ends_on: string;
}

export interface ServiceReportMemberRow {
  member_id: string;
  suid: string;
  display_name: string;
  as_of_date: string;
  semester: string;
  service_hours_total: number;
  community_service_events_attended: number;
  community_service_floor_met: boolean;
  hosted_philanthropy_events_attended: number;
  external_philanthropy_hours_approved: number;
  missed_external_commitments: number;
}

export interface ServiceReportEventRow {
  event_id: string;
  name: string;
  event_type: 'community_service' | 'philanthropy';
  event_date: string;
  starts_at: string;
  location: string | null;
  capacity: number | null;
  signed_up_count: number;
  checked_in_count: number;
  open_spots: number | null;
  hours_per_attendee: number;
  expected_brothers: number;
  brothers_checked_in: number;
  guests_checked_in: number;
  service_hours_earned: number;
  missing_brothers: number;
  external_pending_reports: number;
  external_approved_hours: number;
  external_missed_commitments: number;
  archived: boolean;
}

export interface ServiceTermRollup {
  semester: string;
  chapter_run_hours: number;
  external_hours: number;
  approved_service_hours: number;
  community_service_events: number;
  hosted_philanthropy_events: number;
}

export interface ServiceReportExport {
  as_of_date: string;
  term: ServiceReportTerm;
  summary: ServiceReportSummary;
  members: ServiceReportMemberRow[];
  events: ServiceReportEventRow[];
  term_rollups: ServiceTermRollup[];
}

export interface ServiceAuditTrailEntry {
  action: string;
  reason: string | null;
  actor_member_id: string | null;
  created_at: string;
  before?: unknown;
  after?: unknown;
}

export interface ServiceAuditRow {
  row_id: string;
  member_id: string;
  member_name: string;
  suid: string;
  event_id: string | null;
  event_name: string;
  event_type: string;
  event_date: string;
  source: 'chapter_run_event' | 'external_philanthropy_self_report';
  status: string;
  hours: number;
  requested_hours: number | null;
  occurred_at: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  notes: string | null;
  reviewer_note: string | null;
  audit_trail: ServiceAuditTrailEntry[];
}

export const fetchServiceReportExport = async (): Promise<ServiceReportExport> => {
  const { data, error } = await supabase.rpc('service_philanthropy_report_export');
  if (error) throw error;
  return data as ServiceReportExport;
};

export const fetchServiceAuditHistory = async (memberId?: string): Promise<ServiceAuditRow[]> => {
  const { data, error } = await supabase.rpc('service_member_service_hour_audit', {
    target_member_id: memberId ?? null
  });
  if (error) throw error;
  return (data ?? []) as ServiceAuditRow[];
};

export type CsvValue = string | number | boolean | null | undefined;

export const toCsv = (rows: Array<Record<string, CsvValue>>, columns: string[]) => {
  const escapeCell = (value: CsvValue) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    columns.map(column => escapeCell(String(column))).join(','),
    ...rows.map(row => columns.map(column => escapeCell(row[column])).join(','))
  ].join('\n');
};

export const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
