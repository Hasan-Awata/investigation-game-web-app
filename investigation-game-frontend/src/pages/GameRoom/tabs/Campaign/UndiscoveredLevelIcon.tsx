export default function UndiscoveredLevelIcon({ label }: { label?: string }) {
  return (
    <svg role={label ? 'img' : undefined} aria-label={label} aria-hidden={!label}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 9.5a2.5 2.5 0 1 1 4.2 1.8c-.8.8-1.2 1.3-1.2 2.2" />
      <path d="M12 17h.01" />
    </svg>
  );
}
