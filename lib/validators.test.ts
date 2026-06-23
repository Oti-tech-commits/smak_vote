import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, electionSchema } from '@/lib/validators';

describe('Validators', () => {
  describe('loginSchema', () => {
    it('should validate email and password login', () => {
      const valid = loginSchema.safeParse({
        email: 'student@stmark.com',
        password: 'SecurePass123'
      });
      expect(valid.success).toBe(true);
    });

    it('should validate student number and password login', () => {
      const valid = loginSchema.safeParse({
        studentNumber: 'S12345',
        password: 'SecurePass123'
      });
      expect(valid.success).toBe(true);
    });

    it('should validate voting token login', () => {
      const valid = loginSchema.safeParse({
        token: 'voting-token-uuid-here'
      });
      expect(valid.success).toBe(true);
    });

    it('should reject short password', () => {
      const invalid = loginSchema.safeParse({
        email: 'student@stmark.com',
        password: 'short'
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const invalid = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'SecurePass123'
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate complete registration', () => {
      const valid = registerSchema.safeParse({
        full_name: 'John Doe',
        student_number: 'S12345',
        email: 'john@stmark.com',
        class_name: 'SS3A',
        password: 'SecurePass123'
      });
      expect(valid.success).toBe(true);
    });

    it('should reject short names', () => {
      const invalid = registerSchema.safeParse({
        full_name: 'Jo',
        student_number: 'S12345',
        email: 'john@stmark.com',
        class_name: 'SS3A',
        password: 'SecurePass123'
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const invalid = registerSchema.safeParse({
        full_name: 'John Doe',
        student_number: 'S12345',
        email: 'not-an-email',
        class_name: 'SS3A',
        password: 'SecurePass123'
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('electionSchema', () => {
    it('should validate election creation', () => {
      const valid = electionSchema.safeParse({
        title: 'SS3 Prefect Election 2024',
        description: 'Annual prefect voting for senior secondary three students',
        start_time: '2024-12-01T10:00:00Z',
        end_time: '2024-12-01T14:00:00Z'
      });
      expect(valid.success).toBe(true);
    });

    it('should reject short title', () => {
      const invalid = electionSchema.safeParse({
        title: 'SS',
        description: 'Valid description here for testing purposes',
        start_time: '2024-12-01T10:00:00Z',
        end_time: '2024-12-01T14:00:00Z'
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject short description', () => {
      const invalid = electionSchema.safeParse({
        title: 'Valid Title',
        description: 'short',
        start_time: '2024-12-01T10:00:00Z',
        end_time: '2024-12-01T14:00:00Z'
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject invalid dates', () => {
      const invalid = electionSchema.safeParse({
        title: 'Valid Title',
        description: 'Valid description here for testing purposes',
        start_time: 'not-a-date',
        end_time: '2024-12-01T14:00:00Z'
      });
      expect(invalid.success).toBe(false);
    });
  });
});
