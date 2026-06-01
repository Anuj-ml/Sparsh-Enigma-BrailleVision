import { useRef, useState } from 'react';
import AIGuidance from './components/AIGuidance.jsx';
import CameraView from './components/CameraView.jsx';
import ConfidenceBar from './components/ConfidenceBar.jsx';
import { LogoIcon } from './components/Icons.jsx';

export default function App() {
  const cameraRef = useRef(null);
  const [confidence, setConfidence] = useState([]);
  const [guidance, setGuidance] = useState('Point camera at Braille');
  const [blobCount, setBlobCount] = useState(0);

  const handleFrameProcessed = (result) => {
    setConfidence(result.confidence || []);
    setGuidance(result.guidance || 'Point camera at Braille');
    setBlobCount(result.blobs?.length || 0);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased">
      <div className="relative h-[78vh] w-full">
        {/* Sleek Top Bar Overlay */}
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-zinc-950/80 px-4.5 py-2 backdrop-blur-md border border-white/10">
          <LogoIcon className="h-6 w-6 text-purple-400" />
          <span className="text-xs font-bold tracking-widest uppercase text-zinc-100">Sparsh</span>
          <span
            className={`h-2 w-2 rounded-full ml-1 transition-all duration-300 ${
              blobCount > 0 ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-zinc-600'
            }`}
            title={blobCount > 0 ? 'Braille Detected' : 'No Braille Detected'}
          />
        </div>
        <CameraView ref={cameraRef} onFrameProcessed={handleFrameProcessed} />
        <div className="absolute bottom-4 right-4 z-20">
          <AIGuidance getCaptureCanvas={() => cameraRef.current?.getCanvas()} />
        </div>
      </div>
      <div className="border-t border-white/10 bg-zinc-950/90">
        <div className="px-3 pt-3 text-sm text-zinc-300">CV Guidance: {guidance}</div>
        <div className="px-3 py-1 text-xs text-zinc-500">Blobs: {blobCount}</div>
        <ConfidenceBar confidence={confidence} />
      </div>
    </div>
  );
}
