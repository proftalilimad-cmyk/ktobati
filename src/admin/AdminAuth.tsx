import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * ⚠️ SECURITY NOTE
 * This is a FRONT-END-ONLY demo gate. It is NOT real authentication and provides
 * NO real security — anyone can read the bundled JS. It exists so the CMS demo has
 * a login flow. In production, replace this with Supabase Auth (see supabase/schema.sql)
 * and enforce access with Row Level Security on the server. Never ship secrets in the
 * frontend bundle.
 *
 * Credentials are read from Vite env vars when provided:
 *   VITE_ADMIN_EMAIL, VITE_ADMIN_PASSWORD
 * Otherwise a documented demo fallback is used.
 */
const DEMO_EMAIL = 'admin@maktaba.local';
const DEMO_PASSWORD = 'admin1234';

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined) || DEMO_EMAIL;
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) || DEMO_PASSWORD;

const SESSION_KEY = 'maktaba-admin-session';

interface AuthCtx {
  isAuthed: boolean;
  email: string | null;
  usingDemoCreds: boolean;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });

  const value = useMemo<AuthCtx>(
    () => ({
      isAuthed: Boolean(email),
      email,
      usingDemoCreds: ADMIN_EMAIL === DEMO_EMAIL && ADMIN_PASSWORD === DEMO_PASSWORD,
      login: (e, p) => {
        if (e.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && p === ADMIN_PASSWORD) {
          try {
            sessionStorage.setItem(SESSION_KEY, e.trim());
          } catch {
            /* ignore */
          }
          setEmail(e.trim());
          return { ok: true };
        }
        return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
      },
      logout: () => {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          /* ignore */
        }
        setEmail(null);
      },
    }),
    [email],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

export const DEMO_CREDENTIALS = { email: DEMO_EMAIL, password: DEMO_PASSWORD };
