/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { TrackedItem, ItemStatus } from '../types';
import { Play, Info, AlertTriangle, ArrowRight, PlusCircle, Star, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';

export default function Home() {
  const { user } = useAuth();
  const [inProgress, setInProgress] = useState<TrackedItem[]>([]);
  const [overdue, setOverdue] = useState<TrackedItem[]>([]);
  const [today, setToday] = useState<TrackedItem[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/trackedItems`),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as TrackedItem);
      setInProgress(items.filter(i => i.status === ItemStatus.WATCHING));
      setOverdue(items.filter(i => i.status === ItemStatus.PLANNED && i.plannedDate && isPast(parseISO(i.plannedDate)) && !isToday(parseISO(i.plannedDate))));
      setToday(items.filter(i => i.status === ItemStatus.PLANNED && i.plannedDate && isToday(parseISO(i.plannedDate))));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/trackedItems`);
    });

    return () => unsubscribe();
  }, [user]);

  const updateProgress = async (id: string, progress: number) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/trackedItems`, id), {
        progress,
        updatedAt: new Date().toISOString()
      });
      toast.success('Progress updated');
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/trackedItems/${id}`);
    }
  };

  return (
    <div className="space-y-12 md:space-y-16 pb-20">
      {/* Hero Header Section */}
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden rounded-[2.5rem] border border-neutral-800/30 group">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2 }}
          src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=2000" 
          alt="Hero" 
          className="w-full h-full object-cover grayscale opacity-30 group-hover:scale-105 transition-transform duration-[3s]" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-[#0B0B0C]/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0C] via-[#0B0B0C]/60 to-transparent"></div>
        
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 space-y-5 md:space-y-6">
          <div className="flex items-center gap-4">
             <span className="px-3 py-1 bg-blue-600 text-[9px] font-black text-white uppercase tracking-[0.2em] rounded-full shadow-lg shadow-blue-600/20">System Active</span>
             <span className="text-neutral-500 text-[9px] font-black uppercase tracking-[0.2em]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tighter max-w-xl md:max-w-2xl leading-[0.95] uppercase">
            Your <span className="text-blue-600">Archive</span> is waiting.
          </h1>
          <p className="text-neutral-500 text-sm md:text-base font-medium max-w-lg leading-relaxed">
            Synchronize your cinematic journey. Track movies, anime, and series with premium precision.
          </p>
          <div className="flex items-center gap-8 pt-2">
            <Link to="/search" className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-2xl">
              Search Content
            </Link>
            <Link to="/watchlist" className="flex items-center gap-3 text-neutral-400 font-black uppercase tracking-widest text-[9px] hover:text-white transition-colors group">
              <CalendarIcon className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
              Open Planner
            </Link>
          </div>
        </div>
      </section>

      {/* Grid Layout for Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Activity & In Progress */}
        <div className="lg:col-span-8 space-y-16">
          <section>
            <div className="flex justify-between items-end mb-6">
              <div className="space-y-0.5">
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Active Viewing</h2>
                <p className="text-neutral-600 text-[9px] font-black uppercase tracking-[0.15em]">Resume where you left off</p>
              </div>
              <Link to="/library" className="group flex items-center gap-2 text-neutral-500 hover:text-white transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest">Full Library</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {inProgress.slice(0, 2).map((item) => (
                <InProgressCard key={item.id} item={item} onUpdate={(p) => updateProgress(item.id, p)} />
              ))}
              {inProgress.length === 0 && (
                <EmptyState label="No active sessions" link="/search" icon={Play} />
              )}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-end mb-6">
              <div className="space-y-0.5">
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Today's Schedule</h2>
                <p className="text-neutral-600 text-[9px] font-black uppercase tracking-[0.15em]">Planned for {format(new Date(), 'EEEE')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              {today.map(item => (
                <TrackedItemPoster key={item.id} item={item} />
              ))}
              {today.length === 0 && (
                <div className="col-span-full py-12 border border-dashed border-neutral-800 rounded-3xl flex flex-col items-center justify-center gap-4 text-neutral-600 transition-colors hover:border-neutral-700">
                   <Clock className="w-10 h-10 opacity-20" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Plan is clear for today</span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Alerts & Side Panels */}
        <div className="lg:col-span-4 space-y-12">
          {overdue.length > 0 && (
            <div className="bg-red-600/5 border border-red-500/20 rounded-[2.5rem] p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-red-500 font-black uppercase tracking-[0.2em] text-[10px]">Overdue Alerts</h3>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-6">
                {overdue.slice(0, 3).map(item => (
                  <OverdueItem key={item.id} item={item} />
                ))}
              </div>
              <Link to="/watchlist" className="block text-center py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 transition-all shadow-xl shadow-red-600/10">
                Reschedule Backlog
              </Link>
            </div>
          )}

          <div className="bg-[#141416] border border-neutral-800 rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden group">
             <div className="relative z-10">
                <h3 className="text-neutral-500 font-black uppercase tracking-[0.2em] text-[10px] mb-8">System Stats</h3>
                <div className="space-y-10">
                   <MiniStat label="Completion Rate" value="78%" color="bg-emerald-500" />
                   <MiniStat label="Search Accuracy" value="99%" color="bg-blue-500" />
                   <MiniStat label="Anime Catalog" value="Jikan API" color="bg-amber-500" />
                </div>
             </div>
             <div className="absolute -right-20 -bottom-20 p-10 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
               <PlusCircle className="w-64 h-64 text-white" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const InProgressCard: React.FC<{ item: TrackedItem, onUpdate: (p: number) => void | Promise<void> }> = ({ item, onUpdate }) => {
  return (
    <div className="bg-[#141416] rounded-3xl border border-neutral-800/50 overflow-hidden group hover:border-blue-600/30 transition-all duration-500 p-2 shadow-2xl">
      <div className="relative h-48 rounded-2xl overflow-hidden">
        <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141416] via-transparent to-transparent"></div>
        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
           <h3 className="text-xl font-black text-white truncate drop-shadow-lg uppercase tracking-tight">{item.title}</h3>
           <Play className="w-5 h-5 text-white fill-current opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-blue-500">Progress</span>
            <span className="text-neutral-500">{item.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
             <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${item.progress}%` }}
              className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onUpdate(Math.min(100, item.progress + 10))}
            className="flex-1 bg-neutral-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all border border-neutral-800"
          >
            Update
          </button>
          <Link to="/library" className="p-3 bg-neutral-900 text-neutral-500 rounded-xl border border-neutral-800 hover:text-white transition-all">
            <Info className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

const OverdueItem: React.FC<{ item: TrackedItem }> = ({ item }) => {
  return (
     <div className="flex items-center gap-5 group">
        <div className="w-14 h-20 rounded-xl overflow-hidden border border-neutral-800 flex-shrink-0">
           <img src={item.poster} className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0 shadow-lg" />
        </div>
        <div className="flex-1 min-w-0">
           <h4 className="text-white font-bold text-sm truncate uppercase tracking-tight">{item.title}</h4>
           <p className="text-red-500 text-[9px] font-black uppercase tracking-widest mt-1">
             Due {item.plannedDate ? format(parseISO(item.plannedDate), 'MMM dd') : '---'}
           </p>
        </div>
        <Link to="/watchlist" className="p-2 text-neutral-700 hover:text-white transition-colors">
           <ArrowRight className="w-4 h-4" />
        </Link>
     </div>
  );
}

const TrackedItemPoster: React.FC<{ item: TrackedItem }> = ({ item }) => {
  return (
    <div className="group space-y-4">
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-neutral-800 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl shadow-blue-600/5 group-hover:border-blue-600/30">
        <img src={item.poster} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
           <Play className="w-10 h-10 text-white fill-current" />
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm text-white truncate uppercase tracking-tight">{item.title}</h3>
        <p className="text-neutral-600 text-[10px] font-bold uppercase tracking-widest mt-1">{item.year} • {item.type}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="space-y-3">
       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
         <span className="text-neutral-500">{label}</span>
         <span className="text-white">{value}</span>
       </div>
       <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
          <div className={cn("h-full", color)} style={{ width: value.includes('%') ? value : '100%' }}></div>
       </div>
    </div>
  );
}

function EmptyState({ label, link, icon: Icon }: { label: string, link: string, icon: any }) {
  return (
    <Link to={link} className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-neutral-800 rounded-3xl group hover:border-blue-500/50 transition-all h-full">
       <Icon className="w-10 h-10 text-neutral-800 group-hover:text-blue-500 transition-colors mb-4" />
       <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-neutral-400">{label}</span>
    </Link>
  );
}
