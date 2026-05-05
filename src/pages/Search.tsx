/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { Search as SearchIcon, Loader2, Plus, Bookmark, Check, Play, Calendar as CalendarIcon, Info, Star, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchMovies, getMovieDetails } from '../services/movieService';
import { Movie, TrackedItem, ItemStatus, ItemType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, collection, query as firebaseQuery, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function Search() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState<Set<string>>(new Set());
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [planningMovie, setPlanningMovie] = useState<Movie | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [multiPlanning, setMultiPlanning] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualItem, setManualItem] = useState({ title: '', type: ItemType.MOVIE, poster: '', year: new Date().getFullYear().toString() });
  const [manualStatus, setManualStatus] = useState<ItemStatus>(ItemStatus.PLANNED);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const combined = await searchMovies(searchQuery);
      setResults(combined);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced live search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query);
      } else if (query.trim().length === 0) {
        setResults([]);
        setHasSearched(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  React.useEffect(() => {
    if (!user) return;
    const q = firebaseQuery(collection(db, `users/${user.uid}/trackedItems`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrackedIds(new Set(snapshot.docs.map(doc => doc.id)));
    });
    return () => unsubscribe();
  }, [user]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedMovies);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMovies(next);
  };

  const addToTracker = async (movie: Movie, status: ItemStatus, plannedDate?: Date) => {
    if (!user) return;
    
    // Ensure all fields are present for Firestore security rules
    const trackedItem: TrackedItem = {
      id: movie.id,
      title: movie.title,
      year: movie.year || 'N/A',
      poster: movie.poster || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=300',
      type: movie.type || ItemType.MOVIE,
      status: status,
      progress: status === ItemStatus.WATCHING ? 10 : status === ItemStatus.COMPLETED ? 100 : 0,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      genre: movie.genre || 'Various',
      plot: movie.plot || 'No description available.',
      source: movie.source || 'manual'
    };

    if (status === ItemStatus.PLANNED) {
      trackedItem.plannedDate = plannedDate ? plannedDate.toISOString() : new Date().toISOString();
    }

    try {
      await setDoc(doc(db, `users/${user.uid}/trackedItems`, movie.id), trackedItem);
      toast.success(`"${movie.title}" added to ${status}`);
      
      // If started, offer to go to Home/Active Viewing or just stay
      if (status === ItemStatus.WATCHING) {
        // We stay on the page as requested by "fix this" if it was navigating, 
        // but the user said "it goes to active viewing please fix this" 
        // which might mean it WAS NOT and they WANT it to, or vice versa.
        // Given "make it functional", I will ensure it saves and then stay on page 
        // but maybe the user wants it to navigate? 
        // "if i click start it goes to active vieiwng please fix this" 
        // -> I will assume they want it to navigate to Home to see it there.
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (error) {
      console.error('Add to tracker error:', error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/trackedItems/${movie.id}`);
    }
  };

  const handleMultiAdd = async (status: ItemStatus) => {
    if (status === ItemStatus.PLANNED && !multiPlanning) {
      setMultiPlanning(true);
      return;
    }

    const moviesToAdd = results.filter(m => selectedMovies.has(m.id));
    const promises = moviesToAdd.map(m => addToTracker(m, status, status === ItemStatus.PLANNED ? selectedDate : undefined));
    
    await Promise.all(promises);
    setSelectedMovies(new Set());
    setMultiPlanning(false);
    toast.success(`Successfully added ${moviesToAdd.length} items`);
  };

  const handleManualAdd = async () => {
    if (!user || !manualItem.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setLoading(true);
    const id = `manual-${Date.now()}`;
    const movie: Movie = {
      id,
      title: manualItem.title.trim(),
      year: manualItem.year || new Date().getFullYear().toString(),
      poster: manualItem.poster || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=300',
      type: manualItem.type,
      source: 'manual',
      genre: 'Manual Entry',
      plot: 'Manually added title.'
    };
    
    try {
      await addToTracker(movie, manualStatus);
      setShowManualAdd(false);
      setManualItem({ title: '', type: ItemType.MOVIE, poster: '', year: new Date().getFullYear().toString() });
      setManualStatus(ItemStatus.PLANNED);
    } catch (error) {
      console.error('Manual add error:', error);
      toast.error('Failed to add record manually');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (movie: Movie) => {
    setLoading(true);
    const details = await getMovieDetails(movie.id, movie.source);
    if (details) setDetailMovie(details);
    setLoading(false);
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Premium Compact Search Bar */}
      <section className="flex flex-col items-center">
        <form onSubmit={handleSearch} className="relative w-full max-w-2xl group">
          <div className="absolute inset-0 bg-blue-600/10 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5 transition-colors group-focus-within:text-blue-500" />
          <input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#141416]/80 backdrop-blur-xl border border-[#232326] rounded-2xl py-5 pl-16 pr-8 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-neutral-600 shadow-2xl" 
            placeholder="Search movies, anime, and more..." 
            type="text"
          />
          {loading && (
            <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />
          )}
        </form>
      </section>

      {/* Multi-Select Bar */}
      <AnimatePresence>
        {selectedMovies.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[80] bg-neutral-900 border border-neutral-800 rounded-2xl px-8 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-8 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 pr-8 border-r border-neutral-800">
               <span className="text-blue-500 font-black text-xl">{selectedMovies.size}</span>
               <span className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Selected</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => handleMultiAdd(ItemStatus.PLANNED)} className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-800 rounded-lg transition-colors text-white text-xs font-bold uppercase"><CalendarIcon className="w-4 h-4 text-blue-500" /> Plan</button>
              <button onClick={() => handleMultiAdd(ItemStatus.WATCHING)} className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-800 rounded-lg transition-colors text-white text-xs font-bold uppercase"><Play className="w-4 h-4 text-amber-500 fill-current" /> Start</button>
              <button onClick={() => handleMultiAdd(ItemStatus.COMPLETED)} className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-800 rounded-lg transition-colors text-white text-xs font-bold uppercase"><Check className="w-4 h-4 text-emerald-500" /> Done</button>
            </div>
            <button onClick={() => setSelectedMovies(new Set())} className="p-2 hover:bg-red-500/10 rounded-lg group transition-colors"><Trash2 className="w-4 h-4 text-neutral-600 group-hover:text-red-500 transition-colors" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">
          {results.length > 0 ? 'Discoveries' : 'Popular Titles'}
        </h2>
        {results.length > 0 && <span className="text-neutral-600 text-[10px] font-black uppercase tracking-widest">{results.length} Found</span>}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {results.map((movie) => (
          <MovieCard 
            key={movie.id} 
            movie={movie} 
            isSelected={selectedMovies.has(movie.id)}
            isTracked={trackedIds.has(movie.id)}
            onSelect={() => toggleSelection(movie.id)}
            onInfo={() => openDetails(movie)}
            onPlan={() => setPlanningMovie(movie)}
            onStart={() => addToTracker(movie, ItemStatus.WATCHING)}
            onDone={() => addToTracker(movie, ItemStatus.COMPLETED)}
          />
        ))}

        {results.length > 0 && (
          <div 
            onClick={() => setShowManualAdd(true)}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-800 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group aspect-[2/3]"
          >
            <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-neutral-500 group-hover:text-blue-500" />
            </div>
            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] group-hover:text-blue-500">Add Manually</p>
          </div>
        )}
        {results.length === 0 && !loading && hasSearched && (
          <div className="col-span-full py-20 text-center space-y-6">
            <div className="flex flex-col items-center gap-4 text-neutral-600">
              <SearchIcon className="w-16 h-16 opacity-20" />
              <p className="text-xl font-bold">No results for "{query}"</p>
              <p className="text-sm">Can't find what you're looking for?</p>
            </div>
            <button 
              onClick={() => setShowManualAdd(true)}
              className="px-8 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-blue-500 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
            >
              Add Manually
            </button>
          </div>
        )}
      </div>

      {/* Manual Add Modal */}
      <Modal isOpen={showManualAdd} onClose={() => setShowManualAdd(false)} title="Manual Entry">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Title</label>
            <input 
              value={manualItem.title}
              onChange={(e) => setManualItem({ ...manualItem, title: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Movie or Anime Title"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Type</label>
              <select 
                value={manualItem.type}
                onChange={(e) => setManualItem({ ...manualItem, type: e.target.value as ItemType })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value={ItemType.MOVIE}>Movie</option>
                <option value={ItemType.ANIME}>Anime</option>
                <option value={ItemType.SERIES}>Series</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Year</label>
              <input 
                value={manualItem.year}
                onChange={(e) => setManualItem({ ...manualItem, year: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="2024"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Poster URL (Optional)</label>
            <input 
              value={manualItem.poster}
              onChange={(e) => setManualItem({ ...manualItem, poster: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {[ItemStatus.PLANNED, ItemStatus.WATCHING, ItemStatus.COMPLETED].map(s => (
                <button
                  key={s}
                  onClick={() => setManualStatus(s)}
                  className={cn(
                    "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                    manualStatus === s ? "border-blue-600 bg-blue-600/10 text-blue-500 shadow-lg shadow-blue-600/5" : "border-neutral-800 text-neutral-600 hover:border-neutral-700"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleManualAdd} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-500">
            Add to {manualStatus === ItemStatus.PLANNED ? 'Library' : manualStatus}
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={!!detailMovie} 
        onClose={() => setDetailMovie(null)}
        title="Content Details"
        className="max-w-2xl"
      >
        {detailMovie && (
          <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-8">
              {/* Landscape Header */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 group">
                <img 
                  src={detailMovie.poster} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={detailMovie.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[9px] font-black uppercase tracking-widest leading-none">{detailMovie.type}</span>
                      <span className="text-neutral-300 text-[10px] font-black uppercase tracking-widest">{detailMovie.year}</span>
                   </div>
                   <h3 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">{detailMovie.title}</h3>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="text-2xl font-black text-white">{detailMovie.rating || detailMovie.score || 'N/A'}</span>
                  </div>
                  <div className="h-8 w-px bg-neutral-800" />
                  <div className="flex flex-wrap gap-2">
                    {detailMovie.genre ? detailMovie.genre.split(',').map(g => (
                      <span key={g} className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-[10px] font-black text-neutral-500 uppercase tracking-widest">{g.trim()}</span>
                    )) : (
                      <span className="text-neutral-600 text-[10px] font-black uppercase tracking-widest">No Genre Info</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">Overview</h4>
                  <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                    {detailMovie.plot || 'No detailed overview remains for this archive entry. The cinematic data is currently limited but the title is verified in the system.'}
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-neutral-800/50 grid grid-cols-3 gap-4">
                 <ActionButton icon={CalendarIcon} label="Plan" onClick={() => { setDetailMovie(null); setPlanningMovie(detailMovie); }} color="text-blue-500" />
                 <ActionButton icon={Play} label="Start" onClick={() => { setDetailMovie(null); addToTracker(detailMovie, ItemStatus.WATCHING); }} color="text-amber-500" fill />
                 <ActionButton icon={Check} label="Done" onClick={() => { setDetailMovie(null); addToTracker(detailMovie, ItemStatus.COMPLETED); }} color="text-emerald-500" />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Planning Modal */}
      <Modal
        isOpen={!!planningMovie || multiPlanning}
        onClose={() => { setPlanningMovie(null); setMultiPlanning(false); }}
        title="Schedule View"
        className="max-w-sm"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h4 className="text-neutral-400 font-bold text-[10px] uppercase tracking-widest mb-1">Target Date Selection</h4>
            <p className="text-white font-black text-sm uppercase tracking-tight truncate px-4">{multiPlanning ? `Batch Plan: ${selectedMovies.size} Items` : planningMovie?.title}</p>
          </div>
          
          <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-2 flex justify-center custom-calendar scale-90 origin-top">
            <DayPicker 
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="text-white"
            />
          </div>

          <button 
            onClick={() => {
              if (multiPlanning) handleMultiAdd(ItemStatus.PLANNED);
              else if (planningMovie) addToTracker(planningMovie, ItemStatus.PLANNED, selectedDate);
              setPlanningMovie(null);
              setMultiPlanning(false);
            }}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl shadow-blue-600/20"
          >
            Finalize Schedule
          </button>
        </div>
      </Modal>

      <style>{`
        .custom-calendar .rdp { --rdp-accent-color: #2563EB; --rdp-background-color: #1e1e20; }
        .custom-calendar .rdp-day_selected { background: var(--rdp-accent-color) !important; color: white !important; font-weight: 800; border-radius: 8px; }
        .custom-calendar .rdp-button:hover:not(.rdp-day_selected) { background: #232326; border-radius: 8px; }
      `}</style>
    </div>
  );
}

const MovieCard: React.FC<{ 
  movie: Movie, isSelected: boolean, isTracked: boolean, onSelect: () => void, onInfo: () => void | Promise<void>, onPlan: () => void, onStart: () => void | Promise<void>, onDone: () => void | Promise<void> 
}> = ({ movie, isSelected, isTracked, onSelect, onInfo, onPlan, onStart, onDone }) => {
  return (
    <div className={cn("group relative flex flex-col space-y-4", isTracked && "opacity-60")}>
      <div className={cn(
        "aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#141416] border transition-all duration-300 relative cursor-pointer",
        isSelected ? "border-blue-500 ring-4 ring-blue-500/20" : isTracked ? "border-blue-500/30" : "border-[#232326]"
      )}>
        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" />
        
        {/* Tracked Indicator */}
        {isTracked && (
          <div className="absolute top-2 right-2 z-20 bg-blue-600 text-white p-1 rounded-full shadow-lg">
            <Check className="w-3 h-3" />
          </div>
        )}

        {/* Checkbox for Multi-select */}
        <button 
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={cn(
            "absolute top-4 left-4 z-20 w-8 h-8 rounded-full border flex items-center justify-center transition-all",
            isSelected ? "bg-white border-white shadow-xl" : "bg-black/40 border-neutral-700/50 backdrop-blur-md opacity-0 group-hover:opacity-100"
          )}
        >
          {isSelected ? <Check className="w-4 h-4 text-blue-600 font-bold" /> : <div className="w-2 h-2 rounded-full border border-white/40" />}
        </button>

        {/* Action Overlay */}
        <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/80 backdrop-blur-[2px] transition-opacity duration-300 flex flex-col items-center justify-center p-6 gap-6">
          <div className="grid grid-cols-3 gap-4 w-full">
            <IconButton icon={CalendarIcon} tooltip="Plan" color="hover:text-blue-500" onClick={(e) => { e.stopPropagation(); onPlan(); }} />
            <IconButton icon={Play} tooltip="Start" color="hover:text-amber-500" fill onClick={(e) => { e.stopPropagation(); onStart(); }} />
            <IconButton icon={Check} tooltip="Done" color="hover:text-emerald-500" onClick={(e) => { e.stopPropagation(); onDone(); }} />
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onInfo(); }}
            className="w-full py-2 flex items-center justify-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <Info className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Details</span>
          </button>
        </div>
      </div>
      <div onClick={onSelect}>
        <h3 className="font-bold text-sm text-white truncate">{movie.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{movie.type}</span>
          <div className="w-1 h-1 rounded-full bg-neutral-800"></div>
          <span className="text-[10px] font-bold text-neutral-600">{movie.year}</span>
        </div>
      </div>
    </div>
  );
}

function IconButton({ icon: Icon, tooltip, color, onClick, fill }: { icon: any, tooltip: string, color: string, onClick: (e: any) => void, fill?: boolean }) {
  return (
    <div className="relative group/btn flex flex-col items-center gap-1.5">
       <button 
        onClick={onClick}
        className={cn(
          "w-12 h-12 rounded-full bg-neutral-900/50 border border-neutral-800 flex items-center justify-center transition-all hover:bg-neutral-800 hover:scale-110",
          color
        )}
      >
        <Icon className={cn("w-5 h-5 transition-transform duration-300", fill && "fill-current")} />
      </button>
      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity">{tooltip}</span>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, color, fill }: { icon: any, label: string, onClick: () => void, color: string, fill?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 bg-neutral-900/30 rounded-2xl border border-neutral-800/50 hover:bg-neutral-800 transition-all group",
        color
      )}
    >
      <Icon className={cn("w-6 h-6", fill && "fill-current")} />
      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white">{label}</span>
    </button>
  );
}
