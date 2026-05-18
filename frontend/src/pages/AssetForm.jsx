import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assetAPI, categoryAPI } from '../api';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { Save, ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssetForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    asset_name: '', serial_number: '', model: '',
    category_id: '', purchase_date: '', location: '',
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    categoryAPI.getAll().then(r => setCategories(r.data)).catch(() => {});
    if (isEdit) {
      assetAPI.getById(id)
        .then(r => {
          const a = r.data;
          setForm({
            asset_name: a.asset_name || '',
            serial_number: a.serial_number || '',
            model: a.model || '',
            category_id: a.category_id || '',
            purchase_date: a.purchase_date ? a.purchase_date.split('T')[0] : '',
            location: a.location || '',
          });
        })
        .catch(() => toast.error('Failed to load asset'))
        .finally(() => setFetchLoading(false));
    }
  }, [id, isEdit]);

  const validate = () => {
    const errs = {};
    if (!form.asset_name.trim()) errs.asset_name = 'Asset name is required';
    if (!form.serial_number.trim()) errs.serial_number = 'Serial number is required';
    if (!form.category_id) errs.category_id = 'Category is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEdit) {
        await assetAPI.update(id, form);
        toast.success('Asset updated successfully');
      } else {
        await assetAPI.create(form);
        toast.success('Asset created successfully');
      }
      navigate('/assets');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  if (fetchLoading) return <div className="flex-1 p-6"><LoadingSpinner /></div>;

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title={isEdit ? 'Edit Asset' : 'Add Asset'} subtitle={isEdit ? `Editing asset #${id}` : 'Add a new asset to inventory'} />
      <div className="flex-1 p-6 animate-fade-in">
        <button onClick={() => navigate('/assets')} className="btn-secondary mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Assets
        </button>

        <div className="card p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Asset Name *</label>
                <input className={`input ${errors.asset_name ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="e.g. MacBook Pro 14" value={form.asset_name} onChange={set('asset_name')} />
                {errors.asset_name && <p className="text-xs text-red-400 mt-1">{errors.asset_name}</p>}
              </div>

              <div>
                <label className="label">Serial Number *</label>
                <input className={`input ${errors.serial_number ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="e.g. SN-2024-001" value={form.serial_number} onChange={set('serial_number')} />
                {errors.serial_number && <p className="text-xs text-red-400 mt-1">{errors.serial_number}</p>}
              </div>

              <div>
                <label className="label">Model</label>
                <input className="input" placeholder="e.g. Apple M3 Pro" value={form.model} onChange={set('model')} />
              </div>

              <div>
                <label className="label">Category *</label>
                <select className={`input ${errors.category_id ? 'border-red-500 focus:ring-red-500' : ''}`}
                  value={form.category_id} onChange={set('category_id')}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.category_id && <p className="text-xs text-red-400 mt-1">{errors.category_id}</p>}
              </div>

              <div>
                <label className="label">Purchase Date</label>
                <input type="date" className="input" value={form.purchase_date} onChange={set('purchase_date')} />
              </div>

              <div>
                <label className="label">Location</label>
                <input className="input" placeholder="e.g. HQ Floor 2" value={form.location} onChange={set('location')} />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Saving...' : isEdit ? 'Update Asset' : 'Create Asset'}
              </button>
              <button type="button" onClick={() => navigate('/assets')} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
