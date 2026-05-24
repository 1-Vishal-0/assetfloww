import { useEffect, useState, useCallback } from 'react';
import { damageAPI, assetAPI } from '../api';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import { SeverityBadge, formatDateTime } from '../utils/helpers';
import { AlertTriangle, Plus, ImageIcon, Trash2, CheckCircle, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

function EmptyState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
        <ShieldOff className="w-8 h-8 text-slate-600" />
      </div>
      <div className="text-center">
        <h3 className="text-slate-300 font-semibold">No damage reports</h3>
        <p className="text-xs text-slate-500 mt-1">All assets are in good health. Report damage when it occurs.</p>
      </div>
    </div>
  );
}

export default function DamageReports() {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ asset_id: '', description: '', severity: 'medium', photo: null });
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const fetchReports = useCallback(async (params) => {
    setLoading(true); setError('');
    try {
      const res = await damageAPI.getAll(params);
      setReports(res.data);
      setPagination(res.pagination);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchReports({ page, limit: 10, status: statusFilter || undefined });
  }, [page, statusFilter, fetchReports]);

  const openModal = async () => {
    setModalOpen(true);
    setForm({ asset_id: '', description: '', severity: 'medium', photo: null });
    setPreview(null); setFormErrors({});
    try {
      const res = await assetAPI.getAll({ limit: 500 });
      setAssets(res.data);
    } catch { toast.error('Failed to load assets'); }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, photo: file }));
    setPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const errs = {};
    if (!form.asset_id) errs.asset_id = 'Asset is required';
    if (form.description.trim().length < 20) errs.description = 'Minimum 20 characters required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('asset_id', form.asset_id);
      fd.append('description', form.description);
      fd.append('severity', form.severity);
      if (form.photo) fd.append('photo', form.photo);
      await damageAPI.create(fd);
      toast.success('Damage report submitted');
      setModalOpen(false);
      fetchReports({ page, limit: 10, status: statusFilter || undefined });
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    setResolving(true);
    try {
      await damageAPI.resolve(resolveTarget.id);
      toast.success('Damage report marked as resolved');
      setResolveTarget(null);
      fetchReports({ page, limit: 10, status: statusFilter || undefined });
    } catch (err) { toast.error(err.message); }
    finally { setResolving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await damageAPI.delete(deleteTarget.id);
      toast.success('Damage report deleted');
      setDeleteTarget(null);
      fetchReports({ page, limit: 10, status: statusFilter || undefined });
    } catch (err) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Damage Reports" subtitle="Track and resolve asset damage" />
      <div className="flex-1 p-6 space-y-4 animate-fade-in">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            {['', 'Unresolved', 'Resolved'].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  statusFilter === s
                    ? 'bg-slate-700 text-slate-100 border-slate-600'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                }`}>
                {s === '' ? 'All Reports' : s}
              </button>
            ))}
          </div>
          <button onClick={openModal} className="btn-danger"><Plus className="w-4 h-4" /> Report Damage</button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Photo</th>
                  <th className="px-4 py-3">Reported At</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && <tr><td colSpan={7} className="py-12"><LoadingSpinner /></td></tr>}
                {!loading && error && <tr><td colSpan={7}><ErrorMessage message={error} onRetry={() => fetchReports({ page })} /></td></tr>}
                {!loading && !error && reports.length === 0 && (
                  <tr><td colSpan={7}><EmptyState /></td></tr>
                )}
                {!loading && reports.map((r) => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{r.asset_name}</p>
                      <p className="text-xs text-slate-500">{r.serial_number}</p>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={r.severity?.toLowerCase()} /></td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs">
                      <span className="line-clamp-2 text-xs">{r.description}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        r.resolution_status === 'Resolved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {r.resolution_status === 'Resolved' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {r.resolution_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.photo_url
                        ? <a href={`http://localhost:5000${r.photo_url}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-primary-400 hover:underline text-xs">
                            <ImageIcon className="w-3.5 h-3.5" /> View
                          </a>
                        : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {r.resolution_status === 'Unresolved' && (
                          <button onClick={() => setResolveTarget(r)} title="Mark Resolved"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(r)} title="Delete"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && <div className="px-4 pb-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      {/* Report Damage Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Report Asset Damage" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Asset *</label>
            <select className={`input ${formErrors.asset_id ? 'border-red-500' : ''}`}
              value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })}>
              <option value="">Select asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.asset_name} — {a.serial_number}</option>)}
            </select>
            {formErrors.asset_id && <p className="text-xs text-red-400 mt-1">{formErrors.asset_id}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Severity *</label>
              <select className="input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Photo <span className="text-slate-500 font-normal">(optional)</span></label>
              <input type="file" accept="image/*" onChange={handleFile}
                className="input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-slate-700 file:text-slate-300 file:text-xs cursor-pointer" />
            </div>
          </div>
          {preview && <img src={preview} alt="Preview" className="h-28 w-auto rounded-lg border border-slate-700 object-cover" />}
          <div>
            <label className="label">Description * <span className="text-slate-500 font-normal">(min 20 characters)</span></label>
            <textarea className={`input resize-none ${formErrors.description ? 'border-red-500' : ''}`} rows={4}
              placeholder="Describe the damage in detail..." value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="flex justify-between mt-1">
              {formErrors.description ? <p className="text-xs text-red-400">{formErrors.description}</p> : <span />}
              <p className={`text-xs ${form.description.length < 20 ? 'text-slate-600' : 'text-emerald-500'}`}>{form.description.length} chars</p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn-danger flex-1 justify-center">
              {submitting ? <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Resolve Confirm Modal */}
      <Modal isOpen={!!resolveTarget} onClose={() => setResolveTarget(null)} title="Resolve Damage Report" size="sm">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-emerald-300">Mark this damage report as resolved. The asset will become available for allocation again.</p>
          </div>
          {resolveTarget && (
            <p className="text-sm text-slate-300">Resolve report for <span className="font-semibold text-slate-100">{resolveTarget.asset_name}</span>?</p>
          )}
          <div className="flex gap-3">
            <button onClick={handleResolve} disabled={resolving} className="btn-success flex-1 justify-center">
              {resolving ? <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {resolving ? 'Resolving...' : 'Mark Resolved'}
            </button>
            <button onClick={() => setResolveTarget(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Damage Report" size="sm">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300">This action permanently removes the damage report from the system.</p>
          </div>
          {deleteTarget && (
            <p className="text-sm text-slate-300">Delete damage report for <span className="font-semibold text-slate-100">{deleteTarget.asset_name}</span>?</p>
          )}
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1 justify-center">
              {deleting ? <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? 'Deleting...' : 'Delete Report'}
            </button>
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
