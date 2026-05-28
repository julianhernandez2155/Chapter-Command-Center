import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpDown,
  AtSign,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  CheckSquare,
  Clock,
  Columns3,
  Copy,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Filter,
  Flag,
  GraduationCap,
  HeartPulse,
  House,
  IdCard,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Pencil,
  Save,
  Search,
  School,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Square,
  TableProperties,
  Trash2,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import {
  SecretaryMemberProfile,
  createSecretaryChaseBatch,
  fetchSecretaryMemberProfiles,
  markSecretaryProfileChased,
  markSecretaryProfileVerified,
  updateSecretaryMemberProfile,
  upsertGuardianContact
} from '../lib/memberSecretaryRegistry';
import {
  VerificationCycle,
  VerificationReviewDecision,
  VerificationSubmission,
  closeVerificationCycle,
  fetchActiveVerificationCycle,
  fetchVerificationSubmissions,
  launchVerificationCycle,
  reviewVerificationSubmission
} from '../lib/memberVerification';
import {
  GraduationCandidate,
  GraduationCycle,
  fetchActiveGraduationCycle,
  fetchGraduationCandidates
} from '../lib/memberGraduation';

type ColumnGroup = 'Identity' | 'Contact' | 'Academic' | 'Housing' | 'Social' | 'Hygiene' | 'Family';
type Density = 'compact' | 'standard' | 'comfortable';
type SortDirection = 'asc' | 'desc';
type WorkflowKey = 'verification' | 'chase' | 'graduation';
type ExportPresetId = 'contact_sheet' | 'parent_consent' | 'missing_info' | 'study_abroad' | 'greek_life_fasa';
type VerificationFilter = 'all' | 'verified' | 'unverified' | 'stale_30';
type MissingFilter = 'all' | 'missing' | 'complete';
type RosterFilter = 'all' | 'active' | 'missing' | 'status_watchlist';
type ReviewFieldInputType = 'text' | 'email' | 'tel' | 'number' | 'checkbox';
type ReviewEditableMemberField = keyof Pick<SecretaryMemberProfile,
  | 'preferred_name'
  | 'personal_email'
  | 'phone'
  | 'graduation_year'
  | 'expected_graduation_term'
  | 'school'
  | 'major'
  | 'housing_type'
  | 'local_address'
  | 'campus_housing'
  | 'home_city'
  | 'home_state'
  | 'instagram'
  | 'snapchat'
  | 'linkedin'
  | 'tshirt_size'
  | 'hoodie_size'
  | 'parent_outreach_consent'
>;
type ReviewEditableTarget =
  | { table: 'members'; field: ReviewEditableMemberField }
  | { table: 'guardian'; order: 1 | 2; field: 'contact_name' | 'relationship' | 'phone' | 'email' };

interface VerificationReviewField {
  key: string;
  label: string;
  group: string;
  submittedValue: string | boolean | number | null;
  currentValue: string | boolean | number | null;
  changed: boolean;
  flagged: boolean;
  missing: boolean;
  required: boolean;
  inputType: ReviewFieldInputType;
  editable?: ReviewEditableTarget;
}

type ColumnKey =
  | 'name'
  | 'status'
  | 'suid'
  | 'active_positions'
  | 'phone'
  | 'google_email'
  | 'personal_email'
  | 'tshirt_size'
  | 'hoodie_size'
  | 'expected_graduation_term'
  | 'graduation_year'
  | 'study_abroad'
  | 'pledge_class'
  | 'initiation_date'
  | 'school'
  | 'major'
  | 'housing_type'
  | 'local_address'
  | 'campus_housing'
  | 'home'
  | 'instagram'
  | 'snapchat'
  | 'linkedin'
  | 'missing_count'
  | 'missing_fields'
  | 'last_verified_at'
  | 'last_chased_at'
  | 'guardian_1'
  | 'guardian_2'
  | 'emergency_contact'
  | 'parent_outreach_consent';

interface RegistryColumn {
  key: ColumnKey;
  label: string;
  group: ColumnGroup;
  minWidth: number;
  sensitivity?: 'family_contact';
  sortable?: boolean;
  exportable?: boolean;
  render: (member: SecretaryMemberProfile) => React.ReactNode;
  exportValue: (member: SecretaryMemberProfile) => string | number;
  sortValue?: (member: SecretaryMemberProfile) => string | number | null;
}

interface RegistryFilters {
  roster: RosterFilter;
  status: string;
  pledgeClass: string;
  school: string;
  gradTerm: string;
  missing: MissingFilter;
  verification: VerificationFilter;
}

interface RegistrySort {
  column: ColumnKey;
  direction: SortDirection;
}

interface RegistrySavedView {
  id: string;
  label: string;
  description: string;
  columns: ColumnKey[];
  filters: RegistryFilters;
  sort: RegistrySort;
  density: Density;
  system?: boolean;
  sensitive?: boolean;
}

interface VerificationCycleStats {
  completeCount: number;
  openCount: number;
  notStartedCount: number;
  inProgressCount: number;
  needsReviewCount: number;
  optionalFlagCount: number;
}

interface ChaseComposer {
  recipientLine: string;
  subject: string;
  body: string;
}

const CUSTOM_VIEWS_STORAGE_KEY = 'chapter-command-center-secretary-registry-views-v1';

const DEFAULT_FILTERS: RegistryFilters = {
  roster: 'all',
  status: 'all',
  pledgeClass: 'all',
  school: 'all',
  gradTerm: 'all',
  missing: 'all',
  verification: 'all'
};

const SYSTEM_VIEWS: RegistrySavedView[] = [
  {
    id: 'active',
    label: 'Active Roster',
    description: 'Working roster with chapter and academic context.',
    columns: ['name', 'status', 'active_positions', 'expected_graduation_term', 'pledge_class', 'school', 'major', 'phone', 'missing_count'],
    filters: { ...DEFAULT_FILTERS, roster: 'active' },
    sort: { column: 'name', direction: 'asc' },
    density: 'standard',
    system: true
  },
  {
    id: 'contact',
    label: 'Contact Sheet',
    description: 'Fast lookup and contact exports.',
    columns: ['name', 'phone', 'google_email', 'personal_email', 'instagram', 'snapchat', 'linkedin', 'status', 'active_positions'],
    filters: { ...DEFAULT_FILTERS },
    sort: { column: 'name', direction: 'asc' },
    density: 'compact',
    system: true
  },
  {
    id: 'missing',
    label: 'Missing Data',
    description: 'Follow-up list for incomplete member records.',
    columns: ['name', 'missing_count', 'missing_fields', 'phone', 'personal_email', 'pledge_class', 'last_chased_at', 'last_verified_at'],
    filters: { ...DEFAULT_FILTERS, roster: 'missing', missing: 'missing' },
    sort: { column: 'missing_count', direction: 'desc' },
    density: 'standard',
    system: true
  },
  {
    id: 'family',
    label: 'Parent / Emergency',
    description: 'Sensitive family and emergency contact readiness.',
    columns: ['name', 'phone', 'guardian_1', 'guardian_2', 'emergency_contact', 'parent_outreach_consent'],
    filters: { ...DEFAULT_FILTERS },
    sort: { column: 'name', direction: 'asc' },
    density: 'comfortable',
    system: true,
    sensitive: true
  },
  {
    id: 'status_watchlist',
    label: 'Status Watchlist',
    description: 'Members outside the standard active/new/alumni pattern.',
    columns: ['name', 'status', 'expected_graduation_term', 'pledge_class', 'school', 'phone', 'last_verified_at', 'missing_count'],
    filters: { ...DEFAULT_FILTERS, roster: 'status_watchlist' },
    sort: { column: 'status', direction: 'asc' },
    density: 'standard',
    system: true
  },
  {
    id: 'study_abroad',
    label: 'Study Abroad',
    description: 'Members with current study abroad context.',
    columns: ['name', 'study_abroad', 'phone', 'google_email', 'personal_email', 'school', 'major', 'expected_graduation_term'],
    filters: { ...DEFAULT_FILTERS },
    sort: { column: 'name', direction: 'asc' },
    density: 'standard',
    system: true
  }
];

const INITIAL_VIEW = SYSTEM_VIEWS[0];

const WORKFLOWS: Array<{ id: WorkflowKey; label: string; icon: React.ReactNode }> = [
  { id: 'verification', label: 'Verification Queue', icon: <CheckCircle2 size={18} /> },
  { id: 'chase', label: 'Missing Info Chase', icon: <ClipboardCheck size={18} /> },
  { id: 'graduation', label: 'Graduation Review', icon: <GraduationCap size={18} /> }
];

const EXPORT_PRESETS: Array<{
  id: ExportPresetId;
  label: string;
  description: string;
  columns: ColumnKey[];
  sensitive?: boolean;
}> = [
  {
    id: 'contact_sheet',
    label: 'Chapter Contact Sheet',
    description: 'Names, phones, emails, socials, roles.',
    columns: ['name', 'status', 'active_positions', 'phone', 'google_email', 'personal_email', 'instagram', 'snapchat', 'linkedin']
  },
  {
    id: 'parent_consent',
    label: 'Parent Outreach Consent List',
    description: 'Consent plus guardian contact readiness.',
    columns: ['name', 'phone', 'personal_email', 'parent_outreach_consent', 'guardian_1', 'guardian_2', 'emergency_contact'],
    sensitive: true
  },
  {
    id: 'missing_info',
    label: 'Missing-Info List',
    description: 'Follow-up roster for incomplete profiles.',
    columns: ['name', 'missing_count', 'missing_fields', 'phone', 'personal_email', 'last_chased_at', 'last_verified_at']
  },
  {
    id: 'study_abroad',
    label: 'Study Abroad List',
    description: 'Current abroad status and academic context.',
    columns: ['name', 'study_abroad', 'phone', 'google_email', 'personal_email', 'school', 'major', 'expected_graduation_term']
  },
  {
    id: 'greek_life_fasa',
    label: 'Greek Life FASA Workbook',
    description: 'Three-tab roster format matching the SU workbook.',
    columns: ['name']
  }
];

