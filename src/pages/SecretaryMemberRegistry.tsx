import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  CheckCircle2,
  CheckSquare,
  Columns3,
  Copy,
  Download,
  Filter,
  Loader2,
  Mail,
  Phone,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  TableProperties,
  Trash2,
  UserRound,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  SecretaryMemberProfile,
  fetchSecretaryMemberProfiles,
  markSecretaryProfileChased,
  markSecretaryProfileVerified
} from '../lib/memberSecretaryRegistry';

type ColumnGroup = 'Identity' | 'Contact' | 'Academic' | 'Housing' | 'Social' | 'Hygiene' | 'Family';
type Density = 'compact' | 'standard' | 'comfortable';
type SortDirection = 'asc' | 'desc';
type VerificationFilter = 'all' | 'verified' | 'unverified' | 'stale_30';
type MissingFilter = 'all' | 'missing' | 'complete';
type RosterFilter = 'all' | 'active' | 'missing' | 'status_watchlist';

type ColumnKey =
  | 'name'
  | 'status'
  | 'suid'
  | 'phone'
  | 'google_email'
  | 'personal_email'
  | 'expected_graduation_term'
  | 'graduation_year'
  | 'pledge_class'
  | 'initiation_date'
  | 'school'
  | 'major'
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
    columns: ['name', 'status', 'expected_graduation_term', 'pledge_class', 'school', 'major', 'phone', 'missing_count'],
    filters: { ...DEFAULT_FILTERS, roster: 'active' },
    sort: { column: 'name', direction: 'asc' },
    density: 'standard',
    system: true
  },
  {
    id: 'contact',
    label: 'Contact Sheet',
    description: 'Fast lookup and contact exports.',
    columns: ['name', 'phone', 'google_email', 'personal_email', 'instagram', 'snapchat', 'linkedin', 'status'],
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
  }
];

const INITIAL_VIEW = SYSTEM_VIEWS[0];

