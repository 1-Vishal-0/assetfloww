import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-red-400" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-medium">Something went wrong</p>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">{message || 'An unexpected error occurred.'}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      )}
    </div>
  );
}
