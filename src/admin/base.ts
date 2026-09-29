import { createContext, useContext } from 'react';

/** The mount base for the admin app, e.g. "/admin" or "/dashboard". */
export const AdminBaseContext = createContext<string>('/admin');

export function useAdminBase(): string {
  return useContext(AdminBaseContext);
}

/** Build an absolute admin path under the current base. */
export function useAdminPath(): (segment?: string) => string {
  const base = useAdminBase();
  return (segment = '') => {
    if (!segment) return base;
    return `${base}/${segment}`.replace(/\/+/g, '/');
  };
}
