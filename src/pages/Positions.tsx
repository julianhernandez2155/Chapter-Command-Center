import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  BriefcaseBusiness,
  ChevronDown,
  Gavel,
  Home,
  Loader2,
  Plus,
  Shield,
  UserCircle,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { fetchPositionDashboard, PositionGroupSummary, PositionWithAssignment } from '../lib/roster';

export const Positions = () => {
  const { can } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [groups, setGroups] = useState<PositionGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPositions = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPositionDashboard();
        if (isMounted) {
          setGroups(data);
        }
      } catch (err) {
        console.error('Error loading live positions:', err);
        if (isMounted) {
          setError('Unable to load live position assignments.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadPositions();

    return () => {
      isMounted = false;
    };
  }, []);

  const groupMap = useMemo(
    () => new Map(groups.map(group => [group.key, group])),
    [groups]
  );

  const execGroup = groupMap.get('exec');
  const internalGroup = groupMap.get('internal');
  const externalGroup = groupMap.get('external');
  const smallGroups = groups.filter(group => !['exec', 'internal', 'external'].includes(group.key));
  const assignmentsVisible = groups.some(group => group.positions.some(position => position.assignment?.member));
  const assignmentVisibilityRestricted = !can('roster.view') && !assignmentsVisible;
  const canManagePositions = can('positions.manage');

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <section className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-on-surface mb-2">Chapter Positions</h1>
          <p className="text-on-surface-variant font-medium text-lg max-w-lg">Live leadership roster and position assignments from Supabase.</p>
        </div>
        {canManagePositions && (
          <div className="flex items-center gap-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isEditMode}
                onChange={() => setIsEditMode(!isEditMode)}
              />
              <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-3 text-sm font-bold uppercase tracking-widest text-secondary">Edit Mode</span>
            </label>
          </div>
        )}
      </section>

      {loading && (
        <section className="bg-surface-container-low/40 rounded-xl p-10 border border-white/5 flex items-center justify-center gap-3 text-on-surface-variant">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.2rem]">Loading live positions</span>
        </section>
      )}

      {error && (
        <section className="bg-error/10 rounded-xl p-6 border border-error/20 flex items-center gap-3 text-error">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </section>
      )}

      {!loading && !error && execGroup && (
        <section className="bg-surface-container-low/50 rounded-xl p-8 border border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-8 bg-primary rounded-full"></div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{execGroup.title}</h2>
              <p className="text-[10px] uppercase font-bold tracking-widest mt-1 text-primary/60">{execGroup.oversight}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {execGroup.positions.map(position => (
              <React.Fragment key={position.id}>
                <PositionCard
                  position={position}
                  isEditMode={isEditMode}
                  assignmentsRestricted={assignmentVisibilityRestricted}
                />
              </React.Fragment>
            ))}
          </div>
          {isEditMode && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full border border-dashed border-white/10 py-3 rounded-lg text-[10px] font-bold uppercase tracking-[0.2rem] text-on-surface-variant/50 hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 mt-6"
            >
              <Plus size={14} />
              Add Position to Exec Board
            </motion.button>
          )}
        </section>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {internalGroup && (
            <BranchSection title={internalGroup.title} oversight={internalGroup.oversight} color="primary">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {internalGroup.positions.map(position => (
                  <React.Fragment key={position.id}>
                    <BranchItem position={position} assignmentsRestricted={assignmentVisibilityRestricted} />
                  </React.Fragment>
                ))}
              </div>
            </BranchSection>
          )}

          {externalGroup && (
            <BranchSection title={externalGroup.title} oversight={externalGroup.oversight} color="secondary">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {externalGroup.positions.map(position => (
                  <React.Fragment key={position.id}>
                    <BranchItem position={position} assignmentsRestricted={assignmentVisibilityRestricted} />
                  </React.Fragment>
                ))}
              </div>
            </BranchSection>
          )}
        </div>
      )}

      {!loading && !error && smallGroups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {smallGroups.map(group => (
            <React.Fragment key={group.key}>
              <SmallSection
                title={group.title}
                icon={getGroupIcon(group.key)}
                border={getGroupBorder(group.key)}
              >
                {group.positions.map(position => (
                  <React.Fragment key={position.id}>
                    <SmallItem
                      position={position}
                      compact={group.key === 'judicial'}
                      assignmentsRestricted={assignmentVisibilityRestricted}
                    />
                  </React.Fragment>
                ))}
              </SmallSection>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

interface AssignmentProps {
  position: PositionWithAssignment;
  assignmentsRestricted: boolean;
}

const PositionCard = ({ position, assignmentsRestricted, isEditMode }: AssignmentProps & { isEditMode: boolean }) => {
  const memberName = getAssignedMemberName(position);

  return (
    <button className="bg-surface-container-low p-5 rounded-lg text-left transition-all hover:bg-surface-container-high group relative border border-white/5">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{position.display_name}</span>
        {isEditMode && (
          <div className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 shadow-lg hover:scale-110 transition-transform z-10">
            <X size={12} className="text-white" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {memberName ? (
          <>
            <Avatar name={memberName} seed={position.assignment?.member?.id ?? position.id} />
            <div className="overflow-hidden">
              <p className="text-on-surface font-medium text-sm truncate">{memberName}</p>
              <p className="text-[9px] text-on-surface-variant/50 uppercase tracking-tighter">{formatAssignedDate(position.assignment?.assigned_at)}</p>
            </div>
          </>
        ) : (
          <EmptyAssignment assignmentsRestricted={assignmentsRestricted} />
        )}
      </div>
    </button>
  );
};

const BranchSection = ({ title, oversight, color, children }: { title: string; oversight: string; color: 'primary' | 'secondary'; children: React.ReactNode }) => (
  <section className={cn(
    "bg-surface-container-low/30 rounded-xl p-8 border-t-2",
    color === 'primary' ? "border-primary/20" : "border-secondary/20"
  )}>
    <div className="flex items-center justify-between mb-8">
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className={cn(
          "text-[10px] uppercase font-bold tracking-widest mt-1 opacity-60",
          color === 'primary' ? "text-primary" : "text-secondary"
        )}>{oversight}</p>
      </div>
      <ChevronDown className="text-on-surface-variant/20" />
    </div>
    {children}
  </section>
);

const BranchItem = ({ position, assignmentsRestricted }: AssignmentProps) => (
  <button className="bg-surface-container-low p-4 rounded-lg text-center hover:bg-surface-container-high transition-colors border border-white/5">
    <p className="text-[10px] text-secondary uppercase font-bold tracking-widest mb-1">{position.display_name}</p>
    <p className="text-sm font-medium">{getAssignedMemberName(position) ?? getEmptyAssignmentText(assignmentsRestricted)}</p>
  </button>
);

const SmallSection = ({ title, icon, border, children }: { title: string; icon: React.ReactNode; border: string; children: React.ReactNode }) => (
  <section className={cn("bg-surface-container-low/20 rounded-xl p-6 border-l-4", border)}>
    <h4 className="text-lg font-bold mb-5 flex items-center gap-2">
      {icon}
      {title}
    </h4>
    <div className="space-y-3">
      {children}
    </div>
  </section>
);

const SmallItem = ({ position, compact, assignmentsRestricted }: AssignmentProps & { compact?: boolean }) => (
  <button className={cn(
    "w-full bg-surface-container-low p-3 rounded-lg flex items-center gap-3 text-left hover:bg-surface-container-high border border-white/5",
    compact && "flex-col items-start gap-1"
  )}>
    {!compact && <div className="w-1 h-8 bg-surface-container-high rounded-full"></div>}
    <div>
      <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-widest">{position.display_name}</p>
      <p className="text-xs font-medium">{getAssignedMemberName(position) ?? getEmptyAssignmentText(assignmentsRestricted)}</p>
    </div>
  </button>
);

const EmptyAssignment = ({ assignmentsRestricted }: { assignmentsRestricted: boolean }) => (
  <>
    <div className="w-10 h-10 rounded-full bg-red-950/20 flex items-center justify-center">
      {assignmentsRestricted ? <Shield size={20} className="text-red-500" /> : <X size={20} className="text-red-500" />}
    </div>
    <div>
      <span className="bg-red-600/20 text-red-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
        {getEmptyAssignmentText(assignmentsRestricted)}
      </span>
      <p className="text-[9px] text-on-surface-variant/50 uppercase tracking-tighter mt-1">Supabase RLS</p>
    </div>
  </>
);

const Avatar = ({ name, seed }: { name: string; seed: string }) => (
  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xs font-black uppercase shrink-0">
    {getInitials(name, seed)}
  </div>
);

const getAssignedMemberName = (position: PositionWithAssignment) => {
  const member = position.assignment?.member;
  if (!member) return null;
  return `${member.preferred_name || member.legal_first_name} ${member.legal_last_name}`;
};

const getInitials = (name: string, fallback: string) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(segment => segment.charAt(0))
    .join('');

  return (initials || fallback.charAt(0)).toUpperCase();
};

const getEmptyAssignmentText = (assignmentsRestricted: boolean) =>
  assignmentsRestricted ? 'Restricted' : 'Vacant';

const formatAssignedDate = (assignedAt?: string) => {
  if (!assignedAt) return 'Active assignment';
  return `Assigned ${new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(assignedAt))}`;
};

const getGroupIcon = (group: string) => {
  if (group === 'health_safety') return <Shield className="text-red-600" size={20} />;
  if (group === 'housing') return <Home className="text-secondary" size={20} />;
  if (group === 'judicial') return <Gavel className="text-primary" size={20} />;
  if (group === 'treasury') return <Wallet className="text-emerald-500" size={20} />;
  if (group === 'recruitment') return <Users className="text-indigo-400" size={20} />;
  if (group === 'membership_development') return <BriefcaseBusiness className="text-primary" size={20} />;
  return <UserCircle className="text-on-surface-variant" size={20} />;
};

const getGroupBorder = (group: string) => {
  if (group === 'health_safety') return 'border-red-600';
  if (group === 'housing') return 'border-secondary';
  if (group === 'judicial') return 'border-on-surface-variant/20';
  if (group === 'treasury') return 'border-emerald-500';
  if (group === 'recruitment') return 'border-indigo-400';
  return 'border-primary';
};
