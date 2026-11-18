import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useRoomTabIndicator } from './useRoomTabIndicator';

function Fixture({ tab, animate }: { tab: string; animate: () => unknown }) {
  const rowRef = useRoomTabIndicator(tab);
  return (
    <div ref={element => {
      rowRef.current = element;
      if (element) Object.defineProperty(element, 'animate', { value: animate, configurable: true });
    }} data-testid="row">
      <button data-room-tab="first">First</button>
      <button data-room-tab="second">Second</button>
    </div>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('places the indicator immediately, retargets a running transition, and cleans up', () => {
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }));
  const disconnect = vi.fn();
  const removeEventListener = vi.fn();
  const preference = { matches: false, addEventListener: vi.fn(), removeEventListener };
  vi.stubGlobal('CSS', { registerProperty: vi.fn() });
  vi.stubGlobal('matchMedia', () => preference);
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect = disconnect;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const tab = this.dataset.roomTab;
    return new DOMRect(tab === 'second' ? 110 : 0, 0, tab ? 100 : 210, 40);
  });

  const { getByTestId, rerender, unmount } = render(<Fixture tab="first" animate={animate} />);
  const row = getByTestId('row');
  expect(row.dataset.sharedHighlight).toBe('true');
  expect(row.style.getPropertyValue('--room-highlight-x')).toBe('0px');
  expect(row.style.getPropertyValue('--room-highlight-start')).toBe('1');
  expect(row.style.getPropertyValue('--room-highlight-end')).toBe('0');
  expect(animate).not.toHaveBeenCalled();

  rerender(<Fixture tab="second" animate={animate} />);
  expect(animate).toHaveBeenCalledWith([
    { '--room-highlight-x': '0px', '--room-highlight-width': '100px', '--room-highlight-start': '1', '--room-highlight-end': '0' },
    { '--room-highlight-x': '48.99999999999999px', '--room-highlight-width': '112.00000000000001px', '--room-highlight-start': '0', '--room-highlight-end': '0' },
    { '--room-highlight-x': '110px', '--room-highlight-width': '100px', '--room-highlight-start': '0', '--room-highlight-end': '1' },
  ], { duration: 240, easing: 'ease-in-out' });

  row.style.setProperty('--room-highlight-x', '55px');
  row.style.setProperty('--room-highlight-end', '0.4');
  rerender(<Fixture tab="first" animate={animate} />);
  expect(animate).toHaveBeenLastCalledWith(
    expect.arrayContaining([{ '--room-highlight-x': '55px', '--room-highlight-width': '100px', '--room-highlight-start': '0', '--room-highlight-end': '0.4' }]),
    expect.anything(),
  );
  expect(cancel).toHaveBeenCalledTimes(1);

  preference.matches = true;
  rerender(<Fixture tab="second" animate={animate} />);
  expect(row.style.getPropertyValue('--room-highlight-x')).toBe('110px');
  expect(row.style.getPropertyValue('--room-highlight-start')).toBe('0');
  expect(row.style.getPropertyValue('--room-highlight-end')).toBe('1');
  unmount();
  expect(cancel).toHaveBeenCalledTimes(2);
  expect(disconnect).toHaveBeenCalled();
  expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
});
