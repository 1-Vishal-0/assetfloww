import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetAPI, categoryAPI } from '../api';
import Navbar from '../components/Navbar';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { StatusBadge, formatDate, debounce } from '../utils/helpers';
import { Plus, Pencil, Trash2, Eye, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['all', 'in_stock', 'allocated', 'returned', 'damaged'];

export default function AssetList() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);

  const fetchAssets = useCallback(async (params) => {
    setLoading(true); setError('');
    try {
      const res = await assetAPI.getAll(params);
      setAssets(res.data);
      setPagination(res.pagination);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  const debouncedFetch = useRef(debounce((params) => fetchAssets(params), 400)).current;

  useEffect(() => {
    categoryAPI.getAll().then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    debouncedFetch({ search, category_id: categoryFilter || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, page, limit: 10 });
  }, [search, categoryFilter, statusFilter, page, debouncedFetch]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete asset "${name}"? This action cannot be undone.`)) return;
    setDeleting(id);
    try {
      await assetAPI.delete(id);
      toast.success('Asset deleted');
      fetchAssets({ search, category_id: categoryFilter || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, page, limit: 10 });
    } catch (err) { toast.error(err.message); }
    finally { setDeleting(null); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Assets" subtitle="Manage your inventory" />
      <div className="flex-1 p-6 space-y-4 animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search assets..." className="w-64" />
            <select className="input w-44" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          <button onClick={() => navigate('/assets/new')} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Serial No.</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Purchase Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && (
                  <tr><td colSpan={7} className="py-12"><LoadingSpinner text="Loading assets..." /></td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={7}><ErrorMessage message={error} onRetry={() => fetchAssets({ search, page })} /></td></tr>
                )}
                {!loading && !error && assets.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-500">No assets found. <button onClick={() => navigate('/assets/new')} className="text-primary-400 hover:underline">Add one?</button></td></tr>
                )}
                {!loading && assets.map((asset) => (
                  <tr key={asset.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{asset.asset_name}</p>
                      <p className="text-xs text-slate-500">{asset.model || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{asset.category_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{asset.serial_number}</td>
                    <td className="px-4 py-3 text-slate-400">{asset.location || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(asset.purchase_date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={asset.current_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/history?asset=${asset.id}`)} title="History" className="p-1.5 rounded-lg text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate(`/assets/${asset.id}/edit`)} title="Edit" className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id, asset.asset_name)}
                          disabled={deleting === asset.id}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && (
            <div className="px-4 pb-4">
              <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
