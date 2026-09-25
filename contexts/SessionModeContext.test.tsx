// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SessionModeProvider, useSessionMode } from './SessionModeContext';
import * as AuthContext from './AuthContext';

const TestConsumer: React.FC = () => {
  const { sessionMode, setSessionMode, resetSessionMode } = useSessionMode();
  return (
    <div>
      <span data-testid="mode">{sessionMode ?? 'null'}</span>
      <button onClick={() => setSessionMode('parent')}>Set Parent</button>
      <button onClick={() => setSessionMode('child')}>Set Child</button>
      <button onClick={() => resetSessionMode()}>Reset</button>
    </div>
  );
};

describe('SessionModeContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('initializes sessionMode to null by default', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-1' } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      setIsPasswordRecovery: vi.fn(),
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
    });

    render(
      <SessionModeProvider>
        <TestConsumer />
      </SessionModeProvider>
    );

    expect(screen.getByTestId('mode').textContent).toBe('null');
  });

  it('updates sessionMode to parent and child and resets to null', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-1' } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      setIsPasswordRecovery: vi.fn(),
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
    });

    render(
      <SessionModeProvider>
        <TestConsumer />
      </SessionModeProvider>
    );

    fireEvent.click(screen.getByText('Set Parent'));
    expect(screen.getByTestId('mode').textContent).toBe('parent');

    fireEvent.click(screen.getByText('Set Child'));
    expect(screen.getByTestId('mode').textContent).toBe('child');

    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByTestId('mode').textContent).toBe('null');
  });

  it('automatically resets sessionMode to null when user logs out', () => {
    const authSpy = vi.spyOn(AuthContext, 'useAuth');
    authSpy.mockReturnValue({
      user: { id: 'parent-1' } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      setIsPasswordRecovery: vi.fn(),
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
    });

    const { rerender } = render(
      <SessionModeProvider>
        <TestConsumer />
      </SessionModeProvider>
    );

    fireEvent.click(screen.getByText('Set Parent'));
    expect(screen.getByTestId('mode').textContent).toBe('parent');

    // User logs out (user becomes null)
    authSpy.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      setIsPasswordRecovery: vi.fn(),
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
    });

    rerender(
      <SessionModeProvider>
        <TestConsumer />
      </SessionModeProvider>
    );

    expect(screen.getByTestId('mode').textContent).toBe('null');
  });

  it('provides safe fallback when rendered outside SessionModeProvider without throwing', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('mode').textContent).toBe('parent');
  });
});
