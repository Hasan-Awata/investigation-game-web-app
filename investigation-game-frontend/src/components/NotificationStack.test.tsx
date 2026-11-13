import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import NotificationStack from './NotificationStack';

afterEach(() => vi.restoreAllMocks());
it('measures variable heights, repositions siblings, and disconnects observers', () => {
  let measure = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { measure = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
    return { height: this.dataset.id === 'a' ? 100 : 50 } as DOMRect;
  });
  const pause = vi.fn();
  const entries = [{ id: 'a', visible: true, content: <button>First</button> }, { id: 'b', visible: true, content: <button>Second</button> }];
  const { rerender, unmount } = render(<NotificationStack entries={entries} onPauseChange={pause} />);
  expect(document.querySelector('[data-id="a"]')).toHaveStyle({ transform: 'translateY(-62px)' });
  fireEvent.mouseEnter(screen.getByText('First').closest('[class*="stack"]')!);
  fireEvent.focus(screen.getByText('First'));
  fireEvent.mouseLeave(screen.getByText('First').closest('[class*="stack"]')!);
  expect(pause).toHaveBeenLastCalledWith(true);
  rerender(<NotificationStack entries={[entries[0], { ...entries[1], visible: false }]} onPauseChange={pause} />);
  expect(document.querySelector('[data-id="a"]')).toHaveStyle({ transform: 'translateY(-0px)' });
  expect(screen.getByText('Second').parentElement).toHaveAttribute('inert');
  measure();
  unmount();
  expect(disconnect).toHaveBeenCalled();
  vi.unstubAllGlobals();
});
