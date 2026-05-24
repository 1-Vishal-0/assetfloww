import { useEffect, useState, useCallback, useRef } from 'react';
import { allocationAPI, assetAPI, employeeAPI } from '../api';
import Navbar from '../components/Navbar';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import { formatDateTime, formatDate, debounce } from '../utils/helpers';
import { UserCheck, Plus, Trash2, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';

function EmptyState({ search }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
        <UserCheck className="w-8 h-8 text-slate-600" />
      </div>
      <div className="text-center">
        <h3 className="text-slate-300 font-semibold">
          {search ? 'No allocations match your search' : 'No active allocations'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {search ? 'Try a different name or asset.' : 'Allocate an in-stock asset to an employee to get started.'}
        </p>
      </div>
    </div>
  );
}

export default function Allocations() {
  const [allocations, setAllocations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ asset_id: '', employee_id: '', notes: '', expected_return_date: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    setForm({ asset_id: '', employee_id: '', notes: '', expected_return_date: '' });
    try {
      const [aRes, eRes] = await Promise.all([
        assetAPI.getAll({ status: 'in_stock', limit: 200 }),
        employeeAPI.getAll(),
      ]);
      setAssets(aRes.data.filter(a => a.current_status === 'in_stock'));
      setEmployees(eRes.data);
    } catch { toast.error('Failed to load data'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_id || !form.employee_id) return toast.error('Select both an asset and an employee');
    setSubmitting(true);
    try {
      await allocationAPI.create({
        asset_id: parseInt(form.asset_id),
        employee_id: parseInt(form.employee_id),
        notes: form.notes || undefined,
        expected_return_date: form.expected_return_date || undefined,
      });
      toast.success('Asset allocated successfully');
      setModalOpen(false);
      fetchAllocations({ search, page, limit: 10 });
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await allocationAPI.delete(deleteTarget.id);
      toast.success('Allocation revoked');
      setDeleteTarget(null);
      fetchAllocations({ search, page, limit: 10 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
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
                  <th className="px-4 py-3">Expected Return</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && <tr><td colSpan={7} className="py-12"><LoadingSpinner /></td></tr>}
                {!loading && error && <tr><td colSpan={7}><ErrorMessage message={error} onRetry={() => fetchAllocations({ search, page })} /></td></tr>}
                {!loading && !error && allocations.length === 0 && (
                  <tr><td colSpan={7}><EmptyState search={search} /></td></tr>
                )}
                {!loading && allocations.map((a) => (
                  <tr key={a.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{a.asset_name}</p>
                      <p className="text-xs font-mono text-slate-500">{a.serial_number}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{a.category_name || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-200">{a.employee_name}</p>
                      <p className="text-xs text-slate-500">{a.employee_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">{a.department}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(a.allocated_at)}</td>
                    <td className="px-4 py-3 text-xs">
                      {a.expected_return_date ? (
                        <span className="flex items-center gap-1 text-amber-400">
                          <CalendarClock className="w-3.5 h-3.5" />
                          {formatDate(a.expected_return_date)}
                        </span>
                      ) : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget(a)}
                        title="Revoke allocation"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && <div className="px-4 pb-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      {/* Allocate Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Allocate Asset">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Asset (In Stock) *</label>
            <select className="input" value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })}>
              <option value="">Select asset</option>
              {assets.length === 0 && <option disabled>No in-stock assets available</option>}
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.asset_name} — {a.serial_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Employee *</label>
            <select className="input" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
              <option value="">Select employee</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name || e.full_name} — {e.department}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Expected Return Date <span className="text-slate-500 font-normal">(optional)</span></label>
            <input type="date" className="input" value={form.expected_return_date}
              onChange={e => setForm({ ...form, expected_return_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes <span className="text-slate-500 font-normal">(optional)</span></label>
            <textarea className="input resize-none" rows={2} placeholder="Purpose, handover details..."
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
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

      {/* Revoke Confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Revoke Allocation" size="sm">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-300">This will revoke the active allocation. The asset will return to In Stock status.</p>
          </div>
          {deleteTarget && (
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-1">
              <p className="text-xs text-slate-500">Asset</p>
              <p className="text-sm font-medium text-slate-200">{deleteTarget.asset_name}</p>
              <p className="text-xs text-slate-500 font-mono">{deleteTarget.serial_number}</p>
              <p className="text-xs text-slate-400 mt-1">Assigned to: <span className="text-slate-200">{deleteTarget.employee_name}</span></p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1 justify-center">
              {deleting ? <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? 'Revoking...' : 'Revoke Allocation'}
            </button>
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
