export default function SessionTranscript({ entries = [] }) {
  const copyAll = async () => {
    const content = entries
      .map(
        (entry) =>
          `${new Date(entry.timestamp).toLocaleTimeString()} | raw: ${entry.raw} | corrected: ${entry.corrected}`
      )
      .join('\n');
    if (!content) return;
    await navigator.clipboard.writeText(content);
  };

  return (
    <div className="rounded-t-2xl border border-white/10 bg-zinc-950/95 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Session Transcript</p>
        <button
          type="button"
          onClick={copyAll}
          className="rounded bg-white/10 px-3 py-1 text-xs text-zinc-100"
        >
          Copy All
        </button>
      </div>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-xs text-zinc-400">No transcript yet.</p>
        ) : (
          entries.map((entry, idx) => (
            <div key={`${entry.timestamp}-${idx}`} className="rounded bg-white/5 p-2 text-xs">
              <p className="text-zinc-400">{new Date(entry.timestamp).toLocaleTimeString()}</p>
              <p className="text-zinc-300">Raw: {entry.raw}</p>
              <p className="text-white">Corrected: {entry.corrected}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
