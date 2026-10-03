import type { TerminalDocument, TerminalBlock } from '@/types/evidence/terminal';
import { nextTerminalBlockId } from '@/types/evidence/terminal';

type TerminalTemplateName = 'decryption_session' | 'device_extraction';

function b(type: TerminalBlock['type'], props: TerminalBlock['props'], span = 12): TerminalBlock {
  return { id: nextTerminalBlockId(type.slice(0, 3)), type, props, span, style: {} } as TerminalBlock;
}

export const decryptionSession = (): TerminalDocument => ({
  v: 1,
  theme: 'terminal',
  blocks: [
    b('status_banner', { text: 'DECRYPTION SESSION', tone: 'warn', caption: 'Target: suspect_device_encrypted.vol' }),
    b('prompt_line', { prompt: 'analyst@decrypt:~$', command: 'run-bruteforce /evidence/suspect_device_encrypted.vol', output: ['Initializing decryption sequence...', 'Testing password vectors...', 'STATUS: CRACKED'] }),
    b('status_banner', { text: 'PASSWORD RECOVERED', tone: 'ok', caption: 'Pin: 9472' }),
    b('prompt_line', { prompt: 'analyst@decrypt:~$', command: 'mount-volume /evidence/suspect_device_encrypted.vol --pin=9472', output: ['Volume mounted successfully at /mnt/device'] }),
  ],
});

export const deviceExtraction = (): TerminalDocument => ({
  v: 1,
  theme: 'terminal',
  blocks: [
    b('status_banner', { text: 'DATA EXTRACTION', tone: 'info', caption: 'Target: Mobile Device Storage' }),
    b('prompt_line', { prompt: 'analyst@forensics:~$', command: 'extract-media /mnt/device/DCIM', output: ['Scanning directory...', 'Found 3 hidden media files.', 'Extracting...'] }),
    b('file_tree', { entries: [
      { path: '/mnt/device/DCIM/IMG_0942.jpg', size: '2.4 MB', kind: 'file', state: 'intact' },
      { path: '/mnt/device/DCIM/IMG_0943.jpg', size: '1.8 MB', kind: 'file', state: 'recovered' },
      { path: '/mnt/device/DCIM/VID_0110.mp4', size: '14.2 MB', kind: 'file', state: 'intact' },
    ]}),
    b('status_banner', { text: 'EXTRACTION COMPLETE', tone: 'ok' })
  ],
});

export const templates: Record<TerminalTemplateName, () => TerminalDocument> = {
  decryption_session: decryptionSession,
  device_extraction: deviceExtraction,
};

export type { TerminalTemplateName };