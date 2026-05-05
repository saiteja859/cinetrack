/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-neutral-950 border-t border-neutral-800/50 pt-20 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1 space-y-6">
            <h2 className="text-2xl font-black tracking-tighter text-blue-500 uppercase">CINETRACK</h2>
            <p className="text-neutral-500 text-sm leading-relaxed max-w-xs">
              The ultimate destination for film enthusiasts to track, discover, and organize their cinematic journey in real-time.
            </p>
            <div className="flex gap-4">
              <SocialLink icon={Twitter} />
              <SocialLink icon={Instagram} />
              <SocialLink icon={Youtube} />
              <SocialLink icon={Github} />
            </div>
          </div>
          
          <FooterSection title="Platform">
            <FooterLink to="/">Home</FooterLink>
            <FooterLink to="/search">Explore</FooterLink>
            <FooterLink to="/library">Collection</FooterLink>
            <FooterLink to="/watchlist">Watchlist</FooterLink>
          </FooterSection>

          <FooterSection title="Community">
            <FooterLink to="/">Join Discord</FooterLink>
            <FooterLink to="/">Member Perks</FooterLink>
            <FooterLink to="/">Reviews</FooterLink>
            <FooterLink to="/">Discussion</FooterLink>
          </FooterSection>

          <FooterSection title="Legal">
            <FooterLink to="/">Privacy Policy</FooterLink>
            <FooterLink to="/">Terms of Service</FooterLink>
            <FooterLink to="/">Cookie Policy</FooterLink>
            <FooterLink to="/">API Guidelines</FooterLink>
          </FooterSection>
        </div>

        <div className="pt-8 border-t border-neutral-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-neutral-600 text-xs font-medium">
            © {new Date().getFullYear()} CineTrack Interactive. All cinematic rights reserved.
          </p>
          <div className="flex gap-8 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
            <span className="hover:text-neutral-400 cursor-pointer">Status: Operational</span>
            <span className="hover:text-neutral-400 cursor-pointer">Region: Global</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ icon: Icon }: { icon: any }) {
  return (
    <a href="#" className="p-2 bg-neutral-900 rounded-lg text-neutral-500 hover:text-blue-500 hover:bg-neutral-800 transition-all">
      <Icon className="w-5 h-5" />
    </a>
  );
}

function FooterSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">{title}</h4>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

function FooterLink({ to, children }: { to: string, children: React.ReactNode }) {
  return (
    <Link to={to} className="text-sm text-neutral-500 hover:text-white transition-colors font-medium">
      {children}
    </Link>
  );
}
