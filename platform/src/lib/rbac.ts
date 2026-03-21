export type AppRole = 'super_admin' | 'owner' | 'admin' | 'user'

export const ROLE_NAV: Record<AppRole, Array<{ href: string; label: string; icon: string }>> = {
  super_admin: [], // uses separate superadmin layout
  owner: [
    { href: '/dashboard', label: 'Dashboard', icon: '◉' },
    { href: '/sessions/new', label: 'Nuova Sessione', icon: '＋' },
    { href: '/models', label: 'Modelle', icon: '♀' },
    { href: '/billing/invoices', label: 'Fatturazione', icon: '€' },
    { href: '/support/new', label: 'Supporto', icon: '?' },
  ],
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: '◉' },
    { href: '/billing/invoices', label: 'Fatturazione', icon: '€' },
    { href: '/support/new', label: 'Supporto', icon: '?' },
  ],
  user: [
    { href: '/dashboard', label: 'Dashboard', icon: '◉' },
    { href: '/sessions/new', label: 'Nuova Sessione', icon: '＋' },
    { href: '/models', label: 'Modelle', icon: '♀' },
    { href: '/support/new', label: 'Supporto', icon: '?' },
  ],
}

export const ROLE_HOME: Record<AppRole, string> = {
  super_admin: '/admin/companies',
  owner: '/dashboard',
  admin: '/billing/invoices',
  user: '/sessions/new',
}

export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  '/admin': ['super_admin'],
  '/sessions': ['super_admin', 'owner', 'user'],
  '/models': ['super_admin', 'owner', 'user'],
  '/billing': ['super_admin', 'owner', 'admin'],
  '/support': ['super_admin', 'owner', 'admin', 'user'],
  '/dashboard': ['super_admin', 'owner', 'admin', 'user'],
  '/settings': ['super_admin', 'owner', 'admin', 'user'],
  '/profile': ['super_admin', 'owner', 'admin', 'user'],
  '/company': ['owner', 'admin', 'user'],
  '/team': ['owner', 'admin', 'user'],
}

export function canAccessRoute(role: string, pathname: string): boolean {
  for (const [prefix, roles] of Object.entries(ROUTE_ACCESS)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return roles.includes(role as AppRole)
    }
  }
  return true // allow unmatched routes
}
