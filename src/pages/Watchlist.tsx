/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query as firebaseQuery, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { TrackedItem, ItemStatus } from '../types';
import { Plus, Sparkles, Bolt, Edit3, Calendar, MoreVertical, Play, Check, Trash2, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DayPicker } from 'react-day-picker';
import { toast } from 'sonner';

export default function Watchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'planned' | 'overdue' | 'completed'>('all');
  const [editingItem, setEditingItem] = useState<TrackedItem | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [itemToDiscard, setItemToDiscard] = useState<string | null>(null);
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
      if (data.plannedDate || data.status === ItemStatus.COMPLETED || data.status === ItemStatus.WATCHING) {
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
      setItemToDiscard(null);
      toast.success('Item discarded');
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/trackedItems/${itemId}`);
    }
  };

  const filteredItems = items.filter(i => {
    if (filter === 'all') return i.status !== ItemStatus.COMPLETED;
    if (filter === 'overdue') return i.status === ItemStatus.PLANNED && i.plannedDate && isPast(parseISO(i.plannedDate)) && !isToday(parseISO(i.plannedDate));
    return i.status === filter;
  });

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-0.5">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-widest uppercase">Planner</h1>
          <p className="text-neutral-500 text-sm font-medium">Manage your cinematic journey. Organize what to watch and when.</p>
        </div>
        <Link 
          to="/search" 
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
        >
          <Plus className="w-5 h-5" />
          Plan New Item
        </Link>
      </div>

      <div className="flex items-center justify-between bg-neutral-900/50 p-2 rounded-2xl border border-neutral-800">
        <div className="flex gap-1">
          {['all', 'planned', 'overdue', 'completed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all tracking-widest",
                filter === f ? "bg-neutral-800 text-blue-400" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {filteredItems.map(item => (
          <PlannerCard 
            key={item.id} 
            item={item} 
            onEdit={() => setEditingItem(item)}
            onReschedule={() => { setEditingItem(item); setShowReschedule(true); }}
            onStart={() => updateItem(item.id, { status: ItemStatus.WATCHING })}
            onDone={() => updateItem(item.id, { status: ItemStatus.COMPLETED })}
          />
        ))}
      </div>

      {/* Stats and Help Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#141416] rounded-3xl p-8 border border-neutral-800 relative overflow-hidden group">
          <div className="relative z-10 space-y-8">
            <h3 className="text-neutral-500 font-bold uppercase tracking-[0.2em] text-[10px]">Upcoming Schedule</h3>
            <div className="space-y-4">
              {items.filter(i => i.status === ItemStatus.PLANNED).slice(0, 3).map((item, i) => (
                <div key={item.id} className="flex items-center gap-6 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 transition-colors hover:bg-neutral-800/50">
                  <div className={cn(
                    "w-12 h-14 rounded-xl flex flex-col items-center justify-center",
                    i === 0 ? "bg-blue-500/10 text-blue-500" : "bg-neutral-800 text-neutral-500"
                  )}>
                    <span className="text-[10px] font-black uppercase">{item.plannedDate ? format(parseISO(item.plannedDate), 'MMM') : '---'}</span>
                    <span className="text-xl font-black leading-none">{item.plannedDate ? format(parseISO(item.plannedDate), 'dd') : '--'}</span>
                  </div>
                  <div className="flex-grow">
                    <div className="text-white font-bold">{item.title}</div>
                    <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mt-1">Scheduled Viewing • {item.type}</div>
                  </div>
                  <button onClick={() => setEditingItem(item)} className="text-neutral-600 hover:text-white transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <Calendar className="absolute -right-12 -bottom-12 w-64 h-64 text-neutral-800 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
        </div>

        <div className="bg-blue-600 text-white rounded-3xl p-8 flex flex-col justify-between shadow-2xl shadow-blue-600/10">
          <div>
            <Sparkles className="w-10 h-10 mb-6 opacity-80" />
            <h3 className="text-3xl font-black leading-tight tracking-tighter">Planner Insights</h3>
            <p className="mt-4 text-blue-100 text-sm font-medium leading-relaxed opacity-80">
               You've planned {items.filter(i => i.status === ItemStatus.PLANNED).length} items recently. 
               Consistency is key to reducing your backlog!
            </p>
          </div>
          <Link to="/search" className="mt-10 bg-neutral-950/90 text-white w-full py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95 text-xs">
            Add More
            <Bolt className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal 
        isOpen={!!editingItem && !showReschedule} 
        onClose={() => setEditingItem(null)} 
        title="Planner Management" 
        className="max-w-2xl"
      >
        {editingItem && (
          <div className="max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-8">
               {/* Landscape Header for Watchlist */}
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
                     <h3 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">{editingItem.title}</h3>
                     <div className="mt-4 inline-flex items-center gap-3 p-3 bg-blue-600/10 backdrop-blur-md rounded-xl border border-blue-500/20">
                        <div className="flex flex-col">
                           <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Planned For</span>
                           <span className="text-xs font-bold text-white tracking-tighter">{editingItem.plannedDate ? format(parseISO(editingItem.plannedDate), 'EEEE, MMM dd') : 'NOT SCHEDULED'}</span>
                        </div>
                        <button onClick={() => setShowReschedule(true)} className="p-2 hover:bg-blue-600/20 rounded-lg transition-colors group/edit">
                           <Edit3 className="w-4 h-4 text-blue-500 group-hover/edit:text-white" />
                        </button>
                     </div>
                  </div>
               </div>
               
               <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Action Center</label>
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => updateItem(editingItem.id, { status: ItemStatus.WATCHING })} className="group relative py-5 bg-amber-500 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-400 transition-all active:scale-95 shadow-xl shadow-amber-500/10">
                         <Play className="w-4 h-4 fill-current" /> 
                         Start Viewing
                       </button>
                       <button onClick={() => updateItem(editingItem.id, { status: ItemStatus.COMPLETED })} className="group relative py-5 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all active:scale-95 shadow-xl shadow-emerald-600/10">
                         <Check className="w-4 h-4" /> 
                         Mark as Archived
                       </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">Context</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                      {editingItem.plot || 'Detailed metadata for this planned session is currently being processed. You can start the viewing session to record your progress.'}
                    </p>
                  </div>
               </div>

               <div className="pt-6 border-t border-neutral-800/50 flex items-center justify-between">
                  <button onClick={() => setEditingItem(null)} className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl transition-all active:scale-95">Close</button>
                  <button onClick={() => { setItemToDiscard(editingItem.id); setShowDiscardConfirm(true); }} className="flex items-center gap-2 text-red-500 font-black uppercase tracking-widest text-[9px] hover:text-red-400 transition-colors p-2">
                     <Trash2 className="w-4 h-4" />
                     Discard Planned Entry
                  </button>
               </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => { setShowDiscardConfirm(false); setItemToDiscard(null); }}
        onConfirm={() => itemToDiscard && removeItem(itemToDiscard)}
        title="Discard Item"
        message="Are you sure you want to remove this from your planner? You can always add it back later if needed."
        confirmText="Discard"
      />

      {/* Reschedule Modal */}
      <Modal isOpen={showReschedule} onClose={() => setShowReschedule(false)} title="Update Schedule">
         <div className="space-y-8">
            <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-4 flex justify-center custom-calendar">
              <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} className="text-white" />
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
              Update Date
            </button>
         </div>
      </Modal>
    </div>
  );
}

const PlannerCard: React.FC<{ item: TrackedItem, onEdit: () => void, onReschedule: () => void, onStart: () => void | Promise<void>, onDone: () => void | Promise<void> }> = ({ item, onEdit, onReschedule, onStart, onDone }) => {
  const isOverdue = item.plannedDate && isPast(parseISO(item.plannedDate)) && !isToday(parseISO(item.plannedDate));
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isButtonClick = target.closest('button') || target.closest('a');
    if (isButtonClick) {
      setIsOpen(false);
      return;
    }
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) {
      e.stopPropagation();
      setIsOpen(prev => !prev);
    }
  };
  
  return (
    <div 
      ref={cardRef}
      className={cn(
        "group relative bg-[#141416] rounded-2xl overflow-hidden border transition-all hover:scale-[1.02] group-[.is-open]:scale-[1.02] shadow-2xl",
        isOverdue ? "border-red-600/30" : "border-neutral-800/50 hover:border-blue-500/30 group-[.is-open]:border-blue-500/30",
        isOpen && "is-open"
      )}
    >
      {isOverdue && (
        <div className="absolute top-3 left-3 z-10 bg-red-600 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">
          <AlertCircle className="w-3 h-3 fill-current" />
          Overdue
        </div>
      )}
      <div 
        onClick={handleCardClick}
        className="aspect-[2/3] overflow-hidden relative cursor-pointer"
      >
        <img 
          src={item.poster} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-[.is-open]:scale-110" 
          alt={item.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        
        {/* Actions */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 group-[.is-open]:opacity-100 bg-black/40 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center gap-4">
           <button onClick={onStart} className="p-3 bg-white text-black rounded-full hover:bg-blue-600 hover:text-white transition-all scale-90 group-hover:scale-100 group-[.is-open]:scale-100"><Play className="w-5 h-5 fill-current" /></button>
           <button onClick={onReschedule} className="p-3 bg-white text-black rounded-full hover:bg-amber-500 hover:text-white transition-all scale-90 group-hover:scale-100 group-[.is-open]:scale-100"><CalendarIcon className="w-5 h-5" /></button>
           <button onClick={onEdit} className="p-3 bg-white text-black rounded-full hover:bg-emerald-500 hover:text-white transition-all scale-90 group-hover:scale-100 group-[.is-open]:scale-100"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <h3 className="font-bold text-white text-sm truncate uppercase tracking-tight">{item.title}</h3>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-500">
             <span className={cn(isOverdue ? "text-red-500" : "text-blue-500")}>PLANNED</span>
             <span>{item.type}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarIcon className={cn("w-3 h-3", isOverdue ? "text-red-500" : "text-neutral-500")} />
          <span className={cn("text-[10px] font-bold", isOverdue ? "text-red-500" : "text-neutral-300")}>
            {item.plannedDate ? format(parseISO(item.plannedDate), 'MMM dd, yyyy') : 'No Date'}
          </span>
        </div>
      </div>
    </div>
  );
}
