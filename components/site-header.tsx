'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSessionProfile, getVotingToken, signOut, type SessionProfile } from '@/lib/clientAuth';

type NavItem = { href: Route; label: string };

// Determines navigation items based on user role and token status.
function navItemsFor(profile: SessionProfile | null, hasVotingToken: boolean): NavItem[] {
  const items: NavItem[] = [{ href: '/', label: 'Home' }];

  if (profile?.role === 'admin') {
    items.push({ href: '/admin', label: 'Admin' }, { href: '/register', label: 'Register Student' }, { href: '/results', label: 'Results' });
  } else if (profile?.role === 'officer') {
    items.push({ href: '/officer', label: 'Officer' }, { href: '/register', label: 'Register Student' }, { href: '/results', label: 'Results' });
  } else if (profile || hasVotingToken) {
    items.push({ href: '/vote', label: 'Vote' }, { href: '/results', label: 'Results' });
  }

  return items;
}

export function SiteHeader() {
  const router = useRouter();
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [hasVotingToken, setHasVotingToken] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Memoized function to refresh session and token state.
  const refresh = useCallback(async () => {
    const nextProfile = await getSessionProfile();
    const votingToken = getVotingToken();
    setProfile(nextProfile);
    setHasVotingToken(Boolean(votingToken));
    setAuthenticated(Boolean(nextProfile) || Boolean(votingToken));
  }, []);

  // Effect to refresh state on mount and on auth state changes.
  useEffect(() => {
    refresh();
    const { data } = supabaseClient.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  async function handleLogout() {
    await signOut();
    await refresh(); // Refresh state after logout
    router.push('/login');
  }

  const navItems = navItemsFor(profile, hasVotingToken);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
        <BrandLogo />
        <nav className="flex items-center gap-2 md:gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
          {authenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Login
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
