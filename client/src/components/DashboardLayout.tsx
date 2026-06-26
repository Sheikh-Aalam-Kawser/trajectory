import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { Compass, LayoutDashboard, Calendar, RefreshCcw, LogOut, User, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/commitment', label: 'Active Commitment', icon: Calendar },
    { path: '/reflection', label: 'Reflection Logs', icon: RefreshCcw },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar for Desktop / Bottom Nav for Mobile */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 shrink-0 flex flex-col justify-between p-4 md:p-6 md:sticky md:top-0 md:h-screen z-10">
        <div className="flex flex-col space-y-8">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
              <Compass className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight font-display text-slate-900">
              Trajectory
            </span>
          </div>

          {/* Nav Links */}
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer w-full text-left shrink-0 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex flex-row md:flex-col items-center md:items-start justify-between gap-4">
          <div className="flex items-center space-x-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User Avatar'}
                className="h-9 w-9 rounded-full object-cover border border-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 border border-indigo-200">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                {user?.displayName || 'Anonymous'}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px] font-mono">
                {user?.email || 'No email'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            aria-label="Sign Out"
            className="flex items-center space-x-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-2 rounded-lg transition duration-150 cursor-pointer w-full"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Screen Content */}
      <main className="flex-grow flex flex-col min-w-0">
        <header className="border-b border-slate-200/60 bg-white/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-10 md:hidden">
          <div className="flex items-center space-x-3">
            <Compass className="h-6 w-6 text-indigo-600" />
            <span className="font-bold font-display text-slate-900">Trajectory</span>
          </div>
          <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Sandbox Mode
          </span>
        </header>

        {/* Content Area */}
        <div className="flex-grow p-6 md:p-8 max-w-6xl w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
