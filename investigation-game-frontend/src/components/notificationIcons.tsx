import type { ReactElement } from 'react';

const documentOutline = <path d="M13 3H5v18h14V9l-6-6v6h6" />;
const archive = <><path d="M3 4h18v4H3zM5 8v13h14V8M10 11h4" /></>;
const drawings = {
  evidenceRecovered: <>{documentOutline}<circle cx="12" cy="14" r="3" /><path d="m14 16 3 3" /></>,
  proceduralApproved: <>{documentOutline}<path d="M9 18h6M10 15h4v-3a2 2 0 0 0-4 0z" /></>,
  phaseUnlocked: <><path d="M4 4h5v5H4zM6.5 9v8H12M16 13v-3a3 3 0 0 1 6 0" /><rect x="12" y="13" width="9" height="8" rx="1" /><path d="M16.5 16v2" /></>,
  warrantExecuted: <>{documentOutline}<path d="m8 15 3 3 5-6M8 6h2" /></>,
  personOfInterest: <><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 18v-1a5 5 0 0 1 10 0v1" /><circle cx="12" cy="9" r="3" /></>,
  casualtyIdentified: <><path d="M8 20v-3a8 8 0 1 1 8 0v3zM12 17v3" /><circle cx="8.5" cy="11" r="1.5" /><circle cx="15.5" cy="11" r="1.5" /><path d="m11 15 1-2 1 2" /></>,
  created: <>{documentOutline}<path d="M12 12v6M9 15h6" /></>,
  updated: <>{documentOutline}<path d="m8 18 1-4 6-6 3 3-6 6-4 1zM13 10l3 3" /></>,
  deleted: <>{documentOutline}<path d="M8 12h8M10 12v6h4v-6M11 10h2" /></>,
  imported: <>{archive}<path d="M12 13v6m-3-3 3 3 3-3" /></>,
  exported: <>{archive}<path d="M12 19v-6m-3 3 3-3 3 3" /></>,
  uploaded: <><path d="M12 3H3v18h18v-9M3 17l5-5 5 6M16 7l3-3 3 3M19 4v10" /><circle cx="8" cy="7" r="1" /></>,
  validationError: <><path d="M10 3H3v18h7M6 7h3M6 11h2M17 9l6 12H11zM17 14v2M17 18v.1" /></>,
  error: <><path d="m12 3 10 18H2zM12 9v5M12 17v.1" /></>,
  success: <><circle cx="12" cy="12" r="9" /><path d="m7 12 3 3 7-7" /></>,
  information: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v.1" /></>,
  loading: <><path d="M6 3h12M6 21h12M7 3v4l10 10v4M17 3v4L7 17v4M9 18h6" /></>,
} satisfies Record<string, ReactElement>;

export type NotificationIconName = keyof typeof drawings;

export const notificationIcons = Object.fromEntries(
  Object.entries(drawings).map(([name, drawing]) => [name,
    <svg key={name} data-notification-icon={name} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{drawing}</svg>,
  ]),
) as Record<NotificationIconName, ReactElement>;

export const defaultNotificationIcons = {
  evidence: 'evidenceRecovered', level: 'phaseUnlocked', character: 'personOfInterest', system: 'information',
} as const satisfies Record<string, NotificationIconName>;

export type NotificationIconTone = 'intel' | 'success' | 'failure';

const gameplayIconTones: Partial<Record<NotificationIconName, NotificationIconTone>> = {
  proceduralApproved: 'success',
  warrantExecuted: 'success',
  success: 'success',
  casualtyIdentified: 'failure',
  validationError: 'failure',
  error: 'failure',
};

export function getGameplayIconTone(icon: NotificationIconName): NotificationIconTone {
  return gameplayIconTones[icon] ?? 'intel';
}
