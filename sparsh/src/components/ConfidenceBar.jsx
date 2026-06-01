export default function ConfidenceBar({ confidence = [] }) {
  return (
    <div className="flex w-full items-center gap-1 px-3 py-2">
      {confidence.map((score, index) => {
        let colorClass = 'bg-red-500';
        if (score > 0.8) colorClass = 'bg-green-500';
        else if (score >= 0.5) colorClass = 'bg-amber-400';

        return (
          <span
            key={`confidence-${index}`}
            className={`h-2 w-2 rounded-full ${colorClass}`}
            title={`Confidence: ${Math.round(score * 100)}%`}
          />
        );
      })}
    </div>
  );
}
