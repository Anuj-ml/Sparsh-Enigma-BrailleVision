import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BrailleProcessor } from './BrailleProcessor.js';
import { TorchIcon } from './Icons.jsx';

const CameraView = forwardRef(function CameraView(props, ref) {
  const { className = '', onFrameProcessed, onTorchChange, onStreamReadyChange } = props;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const processorRef = useRef(new BrailleProcessor());
  const processingTimerRef = useRef(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState('');

  useImperativeHandle(
    ref,
    () => ({
      getCanvas: () => canvasRef.current,
      getVideo: () => videoRef.current,
      getStream: () => streamRef.current,
      setTorch: async (enabled) => {
        await applyTorch(enabled);
      },
    }),
    []
  );

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        await processorRef.current.init();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const track = stream.getVideoTracks()[0];
        streamRef.current = stream;
        trackRef.current = track;
        setTorchSupported(hasTorch(track));

        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.addEventListener('loadedmetadata', syncCanvasSize);
          startProcessingLoop();
        }
        onStreamReadyChange?.(true);
      } catch (cameraError) {
        setError('Camera access failed');
        onStreamReadyChange?.(false);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.removeEventListener('loadedmetadata', syncCanvasSize);
        videoEl.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
      }
      streamRef.current = null;
      trackRef.current = null;
      onStreamReadyChange?.(false);
    };
  }, []);

  const syncCanvasSize = () => {
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) {
      return;
    }
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
  };

  const hasTorch = (track) => {
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    return Boolean(capabilities.torch);
  };

  const applyTorch = async (enabled) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    try {
      await track.applyConstraints({ advanced: [{ torch: enabled }] });
      setTorchEnabled(enabled);
      onTorchChange?.(enabled);
    } catch (torchError) {
      setError('Torch toggle failed');
    }
  };

  const onTorchClick = async () => {
    await applyTorch(!torchEnabled);
  };

  const drawBlobs = (blobs) => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    blobs.forEach((blob) => {
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
      ctx.stroke();
    });
  };

  const processCurrentFrame = () => {
    const videoEl = videoRef.current;
    const captureCanvas = captureCanvasRef.current;
    if (!videoEl || !captureCanvas || videoEl.readyState < 2) return;

    // Ensure canvas is sized correctly
    if (captureCanvas.width <= 0 || captureCanvas.height <= 0 || videoEl.videoWidth <= 0 || videoEl.videoHeight <= 0) {
      console.warn('Invalid canvas or video dimensions', {
        canvasWidth: captureCanvas.width,
        canvasHeight: captureCanvas.height,
        videoWidth: videoEl.videoWidth,
        videoHeight: videoEl.videoHeight,
      });
      return;
    }

    if (captureCanvas.width !== videoEl.videoWidth || captureCanvas.height !== videoEl.videoHeight) {
      captureCanvas.width = videoEl.videoWidth;
      captureCanvas.height = videoEl.videoHeight;
    }

    const captureCtx = captureCanvas.getContext('2d', { willReadFrequently: true });
    if (!captureCtx) return;
    captureCtx.drawImage(videoEl, 0, 0, captureCanvas.width, captureCanvas.height);
    const frame = captureCtx.getImageData(0, 0, captureCanvas.width, captureCanvas.height);
    const result = processorRef.current.processFrame(frame);
    drawBlobs(result.blobs);
    if (onFrameProcessed) {
      onFrameProcessed(result);
    }
  };

  const startProcessingLoop = () => {
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
    }
    processingTimerRef.current = setInterval(processCurrentFrame, 300);
  };

  return (
    <div className={`relative h-full w-full overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <canvas ref={captureCanvasRef} className="hidden" />
      <button
        type="button"
        onClick={onTorchClick}
        disabled={!torchSupported}
        className="absolute right-4 top-4 rounded-full bg-black/60 p-2.5 text-zinc-300 backdrop-blur-md transition-all duration-200 active:scale-95 disabled:opacity-40 hover:bg-black/80 hover:text-yellow-400 border border-white/10"
        title={torchEnabled ? 'Turn Torch Off' : 'Turn Torch On'}
        aria-label="Toggle Torch"
      >
        <TorchIcon active={torchEnabled} className="h-5 w-5" />
      </button>
      {error ? (
        <div className="absolute bottom-4 left-4 right-4 rounded bg-red-600/80 px-3 py-2 text-sm text-white">
          {error}
        </div>
      ) : null}
    </div>
  );
});

export default CameraView;
