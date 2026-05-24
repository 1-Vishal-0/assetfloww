import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { historyAPI } from '../api';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { StatusBadge, formatDateTime } from '../utils/helpers';
import { History as HistoryIcon } from 'lucide-react';

const EVENT_TYPES = ['all', 'allocated', 'returned', 'damaged'];

function EmptyState({ filter }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
        <HistoryIcon className="w-8 h-8 text-slate-600" />
      </div>
      <div className="text-center">
        <h3 className="text-slate-300 font-semibold">No events found</h3>
        <p className="text-xs text-slate-500 mt-1">
          {filter !== 'all'
            ? `No "${filter}" events recorded yet. Events appear here as actions occur.`
            : 'No activity yet. Events are recorded automatically as you allocate, return, or report damage.'}
        </p>
      </div>
    </div>
  );
}

export default function History() {
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState('all');

  const fetchHistory = useCallback(async (params) => {
    setLoading(true); setError('');
    try {
      const res = await historyAPI.getAll(params);
      setEvents(res.data);
      setPagination(res.pagination);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchHistory({
      page,
      limit: 15,
      event_type: eventFilter !== 'all' ? eventFilter : undefined,
    });
  }, [page, eventFilter, fetchHistory]);

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Activity History" subtitle="Complete audit trail of all inventory events" />
      <div className="flex-1 p-6 space-y-4 animate-fade-in">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-slate-500">Filter:</span>
          {EVENT_TYPES.map(t => (
            <button
              key={t}
              onClick={() => { setEventFilter(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                eventFilter === t
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {t === 'all' ? 'All Events' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && <tr><td colSpan={6} className="py-12"><LoadingSpinner /></td></tr>}
                {!loading && error && <tr><td colSpan={6}><ErrorMessage message={error} onRetry={() => fetchHistory({ page })} /></td></tr>}
                {!loading && !error && events.length === 0 && (
                  <tr><td colSpan={6}><EmptyState filter={eventFilter} /></td></tr>
                )}
                {!loading && events.map((ev, idx) => (
                  <tr key={`${ev.event_type}-${ev.id ?? idx}`} className="table-row-hover">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{ev.asset_name}</p>
                      <p className="text-xs font-mono text-slate-500">{ev.serial_number}</p>
                      <p className="text-xs text-slate-600">{ev.category_name}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ev.event_type} /></td>
                    <td className="px-4 py-3 text-slate-300">{ev.employee_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{ev.department || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs">
                      <span className="line-clamp-1 text-xs">{ev.notes || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(ev.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && <div className="px-4 pb-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>
    </div>
  );
}
