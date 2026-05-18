import { useEffect, useState, useCallback } from 'react';
import { allocationAPI, returnAPI } from '../api';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import { formatDateTime } from '../utils/helpers';
import { RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Returns() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAllocations = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await allocationAPI.getActive({ limit: 100 });
      setAllocations(res.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAllocations(); }, [fetchAllocations]);

  const handleReturn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await returnAPI.create({ asset_id: selectedAsset.asset_id, notes });
      toast.success(`"${selectedAsset.asset_name}" returned successfully`);
      setSelectedAsset(null);
      setNotes('');
      fetchAllocations();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Return Management" subtitle="Process asset returns" />
      <div className="flex-1 p-6 space-y-4 animate-fade-in">
        <div className="card p-4 bg-sky-500/5 border-sky-500/20">
          <p className="text-sm text-sky-400">Select an allocated asset below to process its return.</p>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Allocated At</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && <tr><td colSpan={5} className="py-12"><LoadingSpinner /></td></tr>}
                {!loading && error && <tr><td colSpan={5}><ErrorMessage message={error} onRetry={fetchAllocations} /></td></tr>}
                {!loading && !error && allocations.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500">No active allocations to return.</td></tr>
                )}
                {!loading && allocations.map((a) => (
                  <tr key={a.event_id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{a.asset_name}</p>
                      <p className="text-xs font-mono text-slate-500">{a.serial_number}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{a.employee_name}</td>
                    <td className="px-4 py-3 text-slate-400">{a.department}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(a.allocated_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setSelectedAsset(a); setNotes(''); }} className="btn-success text-sm py-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> Return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} title="Process Return">
        {selectedAsset && (
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Returning asset</p>
              <p className="font-medium text-slate-200">{selectedAsset.asset_name}</p>
              <p className="text-xs text-slate-500">{selectedAsset.serial_number} · {selectedAsset.category_name}</p>
              <p className="text-xs text-slate-400 mt-1">From: <span className="text-slate-300">{selectedAsset.employee_name}</span></p>
            </div>
            <div>
              <label className="label">Return Notes</label>
              <textarea className="input resize-none" rows={3} placeholder="Condition, reason for return..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {submitting ? 'Processing...' : 'Confirm Return'}
              </button>
              <button type="button" onClick={() => setSelectedAsset(null)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
