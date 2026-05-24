import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import logo from "../assets/logo.jpg";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAuth();

  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const emailValid = useMemo(() => EMAIL_REGEX.test(email), [email]);
  const passwordHint = useMemo(() => {
    if (!password) return "Enter your secure password.";
    if (password.length >= 8) return "Strong password length.";
    if (password.length >= 5) return "Try 8+ characters for stronger security.";
    return "Password is too short.";
  }, [password]);

  const canSubmit = emailValid && password.length > 0 && !submitting;

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!emailValid) {
      setError("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }

    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem("eis_remember", "true");
      } else {
        localStorage.removeItem("eis_remember");
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-slate-100 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-0 top-1/4 h-[36rem] w-[36rem] rounded-full bg-[#3b82f6]/15 blur-3xl animate-pulse-slow" />
        <div className="absolute right-0 top-0 h-[30rem] w-[30rem] rounded-full bg-[#8b5cf6]/15 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 left-10 h-48 w-48 rounded-full bg-[#2563eb]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] items-center px-6 py-10 lg:px-10">
        <motion.section
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hidden lg:flex flex-1 flex-col gap-8 pr-8"
        >
          <div className="glass-card relative overflow-hidden p-8 pb-6">
            <div className="absolute -right-16 top-8 h-40 w-40 rounded-full bg-[#3b82f6]/20 blur-3xl" />
            <div className="absolute -left-16 bottom-10 h-40 w-40 rounded-full bg-[#8b5cf6]/20 blur-3xl" />
            <div className="grid gap-8">
              <div className="flex flex-col gap-4">
                <span className="badge-soft w-fit">Trusted by enterprise teams</span>
                <div className="flex flex-wrap gap-3 items-center">
                  {['Zendesk', 'Intercom', 'Stripe', 'Notion'].map((name) => (
                    <span key={name} className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-panel p-5 hover:-translate-y-1 transition-transform duration-300">
                  <p className="section-title">Smart risk index</p>
                  <h2 className="mt-4 text-3xl font-semibold text-slate-100">92%</h2>
                  <p className="mt-2 text-sm text-slate-400">AI confidence that your asset fleet is within compliance.</p>
                </div>
                <div className="glass-panel p-5 hover:-translate-y-1 transition-transform duration-300">
                  <p className="section-title">Real-time sync</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <p className="text-slate-100 font-medium">Live analytics connected</p>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">Last heartbeat 4 seconds ago.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <motion.div whileHover={{ y: -6 }} className="glass-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Asset tracking</h3>
                  <p className="mt-3 text-2xl font-bold text-slate-100">1,482</p>
                </div>
                <div className="rounded-2xl bg-slate-950/70 px-3 py-2 text-xs text-slate-300">+11% QoQ</div>
              </div>
              <div className="mt-6 h-24 rounded-3xl bg-gradient-to-r from-[#3b82f6]/20 via-[#8b5cf6]/15 to-[#2563eb]/10 p-4">
                <div className="h-full w-full rounded-3xl bg-[linear-gradient(90deg,rgba(59,130,246,0.85)20%,rgba(139,92,246,0.6)60%,rgba(59,130,246,0.18)100%)]" />
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -6 }} className="glass-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">AI summary</h3>
                  <p className="mt-3 text-2xl font-bold text-slate-100">Proactive repair</p>
                </div>
                <div className="rounded-full bg-slate-950/70 px-3 py-2 text-xs text-slate-300">Premium</div>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-400">
                The system predicts 8 assets requiring maintenance within the next 7 days based on usage trends and warranty data.
              </p>
            </motion.div>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-xl rounded-[2rem] border border-slate-800 bg-slate-900/95 p-8 shadow-card backdrop-blur-2xl relative z-10"
        >
          <div className="absolute inset-x-6 top-6 h-2 rounded-full bg-gradient-to-r from-[#3b82f6]/70 via-[#8b5cf6]/70 to-[#6366f1]/70 blur-xl opacity-80" />
          <div className="relative space-y-6">
            <div className="flex items-center gap-4">
              <img src={logo} alt="AssetFlow Elite" className="h-12 w-12 rounded-3xl object-cover shadow-[0_20px_60px_rgba(59,130,246,0.16)]" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Secure access portal</p>
                <h1 className="text-2xl font-semibold text-slate-100">Welcome back, admin.</h1>
              </div>
            </div>

            <div className="glass-panel p-5 border-slate-700/60">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Secure access</p>
                  <p className="mt-2 text-slate-100 font-semibold">Enterprise-grade login flow</p>
                </div>
                <span className="status-pill">AI-powered</span>
              </div>
            </div>

            {error && (
              <div className="glass-panel border border-red-500/20 bg-red-500/10 p-4 animate-shake">
                <div className="flex items-center gap-3 text-red-200">
                  <AlertCircle className="w-4 h-4" />
                  <div>
                    <p className="font-semibold">Login failed</p>
                    <p className="text-sm text-slate-400">{error}. Please try again or reset your password.</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="input pl-11"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <p className={`mt-2 text-xs ${emailValid ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {email
                      ? emailValid
                        ? 'Email syntax is verified.'
                        : 'Email format looks invalid.'
                      : 'Use your enterprise email to sign in.'}
                  </p>
                </div>

                <div>
                  <label htmlFor="login-password" className="label flex items-center justify-between gap-3">
                    <span>Password</span>
                    <span className="text-xs text-slate-500">{passwordHint}</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input pl-11 pr-12"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
                  <label className="inline-flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-primary-500 focus:ring-primary-500"
                    />
                    Keep me signed in
                  </label>
                  <button type="button" className="text-slate-400 hover:text-slate-100 transition-colors">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="btn-primary w-full justify-center py-3 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  {submitting ? 'Signing in...' : 'Unlock workspace'}
                </button>
              </div>

              <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                <p>Demo credentials: <span className="text-slate-200">admin@company.com</span> / <span className="text-slate-200">admin123</span></p>
                <p className="text-xs text-slate-500">AI-powered monitoring and asset intelligence await after login.</p>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
