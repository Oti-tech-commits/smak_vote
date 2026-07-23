'use client';

import type { Route } from 'next';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { authHeaders, getVotingToken, hasVoterAccess, VOTING_TOKEN_KEY } from '@/lib/clientAuth';
import Image from 'next/image';

import type { Election, Position, Candidate } from '@/lib/types';

interface PositionWithCandidates extends Position {
  candidates: Candidate[];
}

export default function VotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<PositionWithCandidates[]>([]);
  const [selectedByPosition, setSelectedByPosition] = useState<Record<string, string[]>>({});
  
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' | 'info' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load election data
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!(await hasVoterAccess())) {
          if (active) router.replace('/login?redirect=/vote' as Route);
          return;
        }

        const headers = await authHeaders();
        // Add CSRF prevention header
        headers['x-requested-with'] = 'XMLHttpRequest';

        const response = await fetch('/api/elections', { headers });
        const result = await response.json();
        
        if (!active) return;
        
        if (response.ok) {
          setElection(result.election);
          setPositions(result.positions ?? []);
        } else {
          setMessage({ text: result.error || 'Unable to load election.', type: 'error' });
        }
      } catch (err) {
        setMessage({ text: 'A network error occurred. Please check your connection.', type: 'error' });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [router]);

  const totalVotes = useMemo(() => 
    Object.values(selectedByPosition).reduce((sum, arr) => sum + arr.length, 0),
    [selectedByPosition]
  );

  const canSubmit = totalVotes > 0 && !submitting && !submitted;

  function handleSelect(positionId: string, candidateId: string, maxVotes: number) {
    setSelectedByPosition((current) => {
      const existing = current[positionId] ?? [];
      const isSelected = existing.includes(candidateId);

      if (isSelected) {
        return { ...current, [positionId]: existing.filter((id) => id !== candidateId) };
      }

      if (existing.length >= maxVotes) {
        return current;
      }

      return { ...current, [positionId]: [...existing, candidateId] };
    });
  }

  async function submitVote() {
    setMessage(null);
    setSubmitting(true);
    setShowConfirm(false);

    try {
      const session = await supabaseClient.auth.getSession();
      const token = session.data.session?.access_token;
      const votingToken = getVotingToken();

      const selectedCandidates = Object.entries(selectedByPosition).flatMap(([positionId, candidateIds]) =>
        candidateIds.map((candidateId) => ({ positionId, candidateId }))
      );

      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'x-requested-with': 'XMLHttpRequest' // Hardened CSRF check
      };
      
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/vote', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          electionId: election?.id,
          selectedCandidates,
          votingToken: votingToken ?? null
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitted(true);
        setMessage({ text: 'Your vote has been cast successfully!', type: 'success' });
        if (typeof window !== 'undefined') window.localStorage.removeItem(VOTING_TOKEN_KEY);
      } else {
        setMessage({ text: result.error ?? 'Unable to submit vote.', type: 'error' });
        if (response.status === 401 || response.status === 403) {
          // If token issue, clear and redirect
          if (result.error?.toLowerCase().includes('token')) {
             if (typeof window !== 'undefined') window.localStorage.removeItem(VOTING_TOKEN_KEY);
          }
        }
      }
    } catch (err) {
      setMessage({ text: 'A network error occurred. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
          <div className="h-4 w-64 bg-slate-100 rounded mx-auto" />
          <Card className="h-64" />
        </div>
      </section>
    );
  }

  if (!election) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-900">No active election available.</h2>
          <p className="mt-3 text-slate-600">Check back when the next prefect election is open.</p>
          <Button onClick={() => router.push('/' as Route)} className="mt-6">Back to Home</Button>
        </Card>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Card className="p-8 text-center border-brand-100 bg-brand-50/30">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Ballot Cast Successfully!</h2>
          <p className="mt-3 text-slate-600">Thank you for your participation. Your vote is anonymous and has been recorded.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => router.push('/results' as Route)} variant="default">View Live Turnout</Button>
            <Button onClick={() => router.push('/' as Route)} variant="outline">Back to Home</Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-16 lg:px-8">
      {/* Selection Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900">Confirm Your Ballot</h3>
            <p className="mt-2 text-slate-600">You are about to cast your vote for {totalVotes} candidates. This action cannot be undone.</p>
            
            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={submitVote} disabled={submitting} className="w-full">
                {submitting ? 'Casting Ballot...' : 'Confirm and Submit'}
              </Button>
              <Button onClick={() => setShowConfirm(false)} variant="ghost" className="w-full">
                Review Selections
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{election.title}</h1>
          <p className="text-lg text-slate-600 max-w-3xl">{election.description}</p>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Election Open
          </div>
        </header>

        <div className="grid gap-8">
          {positions.map((position) => {
            const selectedIds = selectedByPosition[position.id] ?? [];
            const atMaxVotes = selectedIds.length >= position.max_votes;

            return (
              <section key={position.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{position.title}</h2>
                    <p className="text-sm text-slate-500">Select up to {position.max_votes} candidate{position.max_votes > 1 ? 's' : ''}</p>
                  </div>
                  <div className={`mt-2 text-sm font-semibold sm:mt-0 ${atMaxVotes ? 'text-brand-600' : 'text-slate-400'}`}>
                    {selectedIds.length} / {position.max_votes} Selected
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {position.candidates.map((candidate) => {
                    const isSelected = selectedIds.includes(candidate.id);
                    const isDisabled = !isSelected && atMaxVotes;
                    
                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => handleSelect(position.id, candidate.id, position.max_votes)}
                        disabled={isDisabled}
                        aria-pressed={isSelected}
                        className={`group relative flex flex-col rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/50 ring-4 ring-brand-500/10'
                            : 'border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:bg-slate-50'
                        } ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : 'active:scale-[0.98]'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-white shadow-md">
                            <Image 
                              src={candidate.photo_url} 
                              alt={candidate.student_name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-brand-700">{candidate.student_name}</h3>
                            <p className="text-sm font-medium text-slate-500">{candidate.class_name}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-relaxed text-slate-600 line-clamp-3 italic">
                          &ldquo;{candidate.manifesto}&rdquo;
                        </p>
                        
                        {isSelected && (
                          <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-sm">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="sticky bottom-6 mt-12">
          <Card className="flex flex-col items-center gap-4 border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur-md sm:flex-row sm:justify-between sm:px-8">
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Your Ballot Summary</p>
              <p className="text-lg font-bold text-slate-900">{totalVotes} Total Selections Made</p>
            </div>
            
            <div className="flex w-full flex-col gap-3 sm:w-auto">
              <Button
                size="lg"
                onClick={() => setShowConfirm(true)}
                disabled={!canSubmit}
                className="w-full px-8 sm:w-auto shadow-brand-200 shadow-lg"
              >
                Review & Submit Vote
              </Button>
            </div>
          </Card>
          
          {message && (
            <div className={`mt-4 rounded-xl p-4 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${
              message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-brand-50 text-brand-800'
            }`}>
              {message.text}
            </div>
          )}
        </footer>
      </div>
    </section>
  );
}
