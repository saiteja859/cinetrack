/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';
import { Bell, Menu, X } from 'lucide-react';

export function TopBar() {
  const { profile, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Explore', to: '/search' },
    { label: 'My Library', to: '/library' },
    { label: 'Watchlist', to: '/watchlist' },
    { label: 'Schedule', to: '/calendar' },
    { label: 'Activity', to: '/dashboard' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-14 md:h-16 bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-800/50 flex items-center justify-between px-4 md:px-8 z-50">
      
      {/* LEFT */}
      <div className="flex items-center gap-6 md:gap-8">
        <NavLink 
          to="/" 
          className="text-lg md:text-xl font-black tracking-tighter text-blue-500 uppercase shrink-0"
        >
          CINETRACK
        </NavLink>

        <nav className="hidden xl:flex gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "text-xs font-black uppercase tracking-widest px-1 py-1 border-b-2 transition-all",
                  isActive
                    ? "text-blue-500 border-blue-500"
                    : "text-neutral-500 border-transparent hover:text-white"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3 md:gap-6">
        
        <button className="hidden sm:block text-neutral-400 hover:text-blue-400 transition-all p-1.5 rounded-lg hover:bg-neutral-900">
          <Bell className="w-4 h-4" />
        </button>

        {profile && (
          <div className="flex items-center gap-3 border-l border-neutral-800 pl-3 md:pl-6">
            
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-black text-white uppercase tracking-tight leading-none">
                {profile.displayName}
              </p>
              <button
                onClick={logout}
                className="text-[8px] text-neutral-600 hover:text-red-400 mt-1 uppercase font-black tracking-widest transition-colors"
              >
                Sign Out
              </button>
            </div>

            <img
              src={
                profile.photoURL ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`
              }
              alt="Profile"
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl border border-neutral-800 object-cover hover:ring-2 hover:ring-blue-500/30 transition-all"
            />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="xl:hidden p-1.5 text-neutral-400 hover:text-white bg-neutral-900 rounded-lg"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* MOBILE MENU */}
      {isMenuOpen && (
        <div className="absolute top-14 md:top-16 left-0 right-0 bg-neutral-950 border-b border-neutral-800 p-4 xl:hidden flex flex-col gap-3 animate-in slide-in-from-top-4 duration-300">
          
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "text-xs font-black uppercase tracking-widest py-2 px-3 rounded-lg",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-neutral-500 hover:bg-neutral-900"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}

          <button
            onClick={logout}
            className="text-left text-xs font-black uppercase tracking-widest py-2 px-3 text-red-500 hover:bg-red-500/10 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}