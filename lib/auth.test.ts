import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserProfileFromToken } from '@/lib/auth';

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
      const mockUser = { id: 'user-123', email: 'student@stmark.com' };
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
        error: new Error('User not found')
      });

      const profile = await getUserProfileFromToken('invalid-token');
      expect(profile).toBeNull();
    });

    it('should return null if profile not found', async () => {
      const mockUser = { id: 'user-123', email: 'student@stmark.com' };

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
});
