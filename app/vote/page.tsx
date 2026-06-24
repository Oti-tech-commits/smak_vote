'use client';

import type { Route } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { authHeaders, getVotingToken, hasVoterAccess } from '@/lib/clientAuth';
import type { CandidateSelection, Election, Position, Candidate } from '@/lib/types';

interface PositionWithCandidates extends Position {
  candidates: Candidate[];
}

export default function VotePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<PositionWithCandidates[]>([]);
  const [selected, setSelected] = useState<CandidateSelection[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!(await hasVoterAccess())) {
        if (active) {
          router.replace('/login?redirect=/vote' as Route);
        }
        return;
      }
      if (active) {
        setAuthChecked(true);
      }
      const headers = await authHeaders();
      const response = await fetch('/api/elections', { headers });
      const result = await response.json();
      if (!active) {
        return;
      }
      if (response.ok) {
        setElection(result.election);
        setPositions(result.positions ?? []);
      } else {
        setMessage(result.error || 'Unable to load election.');
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [router]);

  const selectionsByPosition = useMemo(() => {
    return selected.reduce<Record<string, string>>((acc, selection) => {
      acc[selection.positionId] = selection.candidateId;
      return acc;
    }, {});
  }, [selected]);

  function handleSelect(positionId: string, candidateId: string) {
    setSelected((current) => {
      const remaining = current.filter((item) => item.positionId !== positionId);
      return [...remaining, { positionId, candidateId }];
    });
  }

  async function submitVote() {
    setMessage(null);
    setSubmitting(true);
    const session = await supabaseClient.auth.getSession();
    const token = session.data.session?.access_token;
    const votingToken = getVotingToken();
    if (!token && !votingToken) {
      setMessage('Please log in or use your voting token to proceed.');
      setSubmitting(false);
      return;
    }
    if (!election?.id) {
      setMessage('No active election is available to submit a vote.');
      setSubmitting(false);
      return;
    }
    const body = {
      electionId: election.id,
      selectedCandidates: selected.map((item) => ({ positionId: item.positionId, candidateId: item.candidateId })),
      votingToken: votingToken ?? null
    };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const result = await response.json();
    setMessage(result.message ?? result.error ?? 'Unable to submit vote.');
    setSubmitting(false);
  }

  if (!authChecked) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Card>
          <p className="text-sm text-slate-600">Verifying your access…</p>
        </Card>
      </section>
    );
  }

  if (!election) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Card>
          <h2 className="text-xl font-semibold">No active election available.</h2>
          <p className="mt-3 text-slate-600">Check back when the next prefect election is open.</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      <Card>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{election.title}</h1>
            <p className="mt-3 text-slate-600">{election.description}</p>
            <p className="mt-2 text-sm text-slate-500">Election open from {new Date(election.start_time).toLocaleString()} to {new Date(election.end_time).toLocaleString()}.</p>
          </div>
          <div className="grid gap-6">
            {positions.map((position) => (
              <section key={position.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{position.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">Select up to {position.max_votes} candidate(s).</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {position.candidates.map((candidate: Candidate) => {
                    const selectedId = selectionsByPosition[position.id] === candidate.id;
                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => handleSelect(position.id, candidate.id)}
                        className={`rounded-3xl border p-4 text-left transition ${selectedId ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-4">
                          <img src={candidate.photo_url} alt={candidate.student_name} className="h-16 w-16 rounded-full object-cover" />
                          <div>
                            <p className="text-base font-semibold text-slate-900">{candidate.student_name}</p>
                            <p className="text-sm text-slate-600">{candidate.class_name}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{candidate.manifesto}</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-600">Selected positions: {selected.length}.</p>
            </div>
            <Button onClick={submitVote} disabled={submitting || selected.length === 0} className="w-full sm:w-auto">
              Submit Vote
            </Button>
          </div>
          {message && <p className="text-sm text-slate-700">{message}</p>}
        </div>
      </Card>
    </section>
  );
}
