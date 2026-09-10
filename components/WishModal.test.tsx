// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WishModal } from './WishModal';

describe('WishModal UI Component', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders default 40 block size message when blockSize is omitted', () => {
    const onSendWish = vi.fn();
    const onWishTextChange = vi.fn();

    render(
      <WishModal
        lastCompletedBlockCorrectCount={40}
        wishText="დრონი"
        isSendingWish={false}
        onWishTextChange={onWishTextChange}
        onSendWish={onSendWish}
      />
    );

    expect(
      screen.getByText('ზედიზედ 40 კითხვიდან 40 სწორად გამოიცანი! შენ ნამდვილი გენიოსი ხარ.')
    ).toBeDefined();
  });

  it('renders 20 block size message when blockSize is 20 (Kveshmicera)', () => {
    const onSendWish = vi.fn();
    const onWishTextChange = vi.fn();

    render(
      <WishModal
        lastCompletedBlockCorrectCount={19}
        blockSize={20}
        wishText="სათამაშო მანქანა"
        isSendingWish={false}
        onWishTextChange={onWishTextChange}
        onSendWish={onSendWish}
      />
    );

    expect(
      screen.getByText('ზედიზედ 20 კითხვიდან 19 სწორად გამოიცანი! შენ ნამდვილი გენიოსი ხარ.')
    ).toBeDefined();
  });

  it('disables submit button when wishText is empty or whitespace', () => {
    const onSendWish = vi.fn();
    const onWishTextChange = vi.fn();

    render(
      <WishModal
        lastCompletedBlockCorrectCount={20}
        blockSize={20}
        wishText="   "
        isSendingWish={false}
        onWishTextChange={onWishTextChange}
        onSendWish={onSendWish}
      />
    );

    const button = screen.getByRole('button', { name: 'გააგზავნე' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('calls onSendWish when button is clicked with non-empty wishText', () => {
    const onSendWish = vi.fn();
    const onWishTextChange = vi.fn();

    render(
      <WishModal
        lastCompletedBlockCorrectCount={20}
        blockSize={20}
        wishText="ლეგო"
        isSendingWish={false}
        onWishTextChange={onWishTextChange}
        onSendWish={onSendWish}
      />
    );

    const button = screen.getByRole('button', { name: 'გააგზავნე' });
    fireEvent.click(button);
    expect(onSendWish).toHaveBeenCalledTimes(1);
  });
});
