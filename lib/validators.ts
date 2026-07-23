import { z } from 'zod';

export const candidateSelectionSchema = z.object({
  candidateId: z.string().uuid(),
  positionId: z.string().uuid()
});

export const voteSubmissionSchema = z.object({
  electionId: z.string().uuid(),
  selectedCandidates: z.array(candidateSelectionSchema).min(1),
  votingToken: z.string().nullable().optional()
});

export type VoteSubmission = z.infer<typeof voteSubmissionSchema>;

export const studentImportSchema = z.array(z.object({
  student_number: z.string().min(1),
  email: z.string().email(),
  full_name: z.string().min(1),
  class_name: z.string().min(1)
}));

// Login schema - supports email+password, studentNumber+password, or voting token
export const loginSchema = z.object({
  email: z.union([z.string().email(), z.literal('')]).optional(),
  studentNumber: z.string().optional(),
  password: z.union([z.string().min(6, 'Password must be at least 6 characters'), z.literal('')]).optional(),
  token: z.string().optional()
}).refine(
  (data) => data.token || (data.email && data.password) || (data.studentNumber && data.password),
  { message: 'Provide email+password, student number+password, or a voting token.' }
);

// Registration schema
export const registerSchema = z.object({
  full_name: z.string().min(3, 'Full name must be at least 3 characters'),
  student_number: z.string().min(3, 'Student number must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  class_name: z.string().min(1, 'Class name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Election creation schema
export const electionSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  start_time: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date/time'),
  end_time: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date/time')
}).refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  { message: 'End time must be after start time' }
);

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
