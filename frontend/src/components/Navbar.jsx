import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ title, subtitle }) {
  const { user } = useAuth();

  // Use name if present (seeded data), else email initial
  const displayName = user?.name || user?.email || 'Admin';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-400">{initial}</span>
          </div>
          <span className="text-sm text-slate-400 hidden sm:block">{displayName}</span>
        </div>
      </div>
    </header>
  );
}
