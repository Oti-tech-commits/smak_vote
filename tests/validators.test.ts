import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '@/lib/validators';

describe('validators', () => {
  it('accepts valid login data with email', () => {
    const result = loginSchema.safeParse({ email: 'student@stmark.com', password: 'StrongPass123' });
    expect(result.success).toBe(true);
  });

  it('rejects login without password', () => {
    const result = loginSchema.safeParse({ email: 'student@stmark.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      full_name: 'Jane Doe',
      student_number: 'S12345',
      email: 'jane@stmark.com',
      class_name: 'S5A',
      password: 'StrongPass123'
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid registration email', () => {
    const result = registerSchema.safeParse({
      full_name: 'Jane Doe',
      student_number: 'S12345',
      email: 'invalid-email',
      class_name: 'S5A',
      password: 'StrongPass123'
    });
    expect(result.success).toBe(false);
  });
});
