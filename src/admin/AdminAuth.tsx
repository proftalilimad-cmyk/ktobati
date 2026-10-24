import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  isSupabaseConfigured,
  signInWithPassword,
  signOutSupabase,
  getCurrentEmail,
} from '../store/supabase';

/**
 * AUTHENTICATION
 * ──────────────
 * • When Supabase is configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY),
 *   the admin logs in through REAL Supabase Auth. That session is what lets
 *   Row-Level-Security accept admin writes (the user id must exist in the
 *   `admins` table — see supabase/schema.sql).
 * • Otherwise the app falls back to a FRONT-END-ONLY demo gate. That gate is
 *   NOT real security (anyone can read the bundled JS); it only exists so the
 *   CMS demo has a login flow. Never ship secrets in the frontend bundle.
 *
 * Demo credentials come from Vite env vars when provided:
 *   VITE_ADMIN_EMAIL, VITE_ADMIN_PASSWORD — otherwise the documented fallback.
 */
const DEMO_EMAIL = 'admin@maktaba.local';
const DEMO_PASSWORD = 'admin1234';

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined) || DEMO_EMAIL;
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) || DEMO_PASSWORD;

const SESSION_KEY = 'maktaba-admin-session';

interface AuthCtx {
  isAuthed: boolean;
  email: string | null;
  /** true when authentication is backed by real Supabase Auth */
  usingSupabaseAuth: boolean;
  /** true only in the front-end demo gate with the default demo credentials */
  usingDemoCreds: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const supa = isSupabaseConfigured();
  const [email, setEmail] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });

  // When Supabase is on, restore a real auth session on mount.
  useEffect(() => {
    if (!supa) return;
    let cancelled = false;
    getCurrentEmail().then((e) => {
      if (cancelled) return;
      setEmail(e);
      try {
        if (e) sessionStorage.setItem(SESSION_KEY, e);
        else sessionStorage.removeItem(SESSION_KEY);
      } catch { /* ignore */ }
    });
    return () => { cancelled = true; };
  }, [supa]);

  const value = useMemo<AuthCtx>(
    () => ({
      isAuthed: Boolean(email),
      email,
      usingSupabaseAuth: supa,
      usingDemoCreds: !supa && ADMIN_EMAIL === DEMO_EMAIL && ADMIN_PASSWORD === DEMO_PASSWORD,
      login: async (e, p) => {
        if (supa) {
          const res = await signInWithPassword(e, p);
          if (res.ok) {
            const who = res.email ?? e.trim();
            try { sessionStorage.setItem(SESSION_KEY, who); } catch { /* ignore */ }
            setEmail(who);
            return { ok: true };
          }
          return { ok: false, error: res.error ?? 'تعذّر تسجيل الدخول' };
        }
        // demo gate
        if (e.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && p === ADMIN_PASSWORD) {
          try { sessionStorage.setItem(SESSION_KEY, e.trim()); } catch { /* ignore */ }
          setEmail(e.trim());
          return { ok: true };
        }
        return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
      },
      logout: () => {
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
        setEmail(null);
        if (supa) void signOutSupabase();
      },
    }),
    [email, supa],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

export const DEMO_CREDENTIALS = { email: DEMO_EMAIL, password: DEMO_PASSWORD };
