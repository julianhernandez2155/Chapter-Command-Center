import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, 
  Plus, 
  ChevronDown, 
  Gavel, 
  Home, 
  Heart, 
  UserPlus, 
  Wallet,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { MOCK_MEMBERS } from '@/src/constants';

export const Positions = () => {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <section className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-on-surface mb-2">Chapter Positions</h1>
          <p className="text-on-surface-variant font-medium text-lg max-w-lg">Manage the hierarchy and assignments of the Alpha Chapter leadership.</p>
        </div>
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
      </section>

      <section className="bg-surface-container-low/50 rounded-xl p-8 border border-white/5">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-8 bg-primary rounded-full"></div>
          <h2 className="text-2xl font-bold tracking-tight">Executive Board</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <PositionCard title="President" member={MOCK_MEMBERS[0]} isEditMode={isEditMode} />
          <PositionCard title="Internal VP" name="Marcus Thorne" isEditMode={isEditMode} />
          <PositionCard title="External VP" name="Julian Vance" isEditMode={isEditMode} />
          <PositionCard title="Treasurer" isVacant isEditMode={isEditMode} />
          <PositionCard title="Secretary" name="Elias Wood" isEditMode={isEditMode} />
          <PositionCard title="Recruitment" name="Cassian Gray" isEditMode={isEditMode} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BranchSection title="Internal Branch" oversight="Internal Vice President Oversight" color="primary">
          <div className="grid grid-cols-2 gap-4">
            <BranchItem title="Brotherhood" name="Roman Knight" />
            <BranchItem title="Scholarship" name="Arthur Pendel" />
            <BranchItem title="Historian" name="Gideon Wells" />
            <BranchItem title="Special Events" name="Finley Reed" />
            <BranchItem title="Alumni Rel." name="Oscar Wilde" className="col-span-2" />
          </div>
        </BranchSection>

        <BranchSection title="External Branch" oversight="External Vice President Oversight" color="secondary">
          <div className="grid grid-cols-2 gap-4">
            <BranchItem title="Philanthropy" name="Nico Di Angelo" />
            <BranchItem title="Community Serv." name="Leo Valdez" />
            <BranchItem title="Social" name="Percy Jackson" />
            <BranchItem title="PR Chair" name="Jason Grace" />
            <BranchItem title="Athletics" name="Frank Zhang" className="col-span-2" />
          </div>
        </BranchSection>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SmallSection title="Health & Safety" icon={<Shield className="text-red-600" size={20} />} border="border-red-600">
          <SmallItem label="Mental Health" name="Dr. Silas Stone" />
          <SmallItem label="Wellness Rep" name="Caleb Moore" />
        </SmallSection>

        <SmallSection title="Housing" icon={<Home className="text-secondary" size={20} />} border="border-secondary">
          <SmallItem label="Liaison" name="Bennett Hayes" />
          <SmallItem label="Finance Chair" name="Luca Rossi" />
        </SmallSection>

        <SmallSection title="Membership Dev" border="border-primary">
          <SmallItem label="Educator" name="Sebastian Thorne" />
          <SmallItem label="Career Dev" name="Liam O'Connell" />
          <div className="mt-4">
            <div className="flex justify-between text-[8px] font-bold text-on-surface-variant/40 mb-1 uppercase tracking-widest">
              <span>Capacity</span>
              <span>85% Assigned</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full">
              <div className="h-full bg-primary rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
        </SmallSection>

        <SmallSection title="Judicial Board" icon={<Gavel className="text-primary" size={20} />} border="border-on-surface-variant/20">
          <div className="grid grid-cols-2 gap-4">
            <SmallItem label="Vice Chair" name="Theo Quinn" compact />
            <SmallItem label="Fr. Rep" name="Holden C." compact />
            <SmallItem label="So. Rep" name="Pip Eston" compact />
            <SmallItem label="Jr. Rep" name="Jay Gatsby" compact />
          </div>
        </SmallSection>
      </div>
    </div>
  );
};

const PositionCard = ({ title, name, member, isVacant, isEditMode }: any) => (
  <button className="bg-surface-container-low p-5 rounded-lg text-left transition-all hover:bg-surface-container-high group relative border border-white/5">
    <div className="flex justify-between items-start mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{title}</span>
      {isEditMode && (
        <div className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 shadow-lg hover:scale-110 transition-transform z-10">
          <X size={12} className="text-white" />
        </div>
      )}
    </div>
    <div className="flex items-center gap-3">
      {isVacant ? (
        <>
          <div className="w-10 h-10 rounded-full bg-red-950/20 flex items-center justify-center">
            <X size={20} className="text-red-500" />
          </div>
          <div>
            <span className="bg-red-600/20 text-red-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Vacant</span>
            <p className="text-[9px] text-on-surface-variant/50 uppercase tracking-tighter mt-1">Priority High</p>
          </div>
        </>
      ) : (
        <>
          <img 
            alt={name || member?.firstName} 
            className="w-10 h-10 rounded-full object-cover" 
            src={member?.avatar || `https://picsum.photos/seed/${name}/100/100`}
            referrerPolicy="no-referrer"
          />
          <div className="overflow-hidden">
            <p className="text-on-surface font-medium text-sm truncate">{name || `${member?.firstName} ${member?.lastName}`}</p>
            <p className="text-[9px] text-on-surface-variant/50 uppercase tracking-tighter">Assigned Sept 23</p>
          </div>
        </>
      )}
    </div>
  </button>
);

const BranchSection = ({ title, oversight, color, children }: any) => (
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

const BranchItem = ({ title, name, className }: any) => (
  <button className={cn(
    "bg-surface-container-low p-4 rounded-lg text-center hover:bg-surface-container-high transition-colors border border-white/5",
    className
  )}>
    <p className="text-[10px] text-secondary uppercase font-bold tracking-widest mb-1">{title}</p>
    <p className="text-sm font-medium">{name}</p>
  </button>
);

const SmallSection = ({ title, icon, border, children }: any) => (
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

const SmallItem = ({ label, name, compact }: any) => (
  <button className={cn(
    "w-full bg-surface-container-low p-3 rounded-lg flex items-center gap-3 text-left hover:bg-surface-container-high border border-white/5",
    compact && "flex-col items-start gap-1"
  )}>
    {!compact && <div className="w-1 h-8 bg-surface-container-high rounded-full"></div>}
    <div>
      <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-xs font-medium">{name}</p>
    </div>
  </button>
);
