/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query as firebaseQuery, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { TrackedItem, ItemStatus } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, ExternalLink, Play, Check, Clock, Trash2, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DayPicker } from 'react-day-picker';

export default function Calendar() {
  const { user } = useAuth();
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingItem, setEditingItem] = useState<TrackedItem | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (editingItem?.plannedDate) {
      setSelectedDate(parseISO(editingItem.plannedDate));
    }
  }, [editingItem]);

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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getItemsForDay = (day: Date) => {
    return items.filter(item => {
      const itemDate = item.plannedDate ? parseISO(item.plannedDate) : parseISO(item.updatedAt);
      return isSameDay(itemDate, day);
    });
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const updateItem = async (itemId: string, data: Partial<TrackedItem>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/trackedItems`, itemId), {
        ...data,
        updatedAt: new Date().toISOString()
      });
      toast.success('Update successful');
      if (data.plannedDate) {
        setShowReschedule(false);
        setEditingItem(null);
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/trackedItems/${itemId}`);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/trackedItems`, itemId));
      setItemToDelete(null);
      toast.success('Entry removed');
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/trackedItems/${itemId}`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-10">
      {/* Calendar Grid */}
      <div className="flex-1 bg-[#141416] rounded-3xl border border-neutral-800 p-6 sm:p-10 flex flex-col shadow-2xl min-h-[600px] md:min-h-[700px] overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 shrink-0">
          <div className="space-y-0.5">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase">{format(currentDate, 'MMMM yyyy')}</h1>
            <p className="text-neutral-500 font-bold text-[9px] uppercase tracking-[0.15em]">
              {items.filter(i => isSameMonth(parseISO(i.plannedDate || i.updatedAt), currentDate)).length} titles this month
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={prevMonth}
              className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl hover:bg-neutral-800 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-400" />
            </button>
            <button 
              onClick={goToToday}
              className="px-6 py-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-neutral-800 transition-all active:scale-95"
            >
              Today
            </button>
            <button 
              onClick={nextMonth}
              className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl hover:bg-neutral-800 transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-[500px] overflow-x-auto">
          <div className="min-w-[600px] flex-1 flex flex-col">
            <div className="grid grid-cols-7 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] uppercase font-black tracking-[0.2em] text-neutral-600">{d}</div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 border-l border-t border-neutral-800/20">
              {calendarDays.map((day) => {
                const itemsForDay = getItemsForDay(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isSameDay(day, new Date());
                const isSelected = isSameDay(day, currentDate);
                
                return (
                  <div 
                    key={day.toString()} 
                    onClick={() => setCurrentDate(day)}
                    className={cn(
                      "border-r border-b border-neutral-800/20 p-2 sm:p-4 transition-all flex flex-col gap-2 min-h-[80px] sm:min-h-[120px]",
                      !isCurrentMonth ? "bg-neutral-900/10 opacity-30" : "bg-[#141416]",
                      isTodayDate ? "ring-2 ring-inset ring-blue-500/50 bg-blue-500/5" : "hover:bg-neutral-900/50 cursor-pointer",
                      isSelected && isCurrentMonth ? "bg-blue-600/10" : ""
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "text-xs font-bold",
                        isTodayDate ? "text-blue-500" : isCurrentMonth ? "text-neutral-400" : "text-neutral-700"
                      )}>{format(day, 'd')}</span>
                      {itemsForDay.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.8)]" />}
                    </div>
                    
                    <div className="flex flex-col gap-1 sm:gap-1.5 overflow-hidden">
                      {itemsForDay.slice(0, 3).map(item => (
                        <div 
                          key={item.id} 
                          className={cn(
                            "h-1.5 w-full rounded-full transition-all group-hover:scale-x-105",
                            item.status === ItemStatus.WATCHING ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : 
                            item.status === ItemStatus.COMPLETED ? "bg-emerald-500" : "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                          )} 
                          title={item.title}
                        />
                      ))}
                      {itemsForDay.length > 3 && (
                        <span className="text-[7px] font-black text-neutral-600 uppercase tracking-tighter">
                          +{itemsForDay.length - 3} MORE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-6 items-center pt-8 border-t border-neutral-800/30">
          <LegendItem color="bg-blue-600" label="Planned" />
          <LegendItem color="bg-amber-500" label="Watching" />
          <LegendItem color="bg-emerald-500" label="Completed" />
          <div className="flex items-center gap-2 text-neutral-600 ml-auto">
            <Clock className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Automatic Sync System</span>
          </div>
        </div>
      </div>

      {/* Detail Sidebar */}
      <aside className="w-full lg:w-[360px] bg-[#141416] rounded-3xl border border-neutral-800 p-8 flex flex-col shadow-2xl relative overflow-hidden group">
        <div className="relative z-10 pb-6 mb-6 border-b border-neutral-800/50">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Queue</h3>
            <span className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[8px] font-black text-neutral-500 uppercase tracking-widest">Real-time</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">Overview</h2>
        </div>

        <div className="relative z-10 space-y-6 flex-1 overflow-y-auto no-scrollbar max-h-[600px] lg:max-h-none">
          <div className="mb-4">
             <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{format(currentDate, 'EEEE, MMMM dd')}</span>
          </div>
          {items.filter(i => isSameDay(parseISO(i.plannedDate || i.updatedAt), currentDate)).length > 0 ? (
            items.filter(i => isSameDay(parseISO(i.plannedDate || i.updatedAt), currentDate)).map(item => (
              <CalendarDetailItem 
                key={item.id} 
                item={item} 
                onRemove={() => { setItemToDelete(item.id); setShowDeleteConfirm(true); }} 
                onUpdate={(data) => updateItem(item.id, data)}
                onReschedule={() => { setEditingItem(item); setShowReschedule(true); }}
              />
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
               <CalendarIcon className="w-12 h-12 text-neutral-800 mx-auto opacity-20" />
               <p className="text-neutral-600 text-[10px] font-black uppercase tracking-widest">No entries for this date</p>
               <Link to="/search" className="inline-block px-6 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-[8px] font-black text-white uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-4">Browse Content</Link>
            </div>
          )}
        </div>
        
        <div className="absolute -right-20 -bottom-20 pointer-events-none opacity-[0.03] group-hover:scale-110 transition-transform duration-[3s]">
           <CalendarIcon className="w-80 h-80 text-white" />
        </div>
      </aside>

      <Modal isOpen={showReschedule} onClose={() => setShowReschedule(false)} title="Move Schedule">
         <div className="space-y-8">
            <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-4 flex justify-center custom-calendar">
              <DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} className="text-white" />
            </div>
            <button 
              onClick={() => {
                if (editingItem && selectedDate) {
                  updateItem(editingItem.id, { plannedDate: selectedDate.toISOString() });
                } else {
                  toast.error('Please select a date');
                }
              }}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
              disabled={!selectedDate}
            >
              Confirm Migration
            </button>
         </div>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setItemToDelete(null); }}
        onConfirm={() => itemToDelete && removeItem(itemToDelete)}
        title="Remove Entry"
        message="Are you sure you want to permanently remove this entry from your calendar? This cannot be undone."
        confirmText="Remove"
      />

      <style>{`
        .custom-calendar .rdp { --rdp-accent-color: #2563EB; }
        .custom-calendar .rdp-day_selected { background: var(--rdp-accent-color) !important; color: white !important; font-weight: 800; border-radius: 8px; }
      `}</style>
    </div>
  );
}

const CalendarDetailItem: React.FC<{ item: TrackedItem, onRemove: () => void, onUpdate: (data: Partial<TrackedItem>) => void, onReschedule: () => void }> = ({ item, onRemove, onUpdate, onReschedule }) => {
  const itemDate = item.plannedDate ? parseISO(item.plannedDate) : parseISO(item.updatedAt);
  
  return (
    <div className="group/item flex gap-5 bg-neutral-900/20 p-3 rounded-2xl border border-transparent hover:border-neutral-800 hover:bg-neutral-900/50 transition-all cursor-pointer">
      <div className="w-16 h-22 bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 flex-shrink-0 group-hover/item:border-blue-500/30 transition-all shadow-lg">
        <img src={item.poster} className="w-full h-full object-cover grayscale opacity-60 group-hover/item:grayscale-0 group-hover/item:opacity-100 transition-all duration-500" alt="" />
      </div>
      <div className="flex-1 py-1 space-y-2 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn(
            "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest leading-none border",
            item.status === ItemStatus.WATCHING ? "bg-amber-500/5 text-amber-500 border-amber-500/20" : 
            item.status === ItemStatus.COMPLETED ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" : 
            "bg-blue-500/5 text-blue-500 border-blue-500/20"
          )}>
            {item.status}
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onReschedule(); }}
              className="p-1 text-neutral-700 hover:text-amber-500 transition-colors"
            >
              <CalendarIcon className="w-3 h-3" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-1 text-neutral-700 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <h4 className="text-xs font-black text-white truncate uppercase tracking-tight group-hover/item:text-blue-400 transition-colors">{item.title}</h4>
        <div className="flex items-center gap-2 pt-1">
          {item.status === ItemStatus.PLANNED && <button onClick={(e) => { e.stopPropagation(); onUpdate({ status: ItemStatus.WATCHING }); }} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all active:scale-90"><Play className="w-3 h-3 fill-current" /></button>}
          {item.status === ItemStatus.WATCHING && <button onClick={(e) => { e.stopPropagation(); onUpdate({ status: ItemStatus.COMPLETED }); }} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all active:scale-90"><Check className="w-3 h-3" /></button>}
          {item.status === ItemStatus.COMPLETED && <div className="flex gap-0.5">{Array.from({ length: item.rating || 0 }).map((_, i) => <Star key={i} className="w-2 h-2 text-amber-500 fill-current" />)}</div>}
          <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest ml-auto">{item.type}</span>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", color)}></div>
      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}
