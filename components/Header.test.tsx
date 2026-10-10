// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';
import { GameMode, GameState } from '../types';

describe('Header Component', () => {
  const defaultProps = {
    gameState: GameState.Playing,
    timeLeft: 10,
    questionsInBlock: 1,
    totalCorrect: 0,
    totalQuestions: 0,
    onHomeClick: vi.fn(),
  };

  it('renders exact label "მაგალითები 👑" for GameMode.Thomthematica', () => {
    render(<Header {...defaultProps} gameMode={GameMode.Thomthematica} />);
    expect(screen.getByText('მაგალითები 👑')).toBeDefined();
  });

  it('renders exact label "გამრავლების ტაბულა ✖️" for GameMode.ThomravlebisTabula', () => {
    render(<Header {...defaultProps} gameMode={GameMode.ThomravlebisTabula} />);
    expect(screen.getByText('გამრავლების ტაბულა ✖️')).toBeDefined();
  });

  it('renders exact label "გეომეტრია 📐" for GameMode.Gethometria', () => {
    render(<Header {...defaultProps} gameMode={GameMode.Gethometria} />);
    expect(screen.getByText('გეომეტრია 📐')).toBeDefined();
  });

  it('renders exact label "ქვეშმიწერით გამრავლება ✍️" for GameMode.Kveshmicera', () => {
    render(<Header {...defaultProps} gameMode={GameMode.Kveshmicera} />);
    expect(screen.getByText('ქვეშმიწერით გამრავლება ✍️')).toBeDefined();
  });

  it('renders exact label "ქვეშმიწერით გაყოფა ➗" for GameMode.Kveshdivision and NOT "ქვეშმიწერით გამრავლება"', () => {
    const { container } = render(<Header {...defaultProps} gameMode={GameMode.Kveshdivision} />);
    expect(screen.getByText('ქვეშმიწერით გაყოფა ➗')).toBeDefined();
    expect(container.textContent).not.toContain('ქვეშმიწერით გამრავლება');
  });
});
