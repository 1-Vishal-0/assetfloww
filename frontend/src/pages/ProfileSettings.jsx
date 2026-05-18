import { useState, useEffect } from 'react';
import { authAPI } from '../api';
import Navbar from '../components/Navbar';
import { User, Shield, Lock, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileSettings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [emailForm, setEmailForm] = useState({ email: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    // Read from localStorage to boot initial user credentials
    const cachedUserStr = localStorage.getItem('eis_user');
    if (cachedUserStr) {
      try {
        const u = JSON.parse(cachedUserStr);
        setCurrentUser(u);
        setEmailForm({ email: u.email || '' });
      } catch (err) {
        console.error('Failed to parse cached user info:', err);
      }
    }
    
    // Fetch fresh user profile details
    authAPI.getMe()
      .then(res => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
          setEmailForm({ email: res.user.email || '' });
          localStorage.setItem('eis_user', JSON.stringify(res.user));
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.email.trim() || !/\S+@\S+\.\S+/.test(emailForm.email)) {
      toast.error('Please input a valid email address');
      return;
    }
    setUpdatingEmail(true);
    try {
      const res = await authAPI.updateProfile({ email: emailForm.email });
      if (res.success) {
        toast.success('Email updated successfully');
        const updated = { ...currentUser, email: emailForm.email };
        setCurrentUser(updated);
        localStorage.setItem('eis_user', JSON.stringify(updated));
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation password do not match');
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await authAPI.updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      if (res.success) {
        toast.success('Password updated successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Profile Settings" subtitle="Manage your security options and user credentials" />
      
      <div className="flex-1 p-6 max-w-4xl space-y-6 animate-fade-in">
        
        {/* Profile Card */}
        {currentUser && (
          <div className="card p-6 flex flex-col sm:flex-row items-center gap-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800">
            <div className="w-16 h-16 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
              <User className="w-8 h-8" />
            </div>
            <div className="text-center sm:text-left flex-1 space-y-1">
              <h3 className="text-lg font-semibold text-slate-200">{currentUser.email}</h3>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20">
                  <Shield className="w-3.5 h-3.5" />
                  {currentUser.role || 'Admin'}
                </span>
                <span className="text-xs text-slate-500">Authorized Session Operator</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Account Details Form */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="w-5 h-5 text-primary-400" />
              <h4 className="font-semibold text-slate-200">Account Details</h4>
            </div>

            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label className="label">Login Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="name@company.com"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ email: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={updatingEmail}
                className="btn-primary w-full justify-center"
              >
                {updatingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {updatingEmail ? 'Saving email...' : 'Update Details'}
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Lock className="w-5 h-5 text-primary-400" />
              <h4 className="font-semibold text-slate-200">Security Credentials</h4>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Minimum 6 characters"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="btn-primary w-full justify-center"
              >
                {updatingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {updatingPassword ? 'Resetting password...' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
