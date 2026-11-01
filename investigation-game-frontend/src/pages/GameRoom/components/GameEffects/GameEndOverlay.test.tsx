import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import GameEndOverlay from './GameEndOverlay';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/utils/userState', () => ({ getLocalUser: () => ({ id: 2 }) }));

it('shows the viewing participant actual award rather than the nominal score on replay', () => {
  render(<GameEndOverlay status="solved" resolutionMessage="Solved" finalStats={{
    time_taken: 'Less than a minute', xp_gained: 900, max_xp: 900,
    suspects_caught: 6, total_guilty: 6, innocents_accused: 0, xp_awards: { 1: 900, 2: 0 },
  }} />);
  const award = screen.getByText('pages.gameRoom.gameEndOverlay.xpGranted').parentElement;
  expect(award).toHaveTextContent('0 / 900');
});
