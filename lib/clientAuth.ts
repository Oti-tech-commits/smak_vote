'use client';

import type { Route } from 'next';
import { supabaseClient } from '@/lib/supabaseClient';
import type { UserRole } from '@/lib/types';

export const VOTING_TOKEN_KEY = 'smak-voting-token';

export interface SessionProfile {
  id: string;
  role: UserRole;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await supabaseClient.auth.getSession();
  return session.data.session?.access_token ?? null;
}

export function getVotingToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(VOTING_TOKEN_KEY);
}

export async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const accessToken = await getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  }
  const votingToken = getVotingToken();
  if (votingToken) {
    headers['x-voting-token'] = votingToken;
  }
  return headers;
}

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as SessionProfile;
}

export async function hasVoterAccess(): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (accessToken) {
    return true;
  }
  return Boolean(getVotingToken());
}

export async function signOut(): Promise<void> {
  await supabaseClient.auth.signOut();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(VOTING_TOKEN_KEY);
  }
}

export function dashboardPathForRole(role: UserRole): Route {
  if (role === 'admin') {
    return '/admin';
  }
  if (role === 'officer') {
    return '/officer';
  }
  return '/vote';
}
