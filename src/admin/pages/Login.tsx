import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, Lock, Mail, AlertTriangle } from 'lucide-react';
import { useAdminAuth, DEMO_CREDENTIALS } from '../AdminAuth';
import { useAdminBase } from '../base';

export default function Login() {
  const { login, isAuthed, usingDemoCreds, usingSupabaseAuth } = useAdminAuth();
  const base = useAdminBase();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthed) {
    return <Navigate to={base} replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) navigate(base, { replace: true });
    else setError(res.error ?? 'تعذّر تسجيل الدخول');
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-login-brand">
          <span className="admin-brand-mark"><BookOpen size={24} /></span>
          <h1>لوحة إدارة المكتبة</h1>
          <p className="muted">سجّل الدخول للوصول إلى نظام إدارة المحتوى</p>
        </div>

        {error && (
          <div className="admin-alert admin-alert--error">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <label className="field">
          <span className="field-label">البريد الإلكتروني</span>
          <span className="field-input-wrap">
            <Mail size={17} className="field-icon" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@maktaba.local"
              required
              autoComplete="username"
            />
          </span>
        </label>

        <label className="field">
          <span className="field-label">كلمة المرور</span>
          <span className="field-input-wrap">
            <Lock size={17} className="field-icon" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </span>
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'جارٍ التحقق…' : 'دخول'}
        </button>

        {usingSupabaseAuth && (
          <p className="muted admin-auth-mode">
            🔐 مصادقة حقيقية عبر Supabase Auth
          </p>
        )}

        {usingDemoCreds && (
          <div className="admin-demo-hint">
            <strong>وضع تجريبي</strong>
            <span>البريد: <code>{DEMO_CREDENTIALS.email}</code></span>
            <span>كلمة المرور: <code>{DEMO_CREDENTIALS.password}</code></span>
            <small className="muted">
              ⚠️ هذه بوابة عرض أمامية فقط وليست حماية حقيقية. في الإنتاج استخدم Supabase Auth مع سياسات RLS.
            </small>
          </div>
        )}
      </form>
    </div>
  );
}
