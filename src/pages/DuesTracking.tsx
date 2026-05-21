import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Upload, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  X, 
  CreditCard,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const DuesTracking = () => {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
        <div className="space-y-2">
          <h1 className="text-7xl font-black tracking-tighter text-on-surface uppercase leading-none">Dues Tracking</h1>
          <p className="text-secondary font-black tracking-widest uppercase text-sm">
            73% collected · <span className="text-on-surface-variant">$47,450 / $65,000 this semester</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-surface-container-lowest flex items-center px-6 py-4 rounded-2xl w-64 border border-white/5">
            <Search className="text-on-surface-variant mr-3" size={18} />
            <input 
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-zinc-800 font-bold" 
              placeholder="Search members..." 
            />
          </div>
          <button className="p-4 rounded-2xl bg-surface-container-high text-on-surface hover:bg-surface-bright transition-colors border border-white/5">
            <Filter size={20} />
          </button>
          <button className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-transparent border border-white/10 text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest">
            <Upload size={16} />
            Import CSV
          </button>
          <button 
            onClick={() => setIsLogModalOpen(true)}
            className="px-8 py-4 rounded-full bg-primary-container text-white hover:brightness-110 transition-all shadow-2xl shadow-primary/20 flex items-center gap-3 font-black text-xs uppercase tracking-widest"
          >
            <Plus size={18} />
            Log Payment
          </button>
        </div>
      </header>

      {/* Summary Bar Pills */}
      <section className="flex gap-4 mb-10 overflow-x-auto no-scrollbar pb-2">
        <SummaryPill color="bg-green-500" label="Paid" value="112 Members" />
        <SummaryPill color="bg-secondary" label="Partial" value="14 Members" />
        <SummaryPill color="bg-primary" label="Unpaid" value="28 Members" />
        <SummaryPill color="bg-zinc-700" label="Waived" value="3 Members" />
      </section>

      {/* Table Container */}
      <section className="bg-surface-container-low rounded-3xl border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-high/30 border-b border-white/5">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Member</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Payment Progress</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Method</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Date</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">On-Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            <DuesRow 
              name="Jameson Sterling" 
              year="Class of '25" 
              status="Unpaid" 
              paid={0} 
              total={650} 
              method="—" 
              date="N/A" 
              onTime={false} 
            />
            <DuesRow 
              name="Liam Vanderbilt" 
              year="Class of '24" 
              status="Partial" 
              paid={325} 
              total={650} 
              method="Venmo" 
              date="Oct 12, 2023" 
              onTime={true} 
            />
            <DuesRow 
              name="Elena Rossi" 
              year="Class of '26" 
              status="Paid" 
              paid={650} 
              total={650} 
              method="GreekBill" 
              date="Sep 28, 2023" 
              onTime={true} 
            />
          </tbody>
        </table>
      </section>

      <AnimatePresence>
        {isLogModalOpen && (
          <LogPaymentModal onClose={() => setIsLogModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const SummaryPill = ({ color, label, value }: any) => (
  <div className="flex items-center gap-3 bg-surface-container-low px-8 py-5 rounded-2xl min-w-fit border border-white/5">
    <div className={cn("w-3 h-3 rounded-full", color)}></div>
    <span className="text-[10px] font-black tracking-[0.2rem] uppercase text-zinc-500">{label}</span>
    <span className="text-on-surface font-black uppercase tracking-tight ml-4">{value}</span>
  </div>
);

const DuesRow = ({ name, year, status, paid, total, method, date, onTime }: any) => (
  <tr className="hover:bg-surface-container-high/20 transition-colors group">
    <td className="px-8 py-6">
      <div className="flex items-center gap-4">
        <img className="w-10 h-10 rounded-full object-cover border border-white/10" src={`https://picsum.photos/seed/${name}/100/100`} alt={name} />
        <div>
          <p className="font-black text-on-surface uppercase tracking-tight">{name}</p>
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{year}</p>
        </div>
      </div>
    </td>
    <td className="px-8 py-6">
      <span className={cn(
        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
        status === 'Paid' ? "bg-green-500/10 text-green-500" :
        status === 'Partial' ? "bg-secondary/10 text-secondary" :
        "bg-primary/10 text-primary"
      )}>
        {status}
      </span>
    </td>
    <td className="px-8 py-6">
      <div className="w-full max-w-xs">
        <div className="flex justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">${paid} / ${total}</span>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            paid === total ? "text-green-500" : paid > 0 ? "text-secondary" : "text-primary"
          )}>{Math.round((paid / total) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-1000", paid === total ? "bg-green-500" : paid > 0 ? "bg-secondary" : "bg-primary")} 
            style={{ width: `${(paid / total) * 100}%` }}
          />
        </div>
      </div>
    </td>
    <td className="px-8 py-6">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{method}</span>
    </td>
    <td className="px-8 py-6">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{date}</span>
    </td>
    <td className="px-8 py-6 text-center">
      {onTime ? (
        <CheckCircle2 className="text-green-500 mx-auto" size={18} />
      ) : (
        <XCircle className="text-primary mx-auto" size={18} />
      )}
    </td>
  </tr>
);

const LogPaymentModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-end">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="h-full w-full max-w-md bg-surface shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col border-l border-white/5"
      >
        <div className="p-10 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-3xl font-black tracking-tighter text-on-surface uppercase">Log Payment</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
          {/* Member Search */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2rem] text-zinc-500 px-2">Member</label>
            <div className="w-full bg-surface-container-lowest p-5 rounded-2xl flex items-center gap-4 border border-white/5">
              <img className="w-10 h-10 rounded-full object-cover border border-white/10" src="https://picsum.photos/seed/Jameson/100/100" alt="Member" />
              <div className="flex-1">
                <p className="font-black text-on-surface uppercase tracking-tight">Jameson Sterling</p>
                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Alpha Rho • Class of '25</p>
              </div>
              <CheckCircle2 className="text-green-500" size={20} />
            </div>
          </div>

          {/* Financials Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2rem] text-zinc-500 px-2">Amount Paid</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-black">$</span>
                <input 
                  className="w-full bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary-container p-5 pl-10 rounded-2xl font-black text-on-surface text-xl" 
                  placeholder="0.00" 
                  type="number" 
                />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2rem] text-zinc-500 px-2">Amount Owed</label>
              <div className="w-full bg-surface-container-low p-5 rounded-2xl flex items-center gap-2 border border-white/5">
                <span className="text-zinc-500 font-black">$</span>
                <span className="font-black text-zinc-500 text-xl">650.00</span>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2rem] text-zinc-500 px-2">Date</label>
              <input className="w-full bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary-container p-5 rounded-2xl font-bold text-on-surface appearance-none" type="date" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2rem] text-zinc-500 px-2">Method</label>
              <div className="relative">
                <select className="w-full bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary-container p-5 rounded-2xl font-bold text-on-surface appearance-none uppercase tracking-widest text-[10px]">
                  <option>GreekBill</option>
                  <option>Venmo</option>
                  <option>Check</option>
                  <option>Cash</option>
                  <option>Other</option>
                </select>
                <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 rotate-90" size={16} />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between bg-surface-container-lowest p-6 rounded-3xl border border-white/5">
            <div className="space-y-1">
              <p className="font-black text-on-surface uppercase tracking-tight text-sm">On-Time Payment</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Exempt from late fees</p>
            </div>
            <div className="w-12 h-6 bg-secondary rounded-full relative flex items-center px-1">
              <div className="w-4 h-4 bg-black rounded-full ml-auto shadow-sm"></div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2rem] text-zinc-500 px-2">Treasurer Notes</label>
            <textarea 
              className="w-full bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary-container p-6 rounded-3xl text-sm font-bold leading-relaxed placeholder:text-zinc-800" 
              placeholder="Optional context about the transaction..." 
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-6">
            <button className="w-full py-5 bg-primary-container text-white rounded-full font-black uppercase tracking-[0.3rem] text-sm shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">
              Log Transaction
            </button>
            <div className="flex justify-center">
              <button className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors">
                Mark as Waived
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
