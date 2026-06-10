import { z } from 'zod';

export const loginSchema = z.object({
  studentNumber: z.string().trim().min(3).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).optional(),
  token: z.string().trim().optional()
}).superRefine((data, ctx) => {
  if (!data.token && !data.password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message: 'Password is required unless logging in with a token.'
    });
  }
});

export const registerSchema = z.object({
  full_name: z.string().min(3),
  student_number: z.string().min(3),
  email: z.string().email(),
  class_name: z.string().min(1),
  password: z.string().min(8)
});

export const electionSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  start_time: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid start date'),
  end_time: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid end date')
});
