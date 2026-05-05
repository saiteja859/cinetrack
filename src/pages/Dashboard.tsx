/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { TrackedItem, ItemStatus } from '../types';
import { Film, Tv, BarChart3, Clock, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/trackedItems`), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => doc.data() as TrackedItem));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/trackedItems`);
    });
    return () => unsubscribe();
  }, [user]);

  const stats = {
    moviesWatched: items.filter(i => i.type === 'movie' && i.status === ItemStatus.COMPLETED).length,
    seriesFinished: items.filter(i => i.type === 'series' && i.status === ItemStatus.COMPLETED).length,
    currentlyWatching: items.filter(i => i.status === ItemStatus.WATCHING).length,
    totalWatchTime: items.reduce((acc, i) => acc + (i.total || 0) * (i.progress / 100), 0)
  };

  const { weeklyData, monthlyData, chartPath, fillPath, maxMonthCount } = useMemo(() => {
    // Real-time Weekly Data Calculation
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const result = new Array(7).fill(0);
    
    items.forEach(item => {
      const date = new Date(item.updatedAt);
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) {
        const dayIndex = date.getDay();
        result[dayIndex]++;
      }
    });

    const max = Math.max(...result, 1);
    const weekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const wd = weekOrder.map(day => {
      const idx = days.indexOf(day);
      return { day, height: (result[idx] / max) * 100 };
    });

    // Monthly
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mResult: { [key: string]: number } = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      mResult[months[d.getMonth()]] = 0;
    }

    items.forEach(item => {
      const date = new Date(item.updatedAt);
      const monthName = months[date.getMonth()];
      if (mResult[monthName] !== undefined) {
        mResult[monthName]++;
      }
    });

    const md = Object.entries(mResult).map(([month, count]) => ({ month, count }));
    const maxMC = Math.max(...md.map(m => m.count), 1);

    // Path
    const width = 400;
    const height = 120;
    const padding = 20;
    const points = md.map((d, i) => {
      const x = (i / (md.length - 1)) * (width - 2 * padding) + padding;
      const y = height - (d.count / maxMC) * (height - 2 * padding) - padding;
      return { x, y };
    });

    let cp = "";
    let fp = "";
    if (points.length >= 2) {
      cp = `M${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cx = (prev.x + curr.x) / 2;
        cp += ` C${cx},${prev.y} ${cx},${curr.y} ${curr.x},${curr.y}`;
      }
      fp = `${cp} L${points[points.length - 1].x},150 L${points[0].x},150 Z`;
    }

    return { weeklyData: wd, monthlyData: md, chartPath: cp, fillPath: fp, maxMonthCount: maxMC };
  }, [items]);
  const recentActivity = items.slice(0, 4);

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="flex justify-between items-end">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Personal Overview</h1>
          <p className="text-neutral-500 text-sm font-medium">Your cinematic habits and milestones.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatWidget label="Movies Watched" value={stats.moviesWatched} icon={Film} trend="+12%" />
        <StatWidget label="Series Finished" value={stats.seriesFinished} icon={Tv} trend="+5%" />
        <StatWidget label="Anime Tracked" value={items.filter(i => i.type === 'series' && i.status === ItemStatus.WATCHING).length} icon={BarChart3} trend="Stable" />
        <StatWidget label="Watch Time" value={`${Math.round(stats.totalWatchTime / 60)}h`} icon={Clock} trend="+8h today" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Watch Time */}
        <div className="bg-[#141416] p-8 rounded-2xl border border-neutral-800 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold text-white">Weekly Watch Time</h4>
              <p className="text-sm text-neutral-500 font-medium">Average 6.2 hours per day</p>
            </div>
            <select className="bg-neutral-800 border-none text-xs font-bold rounded-lg py-2 px-4 focus:ring-0 text-white cursor-pointer hover:bg-neutral-700 transition-colors">
              <option>Last 7 Days</option>
              <option>Previous Week</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between gap-3 px-4">
            {weeklyData.map((data, i) => {
              return (
                <div key={data.day} className="flex-1 flex flex-col items-center gap-4 group">
                  <div className="w-full bg-blue-500/10 rounded-t-lg relative flex items-end h-full">
                    <div 
                      style={{ height: `${Math.max(data.height, 5)}%` }}
                      className="w-full bg-blue-600 rounded-t-lg transition-all opacity-80 group-hover:opacity-100 group-hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] shadow-[0_0_10px_rgba(37,99,235,0.1)]"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{data.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Engagement */}
        <div className="bg-[#141416] p-8 rounded-2xl border border-neutral-800 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold text-white">Monthly Engagement</h4>
              <p className="text-sm text-neutral-500 font-medium">Minutes by category</p>
            </div>
            <div className="flex gap-4">
              <LegendItem color="bg-blue-600" label="Movies" />
              <LegendItem color="bg-neutral-800" label="Series" />
            </div>
          </div>
          <div className="h-64 flex flex-col justify-center px-4 relative overflow-hidden">
             {chartPath ? (
               <svg className="w-full h-full overflow-visible" viewBox="0 0 400 150">
                  <defs>
                    <linearGradient id="blueGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path 
                    d={chartPath} 
                    fill="none" 
                    stroke="#2563EB" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                  />
                  <path d={fillPath} fill="url(#blueGradient)" />
               </svg>
             ) : (
                <div className="flex flex-col items-center text-center space-y-2">
                   <BarChart3 className="w-8 h-8 text-neutral-800" />
                   <p className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">Awaiting Initial Data</p>
                </div>
             )}
             <div className="flex justify-between mt-6">
                {monthlyData.map(m => (
                  <span key={m.month} className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{m.month}</span>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-[#141416] rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-neutral-800 flex items-center justify-between">
          <h4 className="text-xl font-bold text-white">Recent Activity</h4>
          <button className="text-blue-500 text-sm font-bold hover:underline underline-offset-4 decoration-2">View History</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-neutral-500 text-[10px] uppercase font-bold tracking-[0.2em] bg-neutral-900/10">
                <th className="px-8 py-5">Title</th>
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5">Progress</th>
                <th className="px-8 py-5 text-right">Last Watched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/50">
              {recentActivity.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-14 rounded-lg bg-neutral-800 flex-shrink-0 border border-neutral-700/50 overflow-hidden">
                        <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-full bg-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{item.type}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-2">
                       <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500">
                         <span>{item.status}</span>
                         <span>{item.progress}%</span>
                       </div>
                       <div className="w-32 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${item.progress}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right text-xs font-medium text-neutral-500">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatWidget({ label, value, icon: Icon, trend }: { label: string, value: string | number, icon: any, trend: string }) {
  return (
    <div className="bg-[#141416] p-6 rounded-2xl border border-neutral-800 space-y-3 hover:border-blue-500/50 transition-colors group">
      <div className="flex items-center justify-between">
        <span className="text-neutral-500 text-[9px] font-black uppercase tracking-widest">{label}</span>
        <div className="p-2 bg-neutral-900 rounded-lg group-hover:bg-blue-600/10 transition-colors">
          <Icon className="w-4 h-4 text-blue-500" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
          trend.startsWith('+') ? "bg-emerald-950/30 text-emerald-500" : "bg-neutral-900 text-neutral-500"
        )}>
           {trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : null}
           {trend}
        </span>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2.5 h-2.5 rounded-full", color)}></div>
      <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{label}</span>
    </div>
  );
}
