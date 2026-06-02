import { useEffect, useRef, useState } from 'react';
import AIGuidance from './components/AIGuidance.jsx';
import CameraView from './components/CameraView.jsx';
import ConfidenceBar from './components/ConfidenceBar.jsx';
import GuidanceOverlay from './components/GuidanceOverlay.jsx';
import SessionTranscript from './components/SessionTranscript.jsx';
import TextOutput from './components/TextOutput.jsx';
import TTSController from './components/TTSController.jsx';
import { LogoIcon, TorchIcon } from './components/Icons.jsx';
import { correctBraille } from './services/groqCorrection.js';

export default function App() {
  const cameraRef = useRef(null);
  const prevRawRef = useRef('');

  const [cvReady, setCvReady] = useState(false);
  const [rawText, setRawText] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [blobCount, setBlobCount] = useState(0);
  const [confidence, setConfidence] = useState([]);

  const [cvGuidance, setCvGuidance] = useState('Point camera at Braille');
  const [aiGuidance, setAIGuidance] = useState('');
  const [aiGuidanceActive, setAIGuidanceActive] = useState(false);
  const [aiGuidanceMode, setAIGuidanceMode] = useState('off');

  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('live');

  const [sessionLog, setSessionLog] = useState(() => {
    const cached = sessionStorage.getItem('sparsh-session-log');
    if (!cached) return [];
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  });

  const [torchEnabled, setTorchEnabled] = useState(false);
  const [streamReady, setStreamReady] = useState(false);

  const handleFrameProcessed = (result) => {
    setCvReady(true);
    setConfidence(result.confidence || []);
    setCvGuidance(result.guidance || 'Point camera at Braille');
    setBlobCount(result.blobs?.length || 0);
    setRawText(result.rawString || '');
  };

  useEffect(() => {
    if (!rawText || rawText.length < 3) return;
    const timer = setTimeout(async () => {
      const corrected = await correctBraille(rawText);
      setCorrectedText(corrected || rawText);
    }, 800);
    return () => clearTimeout(timer);
  }, [rawText]);

  useEffect(() => {
    const previous = prevRawRef.current;
    if (rawText.length > previous.length && navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
    prevRawRef.current = rawText;
  }, [rawText]);

  useEffect(() => {
    if (!rawText && !correctedText) return;
    const nextEntry = {
      timestamp: Date.now(),
      raw: rawText,
      corrected: correctedText || rawText,
    };
    setSessionLog((prev) => {
      const next = [...prev, nextEntry].slice(-200);
      sessionStorage.setItem('sparsh-session-log', JSON.stringify(next));
      return next;
    });
  }, [correctedText]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen overflow-hidden bg-black text-white">
      <div className="relative h-full w-full">
        <CameraView
          ref={cameraRef}
          onFrameProcessed={handleFrameProcessed}
          onTorchChange={setTorchEnabled}
          onStreamReadyChange={setStreamReady}
        />

        <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/80 px-3 py-2 backdrop-blur-md">
          <LogoIcon className="h-5 w-5 text-purple-400" />
          <span className="text-xs font-semibold tracking-wider">Sparsh</span>
          <span
            className={`h-2 w-2 rounded-full ${
              streamReady && cvReady ? 'bg-emerald-500' : 'bg-zinc-600'
            }`}
          />
          <TorchIcon active={torchEnabled} className="h-4 w-4 text-amber-300" />
        </div>

        <AIGuidance
          getCaptureCanvas={() => cameraRef.current?.getCanvas()}
          active={aiGuidanceActive}
          onActiveChange={setAIGuidanceActive}
          onGuidanceChange={setAIGuidance}
          onModeChange={setAIGuidanceMode}
          showToggle={false}
        />

        <GuidanceOverlay guidance={cvGuidance} blobCount={blobCount} />

        <div className="absolute bottom-0 left-0 right-0 z-20 rounded-t-2xl border-t border-white/10 bg-zinc-950/90">
          <ConfidenceBar confidence={confidence} />
          <div className="px-3 pb-3">
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className={`rounded px-3 py-1 text-xs ${
                  activeTab === 'live' ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400'
                }`}
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('transcript')}
                className={`rounded px-3 py-1 text-xs ${
                  activeTab === 'transcript'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-zinc-400'
                }`}
              >
                Transcript
              </button>
            </div>
            {activeTab === 'live' ? (
              <TextOutput rawText={rawText} correctedText={correctedText || rawText} />
            ) : (
              <SessionTranscript entries={sessionLog} />
            )}
          </div>
        </div>

        <div className="absolute bottom-24 right-4 z-40 flex flex-col gap-3">
          <TTSController
            text={aiGuidance || correctedText || rawText}
            enabled={ttsEnabled}
            onToggle={setTtsEnabled}
          />
          <button
            type="button"
            onClick={() => setAIGuidanceActive((prev) => !prev)}
            className="rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs text-white backdrop-blur-md"
          >
            {aiGuidanceActive ? 'Stop AI' : 'Start AI'}
          </button>
          <div className="text-center text-[10px] text-zinc-300">
            {aiGuidanceMode === 'live' ? '● LIVE' : aiGuidanceMode === 'flash' ? '● AI' : '● OFF'}
          </div>
        </div>
      </div>
    </div>
  );
}
