import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Cake,
  CalendarDays,
  Copy,
  ExternalLink,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Search,
  Save,
  SlidersHorizontal,
  UserRound,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import {
  DirectoryMember,
  DirectoryPosition,
  fetchMemberDirectory,
  fetchMemberPositionHistory,
  replaceCurrentStudyAbroadStatus,
  updateMemberDirectoryProfile
} from '../lib/memberDirectory';

type MemberTab = 'active' | 'alumni';
type SortMode = 'last_name' | 'first_name';
type QuickRosterDraft = {
  legal_first_name: string;
  legal_last_name: string;
  preferred_name: string;
  personal_email: string;
  phone: string;
  instagram: string;
  snapchat: string;
  linkedin: string;
  school: string;
  major: string;
  graduation_year: string;
  avatar_url: string;
  pledge_class: string;
  study_abroad_label: string;
  study_abroad_start_term: string;
  study_abroad_end_term: string;
  birthday_month: string;
  birthday_day: string;
  bio: string;
};

export const MemberDirectory = () => {
  const { can } = useAuth();
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);
  const [editingMember, setEditingMember] = useState<DirectoryMember | null>(null);
  const [quickDraft, setQuickDraft] = useState<QuickRosterDraft | null>(null);
  const [positions, setPositions] = useState<DirectoryPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<MemberTab>('active');
  const [search, setSearch] = useState('');
  const [classYear, setClassYear] = useState('all');
  const [school, setSchool] = useState('all');
  const [major, setMajor] = useState('all');
  const [pledgeClass, setPledgeClass] = useState('all');
  const [groupByPledgeClass, setGroupByPledgeClass] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('last_name');
  const canManageRoster = can('roster.manage');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMemberDirectory();
      setMembers(data);
      setSelectedMember(current => {
        if (current) {
          return data.find(member => member.id === current.id) ?? current;
        }

        return data.find(member => isActiveRosterMember(member)) ?? data[0] ?? null;
      });
    } catch (err) {
      console.error('Error loading member directory:', err);
      setError('Unable to load the live member directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const openQuickEditor = (member: DirectoryMember | null = selectedMember) => {
    const target = member ?? members.find(isActiveRosterMember) ?? members[0] ?? null;
    if (!target) return;

    setEditingMember(target);
    setQuickDraft(createQuickDraft(target));
    setQuickError(null);
  };

  const saveQuickEditor = async () => {
    if (!editingMember || !quickDraft) return;

    setQuickSaving(true);
    setQuickError(null);

    try {
      await updateMemberDirectoryProfile(editingMember.id, {
        legal_first_name: requiredText(quickDraft.legal_first_name, editingMember.legal_first_name),
        legal_last_name: requiredText(quickDraft.legal_last_name, editingMember.legal_last_name),
        preferred_name: nullableText(quickDraft.preferred_name),
        personal_email: nullableText(quickDraft.personal_email),
        phone: nullableText(quickDraft.phone),
        instagram: nullableText(quickDraft.instagram),
        snapchat: nullableText(quickDraft.snapchat),
        linkedin: nullableText(quickDraft.linkedin),
        school: nullableText(quickDraft.school),
        major: requiredText(quickDraft.major, editingMember.major ?? 'Undeclared'),
        graduation_year: parseRequiredYear(quickDraft.graduation_year, editingMember.graduation_year),
        avatar_url: nullableText(quickDraft.avatar_url),
        pledge_class: nullableText(quickDraft.pledge_class),
        birthday_month: parseNullableNumber(quickDraft.birthday_month),
        birthday_day: parseNullableNumber(quickDraft.birthday_day),
        bio: nullableText(quickDraft.bio)
      });
      await replaceCurrentStudyAbroadStatus(editingMember.id, {
        label: nullableText(quickDraft.study_abroad_label),
        start_term: nullableText(quickDraft.study_abroad_start_term),
        end_term: nullableText(quickDraft.study_abroad_end_term)
      });

      await loadMembers();
      setEditingMember(null);
      setQuickDraft(null);
    } catch (err) {
      console.error('Error saving quick roster data:', err);
      setQuickError(err instanceof Error ? err.message : 'Unable to save member data.');
    } finally {
      setQuickSaving(false);
    }
  };

  const updateQuickDraft = (field: keyof QuickRosterDraft, value: string) => {
    setQuickDraft(current => current ? { ...current, [field]: value } : current);
  };

  const chooseQuickEditorMember = (memberId: string) => {
    const nextMember = members.find(member => member.id === memberId);
    if (nextMember) {
      setEditingMember(nextMember);
      setQuickDraft(createQuickDraft(nextMember));
      setQuickError(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadPositions = async () => {
      if (!selectedMember) {
        setPositions([]);
        return;
      }

      setPositionsLoading(true);
      const data = await fetchMemberPositionHistory(selectedMember.id);
      if (isMounted) {
        setPositions(data);
        setPositionsLoading(false);
      }
    };

    void loadPositions();

    return () => {
      isMounted = false;
    };
  }, [selectedMember]);

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return members.filter(member => {
      if (tab === 'active' && !isActiveRosterMember(member)) return false;
      if (tab === 'alumni' && member.status !== 'alumni') return false;
      if (classYear !== 'all' && String(member.graduation_year ?? '') !== classYear) return false;
      if (school !== 'all' && getSchool(member) !== school) return false;
      if (major !== 'all' && (member.major ?? '') !== major) return false;
      if (pledgeClass !== 'all' && (member.pledge_class ?? '') !== pledgeClass) return false;

      if (!normalizedSearch) return true;

      return [
        getDisplayName(member),
        getLegalName(member),
        getSchool(member),
        member.major,
        member.linkedin,
        member.phone?.replace(/\D/g, '').slice(-4)
      ]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(normalizedSearch));
    }).sort((a, b) => sortMembers(a, b, sortMode));
  }, [classYear, major, members, pledgeClass, school, search, sortMode, tab]);

  const groupedMembers = useMemo(() => {
    if (!groupByPledgeClass) {
      return [{ label: null, members: filteredMembers }];
    }

    const groups = filteredMembers.reduce<Map<string, DirectoryMember[]>>((acc, member) => {
      const label = member.pledge_class ?? 'Pledge Class Missing';
      acc.set(label, [...(acc.get(label) ?? []), member]);
      return acc;
    }, new Map());

    return [...groups.entries()].map(([label, groupMembers]) => ({ label, members: groupMembers }));
  }, [filteredMembers, groupByPledgeClass]);

  const birthdaysThisWeek = useMemo(
    () => members.filter(member => isBirthdayThisWeek(member)).slice(0, 4),
    [members]
  );

  const options = useMemo(() => ({
    classYears: uniqueOptions(members.map(member => member.graduation_year ? String(member.graduation_year) : null)),
    schools: uniqueOptions(members.map(getSchool)),
    majors: uniqueOptions(members.map(member => member.major)),
    pledgeClasses: uniqueOptions(members.map(member => member.pledge_class))
  }), [members]);

  return (
    <div className="max-w-[1480px] mx-auto pb-20">
      <section className="mb-10 flex flex-col gap-8">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-on-surface">
              Member Directory
            </h1>
            <p className="mt-3 text-on-surface-variant font-medium">
              {members.filter(isActiveRosterMember).length} active members · {members.filter(member => member.status === 'alumni').length} alumni records
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            {canManageRoster && (
              <button
                onClick={() => openQuickEditor()}
                className="bg-primary text-white px-5 py-3 rounded-full font-black uppercase tracking-[0.16rem] text-[11px] flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <Pencil size={15} />
                Quick Data Entry
              </button>
            )}
            <label className="bg-surface-container-lowest rounded-full px-5 py-3 flex items-center gap-3 text-on-surface-variant w-full sm:w-96 focus-within:ring-1 focus-within:ring-primary/40">
              <Search size={18} />
              <input
                className="bg-transparent border-none focus:ring-0 p-0 text-sm w-full placeholder:text-on-surface-variant/40"
                placeholder="Search name, school, major, phone last 4..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex gap-8">
            <TabButton active={tab === 'active'} onClick={() => setTab('active')}>
              Active Members
            </TabButton>
            <TabButton active={tab === 'alumni'} onClick={() => setTab('alumni')}>
              Alumni
            </TabButton>
          </div>

          <label className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full">
            <span className="text-[10px] uppercase tracking-[0.18rem] text-on-surface-variant font-black">
              Group by pledge class
            </span>
            <input
              type="checkbox"
              className="sr-only peer"
              checked={groupByPledgeClass}
              onChange={event => setGroupByPledgeClass(event.target.checked)}
            />
            <span className="w-10 h-5 rounded-full bg-surface-container-high relative after:absolute after:top-1 after:left-1 after:w-3 after:h-3 after:rounded-full after:bg-on-surface after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5" />
          </label>
        </div>

        <FilterBar
          classYear={classYear}
          school={school}
          major={major}
          pledgeClass={pledgeClass}
          options={options}
          onClassYearChange={setClassYear}
          onSchoolChange={setSchool}
          onMajorChange={setMajor}
          onPledgeClassChange={setPledgeClass}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          onClear={() => {
            setClassYear('all');
            setSchool('all');
            setMajor('all');
            setPledgeClass('all');
            setSearch('');
          }}
        />
      </section>

      {birthdaysThisWeek.length > 0 && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-2xl font-black tracking-tight text-on-surface">Birthdays This Week</h2>
            <button className="text-primary text-[10px] font-black uppercase tracking-[0.18rem] hover:text-primary-fixed">
              View Calendar
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {birthdaysThisWeek.map(member => (
              <React.Fragment key={member.id}>
                <BirthdayChip member={member} />
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      {loading && (
        <section className="bg-surface-container-low/50 rounded-xl p-10 flex items-center justify-center gap-3 text-on-surface-variant">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.2rem]">Loading live member directory</span>
        </section>
      )}

      {error && (
        <section className="bg-error/10 rounded-xl p-6 flex items-center gap-3 text-error">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </section>
      )}

      {!loading && !error && (
        <section className="space-y-10">
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-black tracking-tight text-on-surface">
              {tab === 'active' ? 'Active Roster' : 'Alumni Roster'}
            </h2>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2rem] text-on-surface-variant font-black">
              <SlidersHorizontal size={14} />
              {filteredMembers.length} shown
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl p-12 text-center text-on-surface-variant">
              No members match the current filters.
            </div>
          ) : (
            groupedMembers.map(group => (
              <div key={group.label ?? 'all'} className="space-y-5">
                {group.label && (
                  <h3 className="text-[11px] uppercase tracking-[0.24rem] font-black text-secondary">
                    {group.label}
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {group.members.map(member => (
                    <React.Fragment key={member.id}>
                      <MemberCard
                        member={member}
                        selected={selectedMember?.id === member.id}
                        onSelect={() => setSelectedMember(member)}
                      />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      <ProfileDrawer
        member={selectedMember}
        positions={positions}
        loadingPositions={positionsLoading}
        onClose={() => setSelectedMember(null)}
      />

      {canManageRoster && (
        <QuickRosterEditor
          members={members}
          member={editingMember}
          draft={quickDraft}
          saving={quickSaving}
          error={quickError}
          onSelectMember={chooseQuickEditorMember}
          onChange={updateQuickDraft}
          onSave={saveQuickEditor}
          onClose={() => {
            setEditingMember(null);
            setQuickDraft(null);
            setQuickError(null);
          }}
        />
      )}
    </div>
  );
};

const QuickRosterEditor = ({
  members,
  member,
  draft,
  saving,
  error,
  onSelectMember,
  onChange,
  onSave,
  onClose
}: {
  members: DirectoryMember[];
  member: DirectoryMember | null;
  draft: QuickRosterDraft | null;
  saving: boolean;
  error: string | null;
  onSelectMember: (memberId: string) => void;
  onChange: (field: keyof QuickRosterDraft, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) => (
  <div
    className={cn(
      "fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm transition-opacity",
      member && draft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
    )}
  >
    {member && draft && (
      <div className="absolute inset-x-4 top-8 mx-auto max-w-5xl max-h-[calc(100vh-4rem)] overflow-y-auto rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-2xl">
        <div className="sticky top-0 z-10 bg-surface-container-lowest/95 backdrop-blur-xl p-6 border-b border-outline-variant/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24rem] text-primary font-black mb-2">Temporary Roster Editor</p>
            <h2 className="text-3xl font-black tracking-tight text-on-surface">Quick Data Entry</h2>
            <p className="text-sm text-on-surface-variant mt-1">Officer-only helper for filling live member directory fields.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={member.id}
              onChange={event => onSelectMember(event.target.value)}
              className="bg-surface-container-high border-none rounded-lg text-sm text-on-surface font-semibold py-3 px-4 focus:ring-1 focus:ring-primary min-w-64"
            >
              {members.map(option => (
                <option key={option.id} value={option.id}>{getCardName(option)}</option>
              ))}
            </select>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-6 rounded-xl bg-error/10 border border-error/20 p-4 text-sm text-error font-bold">
            {error}
          </div>
        )}

        <div className="p-6 space-y-6">
          <QuickSection title="Identity">
            <QuickField label="Legal First" value={draft.legal_first_name} onChange={value => onChange('legal_first_name', value)} />
            <QuickField label="Legal Last" value={draft.legal_last_name} onChange={value => onChange('legal_last_name', value)} />
            <QuickField label="Preferred Name" value={draft.preferred_name} onChange={value => onChange('preferred_name', value)} />
            <QuickField label="Avatar URL" value={draft.avatar_url} onChange={value => onChange('avatar_url', value)} />
          </QuickSection>

          <QuickSection title="Chapter And Academic">
            <QuickField label="Class Year" value={draft.graduation_year} onChange={value => onChange('graduation_year', value)} placeholder="2027" />
            <QuickField label="Pledge Class" value={draft.pledge_class} onChange={value => onChange('pledge_class', value)} placeholder="Spring 2027" />
            <QuickField label="Study Abroad" value={draft.study_abroad_label} onChange={value => onChange('study_abroad_label', value)} placeholder="Madrid program" />
            <QuickField label="Study Abroad Start" value={draft.study_abroad_start_term} onChange={value => onChange('study_abroad_start_term', value)} placeholder="Spring 2027" />
            <QuickField label="Study Abroad End" value={draft.study_abroad_end_term} onChange={value => onChange('study_abroad_end_term', value)} placeholder="Summer 2027" />
            <QuickField label="School" value={draft.school} onChange={value => onChange('school', value)} placeholder="Whitman" />
            <QuickField label="Major" value={draft.major} onChange={value => onChange('major', value)} />
            <QuickField label="Birthday Month" value={draft.birthday_month} onChange={value => onChange('birthday_month', value)} placeholder="1-12" />
            <QuickField label="Birthday Day" value={draft.birthday_day} onChange={value => onChange('birthday_day', value)} placeholder="1-31" />
          </QuickSection>

          <QuickSection title="Contact And Social">
            <QuickField label="Personal Email" value={draft.personal_email} onChange={value => onChange('personal_email', value)} />
            <QuickField label="Phone" value={draft.phone} onChange={value => onChange('phone', value)} placeholder="315-555-0101" />
            <QuickField label="Instagram" value={draft.instagram} onChange={value => onChange('instagram', value)} placeholder="@handle" />
            <QuickField label="Snapchat" value={draft.snapchat} onChange={value => onChange('snapchat', value)} placeholder="@handle" />
            <QuickField label="LinkedIn" value={draft.linkedin} onChange={value => onChange('linkedin', value)} placeholder="linkedin.com/in/profile" />
          </QuickSection>

          <QuickSection title="Profile">
            <div className="md:col-span-2 xl:col-span-3">
              <QuickField label="Bio" value={draft.bio} onChange={value => onChange('bio', value)} textarea />
            </div>
          </QuickSection>
        </div>

        <div className="sticky bottom-0 bg-surface-container-lowest/95 backdrop-blur-xl p-6 border-t border-outline-variant/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-full bg-surface-container-high text-on-surface-variant font-black uppercase tracking-[0.16rem] text-[11px] hover:text-on-surface"
          >
            Close
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-3 rounded-full bg-primary text-white font-black uppercase tracking-[0.16rem] text-[11px] flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Member
          </button>
        </div>
      </div>
    )}
  </div>
);

const QuickSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl bg-surface-container-low/45 border border-outline-variant/10 p-5">
    <h3 className="text-[10px] uppercase tracking-[0.24rem] text-primary font-black mb-4">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {children}
    </div>
  </section>
);

const QuickField = ({
  label,
  value,
  onChange,
  placeholder,
  textarea = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) => (
  <label className="flex flex-col gap-2">
    <span className="text-[10px] uppercase tracking-[0.18rem] text-on-surface-variant font-black">{label}</span>
    {textarea ? (
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="bg-surface-container-high border-none rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/35 focus:ring-1 focus:ring-primary resize-none"
      />
    ) : (
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="bg-surface-container-high border-none rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/35 focus:ring-1 focus:ring-primary"
      />
    )}
  </label>
);

const FilterBar = ({
  classYear,
  school,
  major,
  pledgeClass,
  options,
  onClassYearChange,
  onSchoolChange,
  onMajorChange,
  onPledgeClassChange,
  sortMode,
  onSortModeChange,
  onClear
}: {
  classYear: string;
  school: string;
  major: string;
  pledgeClass: string;
  options: { classYears: string[]; schools: string[]; majors: string[]; pledgeClasses: string[] };
  onClassYearChange: (value: string) => void;
  onSchoolChange: (value: string) => void;
  onMajorChange: (value: string) => void;
  onPledgeClassChange: (value: string) => void;
  sortMode: SortMode;
  onSortModeChange: (value: SortMode) => void;
  onClear: () => void;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] gap-3">
    <FilterSelect label="Class Year" value={classYear} values={options.classYears} onChange={onClassYearChange} />
    <FilterSelect label="School" value={school} values={options.schools} onChange={onSchoolChange} />
    <FilterSelect label="Major" value={major} values={options.majors} onChange={onMajorChange} />
    <FilterSelect label="Pledge Class" value={pledgeClass} values={options.pledgeClasses} onChange={onPledgeClassChange} />
    <select
      className="bg-surface-container-lowest border-none rounded-lg text-sm text-on-surface-variant font-semibold py-3 px-4 focus:ring-1 focus:ring-primary"
      value={sortMode}
      onChange={event => onSortModeChange(event.target.value as SortMode)}
    >
      <option value="last_name">Sort: Last Name</option>
      <option value="first_name">Sort: First Name</option>
    </select>
    <button
      onClick={onClear}
      className="bg-primary/10 text-primary font-black uppercase text-[11px] tracking-[0.16rem] px-5 py-3 rounded-lg hover:bg-primary/20 transition-colors"
    >
      Clear Filters
    </button>
  </div>
);

const FilterSelect = ({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) => (
  <select
    className="bg-surface-container-lowest border-none rounded-lg text-sm text-on-surface-variant font-semibold py-3 px-4 focus:ring-1 focus:ring-primary"
    value={value}
    onChange={event => onChange(event.target.value)}
  >
    <option value="all">{label}</option>
    {values.map(option => (
      <option key={option} value={option}>{option}</option>
    ))}
  </select>
);

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "pb-4 text-sm font-black uppercase tracking-[0.25rem] transition-colors",
      active ? "text-primary shadow-[inset_0_-2px_0_#C41E3A]" : "text-on-surface-variant hover:text-on-surface"
    )}
  >
    {children}
  </button>
);

const BirthdayChip = ({ member }: { member: DirectoryMember }) => (
  <button className="bg-surface-container-low rounded-lg p-4 flex items-center gap-4 min-w-[260px] text-left hover:bg-surface-container-high transition-colors">
    <Avatar member={member} size="sm" />
    <div>
      <p className="font-bold text-on-surface">{getDisplayName(member)}</p>
      <p className="text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
        {formatBirthday(member)}
      </p>
    </div>
  </button>
);

const MemberCard = ({ member, selected, onSelect }: { member: DirectoryMember; selected: boolean; onSelect: () => void }) => {
  const phoneHref = getPhoneHref(member.phone);
  const smsHref = getSmsHref(member.phone);
  const socialHref = getSocialHref(member);

  return (
    <article
      onClick={onSelect}
      className={cn(
        "group bg-surface-container-low rounded-xl p-8 flex flex-col items-center text-center transition-all duration-300 cursor-pointer min-h-[430px] border border-transparent hover:-translate-y-1 hover:bg-surface-container hover:border-primary/20 hover:shadow-[0_18px_45px_rgba(0,0,0,0.28)]",
        selected && "bg-surface-container ring-1 ring-primary/30 border-primary/25"
      )}
    >
      <div className="relative mb-7 transition-transform duration-300 group-hover:scale-[1.03]">
        <Avatar member={member} size="lg" />
        {member.current_status_type === 'study_abroad' && (
          <span className="absolute -top-1 -right-4 bg-secondary text-surface text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
            Study Abroad
          </span>
        )}
      </div>
      <h3 className="text-2xl font-black text-on-surface mb-2 group-hover:text-primary transition-colors">
        {getCardName(member)}
      </h3>
      <p className="text-on-surface font-bold text-sm mb-1">{getSchool(member) || 'School missing'}</p>
      <p className="text-on-surface-variant text-sm font-medium mb-1">
        {[member.major, formatClassYear(member.graduation_year)].filter(Boolean).join(' · ') || 'Academic info missing'}
      </p>
      <p className="text-[11px] text-on-surface-variant/50 font-bold uppercase tracking-widest mb-8 italic">
        {member.pledge_class ? `Pledge Class: ${member.pledge_class}` : 'Pledge class missing'}
      </p>
      <div className="flex gap-4 mt-auto">
        <QuickAction label="Text" href={smsHref} icon={<MessageCircle size={19} />} />
        <QuickAction label="Call" href={phoneHref} icon={<Phone size={18} />} />
        <QuickAction label={member.instagram ? 'Instagram' : 'Snapchat'} href={socialHref} icon={member.instagram ? <Instagram size={18} /> : <SnapchatIcon size={18} />} />
      </div>
    </article>
  );
};

const QuickAction = ({ label, href, icon }: { label: string; href: string | null; icon: React.ReactNode }) => (
  <a
    aria-label={label}
    href={href ?? undefined}
    target={href?.startsWith('http') ? '_blank' : undefined}
    rel={href?.startsWith('http') ? 'noreferrer' : undefined}
    onClick={event => event.stopPropagation()}
    className={cn(
      "w-11 h-11 rounded-full flex items-center justify-center bg-surface-container-lowest text-on-surface-variant transition-colors",
      href ? "hover:text-primary" : "opacity-30 pointer-events-none"
    )}
  >
    {icon}
  </a>
);

const ProfileDrawer = ({
  member,
  positions,
  loadingPositions,
  onClose
}: {
  member: DirectoryMember | null;
  positions: DirectoryPosition[];
  loadingPositions: boolean;
  onClose: () => void;
}) => {
  const currentPositions = positions.filter(position => !position.removed_at);
  const pastPositions = positions.filter(position => position.removed_at);
  const primaryName = member ? getDrawerPrimaryName(member) : '';
  const legalName = member ? getDrawerLegalName(member) : null;

  return (
    <aside
      className={cn(
        "fixed right-0 top-0 h-full w-full sm:w-[460px] bg-surface-container-lowest z-[60] shadow-[-32px_0_64px_rgba(0,0,0,0.7)] overflow-y-auto flex flex-col transition-transform duration-500",
        member ? "translate-x-0" : "translate-x-full"
      )}
    >
      {member && (
        <>
          <div className="relative h-[360px] w-full flex-shrink-0 bg-surface-container-high overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center opacity-40">
              <Avatar member={member} size="hero" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/40 to-black/10" />
            <div className="absolute top-7 left-7 right-20 z-10 flex flex-wrap items-center gap-2">
              {currentPositions[0] && <Badge tone="gold">{currentPositions[0].display_name}</Badge>}
              {member.current_status_type === 'study_abroad' && <Badge tone="gold">Study Abroad</Badge>}
              {member.status === 'alumni' && <Badge tone="muted">Alumni</Badge>}
            </div>
            <button
              className="absolute top-7 right-7 text-on-surface hover:text-primary bg-black/40 backdrop-blur-xl rounded-full transition-all z-10 w-10 h-10 flex items-center justify-center"
              onClick={onClose}
            >
              <X size={20} />
            </button>
            <div className="absolute bottom-8 left-8 right-8">
              <h2 className={cn("leading-[0.96] font-black text-on-surface tracking-tight mb-3 break-words", getDrawerNameSize(primaryName))}>
                {primaryName}
              </h2>
              {legalName && (
                <p className="text-sm text-on-surface-variant font-semibold">
                  <span className="text-[10px] uppercase tracking-[0.2rem] text-on-surface-variant/60 font-black mr-2">Legal name</span>
                  {legalName}
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 px-8 py-10 flex flex-col gap-10">
            <div className="grid grid-cols-2 gap-x-8">
              <div className="flex flex-col gap-8">
                <ProfileFact label="Class Year" value={formatClassYear(member.graduation_year)} />
                <ProfileFact label="Pledge Class" value={member.pledge_class} />
                <ProfileFact label="Study Abroad" value={formatStudyAbroad(member)} muted={!member.current_status_type} />
              </div>
              <div className="flex flex-col gap-8">
                <ProfileFact label="School" value={getSchool(member)} />
                <ProfileFact label="Major" value={member.major} />
                <ProfileFact label="Birthday" value={formatBirthday(member)} />
              </div>
            </div>

            <section className="py-8 shadow-[inset_0_1px_0_rgba(170,137,137,0.08),inset_0_-1px_0_rgba(170,137,137,0.08)]">
              <h3 className="text-[10px] uppercase tracking-[0.25rem] text-on-surface-variant font-black mb-5">Contact</h3>
              <div className="flex flex-col gap-3">
                <ContactRow icon={<Phone size={18} />} label={member.phone} href={getPhoneHref(member.phone)} copyValue={member.phone} />
                <ContactRow icon={<Mail size={18} />} label={member.personal_email ?? member.google_email} href={`mailto:${member.personal_email ?? member.google_email}`} copyValue={member.personal_email ?? member.google_email} />
                <ContactRow icon={<Instagram size={18} />} label={formatHandle(member.instagram)} href={member.instagram ? `https://instagram.com/${cleanHandle(member.instagram)}` : null} copyValue={member.instagram} />
                <ContactRow icon={<SnapchatIcon size={18} />} label={formatHandle(member.snapchat)} href={member.snapchat ? `https://www.snapchat.com/add/${cleanHandle(member.snapchat)}` : null} copyValue={member.snapchat} />
                <ContactRow icon={<Linkedin size={18} />} label={formatLinkedIn(member.linkedin)} href={getLinkedInHref(member.linkedin)} copyValue={member.linkedin} />
              </div>
            </section>

            <section>
              <h3 className="text-xl font-black mb-5 text-on-surface tracking-tight">Positions</h3>
              {loadingPositions ? (
                <div className="flex items-center gap-3 text-on-surface-variant text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading position history
                </div>
              ) : positions.length === 0 ? (
                <p className="text-sm text-on-surface-variant/70">No position history available.</p>
              ) : (
                <div className="flex flex-col gap-5 relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant">
                  {[...currentPositions, ...pastPositions].map(position => (
                    <React.Fragment key={position.id}>
                      <PositionTimelineItem position={position} />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </section>

            {member.bio && (
              <section>
                <h3 className="text-xl font-black mb-4 text-on-surface tracking-tight">Biography</h3>
                <p className="text-on-surface-variant/80 text-base leading-relaxed">
                  {member.bio}
                </p>
              </section>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

const Avatar = ({ member, size }: { member: DirectoryMember; size: 'sm' | 'lg' | 'hero' }) => {
  const sizeClass = {
    sm: 'w-12 h-12 text-sm',
    lg: 'w-40 h-40 text-4xl',
    hero: 'w-44 h-44 text-5xl'
  }[size];

  if (member.avatar_url) {
    return <img alt={getDisplayName(member)} className={cn(sizeClass, "rounded-full object-cover shadow-2xl")} src={member.avatar_url} />;
  }

  return (
    <div className={cn(sizeClass, "rounded-full bg-surface-container-high flex items-center justify-center shadow-2xl text-secondary font-black")}>
      {getInitials(member)}
    </div>
  );
};

const Badge = ({ tone, children }: { tone: 'gold' | 'muted'; children: React.ReactNode }) => (
  <span className={cn(
    "text-[10px] font-black uppercase tracking-[0.22rem] px-4 py-2 rounded-full",
    tone === 'gold' ? "text-secondary bg-secondary/10" : "text-on-surface-variant bg-surface-container-high"
  )}>
    {children}
  </span>
);

const SnapchatIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3.25c-2.65 0-4.2 2.05-4.2 4.75v2.15c0 .72-.64 1.15-1.72 1.5-.48.16-.5.83-.04 1.04 1.18.54 1.78.97 2.08 1.78.4 1.05 1.32 1.72 2.62 1.86.46.05.66.42 1.26.42s.8-.37 1.26-.42c1.3-.14 2.22-.81 2.62-1.86.3-.81.9-1.24 2.08-1.78.46-.21.44-.88-.04-1.04-1.08-.35-1.72-.78-1.72-1.5V8c0-2.7-1.55-4.75-4.2-4.75Z" />
    <path d="M9.2 18.15c.7.55 1.57.85 2.8.85s2.1-.3 2.8-.85" />
  </svg>
);

const ProfileFact = ({ label, value, muted = false }: { label: string; value: string | null | undefined; muted?: boolean }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-[0.22rem] text-on-surface-variant font-black">{label}</span>
    <p className={cn("font-bold text-lg", muted ? "text-on-surface-variant/45" : "text-on-surface")}>{value || 'Not provided'}</p>
  </div>
);

const ContactRow = ({ icon, label, href, copyValue }: { icon: React.ReactNode; label: string | null | undefined; href: string | null; copyValue: string | null | undefined }) => (
  <div className="flex items-center justify-between bg-surface-container-high/50 p-4 rounded-lg">
    <a
      href={href ?? undefined}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noreferrer' : undefined}
      className={cn("flex items-center gap-4 min-w-0", href ? "hover:text-primary" : "pointer-events-none opacity-50")}
    >
      <span className="text-on-surface-variant">{icon}</span>
      <span className="text-sm font-bold truncate">{label || 'Not provided'}</span>
      {href?.startsWith('http') && <ExternalLink size={14} className="text-on-surface-variant" />}
    </a>
    <button
      disabled={!copyValue}
      onClick={() => copyValue && void navigator.clipboard?.writeText(copyValue)}
      className="text-on-surface-variant hover:text-primary disabled:opacity-20 disabled:pointer-events-none"
    >
      <Copy size={17} />
    </button>
  </div>
);

const PositionTimelineItem = ({ position }: { position: DirectoryPosition }) => (
  <div className="flex items-center gap-5 relative">
    <div className={cn(
      "absolute -left-[29px] w-3 h-3 rounded-full ring-4 ring-surface-container-lowest",
      position.removed_at ? "bg-outline-variant" : "bg-primary"
    )} />
    <div className={cn(
      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
      position.removed_at ? "bg-surface-container-high text-on-surface-variant/50" : "bg-primary/10 text-primary"
    )}>
      <UserRound size={18} />
    </div>
    <div>
      <h4 className={cn("font-bold", position.removed_at ? "text-on-surface-variant/70" : "text-on-surface")}>{position.display_name}</h4>
      <p className={cn(
        "text-[10px] font-black uppercase tracking-widest",
        position.removed_at ? "text-on-surface-variant/35" : "text-secondary"
      )}>
        {position.removed_at ? position.semester ?? 'Past tenure' : 'Current tenure'}
      </p>
    </div>
  </div>
);

const uniqueOptions = (values: Array<string | null | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));

const createQuickDraft = (member: DirectoryMember): QuickRosterDraft => ({
  legal_first_name: member.legal_first_name ?? '',
  legal_last_name: member.legal_last_name ?? '',
  preferred_name: member.preferred_name ?? '',
  personal_email: member.personal_email ?? '',
  phone: member.phone ?? '',
  instagram: member.instagram ?? '',
  snapchat: member.snapchat ?? '',
  linkedin: member.linkedin ?? '',
  school: getSchool(member) ?? '',
  major: member.major ?? '',
  graduation_year: member.graduation_year ? String(member.graduation_year) : '',
  avatar_url: member.avatar_url ?? '',
  pledge_class: member.pledge_class ?? '',
  study_abroad_label: member.current_status_label ?? '',
  study_abroad_start_term: member.current_status_start_term ?? '',
  study_abroad_end_term: member.current_status_end_term ?? '',
  birthday_month: member.birthday_month ? String(member.birthday_month) : '',
  birthday_day: member.birthday_day ? String(member.birthday_day) : '',
  bio: member.bio ?? ''
});

const nullableText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const requiredText = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const parseRequiredYear = (value: string, fallback: number | null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback ?? new Date().getFullYear();
};

const parseNullableNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const isActiveRosterMember = (member: DirectoryMember) =>
  ['active', 'new_member'].includes(member.status);

const getDisplayName = (member: DirectoryMember) =>
  member.preferred_name?.trim() || `${member.legal_first_name} ${member.legal_last_name}`.trim();

const getCardName = (member: DirectoryMember) =>
  `${member.preferred_name?.trim() || member.legal_first_name} ${member.legal_last_name}`.trim();

const getLegalName = (member: DirectoryMember) =>
  `${member.legal_first_name} ${member.legal_last_name}`.trim();

const getDrawerPrimaryName = getCardName;

const getDrawerLegalName = (member: DirectoryMember) => {
  const legalName = getLegalName(member);
  const primaryName = getDrawerPrimaryName(member);

  return normalizeName(legalName) !== normalizeName(primaryName) ? legalName : null;
};

const normalizeName = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toLowerCase();

const getDrawerNameSize = (name: string) => {
  if (name.length > 30) return 'text-3xl';
  if (name.length > 22) return 'text-4xl';
  return 'text-5xl';
};

const getSchool = (member: DirectoryMember) =>
  member.school ?? member.college ?? null;

const getInitials = (member: DirectoryMember) => {
  const first = member.preferred_name?.[0] ?? member.legal_first_name?.[0] ?? '';
  const last = member.legal_last_name?.[0] ?? '';
  return `${first}${last}`.toUpperCase() || 'M';
};

const sortMembers = (a: DirectoryMember, b: DirectoryMember, sortMode: SortMode) => {
  if (sortMode === 'first_name') {
    return getDisplayName(a).localeCompare(getDisplayName(b));
  }

  const lastNameCompare = a.legal_last_name.localeCompare(b.legal_last_name);
  if (lastNameCompare !== 0) return lastNameCompare;

  return getDisplayName(a).localeCompare(getDisplayName(b));
};

const formatClassYear = (year: number | null | undefined) =>
  year ? `Class of ${year}` : null;

const formatBirthday = (member: DirectoryMember) => {
  if (!member.birthday_month || !member.birthday_day) return null;
  const date = new Date(2024, member.birthday_month - 1, member.birthday_day);
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
};

const formatStudyAbroad = (member: DirectoryMember) => {
  if (member.current_status_type !== 'study_abroad') return 'Not scheduled';
  return member.current_status_label ?? ([member.current_status_start_term, member.current_status_end_term].filter(Boolean).join(' - ') || 'Scheduled');
};

const isBirthdayThisWeek = (member: DirectoryMember) => {
  if (!member.birthday_month || !member.birthday_day) return false;

  const today = new Date();
  const birthday = new Date(today.getFullYear(), member.birthday_month - 1, member.birthday_day);
  const diffDays = Math.ceil((birthday.getTime() - today.setHours(0, 0, 0, 0)) / 86_400_000);

  return diffDays >= 0 && diffDays <= 7;
};

const getPhoneHref = (phone: string | null | undefined) => {
  const digits = phone?.replace(/\D/g, '');
  return digits ? `tel:+1${digits.length === 10 ? digits : digits.slice(-10)}` : null;
};

const getSmsHref = (phone: string | null | undefined) => {
  const digits = phone?.replace(/\D/g, '');
  return digits ? `sms:+1${digits.length === 10 ? digits : digits.slice(-10)}` : null;
};

const getSocialHref = (member: DirectoryMember) => {
  if (member.instagram) return `https://instagram.com/${cleanHandle(member.instagram)}`;
  if (member.snapchat) return `https://www.snapchat.com/add/${cleanHandle(member.snapchat)}`;
  return null;
};

const cleanHandle = (handle: string) =>
  handle.trim().replace(/^@/, '');

const formatHandle = (handle: string | null | undefined) =>
  handle ? `@${cleanHandle(handle)}` : null;

const getLinkedInHref = (linkedin: string | null | undefined) => {
  if (!linkedin) return null;
  const trimmed = cleanLinkedIn(linkedin);
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.includes('linkedin.com')) return `https://${trimmed}`;
  if (trimmed.includes('.')) return `https://${trimmed}`;
  return `https://www.linkedin.com/in/${trimmed}`;
};

const formatLinkedIn = (linkedin: string | null | undefined) => {
  if (!linkedin) return null;
  const trimmed = cleanLinkedIn(linkedin).replace(/^https?:\/\//, '');
  if (!trimmed) return null;
  if (trimmed.includes('linkedin.com')) return trimmed.replace(/\/$/, '');
  if (trimmed.includes('.')) return trimmed.replace(/\/$/, '');
  return `linkedin.com/in/${trimmed}`;
};

const cleanLinkedIn = (linkedin: string) =>
  linkedin.trim().replace(/^@/, '').replace(/^linkedin\.com\/in\//, '').replace(/^www\.linkedin\.com\/in\//, '').replace(/\/$/, '');
