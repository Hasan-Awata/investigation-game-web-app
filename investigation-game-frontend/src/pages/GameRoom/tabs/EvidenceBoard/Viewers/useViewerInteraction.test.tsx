import { Profiler } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ViewersContainer from './ViewersContainer';
import { EvidenceContext } from '../EvidenceContext';
let callbacks: Map<number, FrameRequestCallback>;
let resize: ResizeObserverCallback;
let sequence = 0;
let viewportWidth = 400;
let reads = 0;
const flush = () => act(() => { const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(0)); });
beforeEach(() => {
  callbacks = new Map(); viewportWidth = 400; reads = 0; vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callbacks.set(++sequence, callback); return sequence; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  vi.stubGlobal('ResizeObserver', class { constructor(callback: ResizeObserverCallback) { resize = callback; } observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => { reads++; return 800; });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => { reads++; return 1200; });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => { reads++; return viewportWidth; });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => { reads++; return 600; });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function setup() {
  const commit = vi.fn();
  const result = render(<Profiler id="viewer" onRender={commit}><EvidenceContext.Provider value={{ isFullscreen: true }}><ViewersContainer><article>sheet<audio controls /></article></ViewersContainer></EvidenceContext.Provider></Profiler>);
  const content = result.container.querySelector('article')!.parentElement!;
  const viewport = content.parentElement!.parentElement!;
  return { ...result, content, viewport, commit };
}
describe('frame scheduled viewer', () => {
  it.each(['ltr', 'rtl'])('resets native scroll before fullscreen fitting in %s', direction => {
    const view = (fullscreen: boolean) => (
      <div dir={direction}>
        <EvidenceContext.Provider value={{ isFullscreen: fullscreen }}>
          <ViewersContainer><article>Long evidence</article></ViewersContainer>
        </EvidenceContext.Provider>
      </div>
    );
    const { container, rerender } = render(view(false));
    const content = container.querySelector('article')!.parentElement!;
    const viewport = content.parentElement!.parentElement!;
    viewport.scrollTop = 500;
    viewport.scrollLeft = direction === 'rtl' ? -40 : 40;
    act(() => resize([], {} as ResizeObserver));
    rerender(view(true));
    expect(viewport.scrollTop).toBe(0);
    expect(viewport.scrollLeft).toBe(0);
    expect(content.style.transform).toBe('translate(0px, 0px) scale(0.5)');
    flush();
    expect(viewport.scrollTop).toBe(0);
    fireEvent.wheel(viewport, { deltaY: -200 }); flush();
    rerender(view(false));
    viewport.scrollTop = 350;
    rerender(view(true));
    expect(viewport.scrollTop).toBe(0);
    expect(content.style.transform).toBe('translate(0px, 0px) scale(0.5)');
  });
  it('coalesces wheel bursts, retains deltas, and avoids layout reads and React commits', () => {
    const { viewport, content, commit } = setup(); const initialReads = reads; const initialCommits = commit.mock.calls.length;
    for (let i = 0; i < 10; i++) fireEvent.wheel(viewport, { deltaY: -10 });
    expect(callbacks.size).toBe(1); expect(content.style.transform).toContain('scale(0.5)');
    flush(); expect(Number(content.style.transform.match(/scale\(([^)]+)/)?.[1])).toBeCloseTo(0.75);
    expect(reads).toBe(initialReads); expect(commit).toHaveBeenCalledTimes(initialCommits);
    act(() => vi.advanceTimersByTime(150)); expect(content.style.willChange).toBe('');
  });
  it.each(['pointerup', 'pointercancel', 'lostpointercapture', 'blur'])('ends a captured drag on %s without movement renders', end => {
    const { viewport, content, commit } = setup();
    const capture = vi.fn(); const release = vi.fn();
    Object.assign(viewport, { setPointerCapture: capture, hasPointerCapture: () => true, releasePointerCapture: release });
    fireEvent.wheel(viewport, { deltaY: -200 }); flush();
    const initialReads = reads; const initialCommits = commit.mock.calls.length;
    const pointer = (type: string, x: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: x });
      viewport.dispatchEvent(event);
    };
    pointer('pointerdown', 0); expect(capture).toHaveBeenCalledWith(1);
    for (let i = 1; i <= 10; i++) pointer('pointermove', i);
    expect(callbacks.size).toBe(1); flush();
    expect(content.style.transform).toContain('translate(10px, 10px)');
    expect(reads).toBe(initialReads); expect(commit).toHaveBeenCalledTimes(initialCommits);
    if (end === 'blur') window.dispatchEvent(new Event('blur')); else pointer(end, 10);
    flush(); expect(viewport.style.cursor).toBe('grab'); expect(release).toHaveBeenCalledWith(1);
  });
  it('leaves audio controls alone and consumes evidence zoom', () => {
    const { viewport, container } = setup();
    const audioWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -10 });
    container.querySelector('audio')!.dispatchEvent(audioWheel); expect(audioWheel.defaultPrevented).toBe(false);
    const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -10 });
    viewport.dispatchEvent(wheel); expect(wheel.defaultPrevented).toBe(true);
  });
  it('coalesces geometry updates and cancels pending work on unmount', () => {
    const { unmount, viewport, content } = setup();
    viewportWidth = 200; act(() => { resize([], {} as ResizeObserver); resize([], {} as ResizeObserver); });
    expect(callbacks.size).toBe(1); flush(); expect(content.style.transform).toContain('scale(0.25)');
    fireEvent.wheel(viewport, { deltaY: -20 }); unmount(); expect(callbacks.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
});
