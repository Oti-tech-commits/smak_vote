// Comprehensive type definitions for St. Mark's Voting System

// User roles
export type UserRole = 'admin' | 'officer' | 'student';
export type ElectionStatus = 'draft' | 'open' | 'closed' | 'published';

// Profile
export interface Profile {
  id: string;
  student_number: string;
  email: string;
  full_name: string;
  class_name: string;
  role: UserRole;
  created_at: string;
}

// Election
export interface Election {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: ElectionStatus;
  created_at: string;
}

// Position
export interface Position {
  id: string;
  election_id: string;
  title: string;
  max_votes: number;
  candidates?: Candidate[];
}

// Candidate
export interface Candidate {
  id: string;
  position_id: string;
  student_name: string;
  class_name: string;
  photo_url: string;
  manifesto: string;
}

// Vote (anonymous - no user reference)
export interface Vote {
  id: string;
  election_id: string;
  position_id: string;
  candidate_id: string;
  created_at: string;
}

// Voter Status (tracks if student has voted)
export interface VoterStatus {
  id: string;
  student_id: string;
  election_id: string;
  has_voted: boolean;
  voted_at: string | null;
}

// Audit Log
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, any> | null;
  created_at: string;
}

// Voting Token
export interface VotingToken {
  id: string;
  token: string;
  election_id: string;
  student_id: string | null;
  expires_at: string | null;
  used: boolean;
  used_by: string | null;
  created_at?: string;
}

// Candidate Selection
export interface CandidateSelection {
  candidateId: string;
  positionId: string;
}

// Vote Submission Request
export interface VoteSubmissionRequest {
  electionId: string;
  selectedCandidates: CandidateSelection[];
  votingToken?: string | null;
}

// Turnout Report Row
export interface TurnoutReportRow {
  class_name: string;
  registered_students: number;
  votes_cast: number;
  turnout_percentage: number;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Dynamic route params
export interface RouteParams {
  id: string;
}