export const SecretaryMemberRegistry = () => {
  const { member: currentMember } = useAuth();
  const [members, setMembers] = useState<SecretaryMemberProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<SecretaryMemberProfile | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [customViews, setCustomViews] = useState<RegistrySavedView[]>(loadCustomViews);
  const [activeViewId, setActiveViewId] = useState(INITIAL_VIEW.id);
  const [activeBaseViewLabel, setActiveBaseViewLabel] = useState(INITIAL_VIEW.label);
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(INITIAL_VIEW.columns);
  const [filters, setFilters] = useState<RegistryFilters>(INITIAL_VIEW.filters);
  const [sort, setSort] = useState<RegistrySort>(INITIAL_VIEW.sort);
  const [density, setDensity] = useState<Density>(INITIAL_VIEW.density);
  const [search, setSearch] = useState('');
  const [columnPanelOpen, setColumnPanelOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [workflowPanelOpen, setWorkflowPanelOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [viewNameDraft, setViewNameDraft] = useState('');
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowKey>('verification');
  const [copiedComposerField, setCopiedComposerField] = useState<string | null>(null);
  const [lastChaseBatchId, setLastChaseBatchId] = useState<string | null>(null);
  const [activeVerificationCycle, setActiveVerificationCycle] = useState<VerificationCycle | null>(null);
  const [verificationSubmissions, setVerificationSubmissions] = useState<VerificationSubmission[]>([]);
  const [activeGraduationCycle, setActiveGraduationCycle] = useState<GraduationCycle | null>(null);
  const [graduationCandidates, setGraduationCandidates] = useState<GraduationCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allViews = useMemo(() => [...SYSTEM_VIEWS, ...customViews], [customViews]);
  const activeView = useMemo(
    () => allViews.find(view => view.id === activeViewId) ?? {
      ...INITIAL_VIEW,
      id: 'custom-unsaved',
      label: `${activeBaseViewLabel} Custom`,
      description: 'Unsaved custom view based on the current controls.',
      columns: selectedColumns,
      filters,
      sort,
      density
    },
    [activeBaseViewLabel, activeViewId, allViews, density, filters, selectedColumns, sort]
  );

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchSecretaryMemberProfiles();
      setMembers(data);
      setSelectedMember(current => {
        if (current) return data.find(member => member.id === current.id) ?? null;
        return null;
      });
    } catch (err) {
      console.error('Error loading Secretary Registry:', err);
      setError('Unable to load the Secretary Registry.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVerificationCycle = useCallback(async () => {
    try {
      const cycle = await fetchActiveVerificationCycle();
      setActiveVerificationCycle(cycle);

      if (cycle) {
        setVerificationSubmissions(await fetchVerificationSubmissions(cycle.id));
      } else {
        setVerificationSubmissions([]);
      }
    } catch (err) {
      console.error('Error loading verification cycle:', err);
      setError(err instanceof Error ? err.message : 'Unable to load verification cycle.');
    }
  }, []);

  const loadGraduationCycle = useCallback(async () => {
    try {
      const cycle = await fetchActiveGraduationCycle();
      setActiveGraduationCycle(cycle);
      setGraduationCandidates(cycle ? await fetchGraduationCandidates(cycle.id) : []);
    } catch (err) {
      console.error('Error loading graduation cycle:', err);
      setError(err instanceof Error ? err.message : 'Unable to load graduation workflow.');
    }
  }, []);

  useEffect(() => {
    void loadMembers();
    void loadVerificationCycle();
    void loadGraduationCycle();
  }, [loadGraduationCycle, loadMembers, loadVerificationCycle]);

  useEffect(() => {
    persistCustomViews(customViews);
  }, [customViews]);

  const activeColumns = useMemo(
    () => sanitizeColumns(selectedColumns).map(key => COLUMN_BY_KEY[key]),
    [selectedColumns]
  );

  const options = useMemo(() => ({
    statuses: uniqueOptions(members.map(member => member.status)),
    pledgeClasses: uniqueOptions(members.map(member => member.pledge_class)),
    schools: uniqueOptions(members.map(member => member.school)),
    gradTerms: uniqueOptions(members.map(member => member.expected_graduation_term ?? String(member.graduation_year ?? '')))
  }), [members]);

  const visibleMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members
      .filter(member => matchesFilters(member, filters))
      .filter(member => {
        if (!query) return true;

        return [
          getDisplayName(member),
          getLegalName(member),
          member.suid,
          member.phone,
          member.google_email,
          member.personal_email,
          member.school,
          member.major,
          member.pledge_class,
          member.status,
          member.expected_graduation_term,
          ...member.missing_required_fields
        ]
          .filter(Boolean)
          .some(value => value!.toLowerCase().includes(query));
      })
      .sort((a, b) => compareMembers(a, b, sort));
  }, [filters, members, search, sort]);

  useEffect(() => {
    setSelectedIds(current => {
      const visibleIds = new Set(visibleMembers.map(member => member.id));
      return new Set([...current].filter(id => visibleIds.has(id)));
    });
  }, [visibleMembers]);

  const selectedRows = useMemo(
    () => visibleMembers.filter(member => selectedIds.has(member.id)),
    [selectedIds, visibleMembers]
  );

  const verificationDueMembers = useMemo(
    () => members.filter(member => isStaleVerification(member.last_verified_at)),
    [members]
  );
  const activeMembers = useMemo(
    () => members.filter(member => member.status === 'active'),
    [members]
  );
  const missingInfoMembers = useMemo(
    () => members.filter(member => member.missing_required_field_count > 0),
    [members]
  );
  const graduationReviewMembers = useMemo(
    () => members.filter(isGraduationReviewCandidate),
    [members]
  );
  const chaseRows = useMemo(
    () => selectedRows.length > 0 ? selectedRows : visibleMembers.filter(member => member.missing_required_field_count > 0),
    [selectedRows, visibleMembers]
  );
  const chaseComposer = useMemo(
    () => buildMissingInfoChaseComposer(chaseRows),
    [chaseRows]
  );

  const missingCount = members.filter(member => member.missing_required_field_count > 0).length;
  const verifiedCount = members.filter(member => member.last_verified_at).length;
  const sensitiveView = activeView.sensitive || activeColumns.some(column => column.sensitivity === 'family_contact');

  const closeFloatingPanels = () => {
    setViewMenuOpen(false);
    setFilterPanelOpen(false);
    setColumnPanelOpen(false);
    setWorkflowPanelOpen(false);
    setExportMenuOpen(false);
  };

  const toggleViewMenu = () => {
    setFilterPanelOpen(false);
    setColumnPanelOpen(false);
    setWorkflowPanelOpen(false);
    setExportMenuOpen(false);
    setViewMenuOpen(current => !current);
  };

  const toggleFilterPanel = () => {
    setViewMenuOpen(false);
    setColumnPanelOpen(false);
    setWorkflowPanelOpen(false);
    setExportMenuOpen(false);
    setFilterPanelOpen(current => !current);
  };

  const toggleColumnPanel = () => {
    setViewMenuOpen(false);
    setFilterPanelOpen(false);
    setWorkflowPanelOpen(false);
    setExportMenuOpen(false);
    setColumnPanelOpen(current => !current);
  };

  const toggleWorkflowPanel = () => {
    setViewMenuOpen(false);
    setFilterPanelOpen(false);
    setColumnPanelOpen(false);
    setExportMenuOpen(false);
    setWorkflowPanelOpen(current => !current);
  };

  const toggleExportMenu = () => {
    setViewMenuOpen(false);
    setFilterPanelOpen(false);
    setColumnPanelOpen(false);
    setWorkflowPanelOpen(false);
    setExportMenuOpen(current => !current);
  };

  const selectView = (view: RegistrySavedView) => {
    setActiveViewId(view.id);
    setActiveBaseViewLabel(view.label);
    setSelectedColumns(sanitizeColumns(view.columns));
    setFilters(view.filters);
    setSort(view.sort);
    setDensity(view.density);
    setSelectedIds(new Set());
    setColumnPanelOpen(false);
    setFilterPanelOpen(false);
    setViewMenuOpen(false);
    setWorkflowPanelOpen(false);
    setExportMenuOpen(false);
  };

  const updateFilter = <K extends keyof RegistryFilters>(key: K, value: RegistryFilters[K]) => {
    setFilters(current => ({ ...current, [key]: value }));
    setActiveViewId('custom-unsaved');
  };

  const toggleColumn = (columnKey: ColumnKey) => {
    if (columnKey === 'name') return;

    setSelectedColumns(current => {
      const next = current.includes(columnKey)
        ? current.filter(key => key !== columnKey)
        : [...current, columnKey];
      return sanitizeColumns(next);
    });
    setActiveViewId('custom-unsaved');
  };

  const saveCustomView = () => {
    const label = viewNameDraft.trim() || `${activeView.label} Copy`;
    const view: RegistrySavedView = {
      id: `custom-${Date.now()}`,
      label,
      description: 'Personal saved view stored on this device.',
      columns: sanitizeColumns(selectedColumns),
      filters,
      sort,
      density,
      sensitive: sensitiveView
    };

    setCustomViews(current => [...current, view]);
    setActiveViewId(view.id);
    setActiveBaseViewLabel(view.label);
    setViewNameDraft('');
    setColumnPanelOpen(false);
    setWorkflowPanelOpen(false);
    setExportMenuOpen(false);
  };

  const deleteCustomView = (viewId: string) => {
    setCustomViews(current => current.filter(view => view.id !== viewId));
    if (activeViewId === viewId) {
      selectView(INITIAL_VIEW);
    }
  };

  const setSortColumn = (column: RegistryColumn) => {
    if (!column.sortable) return;
    setSort(current => ({
      column: column.key,
      direction: current.column === column.key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
    setActiveViewId('custom-unsaved');
  };

  const markVerified = async (member: SecretaryMemberProfile) => {
    setSavingId(member.id);
    try {
      await markSecretaryProfileVerified(member.id);
      await loadMembers();
    } catch (err) {
      console.error('Unable to mark registry profile verified:', err);
      setError(err instanceof Error ? err.message : 'Unable to mark verified.');
    } finally {
      setSavingId(null);
    }
  };

  const launchSemesterVerification = async (termLabel: string, dueDate: string) => {
    if (!currentMember) {
      setError('Unable to launch verification without an active Secretary profile.');
      return;
    }

    setSavingId('verification-cycle');
    try {
      await launchVerificationCycle({
        termLabel,
        dueAt: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
        launchedBy: currentMember.id,
        activeMemberIds: activeMembers.map(member => member.id)
      });
      await loadVerificationCycle();
    } catch (err) {
      console.error('Unable to launch semester verification:', err);
      setError(err instanceof Error ? err.message : 'Unable to launch semester verification.');
    } finally {
      setSavingId(null);
    }
  };

  const closeSemesterVerification = async () => {
    if (!currentMember || !activeVerificationCycle) return;

    setSavingId('verification-cycle');
    try {
      await closeVerificationCycle(activeVerificationCycle.id, currentMember.id);
      await loadVerificationCycle();
    } catch (err) {
      console.error('Unable to close semester verification:', err);
      setError(err instanceof Error ? err.message : 'Unable to close semester verification.');
    } finally {
      setSavingId(null);
    }
  };

  const reviewSubmittedVerification = async ({
    submissionId,
    decision,
    note,
    fields,
    fieldNotes
  }: {
    submissionId: string;
    decision: VerificationReviewDecision;
    note?: string | null;
    fields?: string[];
    fieldNotes?: Record<string, string>;
  }) => {
    if (!currentMember) return;

    setSavingId(submissionId);
    try {
      await reviewVerificationSubmission({ submissionId, decision, note, fields, fieldNotes });
      await loadVerificationCycle();
      await loadMembers();
    } catch (err) {
      console.error('Unable to review verification submission:', err);
      setError(err instanceof Error ? err.message : 'Unable to review verification submission.');
    } finally {
      setSavingId(null);
    }
  };

  const saveVerificationReviewField = async (
    member: SecretaryMemberProfile,
    field: VerificationReviewField,
    rawValue: string | boolean
  ) => {
    if (!field.editable) return;

    setSavingId(`${member.id}-${field.key}`);
    try {
      if (field.editable.table === 'members') {
        await updateSecretaryMemberProfile(member.id, {
          [field.editable.field]: rawValue
        });
      } else {
        await upsertGuardianContact({
          member_id: member.id,
          contact_order: field.editable.order,
          contact_name: getGuardianContactName(member, field.editable.order, field.editable.field, rawValue),
          relationship: getGuardianFieldValue(member, field.editable.order, 'relationship', field.editable.field, rawValue),
          phone: getGuardianFieldValue(member, field.editable.order, 'phone', field.editable.field, rawValue),
          email: getGuardianFieldValue(member, field.editable.order, 'email', field.editable.field, rawValue)
        });
      }

      await loadMembers();
    } catch (err) {
      console.error('Unable to save review field edit:', err);
      setError(err instanceof Error ? err.message : 'Unable to save field edit.');
    } finally {
      setSavingId(null);
    }
  };

  const markChased = async (member: SecretaryMemberProfile) => {
    setSavingId(member.id);
    try {
      await markSecretaryProfileChased(member.id);
      await loadMembers();
    } catch (err) {
      console.error('Unable to mark registry profile chased:', err);
      setError(err instanceof Error ? err.message : 'Unable to mark chased.');
    } finally {
      setSavingId(null);
    }
  };

  const markSelectedChased = async () => {
    if (selectedRows.length === 0) return;
    setSavingId('bulk-chased');

    try {
      for (const member of selectedRows) {
        await markSecretaryProfileChased(member.id);
      }
      await loadMembers();
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Unable to mark selected registry profiles chased:', err);
      setError(err instanceof Error ? err.message : 'Unable to mark selected rows chased.');
    } finally {
      setSavingId(null);
    }
  };

  const copyComposerField = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedComposerField(label);
    window.setTimeout(() => setCopiedComposerField(null), 1800);
  };

  const trackChaseBatch = async () => {
    if (chaseRows.length === 0) return;
    setSavingId('chase-batch');
    setError(null);

    try {
      const batchId = await createSecretaryChaseBatch({
        batch_label: `Missing Info Chase - ${formatFileDate(new Date())}`,
        subject: chaseComposer.subject,
        body: chaseComposer.body,
        members: chaseRows.map(member => ({
          member_id: member.id,
          recipient_line: getRecipientLine(member),
          missing_fields: member.missing_required_fields
        }))
      });
      setLastChaseBatchId(batchId);
      await loadMembers();
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Unable to track chase batch:', err);
      setError(err instanceof Error ? err.message : 'Unable to track chase batch.');
    } finally {
      setSavingId(null);
    }
  };

  const exportVisibleRows = async () => {
    const rows = selectedRows.length > 0 ? selectedRows : visibleMembers;
    const exportColumns = activeColumns.filter(column => column.exportable !== false);

    if (sensitiveView) {
      const confirmed = window.confirm('This export includes parent/guardian or emergency contact data. Continue?');
      if (!confirmed) return;
    }

    setExporting(true);
    try {
      const workbook = buildExcelWorkbook({
        rows,
        columns: exportColumns,
        viewLabel: activeView.label,
        selectedOnly: selectedRows.length > 0,
        sensitive: sensitiveView
      });
      downloadWorkbook(`${slugify(activeView.label)}-${formatFileDate(new Date())}.xls`, workbook);
    } finally {
      setExporting(false);
    }
  };

  const exportPreset = async (presetId: ExportPresetId) => {
    const preset = EXPORT_PRESETS.find(item => item.id === presetId);
    if (!preset) return;

    const rows = selectedRows.length > 0 ? selectedRows : getPresetRows(presetId, visibleMembers, members);
    if (rows.length === 0) return;

    if (preset.sensitive) {
      const confirmed = window.confirm('This export includes parent/guardian or emergency contact data. Continue?');
      if (!confirmed) return;
    }

    setExporting(true);
    try {
      const workbook = presetId === 'greek_life_fasa'
        ? buildGreekLifeFasaWorkbook(rows)
        : buildExcelWorkbook({
          rows,
          columns: preset.columns.map(key => COLUMN_BY_KEY[key]).filter(Boolean),
          viewLabel: preset.label,
          selectedOnly: selectedRows.length > 0,
          sensitive: Boolean(preset.sensitive)
        });
      downloadWorkbook(`${slugify(preset.label)}-${formatFileDate(new Date())}.xls`, workbook);
    } finally {
      setExporting(false);
    }
  };

  const copyVisibleEmails = async () => {
    const rows = selectedRows.length > 0 ? selectedRows : visibleMembers;
    const emails = rows
      .flatMap(member => [member.google_email, member.personal_email])
      .filter(Boolean)
      .join(', ');

    await navigator.clipboard.writeText(emails);
  };

  return (
    <div className="max-w-[1540px] mx-auto pb-20">
      <section className="mb-8 flex flex-col gap-7">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 text-secondary mb-3">
              <ShieldCheck size={18} />
              <span className="text-[10px] uppercase tracking-[0.22rem] font-black">Secretary Registry</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-on-surface">
              Member Records
            </h1>
            <p className="mt-3 text-on-surface-variant font-medium">
              {members.length} records · {missingCount} missing data · {verifiedCount} verified · {visibleMembers.length} in view
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <button
              onClick={() => void copyVisibleEmails()}
              className="bg-surface-container-high text-on-surface px-5 py-3 rounded-full font-black uppercase tracking-[0.16rem] text-[11px] flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            >
              <Copy size={15} />
              {selectedRows.length > 0 ? `Copy ${selectedRows.length} Emails` : 'Copy Emails'}
            </button>
            <ExportDropdown
              open={exportMenuOpen}
              exporting={exporting}
              onToggle={toggleExportMenu}
              onExportCurrent={() => void exportVisibleRows()}
              onExportPreset={presetId => void exportPreset(presetId)}
            />
          </div>
        </div>

        <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex flex-col 2xl:flex-row gap-4 2xl:items-center 2xl:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <ViewDropdown
                activeView={activeView}
                systemViews={SYSTEM_VIEWS}
                customViews={customViews}
                open={viewMenuOpen}
                onToggle={toggleViewMenu}
                onSelect={selectView}
                onDelete={deleteCustomView}
              />

              <label className="bg-surface-container-lowest rounded-full px-5 py-3 flex items-center gap-3 text-on-surface-variant w-full sm:w-96 focus-within:ring-1 focus-within:ring-primary/40">
                <Search size={18} />
                <input
                  className="bg-transparent border-none focus:ring-0 p-0 text-sm w-full placeholder:text-on-surface-variant/40"
                  placeholder="Search name, SUID, phone, email, school..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={toggleFilterPanel}
                className={cn(
                  'rounded-full px-5 py-3 text-[11px] font-black uppercase tracking-[0.16rem] flex items-center justify-center gap-2 transition-colors',
                  filterPanelOpen ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                )}
              >
                <Filter size={15} />
                Filters
                {getActiveFilterCount(filters) > 0 && (
                  <span className="bg-primary text-white rounded-full px-2 py-0.5 text-[9px]">
                    {getActiveFilterCount(filters)}
                  </span>
                )}
              </button>
              <button
                onClick={toggleColumnPanel}
                className={cn(
                  'rounded-full px-5 py-3 text-[11px] font-black uppercase tracking-[0.16rem] flex items-center justify-center gap-2 transition-colors',
                  columnPanelOpen ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                )}
              >
                <Columns3 size={15} />
                Customize
              </button>
              <button
                onClick={toggleWorkflowPanel}
                className={cn(
                  'rounded-full px-5 py-3 text-[11px] font-black uppercase tracking-[0.16rem] flex items-center justify-center gap-2 transition-colors',
                  workflowPanelOpen ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                )}
              >
                <ClipboardCheck size={15} />
                Workflows
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant font-bold">
            <span className="text-secondary">{activeView.label}</span>
            <span>·</span>
            <span>{getActiveFilterCount(filters)} filters active</span>
            <span>·</span>
            <span>{formatLabel(density)}</span>
            <span>·</span>
            <span>{activeColumns.length} columns</span>
          </div>

          {sensitiveView && (
            <div className="bg-primary/10 rounded-xl px-4 py-3 flex items-center gap-3 text-primary">
              <AlertCircle size={16} />
              <p className="text-xs font-bold">
                Sensitive contact view. Exports include a warning sheet and require confirmation.
              </p>
            </div>
          )}
        </div>
      </section>

      <RightSideDrawer
        open={filterPanelOpen || columnPanelOpen || workflowPanelOpen}
        title={filterPanelOpen ? 'Filters' : columnPanelOpen ? 'Customize' : 'Workflows'}
        description={
          filterPanelOpen
            ? 'Narrow the registry without pushing the table down.'
            : columnPanelOpen
              ? 'Choose columns, density, and save a custom registry view.'
              : 'Run secretary workflows while keeping the roster readable.'
        }
        icon={filterPanelOpen ? <Filter size={18} /> : columnPanelOpen ? <Columns3 size={18} /> : <ClipboardCheck size={18} />}
        widthClass={workflowPanelOpen ? 'max-w-[1120px]' : 'max-w-[820px]'}
        onClose={() => {
          setFilterPanelOpen(false);
          setColumnPanelOpen(false);
          setWorkflowPanelOpen(false);
        }}
      >
        {filterPanelOpen && (
          <FilterPanel
            filters={filters}
            options={options}
            onChange={updateFilter}
            onClear={() => {
              setFilters({ ...DEFAULT_FILTERS });
              setSearch('');
              setActiveViewId('custom-unsaved');
            }}
          />
        )}

        {columnPanelOpen && (
          <ColumnPanel
            selectedColumns={selectedColumns}
            density={density}
            viewNameDraft={viewNameDraft}
            onToggleColumn={toggleColumn}
            onDensityChange={nextDensity => {
              setDensity(nextDensity);
              setActiveViewId('custom-unsaved');
            }}
            onViewNameChange={setViewNameDraft}
            onSaveView={saveCustomView}
          />
        )}

        {workflowPanelOpen && (
          <GuidedWorkflows
            activeWorkflow={activeWorkflow}
            verificationDueMembers={verificationDueMembers}
            activeMembers={activeMembers}
            activeVerificationCycle={activeVerificationCycle}
            verificationSubmissions={verificationSubmissions}
            missingInfoMembers={missingInfoMembers}
            graduationReviewMembers={graduationReviewMembers}
            activeGraduationCycle={activeGraduationCycle}
            graduationCandidates={graduationCandidates}
            chaseRows={chaseRows}
            composer={chaseComposer}
            copiedComposerField={copiedComposerField}
            lastChaseBatchId={lastChaseBatchId}
            saving={savingId === 'chase-batch'}
            cycleSaving={savingId === 'verification-cycle'}
            savingId={savingId}
            onWorkflowChange={setActiveWorkflow}
            onLaunchVerification={launchSemesterVerification}
            onCloseVerification={() => void closeSemesterVerification()}
            onReviewVerification={input => void reviewSubmittedVerification(input)}
            onSaveVerificationField={(member, field, value) => void saveVerificationReviewField(member, field, value)}
            onCopyComposerField={(label, value) => void copyComposerField(label, value)}
            onTrackChaseBatch={() => void trackChaseBatch()}
            onSelectView={selectView}
          />
        )}
      </RightSideDrawer>

      {loading && (
        <section className="bg-surface-container-low/50 rounded-xl p-10 flex items-center justify-center gap-3 text-on-surface-variant">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.2rem]">Loading Secretary Registry</span>
        </section>
      )}

      {error && (
        <section className="bg-error/10 rounded-xl p-6 mb-6 flex items-center gap-3 text-error">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </section>
      )}

      {!loading && (
        <section className={cn(
          'grid grid-cols-1 gap-6',
          selectedMember && 'xl:grid-cols-[minmax(0,1fr)_420px]'
        )}>
          <div className="overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest">
            {selectedRows.length > 0 && (
              <TableToolbar
                selectedCount={selectedRows.length}
                saving={savingId === 'bulk-chased'}
                onClear={() => setSelectedIds(new Set())}
                onMarkChased={() => void markSelectedChased()}
              />
            )}
            <RegistryTable
              columns={activeColumns}
              members={visibleMembers}
              selectedMember={selectedMember}
              selectedIds={selectedIds}
              allVisibleSelected={visibleMembers.length > 0 && selectedIds.size === visibleMembers.length}
              sort={sort}
              density={density}
              onSelect={member => {
                setSelectedMember(current => current?.id === member.id ? null : member);
              }}
              onToggleRow={memberId => {
                setSelectedIds(current => {
                  const next = new Set(current);
                  if (next.has(memberId)) next.delete(memberId);
                  else next.add(memberId);
                  return next;
                });
              }}
              onToggleAll={() => {
                setSelectedIds(current => current.size === visibleMembers.length
                  ? new Set()
                  : new Set(visibleMembers.map(member => member.id)));
              }}
              onSort={setSortColumn}
              onBeforeSelect={closeFloatingPanels}
            />
          </div>

          {selectedMember && (
            <RegistryDrawer
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
              onMarkVerified={member => void markVerified(member)}
              onMarkChased={member => void markChased(member)}
              saving={savingId === selectedMember.id}
            />
          )}
        </section>
      )}
    </div>
  );
};