export const SecretaryMemberRegistry = () => {
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
  const [viewNameDraft, setViewNameDraft] = useState('');
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

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

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

  const missingCount = members.filter(member => member.missing_required_field_count > 0).length;
  const verifiedCount = members.filter(member => member.last_verified_at).length;
  const sensitiveView = activeView.sensitive || activeColumns.some(column => column.sensitivity === 'family_contact');

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
            <button
              onClick={() => void exportVisibleRows()}
              disabled={exporting}
              className="bg-primary text-white px-5 py-3 rounded-full font-black uppercase tracking-[0.16rem] text-[11px] flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Export Excel
            </button>
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
                onToggle={() => setViewMenuOpen(current => !current)}
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
                onClick={() => setFilterPanelOpen(current => !current)}
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
                onClick={() => setColumnPanelOpen(current => !current)}
                className={cn(
                  'rounded-full px-5 py-3 text-[11px] font-black uppercase tracking-[0.16rem] flex items-center justify-center gap-2 transition-colors',
                  columnPanelOpen ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                )}
              >
                <Columns3 size={15} />
                Customize
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
          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
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
              savingId={savingId}
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
              onMarkVerified={member => void markVerified(member)}
              onMarkChased={member => void markChased(member)}
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
}) => (
  <div className="bg-surface-container-lowest rounded-2xl p-5">
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      <FilterSelect label="Status" value={filters.status} onChange={value => onChange('status', value)}>
        <option value="all">All statuses</option>
        {options.statuses.map(status => <option key={status} value={status}>{formatLabel(status)}</option>)}
      </FilterSelect>
      <FilterSelect label="Pledge" value={filters.pledgeClass} onChange={value => onChange('pledgeClass', value)}>
        <option value="all">All pledge classes</option>
        {options.pledgeClasses.map(pledgeClass => <option key={pledgeClass} value={pledgeClass}>{pledgeClass}</option>)}
      </FilterSelect>
      <FilterSelect label="School" value={filters.school} onChange={value => onChange('school', value)}>
        <option value="all">All schools</option>
        {options.schools.map(school => <option key={school} value={school}>{school}</option>)}
      </FilterSelect>
      <FilterSelect label="Grad" value={filters.gradTerm} onChange={value => onChange('gradTerm', value)}>
        <option value="all">All grad terms</option>
        {options.gradTerms.map(term => <option key={term} value={term}>{term}</option>)}
      </FilterSelect>
      <FilterSelect label="Missing" value={filters.missing} onChange={value => onChange('missing', value as MissingFilter)}>
        <option value="all">All records</option>
        <option value="missing">Missing only</option>
        <option value="complete">Complete only</option>
      </FilterSelect>
      <FilterSelect label="Verified" value={filters.verification} onChange={value => onChange('verification', value as VerificationFilter)}>
        <option value="all">Any verification</option>
        <option value="verified">Verified</option>
        <option value="unverified">Unverified</option>
        <option value="stale_30">Stale 30d</option>
      </FilterSelect>
    </div>
    <div className="mt-4 flex justify-end">
      <button
        onClick={onClear}
        className="bg-surface-container-low rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant hover:text-on-surface"
      >
        Clear Filters
      </button>
    </div>
  </div>
);

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
  <label className="bg-surface-container-lowest rounded-full pl-4 pr-3 py-2 flex items-center gap-2 text-on-surface-variant">
    <Filter size={13} className="text-primary" />
    <span className="text-[9px] uppercase tracking-[0.16rem] font-black">{label}</span>
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="bg-transparent border-none focus:ring-0 p-0 text-xs text-on-surface min-w-24"
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
    <div className="bg-surface-container-lowest rounded-2xl p-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
      <div className="space-y-5">
        {groupedColumns.map(({ group, columns }) => (
          <section key={group}>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2rem] text-on-surface-variant mb-3">{group}</h3>
            <div className="flex flex-wrap gap-2">
              {columns.map(column => {
                const checked = selectedColumns.includes(column.key);
                return (
                  <button
                    key={column.key}
                    onClick={() => onToggleColumn(column.key)}
                    disabled={column.key === 'name'}
                    className={cn(
                      'rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.12rem] flex items-center gap-2 transition-colors disabled:opacity-70',
                      checked
                        ? 'bg-secondary/15 text-secondary'
                        : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    {checked ? <CheckSquare size={13} /> : <Square size={13} />}
                    {column.label}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <aside className="bg-surface-container-low rounded-xl p-4 h-fit">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2rem] text-on-surface-variant mb-4 flex items-center gap-2">
          <SlidersHorizontal size={14} />
          View Setup
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant mb-2">Density</p>
            <div className="grid grid-cols-3 gap-2">
              {(['compact', 'standard', 'comfortable'] as Density[]).map(option => (
                <button
                  key={option}
                  onClick={() => onDensityChange(option)}
                  className={cn(
                    'rounded-full px-2 py-2 text-[9px] font-black uppercase tracking-[0.12rem]',
                    density === option ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface-variant'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16rem] text-on-surface-variant mb-2">Save Custom View</p>
            <input
              value={viewNameDraft}
              onChange={event => onViewNameChange(event.target.value)}
              placeholder="Example: Fall Rush Calls"
              className="w-full bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 border-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={onSaveView}
            className="w-full bg-primary text-white rounded-full px-4 py-3 text-[10px] font-black uppercase tracking-[0.16rem] flex items-center justify-center gap-2"
          >
            <Save size={14} />
            Save View
          </button>
        </div>
      </aside>
    </div>
  );
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

const RegistryTable = ({
  columns,
  members,
  selectedMember,
  selectedIds,
  allVisibleSelected,
  sort,
  density,
  savingId,
  onSelect,
  onToggleRow,
  onToggleAll,
  onSort,
  onMarkVerified,
  onMarkChased
}: {
  columns: RegistryColumn[];
  members: SecretaryMemberProfile[];
  selectedMember: SecretaryMemberProfile | null;
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  sort: RegistrySort;
  density: Density;
  savingId: string | null;
  onSelect: (member: SecretaryMemberProfile) => void;
  onToggleRow: (memberId: string) => void;
  onToggleAll: () => void;
  onSort: (column: RegistryColumn) => void;
  onMarkVerified: (member: SecretaryMemberProfile) => void;
  onMarkChased: (member: SecretaryMemberProfile) => void;
}) => {
  const rowPadding = density === 'compact' ? 'px-4 py-3' : density === 'comfortable' ? 'px-5 py-5' : 'px-5 py-4';

  return (
    <div className="max-h-[calc(100vh-18rem)] overflow-auto">
      <table className="w-full min-w-[1120px] text-left border-separate border-spacing-0">
        <thead className="bg-surface-container-lowest text-on-surface-variant">
          <tr>
            <th className="sticky left-0 top-0 z-50 bg-surface-container-lowest px-4 py-4 w-12">
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
                  'sticky top-0 z-40 bg-surface-container-lowest py-4 text-[10px] uppercase tracking-[0.18rem] font-black whitespace-nowrap',
                  column.key === 'name' && 'left-12 z-50 shadow-[18px_0_28px_rgba(0,0,0,0.36)] before:absolute before:inset-y-0 before:-left-12 before:w-12 before:bg-surface-container-lowest before:content-[\"\"] before:-z-10',
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
            <th className="px-5 py-4 text-[10px] uppercase tracking-[0.18rem] font-black">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr
              key={member.id}
              onClick={() => onSelect(member)}
              className={cn(
                'cursor-pointer transition-colors hover:bg-surface-container-high',
                selectedMember?.id === member.id && 'bg-primary/10'
              )}
            >
              <td className={cn(
                'sticky left-0 z-30',
                selectedMember?.id === member.id ? 'bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface-container-low))]' : 'bg-surface-container-low',
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
                    'text-sm text-on-surface align-top',
                    column.key === 'name' && cn(
                      'sticky left-12 z-30 shadow-[18px_0_28px_rgba(0,0,0,0.34)] before:absolute before:inset-y-0 before:-left-12 before:w-12 before:content-[\"\"] before:-z-10',
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
              <td className={cn(rowPadding, 'align-top')}>
                <div className="flex gap-2">
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onMarkVerified(member);
                    }}
                    disabled={savingId === member.id}
                    className="p-2 rounded-full bg-surface-container-lowest text-secondary hover:bg-secondary/10 disabled:opacity-40"
                    title="Mark verified"
                  >
                    {savingId === member.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  </button>
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onMarkChased(member);
                    }}
                    disabled={savingId === member.id}
                    className="p-2 rounded-full bg-surface-container-lowest text-primary hover:bg-primary/10 disabled:opacity-40"
                    title="Mark chased"
                  >
                    {savingId === member.id ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  </button>
                </div>
              </td>
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
        <DetailRow label="Expected grad" value={member.expected_graduation_term} />
        <DetailRow label="Initiation" value={formatDate(member.initiation_date)} />
        <DetailRow label="School" value={member.school} />
        <DetailRow label="Major" value={member.major} />
      </DrawerSection>

      <DrawerSection title="Contact">
        <DetailRow label="Phone" value={member.phone} icon={<Phone size={14} />} />
        <DetailRow label="School email" value={member.google_email} icon={<Mail size={14} />} />
        <DetailRow label="Personal email" value={member.personal_email} icon={<Mail size={14} />} />
        <DetailRow label="Local address" value={member.local_address} />
        <DetailRow label="Campus housing" value={member.campus_housing} />
        <DetailRow label="Home" value={[member.home_city, member.home_state].filter(Boolean).join(', ')} />
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
  column('phone', 'Phone', 'Contact', 150, member => member.phone ?? 'Missing', member => member.phone ?? '', member => member.phone),
  column('google_email', 'School Email', 'Contact', 240, member => member.google_email, member => member.google_email, member => member.google_email),
  column('personal_email', 'Personal Email', 'Contact', 240, member => member.personal_email ?? 'Missing', member => member.personal_email ?? '', member => member.personal_email),
  column('expected_graduation_term', 'Grad Term', 'Academic', 160, member => member.expected_graduation_term ?? String(member.graduation_year ?? 'Missing'), member => member.expected_graduation_term ?? '', member => member.expected_graduation_term ?? member.graduation_year),
  column('graduation_year', 'Grad Year', 'Academic', 120, member => member.graduation_year ?? 'Missing', member => member.graduation_year ?? '', member => member.graduation_year),
  column('pledge_class', 'Pledge Class', 'Academic', 160, member => member.pledge_class ?? 'Missing', member => member.pledge_class ?? '', member => member.pledge_class),
  column('initiation_date', 'Initiation', 'Academic', 150, member => formatDate(member.initiation_date) ?? 'Missing', member => formatDate(member.initiation_date) ?? '', member => member.initiation_date),
  column('school', 'School', 'Academic', 190, member => member.school ?? 'Missing', member => member.school ?? '', member => member.school),
  column('major', 'Major', 'Academic', 190, member => member.major ?? 'Missing', member => member.major ?? '', member => member.major),
  column('local_address', 'Local Address', 'Housing', 240, member => member.local_address ?? 'Missing', member => member.local_address ?? '', member => member.local_address),
  column('campus_housing', 'Campus Housing', 'Housing', 170, member => member.campus_housing ?? 'Missing', member => member.campus_housing ?? '', member => member.campus_housing),
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

function getDisplayName(member: SecretaryMemberProfile) {
  return `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}`;
}

function getLegalName(member: SecretaryMemberProfile) {
  return `${member.legal_first_name} ${member.legal_last_name}`;
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Missing';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
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

function isStaleVerification(value?: string | null) {
  if (!value) return true;
  const verifiedAt = new Date(value);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return verifiedAt < cutoff;
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
