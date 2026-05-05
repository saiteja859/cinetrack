/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { TopBar } from './components/Navigation';
import { Footer } from './components/Footer';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function Layout() {
  const { user, loading, signingIn, signIn } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-neutral-500 font-medium animate-pulse">Initializing CineTrack...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center p-4 md:p-10 lg:p-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-6xl w-full bg-[#141416] border border-[#232326] rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col md:flex-row min-h-[500px]"
        >
          {/* Left Side: Visual */}
          <div className="md:w-1/2 relative bg-neutral-900 group overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1200" 
              alt="Cinema Atmosphere" 
              className="w-full h-full object-cover opacity-60 grayscale transition-transform duration-1000 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent mix-blend-overlay" />
            <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-black via-black/50 to-transparent">
              <div className="space-y-2">
                <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full">Secure Entry</span>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
                  Your Personal <br/><span className="text-blue-500">Cine Stack</span>
                </h2>
              </div>
            </div>
          </div>

          {/* Right Side: Identity */}
          <div className="md:w-1/2 p-10 md:p-16 flex flex-col justify-center space-y-10">
            <div className="space-y-3">
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase">CINETRACK<span className="text-blue-600">.</span></h1>
              <div className="h-1 w-12 bg-blue-600 rounded-full" />
              <p className="text-neutral-500 text-sm font-medium leading-relaxed max-w-sm uppercase tracking-widest text-[10px]">
                Enter the archive to synchronize your cinematic journey across all devices.
              </p>
            </div>
            
            <div className="space-y-6">
              <button 
                onClick={signIn}
                disabled={signingIn}
                className="w-full group relative flex items-center justify-center gap-4 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 shadow-2xl hover:bg-blue-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white/10 rounded-2xl scale-0 group-hover:scale-100 transition-transform" />
                {signingIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {signingIn ? 'Authenticating...' : 'Enter Website via Google'}
              </button>
            </div>

            <div className="pt-10 border-t border-neutral-900">
               <p className="text-[9px] font-black text-neutral-700 uppercase tracking-[0.3em]">Authorized Access Required</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white flex flex-col">
      <TopBar />
      <main className="flex-1 pt-20 min-h-screen">
        <motion.div 
          key={window.location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto px-6 md:px-12 py-10"
        >
          <Outlet />
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