const ExportDropdown = ({
  open,
  exporting,
  onToggle,
  onExportCurrent,
  onExportPreset
}: {
  open: boolean;
  exporting: boolean;
  onToggle: () => void;
  onExportCurrent: () => void;
  onExportPreset: (presetId: ExportPresetId) => void;
}) => {
  const runExport = (callback: () => void) => {
    onToggle();
    callback();
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        disabled={exporting}
        className="bg-primary text-white px-5 py-3 rounded-full font-black uppercase tracking-[0.16rem] text-[11px] flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 w-full sm:w-auto"
      >
        {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        Export
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-[90] w-80 bg-surface-container-lowest rounded-2xl p-3 shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
          <button
            onClick={() => runExport(onExportCurrent)}
            className="w-full rounded-xl px-3 py-3 text-left text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <p className="text-xs font-black uppercase tracking-[0.14rem] flex items-center gap-2">
              <Download size={14} className="text-primary" />
              Current View
            </p>
            <p className="text-[11px] text-on-surface-variant mt-1">Export the visible table columns.</p>
          </button>

          <div className="my-2 h-px bg-white/10" />

          {EXPORT_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => runExport(() => onExportPreset(preset.id))}
              className="w-full rounded-xl px-3 py-3 text-left text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <p className="text-xs font-black uppercase tracking-[0.14rem] flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-primary" />
                {preset.label}
              </p>
              <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-1">{preset.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ViewDropdown = ({
  activeView,
  systemViews,
  customViews,
  open,
  onToggle,
  onSelect,
  onDelete
}: {
  activeView: RegistrySavedView;
  systemViews: RegistrySavedView[];
  customViews: RegistrySavedView[];
  open: boolean;
  onToggle: () => void;
  onSelect: (view: RegistrySavedView) => void;
  onDelete: (viewId: string) => void;
}) => (
  <div className="relative">
    <button
      onClick={onToggle}
      title={activeView.description}
      className="bg-primary text-white rounded-full px-5 py-3 text-[11px] font-black uppercase tracking-[0.16rem] flex items-center justify-center gap-2 transition-colors min-w-56"
    >
      <TableProperties size={15} />
      {activeView.label}
      <ChevronDown size={15} className={cn('transition-transform', open && 'rotate-180')} />
    </button>

    {open && (
      <div className="absolute left-0 top-14 z-[80] w-80 bg-surface-container-lowest rounded-2xl p-3 shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
        <ViewGroup label="System Views">
          {systemViews.map(view => (
            <React.Fragment key={view.id}>
              <ViewMenuItem
                view={view}
                active={activeView.id === view.id}
                onSelect={() => onSelect(view)}
              />
            </React.Fragment>
          ))}
        </ViewGroup>

        <ViewGroup label="My Views">
          {customViews.length === 0 ? (
            <p className="px-3 py-2 text-xs text-on-surface-variant font-bold">No saved custom views yet.</p>
          ) : customViews.map(view => (
            <React.Fragment key={view.id}>
              <ViewMenuItem
                view={view}
                active={activeView.id === view.id}
                onSelect={() => onSelect(view)}
                onDelete={() => onDelete(view.id)}
              />
            </React.Fragment>
          ))}
        </ViewGroup>
      </div>
    )}
  </div>
);

const ViewGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="py-2">
    <h3 className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.2rem] text-on-surface-variant">
      {label}
    </h3>
    <div className="space-y-1">{children}</div>
  </section>
);

const ViewMenuItem = ({
  view,
  active,
  onSelect,
  onDelete
}: {
  view: RegistrySavedView;
  active: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) => (
  <div className={cn(
    'group/menu rounded-xl flex items-center gap-2',
    active ? 'bg-primary/15 text-primary' : 'text-on-surface hover:bg-surface-container-high'
  )}>
    <button
      onClick={onSelect}
      className="flex-1 text-left px-3 py-3"
    >
      <p className="text-xs font-black uppercase tracking-[0.14rem]">{view.label}</p>
      <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-1">{view.description}</p>
    </button>
    {onDelete && (
      <button
        onClick={onDelete}
        className="mr-2 p-2 rounded-full text-on-surface-variant hover:text-error opacity-0 group-hover/menu:opacity-100 transition-opacity"
        title="Delete saved view"
      >
        <Trash2 size={13} />
      </button>
    )}
  </div>
);

const RightSideDrawer = ({
  open,
  title,
  description,
  icon,
  widthClass = 'max-w-[760px]',
  onClose,
  children
}: {
  open: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  widthClass?: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute right-0 top-0 flex h-full w-full flex-col border-l border-outline-variant bg-surface-container-lowest shadow-[0_0_64px_rgba(0,0,0,0.45)]',
          widthClass
        )}
      >
        <header className="border-b border-outline-variant bg-surface-container-low px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                {icon}
              </span>
              <div>
                <h2 className="text-xl font-black tracking-tight text-on-surface">{title}</h2>
                <p className="mt-1 text-sm font-semibold leading-5 text-on-surface-variant">{description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-surface-container-high p-2 text-on-surface-variant transition-colors hover:text-on-surface"
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {children}
        </div>
      </aside>
    </div>
  );
};

