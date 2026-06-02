import { useEffect, useMemo, useRef, useState } from 'react';
import { explainWord } from '../services/groqCorrection.js';

export default function TextOutput({ rawText = '', correctedText = '' }) {
  const scrollerRef = useRef(null);
  const [tooltip, setTooltip] = useState({ word: '', text: '', loading: false });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [rawText, correctedText]);

  const words = useMemo(
    () => correctedText.split(/\s+/).filter(Boolean),
    [correctedText]
  );

  const onWordTap = async (word) => {
    setTooltip({ word, text: '', loading: true });
    const meaning = await explainWord(word);
    setTooltip({ word, text: meaning, loading: false });
  };

  return (
    <div ref={scrollerRef} className="max-h-56 overflow-y-auto rounded-xl bg-zinc-900/70 p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Raw CV</p>
          <p className="whitespace-pre-wrap break-words text-sm text-zinc-500">{rawText || '-'}</p>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-300">Corrected</p>
          <div className="flex flex-wrap gap-1">
            {words.length > 0 ? (
              words.map((word, idx) => (
                <button
                  key={`${word}-${idx}`}
                  type="button"
                  onClick={() => onWordTap(word)}
                  className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-white"
                >
                  {word}
                </button>
              ))
            ) : (
              <p className="text-sm text-zinc-200">{correctedText || '-'}</p>
            )}
          </div>
        </div>
      </div>
      {tooltip.word ? (
        <div className="mt-3 rounded-lg bg-black/60 p-2 text-xs text-zinc-200">
          <span className="font-semibold">{tooltip.word}: </span>
          {tooltip.loading ? 'Loading...' : tooltip.text}
        </div>
      ) : null}
    </div>
  );
}
