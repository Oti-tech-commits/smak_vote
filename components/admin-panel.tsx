'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { supabaseClient } from '@/lib/supabaseClient';
import type { Election, Position, Candidate, VotingToken } from '@/lib/types';

interface AdminPanelProps {
  role?: 'admin' | 'officer';
  onImportSuccess?: () => void;
}

interface AuditLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
    role: string;
  } | null;
}

interface PreviewRow {
  full_name: string;
  student_number: string;
  email: string;
  class_name: string;
  password?: string;
  status: 'valid' | 'invalid' | 'duplicate_in_file' | 'duplicate_in_db';
  message: string;
}

interface PreviewSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicate_file: number;
  duplicate_db: number;
}

interface ImportPreviewData {
  preview: PreviewRow[];
  summary: PreviewSummary;
}

export function AdminPanel({ role: initialRole, onImportSuccess }: AdminPanelProps) {
  const [role, setRole] = useState<'admin' | 'officer'>(initialRole || 'officer');
  const [activeTab, setActiveTab] = useState<'elections' | 'positions' | 'candidates' | 'tokens' | 'import' | 'audit'>('elections');
  
  // Data lists
  const [elections, setElections] = useState<Election[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [tokens, setTokens] = useState<VotingToken[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Forms
  const [electionForm, setElectionForm] = useState({ title: '', description: '', start_time: '', end_time: '' });
  const [positionForm, setPositionForm] = useState({ title: '', max_votes: '1', election_id: '' });
  const [candidateForm, setCandidateForm] = useState({ student_name: '', class_name: '', manifesto: '', position_id: '', photo: null as File | null });
  const [tokenForm, setTokenForm] = useState({ election_id: '', student_number: '', email: '', expires_at: '' });
  
  // Bulk import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);

  // Messages
  const [electionMessage, setElectionMessage] = useState<string | null>(null);
  const [positionMessage, setPositionMessage] = useState<string | null>(null);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  const [tokenMessage, setTokenMessage] = useState<string | null>(null);
  const [manageElectionMessage, setManageElectionMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function determineRole() {
      if (!initialRole) {
        try {
          const session = await supabaseClient.auth.getSession();
          const token = session.data.session?.access_token;
          if (token) {
            const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
              const profile = await res.json();
              if (profile.role === 'admin' || profile.role === 'officer') {
                setRole(profile.role);
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    determineRole();
  }, [initialRole]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function getAuthHeaders(): Promise<HeadersInit> {
    const session = await supabaseClient.auth.getSession();
    const token = session.data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function fetchData() {
    try {
      const headers = await getAuthHeaders();
      if (activeTab === 'elections') {
        const res = await fetch('/api/admin/elections', { headers });
        if (res.ok) setElections(await res.json());
      } else if (activeTab === 'positions') {
        const [posRes, elRes] = await Promise.all([
          fetch('/api/admin/positions', { headers }),
          fetch('/api/admin/elections', { headers })
        ]);
        if (posRes.ok) setPositions(await posRes.json());
        if (elRes.ok) setElections(await elRes.json());
      } else if (activeTab === 'candidates') {
        const [candRes, posRes] = await Promise.all([
          fetch('/api/admin/candidates', { headers }),
          fetch('/api/admin/positions', { headers })
        ]);
        if (candRes.ok) setCandidates(await candRes.json());
        if (posRes.ok) setPositions(await posRes.json());
      } else if (activeTab === 'tokens') {
        const [tokRes, elRes] = await Promise.all([
          fetch('/api/admin/tokens', { headers }),
          fetch('/api/admin/elections', { headers })
        ]);
        if (tokRes.ok) setTokens(await tokRes.json());
        if (elRes.ok) setElections(await elRes.json());
      } else if (activeTab === 'import') {
        // No fetch needed on tab switch
      } else if (activeTab === 'audit') {
        const res = await fetch('/api/admin/audit-logs', { headers });
        if (res.ok) setAuditLogs(await res.json());
      }
    } catch (err) {
      console.error('Error fetching admin panel data:', err);
    }
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

    // Frontend validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(candidateForm.photo.type)) {
      setCandidateMessage('Invalid photo type. Only PNG, JPEG, WEBP, and GIF are allowed.');
      setIsLoading(false);
      return;
    }
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (candidateForm.photo.size > maxSize) {
      setCandidateMessage('Photo size exceeds the 2MB limit.');
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
      const photoInput = document.getElementById('photo') as HTMLInputElement;
      if (photoInput) photoInput.value = '';
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
        student_number: tokenForm.student_number || null,
        email: tokenForm.email || null,
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

  // Bulk Import Handlers
  async function triggerImportPreview(file: File) {
    setImportMessage(null);
    setPreviewData(null);
    setIsImportLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/students/import?preview=true', {
        method: 'POST',
        headers,
        body: formData
      });

      const result = await response.json();
      if (response.ok) {
        setPreviewData(result);
      } else {
        setImportMessage(result.error || 'Failed to parse file preview.');
      }
    } catch (err: any) {
      setImportMessage(err.message || 'An error occurred during file upload preview.');
    } finally {
      setIsImportLoading(false);
    }
  }

  async function handleConfirmedBulkImport() {
    if (!importFile) return;
    setImportMessage(null);
    setIsImportLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/students/import', {
        method: 'POST',
        headers,
        body: formData
      });

      const result = await response.json();
      if (response.ok) {
        setImportMessage(
          `Import successfully completed!\n` +
          `• Created profiles: ${result.created}\n` +
          `• Already exists: ${result.exists}\n` +
          `• Skipped: ${result.skipped}\n` +
          (result.errors && result.errors.length > 0 ? `\nDetailed Errors:\n${result.errors.join('\n')}` : '')
        );
        setImportFile(null);
        setPreviewData(null);
        const fileInput = document.getElementById('panel_import_file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        onImportSuccess?.();
      } else {
        setImportMessage(result.error || 'Import failed.');
      }
    } catch (error: any) {
      setImportMessage(error.message || 'An error occurred during import.');
    } finally {
      setIsImportLoading(false);
    }
  }

  function formatAuditLogDetails(action: string, details: any): string {
    if (!details) return '';
    try {
      switch (action) {
        case 'election_creation':
          return `Created election "${details.title || ''}"`;
        case 'election_deletion':
          return `Deleted election ID: ${details.election_id || ''}`;
        case 'election_status_change':
          return `Status change: Election ${details.election_id || ''} -> ${details.status || ''}`;
        case 'position_creation':
          return `Created position "${details.title || ''}" (ID: ${details.position_id || ''})`;
        case 'candidate_creation':
          return `Registered candidate "${details.student_name || ''}" (ID: ${details.candidate_id || ''})`;
        case 'voting_token_creation':
          return `Issued voting token for student ID: ${details.student_id || 'N/A'}`;
        case 'voting_token_deletion':
          return `Deleted voting token ID: ${details.token_id || ''}`;
        case 'student_creation':
          return `Registered student account: ${details.email || ''}`;
        case 'officer_creation':
          return `Registered officer account: ${details.email || ''}`;
        case 'student_bulk_import':
          return `Imported ${details.created || 0} students (skipped: ${details.skipped || 0}, exists: ${details.exists || 0})`;
        default:
          return typeof details === 'object' ? JSON.stringify(details) : String(details);
      }
    } catch (e) {
      return String(details);
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50 p-1 rounded-t-xl flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('elections')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'elections' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
        >
          Elections
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'positions' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
        >
          Positions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('candidates')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'candidates' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
        >
          Candidates
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tokens')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'tokens' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
        >
          Voting Tokens
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'import' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
        >
          Bulk Import
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'audit' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
        >
          Audit Logs
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {/* ELECTIONS TAB */}
        {activeTab === 'elections' && (
          <div className="space-y-6">
            {role === 'admin' ? (
              <Card>
                <h2 className="text-xl font-bold text-slate-950">Create Election</h2>
                <p className="text-sm text-slate-500 mt-1">Set up a new prefect voting process.</p>
                <form className="grid gap-4 pt-4" onSubmit={createElection}>
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
                  <Button type="submit" disabled={isLoading} className="w-fit">Create Election</Button>
                  {electionMessage && <div className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700 mt-2">{electionMessage}</div>}
                </form>
              </Card>
            ) : (
              <Card className="bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-600 font-medium">⚠️ Registration/Creation forms are locked. Only system Administrators can create new elections.</p>
              </Card>
            )}

            <Card>
              <h2 className="text-xl font-bold text-slate-950">Manage Elections</h2>
              <p className="text-sm text-slate-500 mt-1">Activate, freeze, or publish elections.</p>
              <div className="mt-4 grid gap-4">
                {elections.length === 0 ? (
                  <p className="text-sm text-slate-600">No elections defined yet.</p>
                ) : (
                  elections.map((election) => (
                    <div key={election.id} className="rounded-2xl border border-slate-200 p-5 bg-slate-50 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{election.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">ID: {election.id}</p>
                        <p className="text-sm text-slate-600 mt-2">{election.description}</p>
                        <div className="flex gap-4 mt-2 flex-wrap text-xs text-slate-500">
                          <span>Starts: {new Date(election.start_time).toLocaleString()}</span>
                          <span>Ends: {new Date(election.end_time).toLocaleString()}</span>
                        </div>
                        <div className="mt-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            election.status === 'open' ? 'bg-green-100 text-green-800' :
                            election.status === 'published' ? 'bg-blue-100 text-blue-800' :
                            election.status === 'closed' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            Status: {election.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:self-start">
                        <Button
                          type="button"
                          onClick={() => updateElectionStatus(election.id, 'open')}
                          disabled={isLoading || election.status !== 'draft'}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 h-auto"
                        >
                          Open
                        </Button>
                        <Button
                          type="button"
                          onClick={() => updateElectionStatus(election.id, 'closed')}
                          disabled={isLoading || election.status !== 'open'}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 h-auto"
                        >
                          Close
                        </Button>
                        <Button
                          type="button"
                          onClick={() => updateElectionStatus(election.id, 'published')}
                          disabled={isLoading || election.status !== 'closed'}
                          className="bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 h-auto"
                        >
                          Publish
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {manageElectionMessage && <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700">{manageElectionMessage}</div>}
            </Card>
          </div>
        )}

        {/* POSITIONS TAB */}
        {activeTab === 'positions' && (
          <div className="space-y-6">
            {role === 'admin' ? (
              <Card>
                <h2 className="text-xl font-bold text-slate-950">Create Position</h2>
                <p className="text-sm text-slate-500 mt-1">Add positions (e.g. Head Boy, Sports Prefect) to an election.</p>
                <form className="grid gap-4 pt-4" onSubmit={createPosition}>
                  <div>
                    <Label htmlFor="position_title">Title</Label>
                    <Input id="position_title" value={positionForm.title} onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })} required placeholder="e.g. Head Prefect" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="max_votes">Vote Limit (Multiple Choice)</Label>
                      <Input id="max_votes" type="number" min="1" value={positionForm.max_votes} onChange={(e) => setPositionForm({ ...positionForm, max_votes: e.target.value })} required />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="election_id">Target Election</Label>
                      <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" id="election_id" value={positionForm.election_id} onChange={(e) => setPositionForm({ ...positionForm, election_id: e.target.value })} required>
                        <option value="">Select election</option>
                        {elections.map((election) => (
                          <option key={election.id} value={election.id}>{election.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-fit">Create Position</Button>
                  {positionMessage && <div className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700 mt-2">{positionMessage}</div>}
                </form>
              </Card>
            ) : (
              <Card className="bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-600 font-medium">⚠️ locked. Only system Administrators can create new electoral positions.</p>
              </Card>
            )}

            <Card>
              <h2 className="text-xl font-bold text-slate-950">Active Positions</h2>
              <div className="mt-4 space-y-4">
                {positions.length === 0 ? (
                  <p className="text-sm text-slate-600">No positions configured yet.</p>
                ) : (
                  elections.map((election) => {
                    const electionPos = positions.filter(p => p.election_id === election.id);
                    if (electionPos.length === 0) return null;
                    return (
                      <div key={election.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                        <h3 className="text-sm font-bold text-slate-800 border-b pb-1">{election.title}</h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {electionPos.map((pos) => (
                            <div key={pos.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                              <p className="font-semibold text-slate-900">{pos.title}</p>
                              <p className="text-xs text-slate-500">ID: {pos.id}</p>
                              <p className="text-xs text-brand-600 mt-1 font-medium">Max votes: {pos.max_votes}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}

        {/* CANDIDATES TAB */}
        {activeTab === 'candidates' && (
          <div className="space-y-6">
            {role === 'admin' ? (
              <Card>
                <h2 className="text-xl font-bold text-slate-950">Register Candidate</h2>
                <p className="text-sm text-slate-500 mt-1">Assign a student candidate with photo to a position.</p>
                <form className="grid gap-4 pt-4" onSubmit={createCandidate}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="student_name">Candidate Name</Label>
                      <Input id="student_name" value={candidateForm.student_name} onChange={(e) => setCandidateForm({ ...candidateForm, student_name: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="class_name">Class / Form</Label>
                      <Input id="class_name" value={candidateForm.class_name} onChange={(e) => setCandidateForm({ ...candidateForm, class_name: e.target.value })} required placeholder="e.g. S.6 Science" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="position_id">Assigned Position</Label>
                    <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" id="position_id" value={candidateForm.position_id} onChange={(e) => setCandidateForm({ ...candidateForm, position_id: e.target.value })} required>
                      <option value="">Select a position</option>
                      {positions.map((position) => (
                        <option key={position.id} value={position.id}>{position.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="manifesto">Manifesto Summary</Label>
                    <Textarea id="manifesto" value={candidateForm.manifesto} onChange={(e) => setCandidateForm({ ...candidateForm, manifesto: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="photo">Candidate Photo (JPEG/PNG/WEBP, Max 2MB)</Label>
                    <Input id="photo" type="file" accept="image/*" onChange={(event) => setCandidateForm({ ...candidateForm, photo: event.target.files?.[0] ?? null })} required />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-fit">Register Candidate</Button>
                  {candidateMessage && <div className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700 mt-2">{candidateMessage}</div>}
                </form>
              </Card>
            ) : (
              <Card className="bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-600 font-medium">⚠️ Locked. Only system Administrators can register new electoral candidates.</p>
              </Card>
            )}

            <Card>
              <h2 className="text-xl font-bold text-slate-950">Registered Candidates</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {candidates.length === 0 ? (
                  <p className="text-sm text-slate-600 col-span-2">No candidates registered yet.</p>
                ) : (
                  candidates.map((candidate) => {
                    const pos = positions.find(p => p.id === candidate.position_id);
                    return (
                      <div key={candidate.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex gap-4 items-start shadow-sm hover:shadow transition-shadow">
                        {candidate.photo_url ? (
                          <img src={candidate.photo_url} alt={candidate.student_name} className="h-16 w-16 rounded-full object-cover border border-slate-300" />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">Photo</div>
                        )}
                        <div className="flex-1 space-y-1">
                          <p className="font-bold text-slate-900 leading-none">{candidate.student_name}</p>
                          <p className="text-xs font-semibold text-brand-600">{pos ? pos.title : 'Unknown Position'}</p>
                          <p className="text-xs text-slate-500">Class: {candidate.class_name}</p>
                          <p className="text-sm text-slate-700 pt-1 border-t border-slate-200/60 leading-relaxed italic">&ldquo;{candidate.manifesto}&rdquo;</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}

        {/* VOTING TOKENS TAB */}
        {activeTab === 'tokens' && (
          <div className="space-y-6">
            <Card>
              <h2 className="text-xl font-bold text-slate-950">Create Voting Token</h2>
              <p className="text-sm text-slate-500 mt-1">Generate a secure, single-use token for a student voter.</p>
              <form className="grid gap-4 pt-4" onSubmit={createToken}>
                <div>
                  <Label htmlFor="token_election_id">Target Election</Label>
                  <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" id="token_election_id" value={tokenForm.election_id} onChange={(e) => setTokenForm({ ...tokenForm, election_id: e.target.value })} required>
                    <option value="">Select election</option>
                    {elections.map((election) => (
                      <option key={election.id} value={election.id}>{election.title}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="student_number">Student Number</Label>
                    <Input id="student_number" value={tokenForm.student_number} onChange={(e) => setTokenForm({ ...tokenForm, student_number: e.target.value })} placeholder="e.g. S12345 (Required if Email is blank)" />
                  </div>
                  <div>
                    <Label htmlFor="token_email">Student Email Address</Label>
                    <Input id="token_email" value={tokenForm.email} onChange={(e) => setTokenForm({ ...tokenForm, email: e.target.value })} placeholder="e.g. name@school.com" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="expires_at">Expiration Time (Optional)</Label>
                  <Input id="expires_at" type="datetime-local" value={tokenForm.expires_at} onChange={(e) => setTokenForm({ ...tokenForm, expires_at: e.target.value })} />
                </div>
                <Button type="submit" disabled={isLoading} className="w-fit">Create Voting Token</Button>
                {tokenMessage && <div className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700 mt-2 whitespace-pre-line">{tokenMessage}</div>}
              </form>
            </Card>

            <Card>
              <h2 className="text-xl font-bold text-slate-950">Active Voting Tokens</h2>
              <p className="text-sm text-slate-500 mt-1">List of tokens currently usable. Expired or used tokens are restricted.</p>
              <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {tokens.length === 0 ? (
                  <p className="text-sm text-slate-600">No active tokens generated.</p>
                ) : (
                  tokens.map((token) => (
                    <div key={token.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-sm">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900">Token: <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-mono select-all">{token.token}</span></p>
                        <p className="text-xs text-slate-500">Election: {elections.find(e => e.id === token.election_id)?.title || token.election_id}</p>
                        <p className="text-xs text-slate-500">Expires: {token.expires_at ? new Date(token.expires_at).toLocaleString() : 'Never'}</p>
                        <p className="text-xs text-slate-500">Status: {token.used ? <span className="text-red-600 font-semibold">USED</span> : <span className="text-green-600 font-semibold">ACTIVE</span>}</p>
                      </div>
                      <Button type="button" onClick={() => deleteToken(token.id)} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 h-auto self-start sm:self-center">Delete</Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* BULK IMPORT TAB */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <Card>
              <h2 className="text-xl font-bold text-slate-950">Bulk Import Students</h2>
              <p className="text-sm text-slate-500 mt-1">Upload a CSV or Excel (.xlsx) sheet to register multiple student accounts at once. The first row must be the header.</p>
              
              <div className="mt-4 p-4 border border-slate-200 bg-slate-50 rounded-xl space-y-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Required CSV/Excel Headers:</p>
                <code className="block bg-slate-900 text-slate-100 p-2.5 rounded font-mono select-all">full_name, student_number, email, class_name, password</code>
                <p>• Duplicate emails/student numbers will be checked in the file and against the database.</p>
                <p>• Password must be at least 6 characters. Student number must be at least 3 characters.</p>
              </div>

              <div className="grid gap-4 pt-4">
                <div>
                  <Label htmlFor="panel_import_file">Select File (.csv, .xlsx)</Label>
                  <Input
                    id="panel_import_file"
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImportFile(file);
                      if (file) {
                        triggerImportPreview(file);
                      } else {
                        setPreviewData(null);
                      }
                    }}
                    required
                  />
                </div>
                
                {isImportLoading && (
                  <p className="text-sm text-brand-600 font-semibold animate-pulse">Processing file. Please wait…</p>
                )}

                {/* Import Preview Section */}
                {previewData && (
                  <div className="space-y-4 border-t pt-4 border-slate-200">
                    <h3 className="text-base font-bold text-slate-900">Import File Preview</h3>
                    
                    {/* Summary Row */}
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-5 text-center">
                      <div className="p-3 bg-slate-100 rounded-lg border">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Total Rows</p>
                        <p className="text-2xl font-bold text-slate-900">{previewData.summary.total}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 uppercase font-semibold">Ready to Import</p>
                        <p className="text-2xl font-bold text-green-800">{previewData.summary.valid}</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-red-700 uppercase font-semibold">Errors</p>
                        <p className="text-2xl font-bold text-red-800">{previewData.summary.invalid}</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-700 uppercase font-semibold">File Duplicates</p>
                        <p className="text-2xl font-bold text-amber-800">{previewData.summary.duplicate_file}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 uppercase font-semibold">DB Conflicts</p>
                        <p className="text-2xl font-bold text-blue-800">{previewData.summary.duplicate_db}</p>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Full Name</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Student Number</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Email</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Class</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {previewData.preview.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 text-slate-900 font-medium">{row.full_name}</td>
                              <td className="px-4 py-2 text-slate-600">{row.student_number}</td>
                              <td className="px-4 py-2 text-slate-600">{row.email}</td>
                              <td className="px-4 py-2 text-slate-600">{row.class_name}</td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  row.status === 'valid' ? 'bg-green-100 text-green-800' :
                                  row.status === 'invalid' ? 'bg-red-100 text-red-800' :
                                  row.status === 'duplicate_in_file' ? 'bg-amber-100 text-amber-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {row.status === 'valid' ? 'Ready' : row.message}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={handleConfirmedBulkImport}
                        disabled={previewData.summary.valid === 0 || isImportLoading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Confirm and Import {previewData.summary.valid} Students
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setImportFile(null);
                          setPreviewData(null);
                          const fileInput = document.getElementById('panel_import_file') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {importMessage && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 mt-2 whitespace-pre-wrap font-sans">
                    {importMessage}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* AUDIT LOGS TAB */}
        {activeTab === 'audit' && (
          <Card>
            <h2 className="text-xl font-bold text-slate-950">System Audit Trail</h2>
            <p className="text-sm text-slate-500 mt-1">Immutable system audit logs tracking logins, token generations, and data modifications.</p>
            
            <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Actor</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Log Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">No logs found.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2.5">
                          {log.profiles ? (
                            <div>
                              <p className="font-semibold text-slate-800">{log.profiles.full_name}</p>
                              <p className="text-[10px] text-slate-400">{log.profiles.email} ({log.profiles.role})</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">{log.user_id || 'System'}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-800 rounded font-mono px-1.5 py-0.5 border border-slate-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 font-medium leading-relaxed">
                          {formatAuditLogDetails(log.action, log.details)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
