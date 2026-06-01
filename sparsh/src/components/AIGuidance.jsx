import { useEffect, useRef, useState } from 'react';
import { getFrameGuidance } from '../services/geminiFlash.js';
import { connect, disconnect, sendFrame } from '../services/geminiLive.js';
import { speakWithGroq } from '../services/groqTTS.js';

function captureFrameAsBase64(canvas, maxWidth = 640) {
  if (!canvas || !canvas.width || !canvas.height) return '';
  const scale = Math.min(1, maxWidth / canvas.width);
  const w = Math.floor(canvas.width * scale);
  const h = Math.floor(canvas.height * scale);
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(canvas, 0, 0, w, h);
  return offscreen.toDataURL('image/jpeg', 0.6).split(',')[1];
}

export default function AIGuidance({ getCaptureCanvas }) {
  const [active, setActive] = useState(false);
  const [guidance, setGuidance] = useState('Tap to start AI guidance');
  const [mode, setMode] = useState('off');
  const frameTimerRef = useRef(null);
  const lastSpokenRef = useRef('');

  const speakGuidance = (text) => {
    if (!text || text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    speakWithGroq(text);
  };

  const stopLoops = () => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    disconnect();
  };

  const processFlashFrame = async () => {
    const canvas = getCaptureCanvas?.();
    const frame = captureFrameAsBase64(canvas);
    if (!frame) return;
    const text = await getFrameGuidance(frame);
    if (text) {
      setGuidance(text);
      speakGuidance(text);
    }
  };

  const startFlashMode = () => {
    setMode('flash');
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    frameTimerRef.current = setInterval(() => {
      processFlashFrame();
    }, 1000);
  };

  const startLiveMode = () => {
    setMode('live');
    connect(
      import.meta.env.VITE_GEMINI_API_KEY,
      (text) => {
        setGuidance(text);
        speakGuidance(text);
      },
      () => {
        startFlashMode();
      }
    );

    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    frameTimerRef.current = setInterval(() => {
      const canvas = getCaptureCanvas?.();
      const frame = captureFrameAsBase64(canvas);
      if (frame) {
        sendFrame(frame);
      }
    }, 1000);
  };

  const toggleGuidance = () => {
    const nextActive = !active;
    setActive(nextActive);
    if (!nextActive) {
      setMode('off');
      stopLoops();
      return;
    }
    setGuidance('Starting AI guidance...');
    startLiveMode();
  };

  useEffect(() => {
    return () => {
      stopLoops();
    };
  }, []);

  return (
    <>
      <div className="absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-center text-sm text-white backdrop-blur">
        <span className="mr-2 text-xs text-emerald-400">{mode === 'live' ? '● LIVE' : mode === 'flash' ? '● AI' : '● OFF'}</span>
        {guidance}
      </div>

      <button
        type="button"
        onClick={toggleGuidance}
        className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur transition hover:bg-white/25"
      >
        {active ? 'Stop AI Guidance' : 'Start AI Guidance'}
      </button>
    </>
  );
}
