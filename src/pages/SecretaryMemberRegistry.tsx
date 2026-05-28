import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
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

type RegistryView = 'active' | 'contact' | 'missing' | 'family';

const REGISTRY_VIEWS: { id: RegistryView; label: string }[] = [
  { id: 'active', label: 'Active Roster' },
  { id: 'contact', label: 'Contact Sheet' },
  { id: 'missing', label: 'Missing Data' },
  { id: 'family', label: 'Parent / Emergency' }
];

export const SecretaryMemberRegistry = () => {
  const [members, setMembers] = useState<SecretaryMemberProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<SecretaryMemberProfile | null>(null);
  const [view, setView] = useState<RegistryView>('active');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchSecretaryMemberProfiles();
      setMembers(data);
      setSelectedMember(current => {
        if (current) return data.find(member => member.id === current.id) ?? data[0] ?? null;
        return data[0] ?? null;
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

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter(member => {
      if (view === 'active' && !['active', 'new_member'].includes(member.status)) return false;
      if (view === 'missing' && member.missing_required_field_count === 0) return false;
      if (statusFilter !== 'all' && member.status !== statusFilter) return false;
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
        member.status
      ]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(query));
    });
  }, [members, search, statusFilter, view]);

  const statusOptions = useMemo(
    () => [...new Set(members.map(member => member.status).filter(Boolean))].sort(),
    [members]
  );

  const missingCount = members.filter(member => member.missing_required_field_count > 0).length;
  const verifiedCount = members.filter(member => member.last_verified_at).length;

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

  const exportVisibleRows = () => {
    const csv = toCsv(filteredMembers.map(member => ({
      name: getDisplayName(member),
      status: member.status,
      suid: member.suid,
      phone: member.phone ?? '',
      google_email: member.google_email,
      personal_email: member.personal_email ?? '',
      school: member.school ?? '',
      major: member.major ?? '',
      pledge_class: member.pledge_class ?? '',
      expected_graduation_term: member.expected_graduation_term ?? '',
      missing_required_field_count: member.missing_required_field_count
    })));

    downloadText(`secretary-registry-${view}.csv`, csv);
  };

  const copyVisibleEmails = async () => {
    const emails = filteredMembers
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
              {members.length} records · {missingCount} missing data · {verifiedCount} verified
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <button
              onClick={() => void copyVisibleEmails()}
              className="bg-surface-container-high text-on-surface px-5 py-3 rounded-full font-black uppercase tracking-[0.16rem] text-[11px] flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            >
              <Copy size={15} />
              Copy Emails
            </button>
            <button
              onClick={exportVisibleRows}
              className="bg-primary text-white px-5 py-3 rounded-full font-black uppercase tracking-[0.16rem] text-[11px] flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Download size={15} />
              Export View
            </button>
          </div>
        </div>

        <div className="flex flex-col 2xl:flex-row gap-4 2xl:items-center 2xl:justify-between">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {REGISTRY_VIEWS.map(option => (
              <button
                key={option.id}
                onClick={() => setView(option.id)}
                className={cn(
                  'px-4 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.18rem] whitespace-nowrap transition-colors',
                  view === option.id
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="bg-surface-container-lowest rounded-full px-5 py-3 flex items-center gap-3 text-on-surface-variant w-full sm:w-96 focus-within:ring-1 focus-within:ring-primary/40">
              <Search size={18} />
              <input
                className="bg-transparent border-none focus:ring-0 p-0 text-sm w-full placeholder:text-on-surface-variant/40"
                placeholder="Search name, SUID, phone, email, school..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </label>

            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              className="bg-surface-container-lowest rounded-full px-5 py-3 text-sm text-on-surface border-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="all">All statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{formatLabel(status)}</option>
              ))}
            </select>
          </div>
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
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
            <RegistryTable
              view={view}
              members={filteredMembers}
              selectedMember={selectedMember}
              savingId={savingId}
              onSelect={setSelectedMember}
              onMarkVerified={member => void markVerified(member)}
              onMarkChased={member => void markChased(member)}
            />
          </div>

          <RegistryDrawer
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            onMarkVerified={member => void markVerified(member)}
            onMarkChased={member => void markChased(member)}
            saving={Boolean(selectedMember && savingId === selectedMember.id)}
          />
        </section>
      )}
    </div>
  );
};

