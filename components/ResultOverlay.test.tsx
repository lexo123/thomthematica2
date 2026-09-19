// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ResultOverlay } from './ResultOverlay';
import * as ChildContext from '../contexts/ChildContext';
import { GameState } from '../types';

describe('ResultOverlay - Per-child and fallback reward images', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('uses fallback images when childRewardImages is null or not personalized', async () => {
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      activeChildId: 'c1',
      childRewardImages: null,
      childrenList: [],
      activeChild: null,
      loading: false,
      error: null,
      hasFetchedOnce: true,
      setActiveChildId: vi.fn(),
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      fetchChildren: vi.fn(),
      showChildSelector: false,
      setShowChildSelector: vi.fn(),
    });

    render(
      <ResultOverlay
        gameState={GameState.Correct}
        onReset={vi.fn()}
        correctAnswer={10}
        message="სწორია"
        showImage={true}
        isPerfectBlock={true}
        consecutivePerfectBlocks={1}
      />
    );

    // With fallback, WINNER_IMAGES are Google Drive links converted to lh3.googleusercontent.com
    const img = (await screen.findByRole('img')) as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('googleusercontent.com');
  });

  it('uses personalized images when childRewardImages is personalized', async () => {
    const personalizedWinnerUrl = 'https://supabase.co/storage/signed/custom-winner.jpg';
    const personalizedWinnerCaption = 'შენ ხარ ჩემი გმირი!';

    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      activeChildId: 'c1',
      childRewardImages: {
        isPersonalized: true,
        winner: [{ url: personalizedWinnerUrl, caption: personalizedWinnerCaption }],
        loser: [{ url: 'https://supabase.co/storage/signed/custom-loser.jpg', caption: 'Loser' }],
        super_winner: [{ url: 'https://supabase.co/storage/signed/custom-super.gif', caption: 'Super' }],
      },
      childrenList: [],
      activeChild: null,
      loading: false,
      error: null,
      hasFetchedOnce: true,
      setActiveChildId: vi.fn(),
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      fetchChildren: vi.fn(),
      showChildSelector: false,
      setShowChildSelector: vi.fn(),
    });

    render(
      <ResultOverlay
        gameState={GameState.Correct}
        onReset={vi.fn()}
        correctAnswer={10}
        message="სწორია"
        showImage={true}
        isPerfectBlock={true}
        consecutivePerfectBlocks={1}
      />
    );

    const img = (await screen.findByRole('img')) as HTMLImageElement;
    expect(img.src).toBe(personalizedWinnerUrl);
    expect(screen.getByText(personalizedWinnerCaption)).toBeDefined();
  });

  it('selects super_winner when consecutivePerfectBlocks is 3, 6, 9 etc.', async () => {
    const superUrl = 'https://supabase.co/storage/signed/custom-super.gif';
    const superCaption = 'სუპერ ჩემპიონი!';

    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      activeChildId: 'c1',
      childRewardImages: {
        isPersonalized: true,
        winner: [{ url: 'https://url/w', caption: 'Winner' }],
        loser: [{ url: 'https://url/l', caption: 'Loser' }],
        super_winner: [{ url: superUrl, caption: superCaption }],
      },
      childrenList: [],
      activeChild: null,
      loading: false,
      error: null,
      hasFetchedOnce: true,
      setActiveChildId: vi.fn(),
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      fetchChildren: vi.fn(),
      showChildSelector: false,
      setShowChildSelector: vi.fn(),
    });

    render(
      <ResultOverlay
        gameState={GameState.Correct}
        onReset={vi.fn()}
        correctAnswer={10}
        message="სწორია"
        showImage={true}
        isPerfectBlock={true}
        consecutivePerfectBlocks={3}
      />
    );

    const img = (await screen.findByRole('img')) as HTMLImageElement;
    expect(img.src).toBe(superUrl);
    expect(screen.getByText(superCaption)).toBeDefined();
  });

  it('selects loser images when isPerfectBlock is false', async () => {
    const loserUrl = 'https://supabase.co/storage/signed/custom-loser.jpg';
    const loserCaption = 'სცადე კიდევ!';

    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      activeChildId: 'c1',
      childRewardImages: {
        isPersonalized: true,
        winner: [{ url: 'https://url/w', caption: 'Winner' }],
        loser: [{ url: loserUrl, caption: loserCaption }],
        super_winner: [{ url: 'https://url/s', caption: 'Super' }],
      },
      childrenList: [],
      activeChild: null,
      loading: false,
      error: null,
      hasFetchedOnce: true,
      setActiveChildId: vi.fn(),
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      fetchChildren: vi.fn(),
      showChildSelector: false,
      setShowChildSelector: vi.fn(),
    });

    render(
      <ResultOverlay
        gameState={GameState.Correct}
        onReset={vi.fn()}
        correctAnswer={10}
        message="შეცდომები გქონდა"
        showImage={true}
        isPerfectBlock={false}
        consecutivePerfectBlocks={0}
      />
    );

    const img = (await screen.findByRole('img')) as HTMLImageElement;
    expect(img.src).toBe(loserUrl);
    expect(screen.getByText(loserCaption)).toBeDefined();
  });

});
