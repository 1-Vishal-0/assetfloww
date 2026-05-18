import { useEffect, useState, useCallback } from 'react';
import { notificationAPI } from '../api';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { formatDateTime } from '../utils/helpers';
import { Bell, BellOff, Check, CheckCheck, Inbox, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      toast.success('Notification marked as read');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.is_read === 0;
    return true;
  });

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Notifications" subtitle="Stay updated with system events and inventory actions" />
      <div className="flex-1 p-6 space-y-4 animate-fade-in">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-slate-800 text-slate-100 border-slate-700'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              All Alerts ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                filter === 'unread'
                  ? 'bg-slate-800 text-slate-100 border-slate-700'
                  : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4 text-primary-400" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Alerts list */}
        {loading && <LoadingSpinner text="Fetching system alert logs..." />}
        {error && <ErrorMessage message={error} onRetry={fetchNotifications} />}

        {!loading && !error && (
          <div className="card overflow-hidden">
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                  {filter === 'unread' ? <Inbox className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-slate-300 font-semibold">{filter === 'unread' ? 'Inbox clean!' : 'No notifications'}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {filter === 'unread' ? "You've read all alerts." : 'System updates will show up here.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-4 p-4 transition-all duration-200 ${
                      notif.is_read ? 'opacity-60 bg-transparent' : 'bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      notif.message.includes('Damage') || notif.message.includes('Low')
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                    }`}>
                      {notif.message.includes('Damage') || notif.message.includes('Low') ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-slate-200 ${notif.is_read ? 'font-normal' : 'font-medium'}`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{formatDateTime(notif.created_at)}</p>
                    </div>

                    {notif.is_read === 0 && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-150 flex-shrink-0"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
