import type { User } from '@/types';
import { getSafeStorage } from './storage';

/**
 * Key under which the authenticated user is mirrored into `localStorage` by
 * the login flow in `MainMenu`.
 */
export const AUTH_USER_KEY = 'auth_user';

/**
 * Reads the currently authenticated user out of `localStorage`.
 *
 * Replaces the `JSON.parse(localStorage.getItem('auth_user'))` pattern that
 * was duplicated in `useInvestigationPhase`, `AgentNotepad`, `CampaignTab`,
 * `LocationPhase` and `MainMenu` -- each of which had its own, differently
 * broken, parse guard.
 *
 * Returns `null` when nobody is signed in, when the payload is corrupt
 * (the corrupt key is purged by `getSafeStorage`), or when storage is
 * unavailable.
 */
export const getLocalUser = (): User | null => {
  return getSafeStorage<User | null>('local', AUTH_USER_KEY, null);
};
