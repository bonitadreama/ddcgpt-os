const sessions = [
  { id: 's1', name: 'Product roadmap', updatedAt: '2 min ago' },
  { id: 's2', name: 'Image styling tests', updatedAt: '1 hr ago' },
  { id: 's3', name: 'Investor pitch draft', updatedAt: 'Yesterday' },
];

export function SessionHistory() {
  return (
    <ul className="space-y-2 text-sm">
      {sessions.map((session) => (
        <li key={session.id} className="rounded-lg border border-white/20 bg-black/25 px-3 py-2">
          <p className="font-medium">{session.name}</p>
          <p className="text-xs text-slate-300">{session.updatedAt}</p>
        </li>
      ))}
    </ul>
  );
}
