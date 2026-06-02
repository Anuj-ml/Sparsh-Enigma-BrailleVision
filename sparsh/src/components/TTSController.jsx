import { useEffect, useState } from 'react';
import { cancelSpeech, speakWithGroq } from '../services/groqTTS.js';
import { SpeakerIcon, MuteIcon } from './Icons.jsx';

export default function TTSController({
  text = '',
  className = '',
  enabled,
  onToggle,
}) {
  const [internalMuted, setInternalMuted] = useState(false);
  const isControlled = typeof enabled === 'boolean';
  const muted = isControlled ? !enabled : internalMuted;

  useEffect(() => {
    if (muted || !text) return;
    speakWithGroq(text);
  }, [text, muted]);

  const handleToggle = () => {
    const nextMuted = !muted;
    if (!isControlled) {
      setInternalMuted(nextMuted);
    }
    onToggle?.(!nextMuted);
    if (nextMuted) {
      cancelSpeech();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`rounded-full bg-black/60 p-2.5 text-zinc-300 backdrop-blur-md transition-all duration-200 active:scale-95 hover:bg-black/80 hover:text-white border border-white/10 ${className}`}
      title={muted ? 'Unmute Text-to-Speech' : 'Mute Text-to-Speech'}
      aria-label="Toggle TTS Audio"
    >
      {muted ? <MuteIcon className="h-5 w-5" /> : <SpeakerIcon className="h-5 w-5" />}
    </button>
  );
}
