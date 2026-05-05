/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query as firebaseQuery, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { TrackedItem, ItemStatus } from '../types';
import { Grid, List, SortAsc, Clock, Star, TrendingUp, Edit3, Trash2, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DayPicker } from 'react-day-picker';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function Library() {
  const { user } = useAuth();
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'movie' | 'series' | 'anime'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed'>('in-progress');
  const [editingItem, setEditingItem] = useState<TrackedItem | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (!user) return;
    const q = firebaseQuery(collection(db, `users/${user.uid}/trackedItems`), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TrackedItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/trackedItems`);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredItems = items.filter(i => {
    const matchesFilter = filter === 'all' || i.type === filter;
    const matchesTab = activeTab === 'in-progress' ? i.status !== ItemStatus.COMPLETED : i.status === ItemStatus.COMPLETED;
    return matchesFilter && matchesTab;
  });

  useEffect(() => {
    if (editingItem?.plannedDate) {
      setSelectedDate(parseISO(editingItem.plannedDate));
    } else {
      setSelectedDate(new Date());
    }
  }, [editingItem]);

  const updateItem = async (itemId: string, data: Partial<TrackedItem>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/trackedItems`, itemId), {
        ...data,
        updatedAt: new Date().toISOString()
      });
      if (data.plannedDate) {
        setShowReschedule(false);
        setEditingItem(null);
      }
      toast.success('Update successful');
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/trackedItems/${itemId}`);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/trackedItems`, itemId));
      setEditingItem(null);
      setItemToDelete(null);
      toast.success('Item removed from collection');
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/trackedItems/${itemId}`);
    }
  };

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tighter uppercase">Collection</h1>
          <p className="text-neutral-500 max-w-md text-sm font-medium">Your curated cinematic archive. Manage progress, ratings, and schedules.</p>
        </div>
        <div className="flex gap-2 bg-neutral-900/50 p-1.5 rounded-2xl border border-neutral-800 backdrop-blur-xl">
          <button 
            onClick={() => setActiveTab('in-progress')}
            className={cn(
              "px-8 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all",
              activeTab === 'in-progress' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-neutral-600 hover:text-neutral-300"
            )}
          >
            ACTIVE
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={cn(
              "px-8 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all",
              activeTab === 'completed' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-neutral-600 hover:text-neutral-300"
            )}
          >
            ARCHIVE
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-neutral-800/50 pb-6">
        <div className="flex gap-10">
          {['all', 'movie', 'series', 'anime'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "text-xs font-black uppercase tracking-[0.2em] pb-6 transition-all border-b-2",
                filter === f ? "text-blue-500 border-blue-500" : "text-neutral-600 border-transparent hover:text-neutral-300"
              )}
            >
              {f} ({items.filter(i => (f === 'all' || i.type === f) && (activeTab === 'in-progress' ? i.status !== ItemStatus.COMPLETED : i.status === ItemStatus.COMPLETED)).length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
             <button onClick={() => setView('grid')} className={cn("p-2 rounded-lg transition-colors", view === 'grid' ? "bg-neutral-800 text-blue-500" : "text-neutral-600")}>
               <Grid className="w-4 h-4" />
             </button>
             <button onClick={() => setView('list')} className={cn("p-2 rounded-lg transition-colors", view === 'list' ? "bg-neutral-800 text-blue-500" : "text-neutral-600")}>
               <List className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 lg:gap-12">
        {filteredItems.map((item) => (
          <LibraryPoster 
            key={item.id} 
            item={item} 
            onEdit={() => setEditingItem(item)}
            onRemove={() => { setItemToDelete(item.id); setShowDeleteConfirm(true); }}
            onReschedule={() => { setEditingItem(item); setShowReschedule(true); }}
          />
        ))}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setItemToDelete(null); }}
        onConfirm={() => itemToDelete && removeItem(itemToDelete)}
        title="Delete Record"
        message="Are you sure you want to permanently remove this from your collection? This action cannot be undone."
        confirmText="Delete"
      />

      {/* Edit Modal */}
      <Modal 
        isOpen={!!editingItem && !showReschedule} 
        onClose={() => setEditingItem(null)}
        title="Record Configuration"
        className="max-w-2xl"
      >
        {editingItem && (
          <div className="max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-8">
              {/* Landscape Header for Library */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 group">
                <img 
                  src={editingItem.poster} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={editingItem.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[8px] font-black text-neutral-500 uppercase tracking-widest">{editingItem.type}</span>
                      <span className="text-neutral-600 text-[10px] font-bold">{editingItem.year}</span>
                   </div>
                   <h4 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">{editingItem.title}</h4>
                   <div className="mt-4 inline-flex items-center gap-3 p-3 bg-neutral-900/60 backdrop-blur-md rounded-xl border border-neutral-800/50">
                      <div className="flex flex-col">
                         <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Planned</span>
                         <span className="text-xs font-bold text-blue-500 tracking-tighter">{editingItem.plannedDate ? format(parseISO(editingItem.plannedDate), 'MMM dd, yyyy') : 'NO DATE'}</span>
                      </div>
                      <button onClick={() => setShowReschedule(true)} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors group/edit">
                         <Edit3 className="w-4 h-4 text-neutral-600 group-hover/edit:text-white" />
                      </button>
                   </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Tracked Status</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[ItemStatus.PLANNED, ItemStatus.WATCHING, ItemStatus.COMPLETED].map(s => (
                      <button 
                        key={s}
                        onClick={() => updateItem(editingItem.id, { status: s })}
                        className={cn(
                          "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                          editingItem.status === s ? "border-blue-600 bg-blue-600/10 text-blue-500 shadow-lg shadow-blue-600/5" : "border-neutral-800 text-neutral-600 hover:border-neutral-700"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {(editingItem.status === ItemStatus.COMPLETED || (editingItem.rating && editingItem.rating > 0)) && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Score Assessment</label>
                    <div className="flex justify-between bg-neutral-900/30 p-2 rounded-2xl border border-neutral-800/50">
                      {[1,2,3,4,5].map(r => (
                        <button 
                          key={r}
                          onClick={() => updateItem(editingItem.id, { rating: r })}
                          className="p-3 transition-all hover:scale-110 active:scale-90"
                        >
                          <Star className={cn("w-6 h-6 transition-colors", r <= (editingItem.rating || 0) ? "text-amber-500 fill-current drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" : "text-neutral-800")} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {editingItem.status === ItemStatus.WATCHING && (
                  <div className="space-y-4">
                     <div className="flex justify-between items-end">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Viewing Progress</label>
                        <span className="text-xl font-black text-white">{editingItem.progress}%</span>
                     </div>
                     <input 
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={editingItem.progress}
                      onChange={(e) => updateItem(editingItem.id, { progress: parseInt(e.target.value) })}
                      className="w-full h-2 bg-neutral-900 rounded-full appearance-none cursor-pointer accent-blue-600"
                     />
                  </div>
                )}
              </div>
              
              <div className="pt-6 border-t border-neutral-800/50 flex items-center justify-between">
                 <button 
                  onClick={() => setEditingItem(null)}
                  className="px-8 py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95"
                 >
                   Close Session
                 </button>
                 <button 
                  onClick={() => { setItemToDelete(editingItem.id); setShowDeleteConfirm(true); }}
                  className="flex items-center gap-2 text-red-500 font-black uppercase tracking-widest text-[9px] hover:text-red-400 transition-colors p-2"
                 >
                   <Trash2 className="w-4 h-4" />
                   Purge Record
                 </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={showReschedule}
        onClose={() => setShowReschedule(false)}
        title="Reschedule"
        className="max-w-md"
      >
        <div className="space-y-8">
           <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-4 flex justify-center">
            <DayPicker 
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="text-white"
            />
          </div>
          <button 
            onClick={() => {
              if (editingItem && selectedDate) {
                updateItem(editingItem.id, { plannedDate: selectedDate.toISOString() });
              } else {
                toast.error('Selection required');
              }
            }}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
            disabled={!selectedDate}
          >
            Update Schedule
          </button>
        </div>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        <StatCard label="Total Content" value={`${items.length} titles`} trend="+3 this month" icon={Clock} />
        <div className="md:col-span-2 bg-[#141416] p-8 rounded-3xl border border-neutral-800/50 shadow-2xl relative overflow-hidden group">
           <div className="flex justify-between items-start mb-8 relative z-10">
             <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">Genre Distribution</h4>
             <TrendingUp className="w-5 h-5 text-blue-600" />
           </div>
           <div className="flex items-end gap-4 h-32 relative z-10">
              {[60, 85, 40, 25, 55, 90, 30].map((h, i) => (
                <div key={i} className="flex-1 bg-blue-600/5 rounded-t-2xl relative group/bar">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className="absolute bottom-0 w-full bg-blue-600/80 rounded-t-2xl transition-all group-hover/bar:bg-blue-500 group-hover/bar:shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                  />
                </div>
              ))}
           </div>
           <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
              <ExternalLink className="w-64 h-64 text-white" />
           </div>
        </div>
      </div>
    </div>
  );
}

const LibraryPoster: React.FC<{ item: TrackedItem, onEdit: () => void, onRemove: () => void | Promise<void>, onReschedule: () => void }> = ({ item, onEdit, onRemove, onReschedule }) => {
  const isWatching = item.status === ItemStatus.WATCHING;
  const isCompleted = item.status === ItemStatus.COMPLETED;

  return (
    <div className="group flex flex-col gap-5">
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-[#232326] transition-all duration-500 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] group-hover:-translate-y-2 cursor-pointer bg-neutral-900">
        <img src={item.poster} alt={item.title} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" />
        
        <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-neutral-800 flex items-center gap-2">
          <div className={cn(
             "w-2 h-2 rounded-full",
             isWatching ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]" : 
             isCompleted ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "bg-neutral-500"
          )} />
          <span className="text-[9px] font-black text-white tracking-widest uppercase">
            {item.status}
          </span>
        </div>

        <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 flex items-center justify-center gap-4">
           <button onClick={onEdit} className="p-3 bg-white text-black rounded-full hover:bg-blue-600 hover:text-white transition-all scale-90 group-hover:scale-100"><Edit3 className="w-5 h-5" /></button>
           <button onClick={onReschedule} className="p-3 bg-white text-black rounded-full hover:bg-amber-500 hover:text-white transition-all scale-90 group-hover:scale-100"><CalendarIcon className="w-5 h-5" /></button>
           <button onClick={onRemove} className="p-3 bg-red-600 text-white rounded-full hover:bg-red-500 transition-all scale-90 group-hover:scale-100"><Trash2 className="w-5 h-5" /></button>
        </div>

        {isWatching && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-neutral-950">
            <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${item.progress}%` }} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 px-1">
        <span className="font-black text-white truncate group-hover:text-blue-500 transition-colors uppercase tracking-tight text-sm">{item.title}</span>
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-[10px] font-bold uppercase tracking-widest">{item.year} • {item.type}</span>
          {isCompleted && (
            <div className="flex gap-0.5">
               {Array.from({ length: item.rating || 0 }).map((_, i) => <Star key={i} className="w-2.5 h-2.5 text-amber-500 fill-current" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, icon: Icon }: { label: string, value: string, trend: string, icon: any }) {
  return (
    <div className="bg-[#141416] p-8 rounded-3xl border border-neutral-800/50 flex flex-col justify-between h-56 hover:border-blue-600/30 transition-colors group">
      <div className="flex justify-between items-start">
        <span className="text-neutral-600 text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
        <div className="p-3 bg-neutral-900 rounded-2xl group-hover:bg-blue-600/10 transition-colors">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>
      <div>
        <div className="text-3xl lg:text-4xl font-black text-white tracking-tighter">{value.split(' ')[0]}<span className="text-lg text-neutral-600 font-bold ml-2">{value.split(' ')[1]}</span></div>
        <p className="text-emerald-500 text-[10px] font-bold mt-1 flex items-center gap-1 uppercase tracking-widest">
           {trend}
        </p>
      </div>
    </div>
  );
}
