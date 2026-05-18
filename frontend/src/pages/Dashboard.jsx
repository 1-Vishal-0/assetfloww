import { useEffect, useState, useCallback } from 'react';
import { dashboardAPI } from '../api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { StatusBadge, formatDateTime } from '../utils/helpers';
import { Package, UserCheck, ArchiveRestore, AlertTriangle, Users, ShieldAlert } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
        <p className="text-slate-300">{label}</p>
        <p className="text-primary-400 font-medium">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await dashboardAPI.getStats();
      // Interceptor unwraps axios .data → res = {success, data:{stats,byCategory,...}}
      setData(res.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Dashboard" subtitle="Overview of your inventory" />
      <div className="flex-1 p-6 space-y-6 animate-fade-in">
        {loading && <LoadingSpinner text="Loading dashboard..." />}
        {error && <ErrorMessage message={error} onRetry={fetchDashboard} />}
        {data && (
          <>
            {/* Low stock alert */}
            {data.lowStock?.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Low Stock Alert</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    {data.lowStock.map(c => `${c.category} (${c.available_count} available)`).join(' · ')}
                  </p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard label="Total Assets" value={data.stats.total_assets} icon={Package} color="blue" />
              <StatCard label="In Stock" value={data.stats.in_stock} icon={ArchiveRestore} color="green" />
              <StatCard label="Allocated" value={data.stats.allocated} icon={UserCheck} color="amber" />
              <StatCard label="Damaged" value={data.stats.damaged} icon={AlertTriangle} color="red" />
              <StatCard label="Employees" value={data.stats.total_employees} icon={Users} color="purple" />
              <StatCard label="Damage Reports" value={data.stats.total_damages} icon={ShieldAlert} color="sky" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart — Assets by Category */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Assets by Category</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byCategory} margin={{ left: -10 }}>
                    <XAxis dataKey="category" tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-slate-400)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="var(--color-primary-600)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart — Events by type */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Events Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.byEventType}
                      dataKey="count"
                      nameKey="event_type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {data.byEventType.map((entry, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-slate-400 text-xs capitalize">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Events */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Recent Activity</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800">
                      <th className="pb-3 pr-4">Asset</th>
                      <th className="pb-3 pr-4">Event</th>
                      <th className="pb-3 pr-4">Employee</th>
                      <th className="pb-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.recentEvents.map((ev) => (
                      <tr key={ev.id} className="table-row-hover">
                        <td className="py-3 pr-4">
                          <p className="text-slate-200 font-medium">{ev.asset_name}</p>
                          <p className="text-xs text-slate-500">{ev.serial_number}</p>
                        </td>
                        <td className="py-3 pr-4"><StatusBadge status={ev.event_type} /></td>
                        <td className="py-3 pr-4 text-slate-400">{ev.employee_name || '—'}</td>
                        <td className="py-3 text-slate-500 text-xs">{formatDateTime(ev.created_at)}</td>
                      </tr>
                    ))}
                    {data.recentEvents.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-slate-500">No events yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
