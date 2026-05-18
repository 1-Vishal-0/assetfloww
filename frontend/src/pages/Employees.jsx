import { useEffect, useState, useCallback, useRef } from 'react';
import { employeeAPI, historyAPI } from '../api';
import Navbar from '../components/Navbar';
import SearchInput from '../components/SearchInput';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import { StatusBadge, formatDateTime, debounce } from '../utils/helpers';
import { Users, Plus, Pencil, Trash2, History } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formModal, setFormModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', department: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = useCallback(async (s) => {
    setLoading(true); setError('');
    try {
      const res = await employeeAPI.getAll({ search: s });
      setEmployees(res.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  const debouncedFetch = useRef(debounce((s) => fetchEmployees(s), 400)).current;
  useEffect(() => { debouncedFetch(search); }, [search, debouncedFetch]);

  const openCreate = () => { setEditTarget(null); setForm({ name: '', email: '', department: '' }); setFormErrors({}); setFormModal(true); };
  const openEdit = (emp) => { setEditTarget(emp); setForm({ name: emp.name, email: emp.email, department: emp.department }); setFormErrors({}); setFormModal(true); };

  const openHistory = async (emp) => {
    setHistoryTarget(emp); setHistoryModal(true); setHistoryData(null); setHistoryLoading(true);
    try {
      const res = await historyAPI.getByEmployee(emp.id);
      setHistoryData(res);
    } catch { toast.error('Failed to load history'); }
    finally { setHistoryLoading(false); }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
    if (!form.department.trim()) errs.department = 'Department is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (editTarget) {
        await employeeAPI.update(editTarget.id, form);
        toast.success('Employee updated');
      } else {
        await employeeAPI.create(form);
        toast.success('Employee created');
      }
      setFormModal(false);
      fetchEmployees(search);
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete employee "${name}"?`)) return;
    try {
      await employeeAPI.delete(id);
      toast.success('Employee deleted');
      fetchEmployees(search);
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Employees" subtitle="Manage employee records" />
      <div className="flex-1 p-6 space-y-4 animate-fade-in">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Search employees..." className="w-64" />
          <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Employee</button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && <tr><td colSpan={4} className="py-12"><LoadingSpinner /></td></tr>}
                {!loading && error && <tr><td colSpan={4}><ErrorMessage message={error} onRetry={() => fetchEmployees(search)} /></td></tr>}
                {!loading && !error && employees.length === 0 && (
                  <tr><td colSpan={4} className="py-12 text-center text-slate-500">No employees found.</td></tr>
                )}
                {!loading && employees.map((emp) => (
                  <tr key={emp.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-400">{emp.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-slate-200">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{emp.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">{emp.department}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openHistory(emp)} title="View History" className="p-1.5 rounded-lg text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors">
                          <History className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(emp)} title="Edit" className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(emp.id, emp.name)} title="Delete" className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={formModal} onClose={() => setFormModal(false)} title={editTarget ? 'Edit Employee' : 'Add Employee'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className={`input ${formErrors.name ? 'border-red-500' : ''}`} placeholder="e.g. John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className={`input ${formErrors.email ? 'border-red-500' : ''}`} placeholder="john@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            {formErrors.email && <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>}
          </div>
          <div>
            <label className="label">Department *</label>
            <input className={`input ${formErrors.department ? 'border-red-500' : ''}`} placeholder="e.g. Engineering" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            {formErrors.department && <p className="text-xs text-red-400 mt-1">{formErrors.department}</p>}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Users className="w-4 h-4" />}
              {submitting ? 'Saving...' : editTarget ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => setFormModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={historyModal} onClose={() => setHistoryModal(false)} title={`History — ${historyTarget?.name}`} size="xl">
        {historyLoading && <LoadingSpinner />}
        {!historyLoading && historyData && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {historyData.events.length === 0 && <p className="text-slate-500 text-center py-8">No history for this employee.</p>}
            {historyData.events.map((ev) => (
              <div key={ev.event_id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
                <StatusBadge status={ev.event_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium">{ev.asset_name}</p>
                  <p className="text-xs text-slate-500">{ev.serial_number} · {ev.category_name}</p>
                  {ev.notes && <p className="text-xs text-slate-400 mt-1">{ev.notes}</p>}
                </div>
                <p className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(ev.timestamp)}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