const RegistryTable = ({
  view,
  members,
  selectedMember,
  savingId,
  onSelect,
  onMarkVerified,
  onMarkChased
}: {
  view: RegistryView;
  members: SecretaryMemberProfile[];
  selectedMember: SecretaryMemberProfile | null;
  savingId: string | null;
  onSelect: (member: SecretaryMemberProfile) => void;
  onMarkVerified: (member: SecretaryMemberProfile) => void;
  onMarkChased: (member: SecretaryMemberProfile) => void;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[980px] text-left">
      <thead className="bg-surface-container-lowest text-on-surface-variant">
        <tr>
          {getColumns(view).map(column => (
            <th key={column} className="px-5 py-4 text-[10px] uppercase tracking-[0.18rem] font-black">
              {column}
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
            {renderCells(view, member).map((cell, index) => (
              <td key={`${member.id}-${index}`} className="px-5 py-4 text-sm text-on-surface align-top">
                {cell}
              </td>
            ))}
            <td className="px-5 py-4 align-top">
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
        <DetailRow label="Google email" value={member.google_email} icon={<Mail size={14} />} />
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

const getColumns = (view: RegistryView) => {
  if (view === 'contact') return ['Name', 'Phone', 'Google', 'Personal', 'Social', 'Status'];
  if (view === 'missing') return ['Name', 'Missing', 'Fields', 'Phone', 'Last chased', 'Verified'];
  if (view === 'family') return ['Name', 'Member phone', 'Guardian 1', 'Guardian 2', 'Emergency', 'Consent'];
  return ['Name', 'Status', 'Grad term', 'Pledge class', 'School', 'Major', 'Missing'];
};

const renderCells = (view: RegistryView, member: SecretaryMemberProfile) => {
  if (view === 'contact') {
    return [
      <NameCell member={member} />,
      member.phone ?? 'Missing',
      member.google_email,
      member.personal_email ?? 'Missing',
      [member.instagram, member.snapchat, member.linkedin].filter(Boolean).join(' · ') || 'Missing',
      <StatusPill status={member.status} />
    ];
  }

  if (view === 'missing') {
    return [
      <NameCell member={member} />,
      <span className="font-black text-primary">{member.missing_required_field_count}</span>,
      <span className="text-on-surface-variant">{member.missing_required_fields.slice(0, 4).map(formatLabel).join(', ') || 'Complete'}</span>,
      member.phone ?? 'Missing',
      formatDateTime(member.last_chased_at),
      formatDateTime(member.last_verified_at)
    ];
  }

  if (view === 'family') {
    return [
      <NameCell member={member} />,
      member.phone ?? 'Missing',
      formatContact(member.guardian_1_name, member.guardian_1_relationship, member.guardian_1_phone, member.guardian_1_email),
      formatContact(member.guardian_2_name, member.guardian_2_relationship, member.guardian_2_phone, member.guardian_2_email),
      formatContact(member.emergency_contact_name, member.emergency_contact_relationship, member.emergency_contact_phone, member.emergency_contact_email),
      member.parent_outreach_consent ? 'Yes' : 'No'
    ];
  }

  return [
    <NameCell member={member} />,
    <StatusPill status={member.status} />,
    member.expected_graduation_term ?? String(member.graduation_year ?? 'Missing'),
    member.pledge_class ?? 'Missing',
    member.school ?? 'Missing',
    member.major ?? 'Missing',
    <span className={member.missing_required_field_count > 0 ? 'font-black text-primary' : 'text-secondary font-black'}>
      {member.missing_required_field_count}
    </span>
  ];
};

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

const getDisplayName = (member: SecretaryMemberProfile) =>
  `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}`;

const getLegalName = (member: SecretaryMemberProfile) =>
  `${member.legal_first_name} ${member.legal_last_name}`;

const formatLabel = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const formatDate = (value?: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Missing';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
};

const formatContact = (
  name?: string | null,
  relationship?: string | null,
  phone?: string | null,
  email?: string | null
) => {
  if (!name && !phone && !email) return 'Missing';
  return [name, relationship, phone, email].filter(Boolean).join(' · ');
};

const toCsv = (rows: Record<string, string | number>[]) => {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => escape(row[header])).join(','))
  ].join('\n');
};

const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
