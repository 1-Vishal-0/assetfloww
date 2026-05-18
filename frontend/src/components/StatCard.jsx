export default function StatCard({ label, value, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue: 'bg-primary-500/10 border-primary-500/20 text-primary-400',
    green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  };

  return (
    <div className="stat-card group cursor-default">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-slate-100">{value ?? '—'}</p>
        <p className="text-sm text-slate-500 truncate">{label}</p>
        {trend && <p className={`text-xs mt-0.5 ${trend.up ? 'text-emerald-400' : 'text-red-400'}`}>{trend.label}</p>}
      </div>
    </div>
  );
}
