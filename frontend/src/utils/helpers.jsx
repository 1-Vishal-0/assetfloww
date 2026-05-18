// Format date to readable string
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

// Format datetime
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// Status badge config
export const STATUS_CONFIG = {
  allocated: { label: 'Allocated', className: 'badge-allocated', dot: 'bg-amber-400' },
  in_stock: { label: 'In Stock', className: 'badge-in_stock', dot: 'bg-emerald-400' },
  returned: { label: 'Returned', className: 'badge-returned', dot: 'bg-sky-400' },
  damaged: { label: 'Damaged', className: 'badge-damaged', dot: 'bg-red-400' },
  added: { label: 'Added', className: 'badge-added', dot: 'bg-purple-400' },
};

export const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['in_stock'];
  return (
    <span className={config.className}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

// Severity config
export const SEVERITY_CONFIG = {
  low: { label: 'Low', className: 'bg-sky-500/15 text-sky-400 border border-sky-500/30' },
  medium: { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  high: { label: 'High', className: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
  critical: { label: 'Critical', className: 'bg-red-500/15 text-red-400 border border-red-500/30' },
};

export const SeverityBadge = ({ severity }) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG['medium'];
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

// Debounce
export const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

// Truncate text
export const truncate = (str, n = 40) => str?.length > n ? `${str.slice(0, n)}…` : str || '—';
