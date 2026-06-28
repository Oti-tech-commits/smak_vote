'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { supabaseClient } from '@/lib/supabaseClient';
import { StudentImportForm } from '@/components/student-import-form';
import type { Election, Position, Candidate, VotingToken } from '@/lib/types';

interface AdminPanelProps {
  onImportSuccess?: () => void;
}

export function AdminPanel({ onImportSuccess }: AdminPanelProps) {
  const [elections, setElections] = useState<Election[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [tokens, setTokens] = useState<VotingToken[]>([]);
  const [electionMessage, setElectionMessage] = useState<string | null>(null);
  const [positionMessage, setPositionMessage] = useState<string | null>(null);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  const [tokenMessage, setTokenMessage] = useState<string | null>(null);
  const [manageElectionMessage, setManageElectionMessage] = useState<string | null>(null);
  const [electionForm, setElectionForm] = useState({ title: '', description: '', start_time: '', end_time: '' });
  const [candidateForm, setCandidateForm] = useState({ student_name: '', class_name: '', manifesto: '', position_id: '', photo: null as File | null });
  const [positionForm, setPositionForm] = useState({ title: '', max_votes: '1', election_id: '' });
  const [tokenForm, setTokenForm] = useState({ election_id: '', student_number: '', email: '', expires_at: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function getAuthHeaders(): Promise<HeadersInit> {
    const session = await supabaseClient.auth.getSession();
    const token = session.data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function fetchData() {
    const headers = await getAuthHeaders();
    const [electionsRes, positionsRes, candidatesRes, tokensRes] = await Promise.all([
      fetch('/api/admin/elections', { headers }),
      fetch('/api/admin/positions', { headers }),
      fetch('/api/admin/candidates', { headers }),
      fetch('/api/admin/tokens', { headers })
    ]);
    if (electionsRes.ok) setElections(await electionsRes.json());
    if (positionsRes.ok) setPositions(await positionsRes.json());
    if (candidatesRes.ok) setCandidates(await candidatesRes.json());
    if (tokensRes.ok) setTokens(await tokensRes.json());
  }

  async function createElection(event: React.FormEvent) {
    event.preventDefault();
    setElectionMessage(null);
    setIsLoading(true);
    const headers = await getAuthHeaders();
    const response = await fetch('/api/admin/elections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(electionForm)
    });
    const result = await response.json();
    setElectionMessage(result.message || result.error || 'Election created.');
    setIsLoading(false);
    if (response.ok) {
      setElectionForm({ title: '', description: '', start_time: '', end_time: '' });
      fetchData();
    }
  }

  async function createPosition(event: React.FormEvent) {
    event.preventDefault();
    setPositionMessage(null);
    setIsLoading(true);
    const headers = await getAuthHeaders();
    const response = await fetch('/api/admin/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        ...positionForm,
        max_votes: Number(positionForm.max_votes)
      })
    });
    const result = await response.json();
    setPositionMessage(result.message || result.error || 'Position created.');
    setIsLoading(false);
    if (response.ok) {
      setPositionForm({ title: '', max_votes: '1', election_id: '' });
      fetchData();
    }
  }

  async function createCandidate(event: React.FormEvent) {
    event.preventDefault();
    setCandidateMessage(null);
    setIsLoading(true);
    if (!candidateForm.photo) {
      setCandidateMessage('Candidate photo is required.');
      setIsLoading(false);
      return;
    }
    const formData = new FormData();
    formData.append('student_name', candidateForm.student_name);
    formData.append('class_name', candidateForm.class_name);
    formData.append('manifesto', candidateForm.manifesto);
    formData.append('position_id', candidateForm.position_id);
    formData.append('photo', candidateForm.photo);

    const headers = await getAuthHeaders();
    const response = await fetch('/api/admin/candidates', { method: 'POST', headers, body: formData });
    const result = await response.json();
    setCandidateMessage(result.message || result.error || 'Candidate added.');
    setIsLoading(false);
    if (response.ok) {
      setCandidateForm({ student_name: '', class_name: '', manifesto: '', position_id: '', photo: null });
      fetchData();
    }
  }

  async function updateElectionStatus(id: string, status: string) {
    setManageElectionMessage(null);
    setIsLoading(true);
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/admin/elections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ status })
    });
    const result = await response.json();
    setManageElectionMessage(result.message || result.error || 'Election status updated.');
    setIsLoading(false);
    if (response.ok) fetchData();
  }

  async function createToken(event: React.FormEvent) {
    event.preventDefault();
    setTokenMessage(null);
    setIsLoading(true);
    const headers = await getAuthHeaders();
    const response = await fetch('/api/admin/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        election_id: tokenForm.election_id,
        student_number: tokenForm.student_number,
        email: tokenForm.email,
        expires_at: tokenForm.expires_at || null
      })
    });
    const result = await response.json();
    setTokenMessage(result.message || (result.token ? `Token created: ${result.token.token}` : result.error) || 'Token created.');
    setIsLoading(false);
    if (response.ok) {
      setTokenForm({ election_id: '', student_number: '', email: '', expires_at: '' });
      fetchData();
    }
  }

  async function deleteToken(id: string) {
    setTokenMessage(null);
    setIsLoading(true);
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/admin/tokens/${id}`, {
      method: 'DELETE',
      headers
    });
    const result = await response.json();
    setTokenMessage(result.message || result.error || 'Token deleted.');
    setIsLoading(false);
    if (response.ok) fetchData();
  }

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="text-2xl font-semibold text-slate-900">Create Election</h2>
        <form className="grid gap-4 pt-6" onSubmit={createElection}>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={electionForm.title} onChange={(e) => setElectionForm({ ...electionForm, title: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={electionForm.description} onChange={(e) => setElectionForm({ ...electionForm, description: e.target.value })} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input id="start_time" type="datetime-local" value={electionForm.start_time} onChange={(e) => setElectionForm({ ...electionForm, start_time: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input id="end_time" type="datetime-local" value={electionForm.end_time} onChange={(e) => setElectionForm({ ...electionForm, end_time: e.target.value })} required />
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>Create Election</Button>
          {electionMessage && <div className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">{electionMessage}</div>}
        </form>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold text-slate-900">Create Position</h2>
        <form className="grid gap-4 pt-6" onSubmit={createPosition}>
          <div>
            <Label htmlFor="position_title">Title</Label>
            <Input id="position_title" value={positionForm.title} onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="max_votes">Vote Limit</Label>
              <Input id="max_votes" type="number" min="1" value={positionForm.max_votes} onChange={(e) => setPositionForm({ ...positionForm, max_votes: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="election_id">Election</Label>
              <select className="w-full rounded-md border border-slate-200 bg-white px-4 py-2" id="election_id" value={positionForm.election_id} onChange={(e) => setPositionForm({ ...positionForm, election_id: e.target.value })} required>
                <option value="">Select election</option>
                {elections.map((election) => (
                  <option key={election.id} value={election.id}>{election.title}</option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>Create Position</Button>
          {positionMessage && <div className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">{positionMessage}</div>}
        </form>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold text-slate-900">Register Candidate</h2>
        <form className="grid gap-4 pt-6" onSubmit={createCandidate}>
          <div>
            <Label htmlFor="student_name">Candidate Name</Label>
            <Input id="student_name" value={candidateForm.student_name} onChange={(e) => setCandidateForm({ ...candidateForm, student_name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="class_name">Class</Label>
            <Input id="class_name" value={candidateForm.class_name} onChange={(e) => setCandidateForm({ ...candidateForm, class_name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="position_id">Position</Label>
            <select className="w-full rounded-md border border-slate-200 bg-white px-4 py-2" id="position_id" value={candidateForm.position_id} onChange={(e) => setCandidateForm({ ...candidateForm, position_id: e.target.value })} required>
              <option value="">Select a position</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>{position.title}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="manifesto">Manifesto</Label>
            <Textarea id="manifesto" value={candidateForm.manifesto} onChange={(e) => setCandidateForm({ ...candidateForm, manifesto: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="photo">Photo</Label>
            <Input id="photo" type="file" accept="image/*" onChange={(event) => setCandidateForm({ ...candidateForm, photo: event.target.files?.[0] ?? null })} required />
          </div>
          <Button type="submit" disabled={isLoading}>Register Candidate</Button>
          {candidateMessage && <div className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">{candidateMessage}</div>}
        </form>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold text-slate-900">Registered Candidates</h2>
        <div className="mt-6 space-y-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-600">No candidates registered yet.</p>
          ) : (
            candidates.map((candidate) => (
              <div key={candidate.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-4">
                  {candidate.photo_url && (
                    <img src={candidate.photo_url} alt={candidate.student_name} className="h-16 w-16 rounded-full object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{candidate.student_name}</p>
                    <p className="text-sm text-slate-600">Class: {candidate.class_name}</p>
                    <p className="text-sm text-slate-600">Manifesto: {candidate.manifesto}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold text-slate-900">Create Voting Token</h2>
        <form className="grid gap-4 pt-6" onSubmit={createToken}>
          <div>
            <Label htmlFor="token_election_id">Election</Label>
            <select className="w-full rounded-md border border-slate-200 bg-white px-4 py-2" id="token_election_id" value={tokenForm.election_id} onChange={(e) => setTokenForm({ ...tokenForm, election_id: e.target.value })} required>
              <option value="">Select election</option>
              {elections.map((election) => (
                <option key={election.id} value={election.id}>{election.title}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="student_number">Student Number</Label>
            <Input id="student_number" value={tokenForm.student_number} onChange={(e) => setTokenForm({ ...tokenForm, student_number: e.target.value })} placeholder="Required if email is blank" />
          </div>
          <div>
            <Label htmlFor="token_email">Email</Label>
            <Input id="token_email" value={tokenForm.email} onChange={(e) => setTokenForm({ ...tokenForm, email: e.target.value })} placeholder="Required if student number is blank" />
          </div>
          <div>
            <Label htmlFor="expires_at">Expires at</Label>
            <Input id="expires_at" type="datetime-local" value={tokenForm.expires_at} onChange={(e) => setTokenForm({ ...tokenForm, expires_at: e.target.value })} />
          </div>
          <Button type="submit" disabled={isLoading}>Create Voting Token</Button>
          {tokenMessage && <div className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">{tokenMessage}</div>}
        </form>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold text-slate-900">Active Voting Tokens</h2>
        <div className="mt-6 space-y-3">
          {tokens.map((token) => (
            <div key={token.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Token: {token.token}</p>
              <p className="text-sm text-slate-600">Election ID: {token.election_id}</p>
              <p className="text-sm text-slate-600">Student ID: {token.student_id ?? 'Unassigned'}</p>
              <p className="text-sm text-slate-600">Expires: {token.expires_at ? new Date(token.expires_at).toLocaleString() : 'No expiration'}</p>
              <p className="text-sm text-slate-600">Used: {token.used ? 'Yes' : 'No'}</p>
              <Button type="button" onClick={() => deleteToken(token.id)} disabled={isLoading} className="mt-3">Delete Token</Button>
            </div>
          ))}
        </div>
      </Card>

      <StudentImportForm onSuccess={() => { onImportSuccess?.(); fetchData(); }} />

      <Card>
        <h2 className="text-2xl font-semibold text-slate-900">Manage Elections</h2>
        <div className="mt-6 grid gap-4">
          {elections.map((election) => (
            <div key={election.id} className="rounded-3xl border border-slate-200 p-5 bg-slate-50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{election.title}</h3>
                  <p className="text-sm text-slate-600">Status: {election.status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => updateElectionStatus(election.id, 'open')} disabled={isLoading || election.status !== 'draft'}>Open</Button>
                  <Button type="button" onClick={() => updateElectionStatus(election.id, 'closed')} disabled={isLoading || election.status !== 'open'}>Close</Button>
                  <Button type="button" onClick={() => updateElectionStatus(election.id, 'published')} disabled={isLoading || election.status !== 'closed'}>Publish</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {manageElectionMessage && <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">{manageElectionMessage}</div>}
      </Card>
    </div>
  );
}
