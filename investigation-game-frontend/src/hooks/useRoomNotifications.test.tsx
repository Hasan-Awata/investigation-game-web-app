import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useRoomNotifications } from './useRoomNotifications';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const notice = { type: 'system' as const, title: 'Ready', message: 'Complete', icon: 'information' as const };
it('expires at eight seconds and retains the exit for 160ms', () => {
  const { result } = renderHook(useRoomNotifications);
  act(() => result.current.addGlobalToast(notice));
  act(() => vi.advanceTimersByTime(7999));
  expect(result.current.toasts[0].visible).toBe(true);
  act(() => vi.advanceTimersByTime(1));
  expect(result.current.toasts[0].visible).toBe(false);
  act(() => vi.advanceTimersByTime(160));
  expect(result.current.toasts).toHaveLength(0);
});
it('pauses remaining time and dismisses only the selected notice', () => {
  const { result, unmount } = renderHook(useRoomNotifications);
  act(() => { result.current.addGlobalToast(notice); result.current.addGlobalToast(notice); });
  act(() => vi.advanceTimersByTime(3000));
  act(() => result.current.onPauseChange(true));
  act(() => vi.advanceTimersByTime(20000));
  expect(result.current.toasts.every(item => item.visible)).toBe(true);
  const id = result.current.toasts[0].id;
  act(() => { result.current.dismiss(id); result.current.dismiss(id); });
  act(() => vi.advanceTimersByTime(160));
  expect(result.current.toasts).toHaveLength(1);
  act(() => result.current.onPauseChange(false));
  act(() => vi.advanceTimersByTime(5000));
  expect(result.current.toasts[0].visible).toBe(false);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
