import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureProfileExists } from './ensureProfile';
import * as supabaseModule from './supabase';

describe('ensureProfileExists', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when user is null', async () => {
    const result = await ensureProfileExists(null);
    expect(result).toBe(false);
  });

  it('returns false when supabase client is not configured', async () => {
    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);

    const mockUser = {
      id: 'user-123',
      user_metadata: { full_name: 'Test Parent' },
    } as any;

    const result = await ensureProfileExists(mockUser);
    expect(result).toBe(false);
  });

  it('calls upsert with onConflict: id and ignoreDuplicates: true to prevent overwriting existing profile data', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: mockFrom,
    } as any);

    const mockUser = {
      id: 'user-123',
      user_metadata: { full_name: 'Test Parent' },
    } as any;

    const result = await ensureProfileExists(mockUser);

    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        id: 'user-123',
        full_name: 'Test Parent',
      },
      {
        onConflict: 'id',
        ignoreDuplicates: true,
      }
    );
  });

  it('gracefully handles missing user_metadata without failing', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: mockFrom,
    } as any);

    const mockUser = {
      id: 'user-456',
    } as any;

    const result = await ensureProfileExists(mockUser);

    expect(result).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        id: 'user-456',
        full_name: '',
      },
      {
        onConflict: 'id',
        ignoreDuplicates: true,
      }
    );
  });

  it('handles database errors gracefully and returns false without throwing', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: { message: 'DB connection error' } });
    const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: mockFrom,
    } as any);

    const mockUser = {
      id: 'user-789',
    } as any;

    const result = await ensureProfileExists(mockUser);
    expect(result).toBe(false);
  });
});
