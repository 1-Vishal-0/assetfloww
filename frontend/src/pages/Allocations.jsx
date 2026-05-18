import { useEffect, useState, useCallback, useRef } from 'react';
import { allocationAPI, assetAPI, employeeAPI } from '../api';
import Navbar from '../components/Navbar';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import { formatDateTime, debounce } from '../utils/helpers';
import { UserCheck, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Allocations() {
  const [allocations, setAllocations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ asset_id: '', employee_id: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAllocations = useCallback(async (params) => {
    setLoading(true); setError('');
    try {
      const res = await allocationAPI.getActive(params);
      setAllocations(res.data);
      setPagination(res.pagination);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  const debouncedFetch = useRef(debounce((p) => fetchAllocations(p), 400)).current;

  useEffect(() => {
    debouncedFetch({ search, page, limit: 10 });
  }, [search, page, debouncedFetch]);

  const openModal = async () => {
    setModalOpen(true);
    setForm({ asset_id: '', employee_id: '', notes: '' });
    try {
      const [aRes, eRes] = await Promise.all([
        assetAPI.getAll({ status: 'in_stock', limit: 100 }),
        employeeAPI.getAll(),
      ]);
      setAssets(aRes.data.filter(a => a.current_status === 'in_stock' || a.current_status === 'returned'));
      setEmployees(eRes.data);
    } catch { toast.error('Failed to load data'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_id || !form.employee_id) return toast.error('Please select asset and employee');
    setSubmitting(true);
    try {
      await allocationAPI.create({ asset_id: parseInt(form.asset_id), employee_id: parseInt(form.employee_id), notes: form.notes });
      toast.success('Asset allocated successfully');
      setModalOpen(false);
      fetchAllocations({ search, page, limit: 10 });
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Allocations" subtitle="Active asset allocations" />
      <div className="flex-1 p-6 space-y-4 animate-fade-in">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by asset or employee..." className="w-72" />
          <button onClick={openModal} className="btn-primary"><Plus className="w-4 h-4" /> Allocate Asset</button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Allocated At</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && <tr><td colSpan={6} className="py-12"><LoadingSpinner /></td></tr>}
                {!loading && error && <tr><td colSpan={6}><ErrorMessage message={error} onRetry={() => fetchAllocations({ search, page })} /></td></tr>}
                {!loading && !error && allocations.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-500">No active allocations found.</td></tr>
                )}
                {!loading && allocations.map((a) => (
                  <tr key={a.event_id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{a.asset_name}</p>
                      <p className="text-xs font-mono text-slate-500">{a.serial_number}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{a.category_name}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-200">{a.employee_name}</p>
                      <p className="text-xs text-slate-500">{a.employee_email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{a.department}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(a.allocated_at)}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{a.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && <div className="px-4 pb-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Allocate Asset">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Asset (In Stock) *</label>
            <select className="input" value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })}>
              <option value="">Select asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.asset_name} — {a.serial_number}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Employee *</label>
            <select className="input" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={3} placeholder="Optional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserCheck className="w-4 h-4" />}
              {submitting ? 'Allocating...' : 'Allocate'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
