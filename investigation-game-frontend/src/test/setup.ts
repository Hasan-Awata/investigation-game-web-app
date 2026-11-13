import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom exposes dialog elements without the browser's modal lifecycle.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', ''); } },
  close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open'); } },
});

afterEach(() => {
  cleanup();
});
