interface StatusMessageProps {
  feedback: { type: 'success' | 'error'; message: string } | null;
}

export default function StatusMessage({ feedback }: StatusMessageProps) {
  if (!feedback) return null;
  return (
    <div className={`status-message ${feedback.type}`} style={{ margin: '0.5rem 0', fontSize: '0.85rem' }}>
      {feedback.message}
    </div>
  );
}