import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBearerToken, getUserProfileFromToken, requireProfile } from '@/lib/auth';

// Mock Supabase
vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}));

import { supabaseServer } from '@/lib/supabaseServer';

describe('Auth Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfileFromToken', () => {
    it('should return null for missing token', async () => {
      const profile = await getUserProfileFromToken('');
      expect(profile).toBeNull();
    });

    it('should return profile for valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'student@stmark.com',
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
        app_metadata: {},
        user_metadata: {},
      } as any;
      const mockProfile = { id: 'user-123', role: 'student' };


      vi.mocked(supabaseServer.auth.getUser).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      });

      vi.mocked(supabaseServer.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: mockProfile,
              error: null
            })
          })
        })
      } as any);

      const profile = await getUserProfileFromToken('valid-token');
      expect(profile).toEqual({ id: 'user-123', role: 'student' });
    });

    it('should return null if user not found', async () => {
      vi.mocked(supabaseServer.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: new Error('User not found') as any
      });

      const profile = await getUserProfileFromToken('invalid-token');
      expect(profile).toBeNull();
    });

    it('should return null if profile not found', async () => {
      const mockUser = { id: 'user-123', email: 'student@stmark.com' } as any;

      vi.mocked(supabaseServer.auth.getUser).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      });

      vi.mocked(supabaseServer.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: null,
              error: new Error('Profile not found')
            })
          })
        })
      } as any);

      const profile = await getUserProfileFromToken('valid-token');
      expect(profile).toBeNull();
    });
  });

  describe('getBearerToken', () => {
    it('extracts the bearer token from the authorization header', () => {
      const request = new Request('https://example.com', {
        headers: { authorization: 'Bearer abc123' }
      });
      expect(getBearerToken(request)).toBe('abc123');
    });

    it('returns null when no authorization header is present', () => {
      const request = new Request('https://example.com');
      expect(getBearerToken(request)).toBeNull();
    });
  });

  describe('requireProfile', () => {
    function mockProfileLookup(role: string) {
      vi.mocked(supabaseServer.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-123' } as any },
        error: null
      });
      vi.mocked(supabaseServer.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({ data: { id: 'user-123', role }, error: null })
          })
        })
      } as any);
    }

    it('returns null when no token is provided', async () => {
      const request = new Request('https://example.com');
      expect(await requireProfile(request, 'admin')).toBeNull();
    });

    it('returns null when the role is not allowed', async () => {
      mockProfileLookup('student');
      const request = new Request('https://example.com', {
        headers: { authorization: 'Bearer token' }
      });
      expect(await requireProfile(request, 'admin')).toBeNull();
    });

    it('returns the profile when the role is allowed', async () => {
      mockProfileLookup('admin');
      const request = new Request('https://example.com', {
        headers: { authorization: 'Bearer token' }
      });
      expect(await requireProfile(request, ['admin', 'officer'])).toEqual({ id: 'user-123', role: 'admin' });
    });
  });
});
