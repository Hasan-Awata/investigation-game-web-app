import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Level } from '@/types';
import LevelCard from './LevelCard';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? 'Location survey' }) }));
const level: Level = { id: 1, zone_id: 1, title: 'Lead', details: '', order_index: 1, is_initial: true, presentation_type: 'location' };

describe('LevelCard', () => {
  it('exposes selection and activates once through its single button', () => {
    const onSelect = vi.fn();
    render(<LevelCard level={level} status="actionable" isSelected displayTitle="Lead" onSelect={onSelect} />);
    const button = screen.getByRole('button', { pressed: true });
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
  it.each(['undiscovered', 'actionable'] as const)('blocks unavailable %s leads', status => {
    const onSelect = vi.fn();
    render(<LevelCard level={level} status={status} disabled={status === 'actionable'} isSelected={false} displayTitle="Unknown lead" onSelect={onSelect} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSelect).not.toHaveBeenCalled();
  });
  it('keeps gated leads selectable without a warrant badge', () => {
    const onSelect = vi.fn();
    render(<LevelCard level={level} status="gated" isSelected={false} displayTitle="Lead" onSelect={onSelect} />);
    expect(screen.queryByText('Warrant required')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lead/ }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
  it('labels completed leads without disabling their history', () => {
    render(<LevelCard level={level} status="completed" isSelected={false} displayTitle="Lead" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Completed/ })).toBeEnabled();
  });
});
