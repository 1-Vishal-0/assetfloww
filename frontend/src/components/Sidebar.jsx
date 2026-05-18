import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, UserCheck, RotateCcw,
  AlertTriangle, History, Users, LogOut, ChevronRight, Sun, Moon,
  BarChart3, Bell, Settings
} from 'lucide-react';
import logo from '../assets/logo.jpg';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assets', icon: Package, label: 'Assets' },
  { to: '/allocations', icon: UserCheck, label: 'Allocations' },
  { to: '/returns', icon: RotateCcw, label: 'Returns' },
  { to: '/damages', icon: AlertTriangle, label: 'Damage Reports' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <aside className={`h-screen bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex-shrink-0`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <img src={logo} alt="AssetFlow Elite Logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-glow" />
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-sm font-bold text-slate-100 leading-tight">AssetFlow Elite</p>
            <p className="text-xs text-slate-500">Enterprise Console</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
            title={collapsed ? label : ''}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="animate-fade-in">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-slate-800">
        {!collapsed && (
          <div className="px-3 py-2 mb-2 animate-fade-in">
            <p className="text-xs font-medium text-slate-300 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        )}
        
        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className={`sidebar-link w-full mb-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? `${theme === 'light' ? 'Dark Mode' : 'Light Mode'}` : ''}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-5 h-5 flex-shrink-0 text-slate-400" />
              {!collapsed && <span>Dark Mode</span>}
            </>
          ) : (
            <>
              <Sun className="w-5 h-5 flex-shrink-0 text-amber-400 animate-pulse-slow" />
              {!collapsed && <span>Light Mode</span>}
            </>
          )}
        </button>

        <button
          onClick={logout}
          className={`sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? 'Logout' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
