import React, { useState, useEffect } from 'react';
import { User } from '../types';
import AdminPanel from './AdminPanel';
import { supabase } from '../src/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onAuthClick: () => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onAuthClick, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.email) {
        setIsAdmin(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .single();

      setIsAdmin(!!data && !error);
    };

    checkAdminStatus();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center font-bold text-xl glow-red">
            HR
          </div>
          <span className="text-xl font-bold tracking-tighter text-white">FILM.COM</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
          <a href="#" className="hover:text-white transition-colors">Movies</a>
        </nav>
        
        <div className="relative">
          {user ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-[10px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-white hidden sm:block">{user.name}</span>
                <i className={`fas fa-chevron-down text-[10px] transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}></i>
              </button>
              
              {showProfileMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 glass-panel rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Signed in as</p>
                    <p className="text-xs font-bold truncate">{user.email}</p>
                    {isAdmin && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-red-600/20 border border-red-600/30 rounded text-[9px] font-bold text-red-400 uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <button className="w-full text-left px-4 py-3 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3">
                    <i className="fas fa-ticket-alt w-4"></i> My Bookings
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        setShowAdminPanel(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all flex items-center gap-3"
                    >
                      <i className="fas fa-shield-alt w-4"></i> Admin Panel
                    </button>
                  )}
                  <button className="w-full text-left px-4 py-3 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3">
                    <i className="fas fa-cog w-4"></i> Settings
                  </button>
                  <button 
                    onClick={onLogout}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-3"
                  >
                    <i className="fas fa-sign-out-alt w-4"></i> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={onAuthClick}
              className="text-sm font-bold text-white bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-xl transition-all border border-white/10"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow pt-20">
        {children}
      </main>

      <footer className="py-12 px-6 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-lg glow-red">
              HR
            </div>
            <span className="text-lg font-bold tracking-tighter">FILM.COM</span>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed max-w-md">
            Experience the future of cinema booking. Premium seats, exclusive premieres, and seamless digital ticketing.
          </p>
        </div>
        <div className="mt-12 pt-8 border-t border-white/5 text-center text-gray-600 text-xs">
          © {new Date().getFullYear()} HRFILM.COM. All rights reserved. Built for cinema lovers.
        </div>
      </footer>

      {/* Admin Panel Modal */}
      <AdminPanel 
        isOpen={showAdminPanel} 
        onClose={() => setShowAdminPanel(false)}
        userEmail={user?.email}
      />
    </div>
  );
};

export default Layout;