const FilterPanel = ({
  filters,
  options,
  onChange,
  onClear
}: {
  filters: RegistryFilters;
  options: {
    statuses: string[];
    pledgeClasses: string[];
    schools: string[];
    gradTerms: string[];
  };
  onChange: <K extends keyof RegistryFilters>(key: K, value: RegistryFilters[K]) => void;
  onClear: () => void;
}) => {
  const activeFilters = getActiveFilterItems(filters);

  return (
  <div className="space-y-6">
    <section className="rounded-2xl bg-surface-container-low px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-secondary">Current Lens</p>
          <p className="mt-1 text-sm font-semibold text-on-surface-variant">
            {activeFilters.length === 0 ? 'Showing the full registry.' : `${activeFilters.length} active filter${activeFilters.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeFilters.length === 0 ? (
            <span className="rounded-full bg-surface-container-lowest px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12rem] text-on-surface-variant">
              No filters
            </span>
          ) : activeFilters.map(filter => (
            <span key={filter} className="rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12rem] text-primary">
              {filter}
            </span>
          ))}
        </div>
      </div>
    </section>

    <section>
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2rem] text-on-surface-variant">Roster Scope</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FilterSelect label="Roster" value={filters.roster} onChange={value => onChange('roster', value as RosterFilter)}>
          <option value="all">All roster records</option>
          <option value="active">Active and new members</option>
          <option value="missing">Missing data roster</option>
          <option value="status_watchlist">Status watchlist</option>
        </FilterSelect>
        <FilterSelect label="Status" value={filters.status} onChange={value => onChange('status', value)}>
          <option value="all">All statuses</option>
          {options.statuses.map(status => <option key={status} value={status}>{formatLabel(status)}</option>)}
        </FilterSelect>
      </div>
    </section>

    <section>
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2rem] text-on-surface-variant">Member Attributes</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FilterSelect label="Pledge class" value={filters.pledgeClass} onChange={value => onChange('pledgeClass', value)}>
          <option value="all">All pledge classes</option>
          {options.pledgeClasses.map(pledgeClass => <option key={pledgeClass} value={pledgeClass}>{pledgeClass}</option>)}
        </FilterSelect>
        <FilterSelect label="School" value={filters.school} onChange={value => onChange('school', value)}>
          <option value="all">All schools</option>
          {options.schools.map(school => <option key={school} value={school}>{school}</option>)}
        </FilterSelect>
        <FilterSelect label="Graduation term" value={filters.gradTerm} onChange={value => onChange('gradTerm', value)}>
          <option value="all">All grad terms</option>
          {options.gradTerms.map(term => <option key={term} value={term}>{term}</option>)}
        </FilterSelect>
      </div>
    </section>

    <section>
      <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2rem] text-on-surface-variant">Readiness</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FilterSelect label="Profile data" value={filters.missing} onChange={value => onChange('missing', value as MissingFilter)}>
          <option value="all">All records</option>
          <option value="missing">Missing only</option>
          <option value="complete">Complete only</option>
        </FilterSelect>
        <FilterSelect label="Verification" value={filters.verification} onChange={value => onChange('verification', value as VerificationFilter)}>
          <option value="all">Any verification</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
          <option value="stale_30">Stale 30d</option>
        </FilterSelect>
      </div>
    </section>

    <div className="flex justify-end">
      <button
        onClick={onClear}
        className="rounded-full bg-surface-container-high px-4 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant hover:text-on-surface"
      >
        Clear Filters
      </button>
    </div>
  </div>
  );
};

const FilterSelect = ({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) => (
  <label className="block rounded-2xl bg-surface-container-low px-4 py-3 text-on-surface-variant">
    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16rem]">
      <Filter size={13} className="text-primary" />
      {label}
    </span>
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="mt-2 w-full bg-surface-container-lowest rounded-xl border-none px-3 py-2 text-sm font-semibold text-on-surface focus:ring-1 focus:ring-primary/40"
    >
      {children}
    </select>
  </label>
);

const ColumnPanel = ({
  selectedColumns,
  density,
  viewNameDraft,
  onToggleColumn,
  onDensityChange,
  onViewNameChange,
  onSaveView
}: {
  selectedColumns: ColumnKey[];
  density: Density;
  viewNameDraft: string;
  onToggleColumn: (column: ColumnKey) => void;
  onDensityChange: (density: Density) => void;
  onViewNameChange: (value: string) => void;
  onSaveView: () => void;
}) => {
  const groupedColumns = COLUMN_GROUPS.map(group => ({
    group,
    columns: REGISTRY_COLUMNS.filter(column => column.group === group)
  }));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <section className="rounded-2xl bg-surface-container-low px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-secondary">Table Shape</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(['compact', 'standard', 'comfortable'] as Density[]).map(option => (
              <button
                key={option}
                onClick={() => onDensityChange(option)}
                className={cn(
                  'min-h-11 rounded-xl px-2 text-[10px] font-black uppercase tracking-[0.12rem] transition-colors',
                  density === option ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        {groupedColumns.map(({ group, columns }) => (
          <section key={group}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2rem] text-on-surface-variant">{group}</h3>
              <span className="text-[10px] font-black uppercase tracking-[0.12rem] text-on-surface-variant/70">
                {columns.filter(column => selectedColumns.includes(column.key)).length}/{columns.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {columns.map(column => {
                const checked = selectedColumns.includes(column.key);
                return (
                  <button
                    key={column.key}
                    onClick={() => onToggleColumn(column.key)}
                    disabled={column.key === 'name'}
                    className={cn(
                      'min-h-12 rounded-xl px-3 text-left text-sm font-bold transition-colors disabled:opacity-70',
                      checked
                        ? 'bg-secondary/15 text-secondary'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    )}
                  >
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          {checked ? <CheckSquare size={14} /> : <Square size={14} />}
                          <span className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            checked ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-lowest text-on-surface-variant'
                          )}>
                            {getColumnPickerIcon(column.key)}
                          </span>
                          <span className="truncate">{column.label}</span>
                        </span>
                        {column.key === 'name' && (
                        <span className="rounded-full bg-surface-container-lowest px-2 py-1 text-[9px] font-black uppercase tracking-[0.08rem] text-on-surface-variant">
                          Fixed
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <aside className="h-fit rounded-2xl bg-surface-container-low p-4 xl:sticky xl:top-5">
        <h3 className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2rem] text-on-surface-variant">
          <SlidersHorizontal size={14} />
          View Setup
        </h3>
        <div className="space-y-4">
          <div className="rounded-xl bg-surface-container-lowest px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">Visible Columns</p>
            <p className="mt-1 text-3xl font-black text-on-surface">{selectedColumns.length}</p>
            <p className="mt-1 text-xs font-bold text-on-surface-variant">{formatLabel(density)} density</p>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">Save Custom View</p>
            <input
              value={viewNameDraft}
              onChange={event => onViewNameChange(event.target.value)}
              placeholder="Example: Fall Rush Calls"
              className="w-full rounded-xl border-none bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={onSaveView}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-white"
          >
            <Save size={14} />
            Save View
          </button>
        </div>
      </aside>
    </div>
  );
};

const getColumnPickerIcon = (columnKey: ColumnKey) => {
  const size = 14;

  switch (columnKey) {
    case 'name':
      return <UserRound size={size} />;
    case 'status':
      return <ShieldCheck size={size} />;
    case 'suid':
      return <IdCard size={size} />;
    case 'active_positions':
      return <UsersRound size={size} />;
    case 'phone':
      return <Phone size={size} />;
    case 'google_email':
    case 'personal_email':
      return <Mail size={size} />;
    case 'tshirt_size':
    case 'hoodie_size':
      return <Shirt size={size} />;
    case 'expected_graduation_term':
    case 'graduation_year':
      return <GraduationCap size={size} />;
    case 'study_abroad':
      return <MapPin size={size} />;
    case 'pledge_class':
      return <Sparkles size={size} />;
    case 'initiation_date':
      return <CalendarDays size={size} />;
    case 'school':
      return <School size={size} />;
    case 'major':
      return <BookOpen size={size} />;
    case 'housing_type':
    case 'campus_housing':
      return <House size={size} />;
    case 'local_address':
    case 'home':
      return <MapPin size={size} />;
    case 'instagram':
      return <Instagram size={size} />;
    case 'snapchat':
      return <AtSign size={size} />;
    case 'linkedin':
      return <Linkedin size={size} />;
    case 'missing_count':
    case 'missing_fields':
      return <AlertCircle size={size} />;
    case 'last_verified_at':
      return <CheckCircle2 size={size} />;
    case 'last_chased_at':
      return <Clock size={size} />;
    case 'guardian_1':
    case 'guardian_2':
      return <UsersRound size={size} />;
    case 'emergency_contact':
      return <HeartPulse size={size} />;
    case 'parent_outreach_consent':
      return <ClipboardCheck size={size} />;
    default:
      return <Columns3 size={size} />;
  }
};

const TableToolbar = ({
  selectedCount,
  saving,
  onClear,
  onMarkChased
}: {
  selectedCount: number;
  saving: boolean;
  onClear: () => void;
  onMarkChased: () => void;
}) => (
  <div className="bg-surface-container-lowest px-5 py-2 flex flex-wrap items-center justify-between gap-3">
    <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">
      {selectedCount} selected
    </p>
    <div className="flex gap-2">
      <button
        onClick={onMarkChased}
        disabled={saving}
        className="bg-primary/10 text-primary rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14rem] flex items-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        Mark Chased
      </button>
      <button
        onClick={onClear}
        className="bg-surface-container-high text-on-surface-variant rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14rem]"
      >
        Clear
      </button>
    </div>
  </div>
);

const GuidedWorkflows = ({
  activeWorkflow,
  verificationDueMembers,
  activeMembers,
  activeVerificationCycle,
  verificationSubmissions,
  missingInfoMembers,
  graduationReviewMembers,
  activeGraduationCycle,
  graduationCandidates,
  chaseRows,
  composer,
  copiedComposerField,
  lastChaseBatchId,
  saving,
  cycleSaving,
  savingId,
  onWorkflowChange,
  onLaunchVerification,
  onCloseVerification,
  onReviewVerification,
  onSaveVerificationField,
  onCopyComposerField,
  onTrackChaseBatch,
  onSelectView
}: {
  activeWorkflow: WorkflowKey;
  verificationDueMembers: SecretaryMemberProfile[];
  activeMembers: SecretaryMemberProfile[];
  activeVerificationCycle: VerificationCycle | null;
  verificationSubmissions: VerificationSubmission[];
  missingInfoMembers: SecretaryMemberProfile[];
  graduationReviewMembers: SecretaryMemberProfile[];
  activeGraduationCycle: GraduationCycle | null;
  graduationCandidates: GraduationCandidate[];
  chaseRows: SecretaryMemberProfile[];
  composer: ChaseComposer;
  copiedComposerField: string | null;
  lastChaseBatchId: string | null;
  saving: boolean;
  cycleSaving: boolean;
  savingId: string | null;
  onWorkflowChange: (workflow: WorkflowKey) => void;
  onLaunchVerification: (termLabel: string, dueDate: string) => void;
  onCloseVerification: () => void;
  onReviewVerification: (input: {
    submissionId: string;
    decision: VerificationReviewDecision;
    note?: string | null;
    fields?: string[];
  }) => void;
  onSaveVerificationField: (
    member: SecretaryMemberProfile,
    field: VerificationReviewField,
    value: string | boolean
  ) => void;
  onCopyComposerField: (label: string, value: string) => void;
  onTrackChaseBatch: () => void;
  onSelectView: (view: RegistrySavedView) => void;
}) => {
  const cycleStats = getVerificationCycleStats(activeMembers, verificationSubmissions);
  const workflowStats = {
    verification: activeVerificationCycle ? cycleStats.openCount + cycleStats.needsReviewCount : verificationDueMembers.length,
    chase: missingInfoMembers.length,
    graduation: activeGraduationCycle
      ? graduationCandidates.filter(candidate => candidate.member_response || candidate.secretary_decision === 'promote').length
      : graduationReviewMembers.length
  };
  const workflowDescriptions: Record<WorkflowKey, string> = {
    verification: activeVerificationCycle ? 'Track progress and route review work.' : 'Launch the semester profile gate.',
    chase: 'Copy the missing-info email and track follow-up batches.',
    graduation: activeGraduationCycle ? 'Review responses and promote approved alumni.' : 'Start graduation confirmations.'
  };
  const graduationRespondedCount = graduationCandidates.filter(candidate => candidate.member_response).length;
  const graduationReadyCount = graduationCandidates.filter(candidate => candidate.secretary_decision === 'promote' && !candidate.promoted_at).length;
  const graduationPromotedCount = graduationCandidates.filter(candidate => candidate.promoted_at).length;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <nav className="space-y-2 xl:sticky xl:top-5 xl:self-start" aria-label="Registry workflows">
        {WORKFLOWS.map(workflow => {
          const active = activeWorkflow === workflow.id;

          return (
            <button
              key={workflow.id}
              onClick={() => onWorkflowChange(workflow.id)}
              className={cn(
                'w-full rounded-2xl px-4 py-4 text-left transition-colors',
                active ? 'bg-primary/15 text-primary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16rem]">
                    {workflow.icon}
                    {workflow.label}
                  </span>
                  <span className={cn('mt-2 block text-xs font-semibold leading-5', active ? 'text-primary/80' : 'text-on-surface-variant')}>
                    {workflowDescriptions[workflow.id]}
                  </span>
                </span>
                <span className={cn(
                  'rounded-full px-3 py-1 text-sm font-black',
                  active ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface'
                )}>
                  {workflowStats[workflow.id]}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="min-w-0">
        {activeWorkflow === 'verification' && (
          <VerificationCycleWorkflow
            activeMembers={activeMembers}
            staleMembers={verificationDueMembers}
            activeCycle={activeVerificationCycle}
            submissions={verificationSubmissions}
            stats={cycleStats}
            cycleSaving={cycleSaving}
            onLaunch={onLaunchVerification}
            onClose={onCloseVerification}
            onOpenMissingView={() => onSelectView(SYSTEM_VIEWS.find(view => view.id === 'missing') ?? INITIAL_VIEW)}
          />
        )}

        {activeWorkflow === 'chase' && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="rounded-2xl bg-surface-container-low p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Missing Info Chase</p>
                  <h3 className="mt-1 text-2xl font-black text-on-surface">{chaseRows.length} recipients</h3>
                  <p className="mt-1 text-sm font-semibold text-on-surface-variant">Uses selected rows first, then falls back to every visible record missing required data.</p>
                </div>
                <button
                  onClick={onTrackChaseBatch}
                  disabled={saving || chaseRows.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                  Mark Chased
                </button>
              </div>
              <ComposerField label="BCC recipients" copyLabel="Copy BCC" value={composer.recipientLine} copied={copiedComposerField === 'BCC'} onCopy={() => onCopyComposerField('BCC', composer.recipientLine)} />
              <ComposerField label="Subject" copyLabel="Copy Subject" value={composer.subject} copied={copiedComposerField === 'Subject'} onCopy={() => onCopyComposerField('Subject', composer.subject)} />
              <ComposerField label="Body" copyLabel="Copy Body" value={composer.body} copied={copiedComposerField === 'Body'} multiline copiedLabel="Copied body" onCopy={() => onCopyComposerField('Body', composer.body)} />
              {lastChaseBatchId && (
                <p className="mt-3 text-xs font-bold text-secondary">Batch tracked: {lastChaseBatchId.slice(0, 8)}</p>
              )}
            </section>
            <section className="rounded-2xl bg-surface-container-low p-5">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18rem] text-on-surface-variant">Highest Need</p>
              <WorkflowList rows={missingInfoMembers.slice(0, 8)} getMeta={member => member.missing_required_fields.slice(0, 4).map(formatLabel).join(', ')} />
            </section>
          </div>
        )}

        {activeWorkflow === 'graduation' && (
          <section className="rounded-2xl bg-surface-container-low p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18rem] text-primary">
                  <GraduationCap size={14} />
                  Graduation Workflow
                </p>
                <h3 className="mt-2 text-2xl font-black text-on-surface">
                  {activeGraduationCycle ? activeGraduationCycle.term_label : `${graduationReviewMembers.length} likely candidates`}
                </h3>
                <p className="mt-2 max-w-xl text-xs font-semibold leading-5 text-on-surface-variant">
                  {activeGraduationCycle
                    ? 'Review member responses, approve alumni moves, and promote approved graduates from the focused workflow.'
                    : 'Start member confirmations, review responses, then move approved graduates to alumni status.'}
                </p>
              </div>
              <Link
                to="/admin/members/graduation"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-white"
              >
                <GraduationCap size={14} />
                {activeGraduationCycle ? 'Review Responses' : 'Start Graduation Review'}
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {activeGraduationCycle ? (
                <>
                  <MetricPill label="Candidates" value={String(graduationCandidates.length)} />
                  <MetricPill label="Responded" value={String(graduationRespondedCount)} />
                  <MetricPill label="Approved" value={String(graduationReadyCount)} />
                </>
              ) : (
                <>
                  <MetricPill label="Detected" value={String(graduationReviewMembers.length)} />
                  <MetricPill label="Next step" value="Send" />
                  <MetricPill label="Final action" value="Promote" />
                </>
              )}
            </div>

            <div className="mt-5">
              {activeGraduationCycle ? (
                <p className="rounded-xl bg-surface-container-lowest px-4 py-3 text-sm font-bold text-on-surface-variant">
                  {graduationPromotedCount} promoted. {graduationCandidates.length - graduationRespondedCount} still waiting on member response.
                </p>
              ) : (
                <WorkflowList rows={graduationReviewMembers.slice(0, 6)} getMeta={member => [
                  member.expected_graduation_term ?? member.graduation_year ?? 'Grad term missing',
                  member.status,
                  member.current_status_label
                ].filter(Boolean).join(' · ')} />
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const VerificationCycleWorkflow = ({
  activeMembers,
  staleMembers,
  activeCycle,
  submissions,
  stats,
  cycleSaving,
  onLaunch,
  onClose,
  onOpenMissingView
}: {
  activeMembers: SecretaryMemberProfile[];
  staleMembers: SecretaryMemberProfile[];
  activeCycle: VerificationCycle | null;
  submissions: VerificationSubmission[];
  stats: VerificationCycleStats;
  cycleSaving: boolean;
  onLaunch: (termLabel: string, dueDate: string) => void;
  onClose: () => void;
  onOpenMissingView: () => void;
}) => {
  const [termLabel, setTermLabel] = useState(getDefaultTermLabel);
  const [dueDate, setDueDate] = useState(getDefaultDueDate);
  const submissionByMemberId = useMemo(
    () => new Map(submissions.map(submission => [submission.member_id, submission])),
    [submissions]
  );
  const cycleRows = useMemo(() => activeMembers
    .map(member => ({ member, submission: submissionByMemberId.get(member.id) }))
    .sort((a, b) => getDisplayName(a.member).localeCompare(getDisplayName(b.member))), [activeMembers, submissionByMemberId]);
  const submittedRows = cycleRows.filter((row): row is { member: SecretaryMemberProfile; submission: VerificationSubmission } => row.submission?.status === 'submitted');
  const needsChangesRows = cycleRows.filter((row): row is { member: SecretaryMemberProfile; submission: VerificationSubmission } => row.submission?.status === 'needs_changes');
  const stillGatedRows = cycleRows
    .filter(row => !row.submission || ['not_started', 'in_progress', 'needs_changes'].includes(row.submission.status))
    .slice(0, 8);
  const optionalFlagRows = submittedRows.filter(row => row.submission.optional_review_flags.length > 0);
  const completionPercent = activeMembers.length > 0
    ? Math.round((stats.completeCount / activeMembers.length) * 100)
    : 0;

  if (!activeCycle) {
    return (
      <section className="rounded-2xl bg-surface-container-low p-5">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Verification Cycle</p>
            <h3 className="mt-2 text-2xl font-black text-on-surface">No active semester gate</h3>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-on-surface-variant leading-6">
              Launching starts a hard in-app verification gate for Active members. Parent/emergency/consent are tracked as review signals, not completion blockers.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricPill label="Audience" value={`${activeMembers.length} active`} />
              <MetricPill label="Legacy stale" value={`${staleMembers.length} stale`} />
              <MetricPill label="Gate mode" value="Hard" />
            </div>
            {staleMembers.length > 0 && (
              <button
                onClick={onOpenMissingView}
                className="mt-6 bg-surface-container-low rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Open Missing View
              </button>
            )}
          </div>

          <div className="rounded-2xl bg-surface-container-lowest p-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">Term</span>
              <input
                value={termLabel}
                onChange={event => setTermLabel(event.target.value)}
                className="mt-2 w-full bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface font-bold outline-none focus:ring-1 focus:ring-primary/60"
              />
            </label>
            <label className="block mt-3">
              <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={event => setDueDate(event.target.value)}
                className="mt-2 w-full bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface font-bold outline-none focus:ring-1 focus:ring-primary/60"
              />
            </label>
            <button
              onClick={() => onLaunch(termLabel.trim(), dueDate)}
              disabled={cycleSaving || activeMembers.length === 0 || termLabel.trim().length === 0}
              className="mt-4 w-full rounded-full bg-primary text-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {cycleSaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Start Semester Verification
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-surface-container-low p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Active Verification Gate</p>
            <h3 className="mt-1 text-2xl font-black text-on-surface">{activeCycle.term_label}</h3>
            <p className="mt-2 text-sm font-semibold text-on-surface-variant">
              {activeCycle.due_at ? `Due ${formatDate(activeCycle.due_at)}` : 'No due date'} · Active members only · Hard gate
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/members/verification"
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-white hover:bg-primary/90"
            >
              <ShieldCheck size={14} />
              Review Submissions
            </Link>
            <button
              onClick={onClose}
              disabled={cycleSaving}
              className="flex items-center justify-center gap-2 rounded-full bg-surface-container-high px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface hover:bg-surface-container-lowest disabled:opacity-50"
            >
              {cycleSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Close Cycle
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-surface-container-lowest p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">Completion</p>
              <p className="mt-1 text-3xl font-black text-on-surface">{completionPercent}%</p>
            </div>
            <p className="pb-1 text-sm font-black text-on-surface-variant">{stats.completeCount}/{activeMembers.length} complete</p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container-low">
            <div
              className="h-full rounded-full bg-secondary"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <VerificationStatusTile label="Awaiting review" value={submittedRows.length} tone={submittedRows.length > 0 ? 'primary' : 'quiet'} />
        <VerificationStatusTile label="Needs changes" value={needsChangesRows.length} tone={needsChangesRows.length > 0 ? 'error' : 'quiet'} />
        <VerificationStatusTile label="Still gated" value={stats.openCount} tone={stats.openCount > 0 ? 'primary' : 'quiet'} />
        <VerificationStatusTile label="Optional flags" value={optionalFlagRows.length} tone={optionalFlagRows.length > 0 ? 'primary' : 'quiet'} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl bg-surface-container-low p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Secretary Actions</p>
              <h4 className="mt-1 text-xl font-black text-on-surface">What needs attention</h4>
            </div>
            <Link
              to="/admin/members/verification"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-white hover:bg-primary/90"
            >
              <ShieldCheck size={14} />
              Review Submissions
            </Link>
          </div>

          <div className="space-y-3">
            <VerificationActionRow
              icon={<ClipboardCheck size={16} />}
              title={`${submittedRows.length} submitted profile${submittedRows.length === 1 ? '' : 's'} ready`}
              detail={submittedRows.length > 0 ? 'Open the review desk to approve, request changes, or exempt.' : 'No submitted profiles are waiting on manual review.'}
              active={submittedRows.length > 0}
            />
            <VerificationActionRow
              icon={<AlertCircle size={16} />}
              title={`${needsChangesRows.length} member${needsChangesRows.length === 1 ? '' : 's'} need changes`}
              detail="These members have already been sent back for correction and remain blocked until they resubmit."
              active={needsChangesRows.length > 0}
              tone="error"
            />
            <VerificationActionRow
              icon={<MessageSquare size={16} />}
              title={`${stats.notStartedCount} not started, ${stats.inProgressCount} in progress`}
              detail="Use the list on the right for quick follow-up targeting."
              active={stats.notStartedCount + stats.inProgressCount > 0}
            />
            <VerificationActionRow
              icon={<Flag size={16} />}
              title={`${optionalFlagRows.length} optional review flag${optionalFlagRows.length === 1 ? '' : 's'}`}
              detail="Flags do not block completion, but they are the records most likely to need judgment."
              active={optionalFlagRows.length > 0}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-surface-container-low p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-on-surface-variant">Still Gated</p>
            <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-[10px] font-black text-on-surface-variant">
              {stats.openCount}
            </span>
          </div>
          {stillGatedRows.length === 0 ? (
            <p className="text-sm font-bold text-on-surface-variant">Every active member has submitted or been cleared.</p>
          ) : (
            <WorkflowList rows={stillGatedRows.map(row => row.member)} getMeta={member => {
              const submission = submissionByMemberId.get(member.id);
              return [
                formatVerificationSubmissionStatus(submission?.status ?? 'not_started'),
                submission?.last_seen_at ? `Last seen ${formatDateTime(submission.last_seen_at)}` : null
              ].filter(Boolean).join(' · ');
            }} />
          )}
          <button
            onClick={onOpenMissingView}
            className="mt-4 w-full rounded-full bg-surface-container-high px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface hover:bg-surface-container-lowest"
          >
            Open Missing View
          </button>
        </section>
      </div>
    </section>
  );
};

const VerificationStatusTile = ({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: 'quiet' | 'primary' | 'error';
}) => (
  <div className={cn(
    'rounded-2xl px-4 py-3',
    tone === 'quiet' && 'bg-surface-container-low text-on-surface',
    tone === 'primary' && 'bg-primary/10 text-primary',
    tone === 'error' && 'bg-error/10 text-error'
  )}>
    <p className="text-[10px] font-black uppercase tracking-[0.14rem] opacity-75">{label}</p>
    <p className="mt-1 text-2xl font-black">{value}</p>
  </div>
);

const VerificationActionRow = ({
  icon,
  title,
  detail,
  active,
  tone = 'primary'
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  active: boolean;
  tone?: 'primary' | 'error';
}) => (
  <div className={cn(
    'rounded-2xl px-4 py-3',
    active && tone === 'primary' && 'bg-primary/10',
    active && tone === 'error' && 'bg-error/10',
    !active && 'bg-surface-container-lowest'
  )}>
    <div className="flex gap-3">
      <span className={cn(
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        active && tone === 'primary' && 'bg-primary text-white',
        active && tone === 'error' && 'bg-error text-white',
        !active && 'bg-surface-container-low text-on-surface-variant'
      )}>
        {icon}
      </span>
      <div>
        <p className="text-sm font-black text-on-surface">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-on-surface-variant">{detail}</p>
      </div>
    </div>
  </div>
);

const VerificationReviewDetail = ({
  activeReview,
  fields,
  fieldNotes,
  reviewError,
  savingId,
  openRows,
  onFieldNoteChange,
  onApprove,
  onRequestChanges,
  onExempt,
  onSkip,
  onSaveField
}: {
  activeReview: { member: SecretaryMemberProfile; submission: VerificationSubmission } | null;
  fields: VerificationReviewField[];
  fieldNotes: Record<string, string>;
  reviewError: string | null;
  savingId: string | null;
  openRows: Array<{ member: SecretaryMemberProfile; submission: VerificationSubmission | undefined }>;
  onFieldNoteChange: (fieldKey: string, value: string) => void;
  onApprove: () => void;
  onRequestChanges: () => void;
  onExempt: () => void;
  onSkip: () => void;
  onSaveField: (member: SecretaryMemberProfile, field: VerificationReviewField, value: string | boolean) => void;
}) => {
  const noteCount = Object.values(fieldNotes).filter(note => note.trim().length > 0).length;
  const sections = groupReviewFieldsBySection(fields, fieldNotes);
  const missingCount = fields.filter(field => field.required && field.missing).length;
  const flagCount = activeReview?.submission.optional_review_flags.length ?? 0;

  return (
  <div className="space-y-4">
    <div className="bg-surface-container-low rounded-2xl p-4">
      {!activeReview ? (
        <div className="min-h-64 flex items-center justify-center text-center text-on-surface-variant">
          <div>
            <CheckCircle2 className="mx-auto mb-3 opacity-50" size={34} />
            <p className="text-sm font-black">No submitted records need review.</p>
            <p className="text-xs font-bold mt-1">Use Still Gated to see who has not submitted yet.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">Profile Inspection</p>
              <h4 className="mt-1 text-3xl font-black text-on-surface">{getDisplayName(activeReview.member)}</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                <InspectionChip tone={missingCount > 0 ? 'error' : 'quiet'} label={`${missingCount} missing`} />
                <InspectionChip tone={flagCount > 0 ? 'primary' : 'quiet'} label={`${flagCount} ${flagCount === 1 ? 'flag' : 'flags'}`} />
                <InspectionChip tone={noteCount > 0 ? 'error' : 'quiet'} label={`${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onApprove}
                disabled={savingId === activeReview.submission.id}
                className="rounded-full bg-secondary text-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingId === activeReview.submission.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Approve
              </button>
              <button
                type="button"
                onClick={onRequestChanges}
                disabled={savingId === activeReview.submission.id}
                className="rounded-full bg-primary text-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingId === activeReview.submission.id ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                Request{noteCount > 0 ? ` (${noteCount})` : ''}
              </button>
              <button
                type="button"
                onClick={onSkip}
                disabled={savingId === activeReview.submission.id}
                className="rounded-full bg-surface-container-lowest text-on-surface px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] hover:bg-surface-container-high disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </div>

          {activeReview.submission.correction_notes && (
            <div className="mt-4 bg-primary/10 rounded-xl px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-primary">Member Note</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">{activeReview.submission.correction_notes}</p>
            </div>
          )}

          <div className="mt-5 space-y-4">
            {sections.map(section => (
              <section key={section.group} className="overflow-hidden rounded-2xl bg-surface-container-lowest">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-secondary">{section.group}</p>
                    <p className="mt-1 text-xs font-bold text-on-surface-variant">
                      {section.completeCount}/{section.fields.length} filled
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {section.noteCount > 0 && <InspectionChip tone="error" label={`${section.noteCount} notes`} />}
                    {section.missingCount > 0 && <InspectionChip tone="primary" label={`${section.missingCount} missing`} />}
                  </div>
                </div>
                <div className="bg-surface-container-low/55 px-4 py-2 hidden lg:grid grid-cols-[180px_minmax(0,1fr)_90px_76px] gap-3 text-[9px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">
                  <span>Field</span>
                  <span>Value</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="space-y-1 px-2 pb-2">
                  {section.fields.map(field => (
                    <VerificationReviewFieldRow
                      key={field.key}
                      field={field}
                      note={fieldNotes[field.key] ?? ''}
                      saving={savingId === `${activeReview.member.id}-${field.key}`}
                      onNoteChange={value => onFieldNoteChange(field.key, value)}
                      onSave={value => onSaveField(activeReview.member, field, value)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
          {reviewError && <p className="mt-2 text-xs font-bold text-error">{reviewError}</p>}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onExempt}
              disabled={savingId === activeReview.submission.id}
              className="rounded-full bg-surface-container-lowest text-on-surface px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] disabled:opacity-50 hover:bg-surface-container-high"
            >
              Exempt
            </button>
          </div>
        </>
      )}
    </div>

    <div className="bg-surface-container-low rounded-xl p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-on-surface-variant mb-3">Still Gated</p>
      {openRows.length === 0 ? (
        <p className="text-sm font-bold text-on-surface-variant">Every active member has submitted or been cleared.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {openRows.map(({ member, submission }) => (
            <div key={member.id} className="bg-surface-container-lowest rounded-xl px-4 py-3">
              <p className="font-black text-sm">{getDisplayName(member)}</p>
              <p className="text-[11px] font-bold text-on-surface-variant">
                {formatVerificationSubmissionStatus(submission?.status ?? 'not_started')}
                {submission?.last_seen_at ? ` · Last seen ${formatDateTime(submission.last_seen_at)}` : ''}
              </p>
              {submission?.needs_changes_note && (
                <p className="mt-1 text-[11px] font-semibold text-error line-clamp-2">{submission.needs_changes_note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
  );
};

const VerificationReviewFieldRow = ({
  field,
  note,
  saving,
  onNoteChange,
  onSave
}: {
  key?: string;
  field: VerificationReviewField;
  note: string;
  saving: boolean;
  onNoteChange: (value: string) => void;
  onSave: (value: string | boolean) => void;
}) => {
  const [draft, setDraft] = useState<string | boolean>(getReviewInputValue(field.currentValue, field.inputType));
  const [editing, setEditing] = useState(false);
  const [noting, setNoting] = useState(Boolean(note));

  useEffect(() => {
    setDraft(getReviewInputValue(field.currentValue, field.inputType));
  }, [field.currentValue, field.inputType]);

  useEffect(() => {
    setNoting(Boolean(note));
  }, [note]);

  const valueChanged = String(draft) !== String(getReviewInputValue(field.currentValue, field.inputType));

  return (
    <div className={cn(
      'group rounded-xl px-3 py-2 text-sm transition-colors',
      note ? 'bg-error/10' : field.required && field.missing ? 'bg-primary/10' : 'bg-surface-container-low hover:bg-surface-container-high/60'
    )}>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[180px_minmax(0,1fr)_90px_76px] lg:items-center lg:gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-black text-on-surface">
            {field.label}
            {field.required && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Required" />}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-on-surface-variant lg:hidden">
            {getReviewFieldStatus(field, note)}
          </p>
        </div>

        <div className="min-w-0">
          {editing && field.editable ? (
            <div className="flex items-center gap-2">
              {field.inputType === 'checkbox' ? (
                <button
                  type="button"
                  onClick={() => setDraft(!Boolean(draft))}
                  className={cn(
                    'min-h-10 min-w-10 rounded-full flex items-center justify-center',
                    Boolean(draft) ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface-variant'
                  )}
                  title="Toggle value"
                >
                  {Boolean(draft) ? <CheckSquare size={15} /> : <Square size={15} />}
                </button>
              ) : (
                <input
                  type={field.inputType}
                  value={String(draft)}
                  onChange={event => setDraft(event.target.value)}
                  className="min-w-0 flex-1 bg-surface-container-lowest rounded-lg px-3 py-2 text-sm font-semibold text-on-surface outline-none focus:ring-1 focus:ring-primary/50"
                  autoFocus
                />
              )}
              <button
                type="button"
                onClick={() => {
                  onSave(draft);
                  setEditing(false);
                }}
                disabled={saving || !valueChanged}
                className="min-h-9 min-w-9 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40"
                title="Save field"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => field.editable && setEditing(true)}
              className={cn(
                'w-full rounded-lg px-2 py-1.5 text-left font-semibold transition-colors',
                field.missing ? 'text-on-surface-variant' : 'text-on-surface',
                field.editable && 'hover:bg-surface-container-lowest'
              )}
            >
              {formatReviewFieldValue(field)}
            </button>
          )}
        </div>

        <div className="hidden lg:block">
          <ReviewStatusPill field={field} note={note} />
        </div>

        <div className="flex items-center justify-start gap-1 lg:justify-end">
          <button
            type="button"
            onClick={() => setEditing(current => !current)}
            disabled={!field.editable}
            className="flex min-h-9 min-w-9 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant opacity-100 transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30 lg:opacity-40 lg:group-hover:opacity-100 lg:focus:opacity-100"
            title="Edit field"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => setNoting(current => !current)}
            className={cn(
              'flex min-h-9 min-w-9 items-center justify-center rounded-full transition-colors',
              note ? 'bg-error text-white' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface lg:opacity-40 lg:group-hover:opacity-100 lg:focus:opacity-100'
            )}
            title={note ? 'Edit note' : 'Add note'}
          >
            <MessageSquare size={14} />
          </button>
        </div>
      </div>

      {noting && (
        <label className="block mt-3">
          <span className="text-[10px] font-black uppercase tracking-[0.14rem] text-error">Member note</span>
          <textarea
            value={note}
            onChange={event => onNoteChange(event.target.value)}
            rows={2}
            placeholder="Tell the member exactly what to fix for this field."
            className="mt-2 w-full rounded-xl bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:ring-1 focus:ring-primary/50 resize-none"
          />
        </label>
      )}

      </div>
  );
};

const InspectionChip = ({ tone, label }: { tone: 'quiet' | 'primary' | 'error'; label: string }) => (
  <span className={cn(
    'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08rem]',
    tone === 'error' && 'bg-error/10 text-error',
    tone === 'primary' && 'bg-primary/10 text-primary',
    tone === 'quiet' && 'bg-surface-container-lowest text-on-surface-variant'
  )}>
    {label}
  </span>
);

const ReviewStatusPill = ({ field, note }: { field: VerificationReviewField; note: string }) => {
  const status = getReviewFieldStatus(field, note);
  const tone = note ? 'error' : field.required && field.missing ? 'primary' : field.flagged ? 'primary' : 'quiet';

  return (
    <span className={cn(
      'inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08rem]',
      tone === 'error' && 'bg-error/10 text-error',
      tone === 'primary' && 'bg-primary/10 text-primary',
      tone === 'quiet' && 'bg-surface-container-lowest text-on-surface-variant'
    )}>
      {status}
    </span>
  );
};

const MetricPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-surface-container-lowest px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface-variant">{label}</p>
    <p className="mt-1 text-xl font-black text-on-surface">{value}</p>
  </div>
);

const WorkflowBand = ({
  title,
  metric,
  actionLabel,
  onAction,
  children
}: {
  title: string;
  metric: string;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl bg-surface-container-low p-5">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary">{title}</p>
        <h3 className="mt-1 text-2xl font-black text-on-surface">{metric}</h3>
      </div>
      <button
        onClick={onAction}
        className="rounded-full bg-surface-container-high px-4 py-3 text-[10px] font-black uppercase tracking-[0.14rem] text-on-surface hover:bg-surface-container-lowest"
      >
        {actionLabel}
      </button>
    </div>
    {children}
  </section>
);

const WorkflowList = ({
  rows,
  getMeta
}: {
  rows: SecretaryMemberProfile[];
  getMeta: (member: SecretaryMemberProfile) => string;
}) => (
  <div className="space-y-2">
    {rows.length === 0 ? (
      <p className="text-sm font-bold text-on-surface-variant">No matching records.</p>
    ) : rows.map(member => (
      <div key={member.id} className="rounded-xl bg-surface-container-lowest px-4 py-3">
        <p className="text-sm font-black text-on-surface">{getDisplayName(member)}</p>
        <p className="text-[11px] font-bold text-on-surface-variant mt-1 line-clamp-2">{getMeta(member)}</p>
      </div>
    ))}
  </div>
);

const ComposerField = ({
  label,
  copyLabel,
  value,
  copied,
  multiline,
  copiedLabel = 'Copied',
  onCopy
}: {
  label: string;
  copyLabel: string;
  value: string;
  copied: boolean;
  multiline?: boolean;
  copiedLabel?: string;
  onCopy: () => void;
}) => (
  <label className="block mb-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant">{label}</span>
      <button
        type="button"
        onClick={onCopy}
        className="text-[10px] font-black uppercase tracking-[0.14rem] text-primary flex items-center gap-1"
      >
        <Copy size={12} />
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
    {multiline ? (
      <textarea
        value={value}
        readOnly
        rows={8}
        className="w-full resize-none rounded-xl border-none bg-surface-container-lowest px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/40"
      />
    ) : (
      <input
        value={value}
        readOnly
        className="w-full rounded-xl border-none bg-surface-container-lowest px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/40"
      />
    )}
  </label>
);

const RegistryTable = ({
  columns,
  members,
  selectedMember,
  selectedIds,
  allVisibleSelected,
  sort,
  density,
  onSelect,
  onToggleRow,
  onToggleAll,
  onSort,
  onBeforeSelect
}: {
  columns: RegistryColumn[];
  members: SecretaryMemberProfile[];
  selectedMember: SecretaryMemberProfile | null;
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  sort: RegistrySort;
  density: Density;
  onSelect: (member: SecretaryMemberProfile) => void;
  onToggleRow: (memberId: string) => void;
  onToggleAll: () => void;
  onSort: (column: RegistryColumn) => void;
  onBeforeSelect: () => void;
}) => {
  const rowPadding = density === 'compact' ? 'px-4 py-3' : density === 'comfortable' ? 'px-5 py-5' : 'px-5 py-4';

  return (
    <div className="max-h-[calc(100vh-18rem)] overflow-auto bg-surface-container-lowest">
      <table className="w-full min-w-[1120px] text-left border-separate border-spacing-0">
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th className="sticky left-0 top-0 z-50 w-12 border-b border-r border-outline-variant bg-surface-container-low px-4 py-4">
              <button
                onClick={event => {
                  event.stopPropagation();
                  onToggleAll();
                }}
                className="text-on-surface-variant hover:text-on-surface"
                title="Select visible rows"
              >
                {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
            </th>
            {columns.map((column, index) => (
              <th
                key={column.key}
                style={{ minWidth: column.minWidth }}
                className={cn(
                  'sticky top-0 z-40 border-b border-r border-outline-variant bg-surface-container-low py-4 text-[10px] uppercase tracking-[0.18rem] font-black whitespace-nowrap',
                  column.key === 'name' && 'left-12 z-50 before:absolute before:inset-y-0 before:-left-12 before:w-12 before:bg-surface-container-low before:content-[\"\"] before:-z-10',
                  index === 0 ? 'px-4' : 'px-5'
                )}
              >
                <button
                  onClick={() => onSort(column)}
                  disabled={!column.sortable}
                  className={cn('flex items-center gap-2', column.sortable && 'hover:text-on-surface')}
                >
                  {column.label}
                  {column.sortable && (
                    <ArrowUpDown
                      size={12}
                      className={sort.column === column.key ? 'text-primary' : 'opacity-40'}
                    />
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr
              key={member.id}
              onClick={() => {
                onBeforeSelect();
                onSelect(member);
              }}
              className={cn(
                'cursor-pointer transition-colors hover:bg-surface-container-high',
                selectedMember?.id === member.id && 'bg-primary/10'
              )}
            >
              <td className={cn(
                'sticky left-0 z-30',
                selectedMember?.id === member.id ? 'bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface-container-low))]' : 'bg-surface-container-low',
                'border-b border-r border-outline-variant',
                rowPadding
              )}>
                <button
                  onClick={event => {
                    event.stopPropagation();
                    onToggleRow(member.id);
                  }}
                  className="text-on-surface-variant hover:text-on-surface"
                  title="Select row"
                >
                  {selectedIds.has(member.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </td>
              {columns.map((column, index) => (
                <td
                  key={`${member.id}-${column.key}`}
                  style={{ minWidth: column.minWidth }}
                  className={cn(
                    rowPadding,
                    'border-b border-r border-outline-variant text-sm text-on-surface align-top',
                    column.key === 'name' && cn(
                      'sticky left-12 z-30 before:absolute before:inset-y-0 before:-left-12 before:w-12 before:content-[\"\"] before:-z-10',
                      selectedMember?.id === member.id
                        ? 'bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface-container-low))] before:bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface-container-low))]'
                        : 'bg-surface-container-low before:bg-surface-container-low'
                    ),
                    index === 0 ? 'px-4' : undefined
                  )}
                >
                  {column.render(member)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {members.length === 0 && (
        <div className="p-10 text-center text-on-surface-variant text-sm font-bold">
          No records match this view.
        </div>
      )}
    </div>
  );
};

const RegistryDrawer = ({
  member,
  onClose,
  onMarkVerified,
  onMarkChased,
  saving
}: {
  member: SecretaryMemberProfile | null;
  onClose: () => void;
  onMarkVerified: (member: SecretaryMemberProfile) => void;
  onMarkChased: (member: SecretaryMemberProfile) => void;
  saving: boolean;
}) => {
  if (!member) {
    return (
      <aside className="bg-surface-container-low rounded-2xl p-8 min-h-[520px] flex items-center justify-center text-on-surface-variant">
        <div className="text-center">
          <UserRound className="mx-auto mb-4 opacity-40" size={42} />
          <p className="text-xs font-black uppercase tracking-[0.2rem]">Select a record</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-surface-container-low rounded-2xl p-6 xl:sticky xl:top-32 max-h-[calc(100vh-10rem)] overflow-y-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18rem] font-black text-secondary mb-2">
            {member.status.replace('_', ' ')}
          </p>
          <h2 className="text-3xl font-black tracking-tight text-on-surface">{getDisplayName(member)}</h2>
          <p className="text-sm text-on-surface-variant mt-1">{member.suid} · {member.pledge_class ?? 'Pledge class missing'}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <ActionButton icon={<CheckCircle2 size={15} />} label="Verified" loading={saving} onClick={() => onMarkVerified(member)} />
        <ActionButton icon={<Sparkles size={15} />} label="Chased" loading={saving} onClick={() => onMarkChased(member)} />
      </div>

      {member.missing_required_field_count > 0 && (
        <section className="bg-primary/10 rounded-xl p-4 mb-7">
          <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-primary mb-3">
            {member.missing_required_field_count} missing
          </p>
          <div className="flex flex-wrap gap-2">
            {member.missing_required_fields.map(field => (
              <span key={field} className="bg-surface-container-lowest rounded-full px-3 py-1 text-[10px] font-bold text-on-surface-variant">
                {formatLabel(field)}
              </span>
            ))}
          </div>
        </section>
      )}

      <DrawerSection title="Core">
        <DetailRow label="Legal name" value={getLegalName(member)} />
        <DetailRow label="Active roles" value={formatList(member.active_position_names)} />
        <DetailRow label="Expected grad" value={member.expected_graduation_term} />
        <DetailRow label="Study abroad" value={formatStudyAbroad(member)} />
        <DetailRow label="Initiation" value={formatDate(member.initiation_date)} />
        <DetailRow label="School" value={member.school} />
        <DetailRow label="Major" value={member.major} />
      </DrawerSection>

      <DrawerSection title="Contact">
        <DetailRow label="Phone" value={member.phone} icon={<Phone size={14} />} />
        <DetailRow label="School email" value={member.google_email} icon={<Mail size={14} />} />
        <DetailRow label="Personal email" value={member.personal_email} icon={<Mail size={14} />} />
        <DetailRow label="Housing type" value={formatHousingType(member.housing_type)} />
        <DetailRow label="Local address" value={member.local_address} />
        <DetailRow label="Building / housing" value={member.campus_housing} />
        <DetailRow label="Home" value={[member.home_city, member.home_state].filter(Boolean).join(', ')} />
        <DetailRow label="T-Shirt" value={member.tshirt_size} />
        <DetailRow label="Hoodie" value={member.hoodie_size} />
      </DrawerSection>

      <DrawerSection title="Parent / Emergency">
        <DetailRow label="Guardian 1" value={formatContact(member.guardian_1_name, member.guardian_1_relationship, member.guardian_1_phone, member.guardian_1_email)} />
        <DetailRow label="Guardian 2" value={formatContact(member.guardian_2_name, member.guardian_2_relationship, member.guardian_2_phone, member.guardian_2_email)} />
        <DetailRow label="Emergency" value={formatContact(member.emergency_contact_name, member.emergency_contact_relationship, member.emergency_contact_phone, member.emergency_contact_email)} />
        <DetailRow label="Parent outreach" value={member.parent_outreach_consent ? 'Consent on file' : 'No consent'} />
      </DrawerSection>

      <DrawerSection title="Hygiene">
        <DetailRow label="Last verified" value={formatDateTime(member.last_verified_at)} />
        <DetailRow label="Last chased" value={formatDateTime(member.last_chased_at)} />
        <DetailRow label="Updated" value={formatDateTime(member.updated_at)} />
      </DrawerSection>
    </aside>
  );
};

const ActionButton = ({
  icon,
  label,
  loading,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="bg-surface-container-lowest rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface flex items-center justify-center gap-2 hover:bg-surface-container-high disabled:opacity-40"
  >
    {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
    {label}
  </button>
);

const DrawerSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h3 className="text-[10px] font-black uppercase tracking-[0.2rem] text-on-surface-variant mb-3">{title}</h3>
    <div className="bg-surface-container-lowest rounded-xl p-4 space-y-4">
      {children}
    </div>
  </section>
);

const DetailRow = ({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant mb-1">{label}</p>
    <div className="text-sm text-on-surface font-semibold leading-relaxed flex gap-2">
      {icon && <span className="text-primary mt-0.5">{icon}</span>}
      <span>{value || 'Missing'}</span>
    </div>
  </div>
);

const COLUMN_GROUPS: ColumnGroup[] = ['Identity', 'Contact', 'Academic', 'Housing', 'Social', 'Hygiene', 'Family'];

const REGISTRY_COLUMNS: RegistryColumn[] = [
  {
    key: 'name',
    label: 'Name',
    group: 'Identity',
    minWidth: 220,
    sortable: true,
    render: member => <NameCell member={member} />,
    exportValue: getDisplayName,
    sortValue: member => getDisplayName(member).toLowerCase()
  },
  column('status', 'Status', 'Identity', 150, member => <StatusPill status={member.status} />, member => member.status, member => member.status),
  column('suid', 'SUID', 'Identity', 120, member => member.suid, member => member.suid, member => member.suid),
  column('active_positions', 'Roles', 'Identity', 220, member => formatList(member.active_position_names), member => formatList(member.active_position_names), member => formatList(member.active_position_names)),
  column('phone', 'Phone', 'Contact', 150, member => member.phone ?? 'Missing', member => member.phone ?? '', member => member.phone),
  column('google_email', 'School Email', 'Contact', 240, member => member.google_email, member => member.google_email, member => member.google_email),
  column('personal_email', 'Personal Email', 'Contact', 240, member => member.personal_email ?? 'Missing', member => member.personal_email ?? '', member => member.personal_email),
  column('tshirt_size', 'T-Shirt', 'Contact', 120, member => member.tshirt_size ?? 'Missing', member => member.tshirt_size ?? '', member => member.tshirt_size),
  column('hoodie_size', 'Hoodie', 'Contact', 120, member => member.hoodie_size ?? 'Missing', member => member.hoodie_size ?? '', member => member.hoodie_size),
  column('expected_graduation_term', 'Grad Term', 'Academic', 160, member => member.expected_graduation_term ?? String(member.graduation_year ?? 'Missing'), member => member.expected_graduation_term ?? '', member => member.expected_graduation_term ?? member.graduation_year),
  column('graduation_year', 'Grad Year', 'Academic', 120, member => member.graduation_year ?? 'Missing', member => member.graduation_year ?? '', member => member.graduation_year),
  column('study_abroad', 'Study Abroad', 'Academic', 210, member => formatStudyAbroad(member), member => formatStudyAbroad(member), member => formatStudyAbroad(member)),
  column('pledge_class', 'Pledge Class', 'Academic', 160, member => member.pledge_class ?? 'Missing', member => member.pledge_class ?? '', member => member.pledge_class),
  column('initiation_date', 'Initiation', 'Academic', 150, member => formatDate(member.initiation_date) ?? 'Missing', member => formatDate(member.initiation_date) ?? '', member => member.initiation_date),
  column('school', 'School', 'Academic', 190, member => member.school ?? 'Missing', member => member.school ?? '', member => member.school),
  column('major', 'Major', 'Academic', 190, member => member.major ?? 'Missing', member => member.major ?? '', member => member.major),
  column('housing_type', 'Housing Type', 'Housing', 150, member => formatHousingType(member.housing_type), member => formatHousingType(member.housing_type), member => member.housing_type),
  column('local_address', 'Local Address', 'Housing', 240, member => member.local_address ?? 'Missing', member => member.local_address ?? '', member => member.local_address),
  column('campus_housing', 'Building / Housing', 'Housing', 170, member => member.campus_housing ?? 'Missing', member => member.campus_housing ?? '', member => member.campus_housing),
  column('home', 'Home', 'Housing', 160, member => [member.home_city, member.home_state].filter(Boolean).join(', ') || 'Missing', member => [member.home_city, member.home_state].filter(Boolean).join(', '), member => `${member.home_state ?? ''} ${member.home_city ?? ''}`),
  column('instagram', 'Instagram', 'Social', 150, member => member.instagram ?? 'Missing', member => member.instagram ?? '', member => member.instagram),
  column('snapchat', 'Snapchat', 'Social', 150, member => member.snapchat ?? 'Missing', member => member.snapchat ?? '', member => member.snapchat),
  column('linkedin', 'LinkedIn', 'Social', 170, member => member.linkedin ?? 'Missing', member => member.linkedin ?? '', member => member.linkedin),
  {
    key: 'missing_count',
    label: 'Missing',
    group: 'Hygiene',
    minWidth: 120,
    sortable: true,
    render: member => (
      <span className={member.missing_required_field_count > 0 ? 'font-black text-primary' : 'font-black text-secondary'}>
        {member.missing_required_field_count}
      </span>
    ),
    exportValue: member => member.missing_required_field_count,
    sortValue: member => member.missing_required_field_count
  },
  column('missing_fields', 'Missing Fields', 'Hygiene', 280, member => member.missing_required_fields.slice(0, 5).map(formatLabel).join(', ') || 'Complete', member => member.missing_required_fields.map(formatLabel).join(', '), member => member.missing_required_fields.join(', ')),
  column('last_verified_at', 'Verified', 'Hygiene', 160, member => formatDateTime(member.last_verified_at), member => formatDateTime(member.last_verified_at), member => member.last_verified_at),
  column('last_chased_at', 'Chased', 'Hygiene', 160, member => formatDateTime(member.last_chased_at), member => formatDateTime(member.last_chased_at), member => member.last_chased_at),
  familyColumn('guardian_1', 'Guardian 1', member => formatContact(member.guardian_1_name, member.guardian_1_relationship, member.guardian_1_phone, member.guardian_1_email)),
  familyColumn('guardian_2', 'Guardian 2', member => formatContact(member.guardian_2_name, member.guardian_2_relationship, member.guardian_2_phone, member.guardian_2_email)),
  familyColumn('emergency_contact', 'Emergency', member => formatContact(member.emergency_contact_name, member.emergency_contact_relationship, member.emergency_contact_phone, member.emergency_contact_email)),
  {
    key: 'parent_outreach_consent',
    label: 'Parent Consent',
    group: 'Family',
    minWidth: 150,
    sensitivity: 'family_contact',
    sortable: true,
    render: member => member.parent_outreach_consent ? 'Yes' : 'No',
    exportValue: member => member.parent_outreach_consent ? 'Yes' : 'No',
    sortValue: member => member.parent_outreach_consent ? 1 : 0
  }
];

const COLUMN_BY_KEY = REGISTRY_COLUMNS.reduce((acc, columnDef) => {
  acc[columnDef.key] = columnDef;
  return acc;
}, {} as Record<ColumnKey, RegistryColumn>);

function column(
  key: ColumnKey,
  label: string,
  group: ColumnGroup,
  minWidth: number,
  render: (member: SecretaryMemberProfile) => React.ReactNode,
  exportValue: (member: SecretaryMemberProfile) => string | number,
  sortValue?: (member: SecretaryMemberProfile) => string | number | null
): RegistryColumn {
  return {
    key,
    label,
    group,
    minWidth,
    sortable: Boolean(sortValue),
    render,
    exportValue,
    sortValue
  };
}

function familyColumn(
  key: ColumnKey,
  label: string,
  getValue: (member: SecretaryMemberProfile) => string
): RegistryColumn {
  return {
    key,
    label,
    group: 'Family',
    minWidth: 260,
    sensitivity: 'family_contact',
    sortable: true,
    render: getValue,
    exportValue: getValue,
    sortValue: getValue
  };
}

const NameCell = ({ member }: { member: SecretaryMemberProfile }) => (
  <div>
    <p className="font-black text-on-surface">{getDisplayName(member)}</p>
    <p className="text-xs text-on-surface-variant mt-1">{member.suid}</p>
  </div>
);

const StatusPill = ({ status }: { status: string }) => (
  <span className="inline-flex rounded-full bg-secondary/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14rem] text-secondary">
    {formatLabel(status)}
  </span>
);

function getActiveFilterItems(filters: RegistryFilters) {
  return [
    filters.roster !== DEFAULT_FILTERS.roster ? `Roster: ${formatLabel(filters.roster)}` : null,
    filters.status !== DEFAULT_FILTERS.status ? `Status: ${formatLabel(filters.status)}` : null,
    filters.pledgeClass !== DEFAULT_FILTERS.pledgeClass ? `Pledge: ${filters.pledgeClass}` : null,
    filters.school !== DEFAULT_FILTERS.school ? `School: ${filters.school}` : null,
    filters.gradTerm !== DEFAULT_FILTERS.gradTerm ? `Grad: ${filters.gradTerm}` : null,
    filters.missing !== DEFAULT_FILTERS.missing ? `Data: ${formatLabel(filters.missing)}` : null,
    filters.verification !== DEFAULT_FILTERS.verification ? `Verification: ${formatLabel(filters.verification)}` : null
  ].filter((item): item is string => Boolean(item));
}

function matchesFilters(member: SecretaryMemberProfile, filters: RegistryFilters) {
  if (filters.roster === 'active' && !['active', 'new_member'].includes(member.status)) return false;
  if (filters.roster === 'missing' && member.missing_required_field_count === 0) return false;
  if (filters.roster === 'status_watchlist' && ['active', 'new_member', 'alumni'].includes(member.status)) return false;
  if (filters.status !== 'all' && member.status !== filters.status) return false;
  if (filters.pledgeClass !== 'all' && member.pledge_class !== filters.pledgeClass) return false;
  if (filters.school !== 'all' && member.school !== filters.school) return false;

  const gradTerm = member.expected_graduation_term ?? String(member.graduation_year ?? '');
  if (filters.gradTerm !== 'all' && gradTerm !== filters.gradTerm) return false;
  if (filters.missing === 'missing' && member.missing_required_field_count === 0) return false;
  if (filters.missing === 'complete' && member.missing_required_field_count > 0) return false;
  if (filters.verification === 'verified' && !member.last_verified_at) return false;
  if (filters.verification === 'unverified' && member.last_verified_at) return false;
  if (filters.verification === 'stale_30' && !isStaleVerification(member.last_verified_at)) return false;

  return true;
}

function compareMembers(a: SecretaryMemberProfile, b: SecretaryMemberProfile, sort: RegistrySort) {
  const columnDef = COLUMN_BY_KEY[sort.column] ?? COLUMN_BY_KEY.name;
  const aValue = columnDef.sortValue?.(a) ?? columnDef.exportValue(a);
  const bValue = columnDef.sortValue?.(b) ?? columnDef.exportValue(b);
  const multiplier = sort.direction === 'asc' ? 1 : -1;

  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return (aValue - bValue) * multiplier;
  }

  return String(aValue ?? '').localeCompare(String(bValue ?? ''), undefined, { numeric: true }) * multiplier;
}

function sanitizeColumns(columns: ColumnKey[]) {
  const unique = [...new Set(['name' as ColumnKey, ...columns])];
  return unique.filter(key => COLUMN_BY_KEY[key]);
}

function loadCustomViews(): RegistrySavedView[] {
  try {
    const raw = localStorage.getItem(CUSTOM_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RegistrySavedView[];
    return parsed.map(view => ({
      ...view,
      columns: sanitizeColumns(view.columns),
      filters: { ...DEFAULT_FILTERS, ...view.filters },
      sort: COLUMN_BY_KEY[view.sort?.column] ? view.sort : INITIAL_VIEW.sort,
      density: view.density ?? 'standard',
      system: false
    }));
  } catch {
    return [];
  }
}

function persistCustomViews(views: RegistrySavedView[]) {
  localStorage.setItem(CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(views));
}

function uniqueOptions(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
}

function getActiveFilterCount(filters: RegistryFilters) {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === 'roster') return value !== 'all';
    return value !== 'all';
  }).length;
}

const VERIFICATION_REVIEW_MEMBER_FIELDS: VerificationReviewField[] = [
  reviewMemberField('preferred_name', 'Preferred name', 'Identity', 'text'),
  reviewMemberField('personal_email', 'Personal email', 'Contact', 'email'),
  reviewMemberField('phone', 'Phone', 'Contact', 'tel'),
  reviewMemberField('graduation_year', 'Graduation year', 'Academic', 'number'),
  reviewMemberField('expected_graduation_term', 'Expected grad term', 'Academic', 'text'),
  reviewMemberField('school', 'School', 'Academic', 'text'),
  reviewMemberField('major', 'Major', 'Academic', 'text'),
  reviewMemberField('housing_type', 'Housing type', 'Housing', 'text'),
  reviewMemberField('local_address', 'Local address', 'Housing', 'text'),
  reviewMemberField('campus_housing', 'Dorm / room', 'Housing', 'text'),
  reviewMemberField('home_city', 'Home city', 'Housing', 'text'),
  reviewMemberField('home_state', 'Home state', 'Housing', 'text'),
  reviewMemberField('instagram', 'Instagram', 'Social', 'text'),
  reviewMemberField('snapchat', 'Snapchat', 'Social', 'text'),
  reviewMemberField('linkedin', 'LinkedIn', 'Social', 'text'),
  reviewMemberField('tshirt_size', 'T-shirt size', 'Sizes', 'text'),
  reviewMemberField('hoodie_size', 'Hoodie size', 'Sizes', 'text'),
  reviewMemberField('parent_outreach_consent', 'Parent outreach consent', 'Family', 'checkbox')
];

const VERIFICATION_REVIEW_GUARDIAN_FIELDS: VerificationReviewField[] = [
  reviewGuardianField('guardian_1_name', 'Guardian 1 name', 'Family', 1, 'contact_name', 'text'),
  reviewGuardianField('guardian_1_relationship', 'Guardian 1 relationship', 'Family', 1, 'relationship', 'text'),
  reviewGuardianField('guardian_1_phone', 'Guardian 1 phone', 'Family', 1, 'phone', 'tel'),
  reviewGuardianField('guardian_1_email', 'Guardian 1 email', 'Family', 1, 'email', 'email'),
  reviewGuardianField('guardian_2_name', 'Guardian 2 name', 'Family', 2, 'contact_name', 'text'),
  reviewGuardianField('guardian_2_relationship', 'Guardian 2 relationship', 'Family', 2, 'relationship', 'text'),
  reviewGuardianField('guardian_2_phone', 'Guardian 2 phone', 'Family', 2, 'phone', 'tel'),
  reviewGuardianField('guardian_2_email', 'Guardian 2 email', 'Family', 2, 'email', 'email')
];

function reviewMemberField(
  key: ReviewEditableMemberField,
  label: string,
  group: string,
  inputType: ReviewFieldInputType
): VerificationReviewField {
  return {
    key: String(key),
    label,
    group,
    submittedValue: null,
    currentValue: null,
    changed: false,
    flagged: false,
    missing: false,
    required: false,
    inputType,
    editable: { table: 'members', field: key }
  };
}

function reviewGuardianField(
  key: string,
  label: string,
  group: string,
  order: 1 | 2,
  field: 'contact_name' | 'relationship' | 'phone' | 'email',
  inputType: ReviewFieldInputType
): VerificationReviewField {
  return {
    key,
    label,
    group,
    submittedValue: null,
    currentValue: null,
    changed: false,
    flagged: false,
    missing: false,
    required: false,
    inputType,
    editable: { table: 'guardian', order, field }
  };
}

function buildVerificationReviewFields(
  member: SecretaryMemberProfile,
  submission: VerificationSubmission
): VerificationReviewField[] {
  const changedFields = new Set(submission.changed_fields);
  const flaggedFields = new Set([
    ...submission.optional_review_flags,
    ...submission.needs_changes_fields,
    ...submission.missing_required_fields
  ]);

  const memberFields = VERIFICATION_REVIEW_MEMBER_FIELDS.map(field => {
    const submittedValue = getSnapshotValue(submission.snapshot, field.key);
    const currentValue = getMemberReviewValue(member, field.key);
    return hydrateReviewField(field, submittedValue, currentValue, changedFields, flaggedFields, isRequiredReviewFieldForMember(field.key, member));
  });

  const guardianFields = VERIFICATION_REVIEW_GUARDIAN_FIELDS.map(field => {
    const submittedValue = getSnapshotGuardianValue(submission.snapshot, field.key);
    const currentValue = getMemberReviewValue(member, field.key);
    return hydrateReviewField(field, submittedValue, currentValue, changedFields, flaggedFields, isRequiredReviewFieldForMember(field.key, member));
  });

  return [...memberFields, ...guardianFields];
}

function hydrateReviewField(
  field: VerificationReviewField,
  submittedValue: string | boolean | number | null,
  currentValue: string | boolean | number | null,
  changedFields: Set<string>,
  flaggedFields: Set<string>,
  required: boolean
): VerificationReviewField {
  return {
    ...field,
    submittedValue,
    currentValue,
    changed: changedFields.has(field.key) || normalizeReviewComparable(submittedValue) !== normalizeReviewComparable(currentValue),
    flagged: flaggedFields.has(field.key),
    missing: !hasReviewValue(currentValue),
    required
  };
}

function isRequiredReviewFieldForMember(fieldKey: string, member: SecretaryMemberProfile) {
  if (fieldKey === 'local_address') return member.housing_type === 'off_campus';
  if (fieldKey === 'campus_housing') return member.housing_type === 'on_campus' || member.housing_type === 'chapter_housing';
  return ![
    'preferred_name',
    'instagram',
    'snapchat',
    'linkedin',
    'guardian_2_name',
    'guardian_2_relationship',
    'guardian_2_phone',
    'guardian_2_email',
    'parent_outreach_consent'
  ].includes(fieldKey);
}

const REVIEW_SECTION_ORDER = ['Identity', 'Contact', 'Housing', 'Academic', 'Sizes', 'Social', 'Family'];

function groupReviewFieldsBySection(fields: VerificationReviewField[], fieldNotes: Record<string, string>) {
  return REVIEW_SECTION_ORDER
    .map(group => {
      const sectionFields = fields.filter(field => field.group === group);
      return {
        group: group === 'Sizes' ? 'Apparel' : group,
        fields: sectionFields,
        completeCount: sectionFields.filter(field => !field.missing).length,
        missingCount: sectionFields.filter(field => field.required && field.missing).length,
        noteCount: sectionFields.filter(field => Boolean(fieldNotes[field.key]?.trim())).length
      };
    })
    .filter(section => section.fields.length > 0);
}

function countReviewFieldNotes(submission: VerificationSubmission) {
  return Object.values(submission.needs_changes_field_notes ?? {}).filter(note => note.trim().length > 0).length;
}

function getReviewFieldStatus(field: VerificationReviewField, note: string) {
  if (note.trim()) return 'Note';
  if (field.required && field.missing) return 'Missing';
  if (field.flagged) return 'Flag';
  return 'OK';
}

function getSnapshotValue(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return null;
}

function getSnapshotGuardianValue(snapshot: Record<string, unknown>, key: string) {
  const order = key.startsWith('guardian_2') ? 2 : 1;
  const contacts = Array.isArray(snapshot.parent_guardian_contacts)
    ? snapshot.parent_guardian_contacts as Array<Record<string, unknown>>
    : [];
  const contact = contacts.find(item => item.contactOrder === order || item.contact_order === order);

  if (!contact) return null;
  if (key.endsWith('_name')) {
    return [contact.firstName, contact.lastName, contact.contact_name]
      .filter(value => typeof value === 'string' && value.trim().length > 0)
      .slice(0, contact.contact_name ? 1 : 2)
      .join(' ') || null;
  }

  const contactKey = key.endsWith('_relationship')
    ? 'relationship'
    : key.endsWith('_phone')
      ? 'phone'
      : 'email';
  const value = contact[contactKey];
  return typeof value === 'string' ? value : null;
}

function getMemberReviewValue(member: SecretaryMemberProfile, key: string): string | boolean | number | null {
  switch (key) {
    case 'guardian_1_name':
      return member.guardian_1_name;
    case 'guardian_1_relationship':
      return member.guardian_1_relationship;
    case 'guardian_1_phone':
      return member.guardian_1_phone;
    case 'guardian_1_email':
      return member.guardian_1_email;
    case 'guardian_2_name':
      return member.guardian_2_name;
    case 'guardian_2_relationship':
      return member.guardian_2_relationship;
    case 'guardian_2_phone':
      return member.guardian_2_phone;
    case 'guardian_2_email':
      return member.guardian_2_email;
    default: {
      const value = member[key as keyof SecretaryMemberProfile];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
      return null;
    }
  }
}

function hasReviewValue(value: string | boolean | number | null) {
  if (typeof value === 'boolean' || typeof value === 'number') return true;
  return Boolean(value && value.trim().length > 0);
}

function normalizeReviewComparable(value: string | boolean | number | null) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return value?.trim().toLowerCase() ?? '';
}

function formatReviewValue(value: string | boolean | number | null) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  return value && value.trim().length > 0 ? value : 'Missing';
}

function formatReviewFieldValue(field: VerificationReviewField) {
  if (field.key === 'housing_type' && typeof field.currentValue === 'string') {
    return formatLabel(field.currentValue);
  }
  return formatReviewValue(field.currentValue);
}

function getReviewInputValue(value: string | boolean | number | null, inputType: ReviewFieldInputType) {
  if (inputType === 'checkbox') return Boolean(value);
  return value === null ? '' : String(value);
}

function getGuardianContactName(
  member: SecretaryMemberProfile,
  order: 1 | 2,
  editedField: 'contact_name' | 'relationship' | 'phone' | 'email',
  rawValue: string | boolean
) {
  if (editedField === 'contact_name') return String(rawValue);
  return order === 1
    ? member.guardian_1_name ?? 'Parent/Guardian 1'
    : member.guardian_2_name ?? 'Parent/Guardian 2';
}

function getGuardianFieldValue(
  member: SecretaryMemberProfile,
  order: 1 | 2,
  targetField: 'relationship' | 'phone' | 'email',
  editedField: 'contact_name' | 'relationship' | 'phone' | 'email',
  rawValue: string | boolean
) {
  if (editedField === targetField) return String(rawValue);
  const prefix = order === 1 ? 'guardian_1' : 'guardian_2';
  return member[`${prefix}_${targetField}` as keyof SecretaryMemberProfile] as string | null;
}

function getDisplayName(member: SecretaryMemberProfile) {
  return `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}`;
}

function getLegalName(member: SecretaryMemberProfile) {
  return `${member.legal_first_name} ${member.legal_last_name}`;
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatHousingType(value?: string | null) {
  if (!value) return 'Missing';
  if (value === 'on_campus') return 'On Campus';
  if (value === 'off_campus') return 'Off-campus';
  if (value === 'chapter_housing') return 'Chapter Housing';
  return formatLabel(value);
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Missing';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function getVerificationCycleStats(
  activeMembers: SecretaryMemberProfile[],
  submissions: VerificationSubmission[]
): VerificationCycleStats {
  const submissionByMemberId = new Map(submissions.map(submission => [submission.member_id, submission]));
  let completeCount = 0;
  let notStartedCount = 0;
  let inProgressCount = 0;
  let needsReviewCount = 0;
  let optionalFlagCount = 0;

  for (const member of activeMembers) {
    const submission = submissionByMemberId.get(member.id);
    const status = submission?.status ?? 'not_started';

    if (['submitted', 'approved', 'exempted', 'temporarily_unlocked'].includes(status)) {
      completeCount += 1;
    }

    if (status === 'not_started') notStartedCount += 1;
    if (status === 'in_progress') inProgressCount += 1;
    if (status === 'submitted' || status === 'needs_changes') needsReviewCount += 1;

    optionalFlagCount += submission?.optional_review_flags.length ?? 0;
  }

  return {
    completeCount,
    notStartedCount,
    inProgressCount,
    needsReviewCount,
    openCount: activeMembers.length - completeCount,
    optionalFlagCount
  };
}

function formatVerificationSubmissionStatus(status: VerificationSubmission['status']) {
  return status
    .split('_')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getDefaultTermLabel() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const term = month >= 0 && month <= 4 ? 'Spring' : month >= 5 && month <= 6 ? 'Summer' : 'Fall';
  return `${term} ${year}`;
}

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function formatFileDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatContact(
  name?: string | null,
  relationship?: string | null,
  phone?: string | null,
  email?: string | null
) {
  if (!name && !phone && !email) return 'Missing';
  return [name, relationship, phone, email].filter(Boolean).join(' · ');
}

function formatList(values: string[] | null | undefined) {
  return values && values.length > 0 ? values.join(', ') : 'None';
}

function formatStudyAbroad(member: SecretaryMemberProfile) {
  if (member.current_status_type !== 'study_abroad' && !member.current_status_label) return 'None';
  return [
    member.current_status_label ?? 'Study abroad',
    [member.current_status_start_term, member.current_status_end_term].filter(Boolean).join(' to ')
  ].filter(Boolean).join(' · ');
}

function getRecipientLine(member: SecretaryMemberProfile) {
  const email = member.personal_email || member.google_email;
  return `${getDisplayName(member)} <${email}>`;
}

function buildMissingInfoChaseComposer(rows: SecretaryMemberProfile[]): ChaseComposer {
  const recipientLine = rows.map(getRecipientLine).join(', ');
  const subject = 'Missing Chapter Roster Info';
  const missingFields = [...new Set(rows.flatMap(member => member.missing_required_fields))]
    .map(formatLabel)
    .sort((a, b) => a.localeCompare(b));
  const checklist = missingFields.length > 0
    ? missingFields.map(field => `- ${field}`)
    : ['- Any missing roster fields I flagged for your profile'];
  const body = [
    'Hey,',
    '',
    'I am cleaning up the chapter roster and your profile is missing one or more required items.',
    '',
    'Please reply with any of the following that apply to you:',
    ...checklist,
    '',
    'This is a BCC batch note, so I am not listing individual missing fields by name here.',
    'Reply directly with your updates when you can.',
    '',
    'Thank you.'
  ].join('\n');

  return { recipientLine, subject, body };
}

function isStaleVerification(value?: string | null) {
  if (!value) return true;
  const verifiedAt = new Date(value);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return verifiedAt < cutoff;
}

function isGraduationReviewCandidate(member: SecretaryMemberProfile) {
  const currentYear = new Date().getFullYear();
  const term = (member.expected_graduation_term ?? '').toLowerCase();
  return member.status !== 'alumni' && (
    (member.graduation_year !== null && member.graduation_year <= currentYear)
    || term.includes(String(currentYear))
  );
}

function getPresetRows(
  presetId: ExportPresetId,
  visibleMembers: SecretaryMemberProfile[],
  allMembers: SecretaryMemberProfile[]
) {
  if (presetId === 'missing_info') {
    return allMembers.filter(member => member.missing_required_field_count > 0);
  }

  if (presetId === 'study_abroad') {
    return allMembers.filter(member => member.current_status_type === 'study_abroad' || Boolean(member.current_status_label));
  }

  return visibleMembers;
}

function buildExcelWorkbook({
  rows,
  columns,
  viewLabel,
  selectedOnly,
  sensitive
}: {
  rows: SecretaryMemberProfile[];
  columns: RegistryColumn[];
  viewLabel: string;
  selectedOnly: boolean;
  sensitive: boolean;
}) {
  const now = new Date();
  const columnXml = columns.map(columnDef => `<Column ss:Width="${Math.max(90, columnDef.minWidth * 0.75)}"/>`).join('');
  const headerXml = columns.map(columnDef => cell(columnDef.label, 'Header')).join('');
  const bodyXml = rows.map(member => {
    const rowCells = columns.map(columnDef => {
      const value = columnDef.exportValue(member);
      const style = columnDef.key === 'missing_count' && Number(value) > 0
        ? 'Warning'
        : columnDef.sensitivity === 'family_contact'
          ? 'Sensitive'
          : 'Body';
      return cell(value, style);
    }).join('');
    return `<Row>${rowCells}</Row>`;
  }).join('');

  const notesWorksheet = sensitive ? `
    <Worksheet ss:Name="Export Notes">
      <Table>
        <Row>${cell('Sensitive Export Notice', 'Title')}</Row>
        <Row>${cell('This workbook may include parent, guardian, or emergency contact data. Treat it as officer-only chapter records.', 'Body')}</Row>
        <Row>${cell(`Generated: ${now.toLocaleString()}`, 'Body')}</Row>
      </Table>
    </Worksheet>
  ` : '';

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="16" ss:Color="#FFFFFF"/><Interior ss:Color="#7A1F2B" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Meta"><Font ss:Color="#D6C28A" ss:Bold="1"/><Interior ss:Color="#131313" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2A2A2A" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Body"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Interior ss:Color="#F7F7F4" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Warning"><Font ss:Bold="1" ss:Color="#7A1F2B"/><Interior ss:Color="#F5E6E8" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Sensitive"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Interior ss:Color="#FFF6D6" ss:Pattern="Solid"/></Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(toExcelSheetName(viewLabel))}">
    <Table>
      ${columnXml}
      <Row>${cell(`Chapter Command Center - ${viewLabel}`, 'Title')}</Row>
      <Row>${cell(`Generated ${now.toLocaleString()}${selectedOnly ? ' - selected rows only' : ''}`, 'Meta')}</Row>
      <Row>${headerXml}</Row>
      ${bodyXml}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>3</SplitHorizontal>
      <TopRowBottomPane>3</TopRowBottomPane>
      <ActivePane>2</ActivePane>
    </WorksheetOptions>
  </Worksheet>
  ${notesWorksheet}
</Workbook>`;
}

function buildGreekLifeFasaWorkbook(rows: SecretaryMemberProfile[]) {
  const memberRows = rows.map((member, index) => `
    <Row>
      ${cell(member.legal_first_name, 'Body')}
      ${cell(member.legal_last_name, 'Body')}
      ${cell(member.suid, 'Body')}
      ${cell(member.google_email, 'Body')}
      ${cell(toGreekLifeStatus(member), 'Body')}
      ${cell(isChapterHouseMember(member) ? 'Yes' : 'No', 'Body')}
      ${cell(member.local_address ?? member.campus_housing ?? '', 'Body')}
      ${cell(index + 1, 'Body')}
    </Row>
  `).join('');

  const officerRows = rows.flatMap(member => member.active_position_names.map(position => `
    <Row>
      ${cell(position, 'Body')}
      ${cell(member.legal_first_name, 'Body')}
      ${cell(member.legal_last_name, 'Body')}
      ${cell(member.google_email, 'Body')}
      ${cell(member.phone ?? '', 'Body')}
      ${cell('', 'Body')}
      ${cell('', 'Body')}
    </Row>
  `)).join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14" ss:Color="#FFFFFF"/><Interior ss:Color="#7A1F2B" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2A2A2A" ss:Pattern="Solid"/><Alignment ss:WrapText="1" ss:Vertical="Top"/></Style>
    <Style ss:ID="Body"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Interior ss:Color="#F7F7F4" ss:Pattern="Solid"/></Style>
  </Styles>
  <Worksheet ss:Name="1) Chapter Members">
    <Table>
      <Column ss:Width="110"/><Column ss:Width="110"/><Column ss:Width="150"/><Column ss:Width="210"/><Column ss:Width="180"/><Column ss:Width="150"/><Column ss:Width="280"/><Column ss:Width="80"/>
      <Row>${cell('1) INPUT CHAPTER MEMBERS:', 'Title')}</Row>
      <Row>
        ${cell('First Name', 'Header')}
        ${cell('Last Name', 'Header')}
        ${cell('SU ID#', 'Header')}
        ${cell('SYR Email', 'Header')}
        ${cell('Chapter Member Status', 'Header')}
        ${cell('Lives in Chapter House', 'Header')}
        ${cell('Campus Address', 'Header')}
        ${cell('Row', 'Header')}
      </Row>
      ${memberRows}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="2) Chapter Officers">
    <Table>
      <Column ss:Width="210"/><Column ss:Width="110"/><Column ss:Width="110"/><Column ss:Width="210"/><Column ss:Width="140"/><Column ss:Width="110"/><Column ss:Width="110"/>
      <Row>${cell('2) INPUT CHAPTER OFFICERS:', 'Title')}</Row>
      <Row>
        ${cell('Role/Responsibilities', 'Header')}
        ${cell('First Name', 'Header')}
        ${cell('Last Name', 'Header')}
        ${cell('SYR Email', 'Header')}
        ${cell('Cell Phone', 'Header')}
        ${cell('Mo./Yr. Term Begins', 'Header')}
        ${cell('Mo./Yr. Term Ends', 'Header')}
      </Row>
      ${officerRows}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="3) Chapter Advisors">
    <Table>
      <Column ss:Width="210"/><Column ss:Width="110"/><Column ss:Width="110"/><Column ss:Width="210"/><Column ss:Width="140"/>
      <Row>${cell('3) INPUT CHAPTER ADVISORS:', 'Title')}</Row>
      <Row>${cell('A) COMPLETE SECTION "A" ONLY IF YOUR CHAPTER HAS A HOUSE', 'Body')}</Row>
      <Row>
        ${cell('Role/Responsibilities', 'Header')}
        ${cell('First Name', 'Header')}
        ${cell('Last Name', 'Header')}
        ${cell('Email', 'Header')}
        ${cell('Phone Number', 'Header')}
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;
}

function toGreekLifeStatus(member: SecretaryMemberProfile) {
  if (member.current_status_type === 'study_abroad') return 'Abroad';
  if (member.status === 'new_member') return 'New Member';
  if (member.status === 'alumni') return 'Alumni/Graduate';
  if (member.status === 'inactive' || member.status === 'suspended') return 'Inactive';
  return 'Active';
}

function isChapterHouseMember(member: SecretaryMemberProfile) {
  return (member.campus_housing ?? '').toLowerCase().includes('chapter');
}

function cell(value: string | number, styleId: string) {
  const type = typeof value === 'number' ? 'Number' : 'String';
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="${type}">${escapeXml(String(value))}</Data></Cell>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'secretary-registry';
}

function toExcelSheetName(value: string) {
  const sanitized = value.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  return (sanitized || 'Registry').slice(0, 31);
}

function downloadWorkbook(filename: string, workbookXml: string) {
  const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
