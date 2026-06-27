'use client';

import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authHeaders } from '@/lib/clientAuth';
import type { Election, Position, Candidate } from '@/lib/types';

interface CandidateWithVotes extends Candidate {
  votes: { count: number }[];
}
interface PositionWithResults extends Position {
  candidates: CandidateWithVotes[];
}
interface ElectionWithResults extends Election {
  positions: PositionWithResults[];
  turnout: { voted: number; total: number };
}

export default function ResultsPage() {
  const router = useRouter();
  const [elections, setElections] = useState<ElectionWithResults[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        // Published results are public; only attach auth headers if available.
        const headers = await authHeaders();
        const response = await fetch('/api/results', { headers });
        const result = await response.json();
        if (!active) return;
        if (response.ok) {
          setElections(result.elections ?? []);
        } else {
          setError(result.error || 'Unable to load results at this time.');
        }
      } catch {
        if (active) {
          setError('Unable to load results at this time.');
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);



  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <Card>
          <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
          <p className="mt-4 text-slate-600">{error}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Published Results</h1>
        <p className="mt-2 text-slate-600">Review final election results and turnout summaries.</p>
      </div>
      {elections.map((election) => (
        <Card key={election.id} className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{election.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{election.description}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-800">Turnout</h3>
            <p className="mt-2 text-4xl font-bold">{election.turnout.voted} / {election.turnout.total} <span className="text-xl font-medium text-slate-600">voters</span></p>
            <p className="text-sm text-slate-500">({election.turnout.total > 0 ? ((election.turnout.voted / election.turnout.total) * 100).toFixed(1) : 0}%)</p>
          </div>
          {election.positions.map(position => {
            const sortedCandidates = [...position.candidates].sort((a, b) => (b.votes[0]?.count ?? 0) - (a.votes[0]?.count ?? 0));
            const winners = sortedCandidates.slice(0, position.max_votes);

            return (
              <div key={position.id} className="rounded-3xl border border-slate-200 p-5">
                <h3 className="text-xl font-semibold text-slate-900">{position.title}</h3>
                <div className="mt-4 grid gap-4">
                  {sortedCandidates.map(candidate => {
                    const voteCount = candidate.votes[0]?.count ?? 0;
                    const isWinner = winners.some(w => w.id === candidate.id) && voteCount > 0;
                    return (
                      <div key={candidate.id} className={`rounded-2xl p-4 ${isWinner ? 'bg-green-50 border-green-400 border' : 'bg-slate-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <img src={candidate.photo_url} alt={candidate.student_name} className="h-12 w-12 rounded-full object-cover" />
                            <div>
                              <p className="font-semibold text-slate-800">{candidate.student_name}</p>
                              <p className="text-sm text-slate-500">{candidate.class_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">{voteCount} votes</p>
                            {isWinner && <p className="text-sm font-semibold text-green-700">Winner</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Card>
      ))}
      {elections.length === 0 && !error && (
        <Card>
          <p className="text-slate-600">No published election results are available at this time.</p>
        </Card>
      )}
    </section>
  );
}

