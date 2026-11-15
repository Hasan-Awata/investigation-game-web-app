import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ViewersContainer from './ViewersContainer';
import { EvidenceContext } from '../EvidenceContext';
let resize: () => void;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('evidence fitting', () => {
  it.each([[800, 343, 2400], [1000, 740, 1600], [800, 800, 1131]])('fits a %ipx sheet into %ipx while retaining its full height', (width, available, height) => {
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(width);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(height);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(available);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
    const { container, rerender } = render(<ViewersContainer><article>sheet</article></ViewersContainer>);
    const content = container.querySelector('article')!.parentElement!;
    const scale = Math.min(1, available / width);
    expect(content.style.transform).toBe(`scale(${scale})`);
    expect(content.parentElement!.style.height).toBe(`${height * scale}px`);
    act(() => resize());
    rerender(<EvidenceContext.Provider value={{ isFullscreen: true }}><ViewersContainer><article>sheet</article></ViewersContainer></EvidenceContext.Provider>);
    expect(container.querySelector('article')!.parentElement!.style.transform).toContain(`scale(${Math.min(1, available / width, 600 / height)})`);
  });
});
