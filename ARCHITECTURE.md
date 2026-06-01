# Architecture — Sparsh

## System Overview

Sparsh has three parallel processing tracks that run simultaneously once the app is open:

```
┌─────────────────────────────────────────────────────────────┐
│                        CAMERA FEED                          │
│              (rear camera, 1280×720, 30fps)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┼──────────────┐
           │             │              │
           ▼             ▼              ▼
    [CV Track]    [Gemini Live     [Frame Store]
    300ms tick     Track]          (base64 JPEG)
                   1000ms tick
           │             │
           ▼             ▼
   BrailleProcessor   AIGuidance.jsx
   .processFrame()    geminiLive.js /
           │           geminiFlash.js
           ▼                │
   {chars[], blobs[],       ▼
    guidance, confidence,  Guidance pill
    rawString}             (top-center)
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
 Canvas        App state
 overlay       update
 (blob dots)      │
           ┌──────┴──────────┐
           │                 │
           ▼                 ▼
      GuidanceOverlay    rawText
      (CV pill)          changes?
                              │
                        debounce 800ms
                              │
                              ▼
                      groqCorrection.js
                      correctBraille()
                              │
                              ▼
                       correctedText
                       setCorrectedText
                         ┌───┴────┐
                         │        │
                         ▼        ▼
                    TextOutput  groqTTS.js
                    (render)    speakWithGroq()
                                     │
                               fallback?
                               Web Speech API
```

## Data Flow (step by step)

```
Camera (rear)
→ <video> element (live stream, muted, autoPlay, playsInline)
→ <canvas> overlay (frame captured every 300ms via setInterval)
→ imageData (RGBA pixel array via ctx.getImageData)
→ BrailleProcessor.processFrame(imageData)
    → grayscale
    → CLAHE (clipLimit=2.0, tileGridSize=8×8)
    → adaptive threshold (blockSize=11, C=2)
    → morphological close (3×3, 1 iter)
    → SimpleBlobDetector (area 20–400, circularity ≥0.6)
    → inferGrid() → 6-bit cells[]
    → BrailleDecoder.decodeSequence(cells)
→ { chars[], blobs[], guidance, confidence[], rawString }
→ App state update
    → Canvas overlay: draw green blob circles
    → GuidanceOverlay: render CV guidance pill
    → rawText state update → Groq debounce trigger
        → groqCorrection.correctBraille(rawText) [after 800ms idle]
        → correctedText state update
            → TextOutput: render raw (gray) + corrected (white) columns
            → groqTTS.speakWithGroq(correctedText)
            → SessionTranscript: append {timestamp, raw, corrected}

Parallel — Gemini Live track (when AI guidance is active):
→ AIGuidance.jsx captures frame every 1000ms as base64 JPEG (640×480, q=0.6)
→ geminiLive.sendFrame(base64) over WebSocket
    OR geminiFlash.getFrameGuidance(base64) via REST (fallback)
→ guidance string → AIGuidance pill (top-center, large)
→ speakWithGroq(guidance) [debounced — skip if same as last]
```

## Component Responsibilities

| Component | Owns | Does NOT own |
|---|---|---|
| `CameraView.jsx` | stream lifecycle, canvas capture loop, torch toggle, blob overlay draw | decode logic, API calls |
| `BrailleProcessor.js` | all OpenCV.js operations, CLAHE, threshold, blob detect, grid inference | React state, API calls |
| `BrailleDecoder.js` | Grade 1 lookup table, decode logic, confidence scoring | anything visual or stateful |
| `AIGuidance.jsx` | Gemini Live/Flash connection management, frame send loop, guidance pill render | CV pipeline, decode |
| `GuidanceOverlay.jsx` | CV-based guidance pill (brightness/blur/blob count) | Gemini guidance |
| `TextOutput.jsx` | raw+corrected text display, auto-scroll, tap-to-explain | how text is produced |
| `AICorrectionBadge.jsx` | diff display between raw and corrected | correction logic |
| `ConfidenceBar.jsx` | per-cell colored dot strip render | confidence calculation |
| `TTSController.jsx` | speech toggle UI, mute state | which text to speak |
| `SessionTranscript.jsx` | session log panel, copy-to-clipboard | session data production |
| `geminiLive.js` | WebSocket connection to Gemini Live, send/receive, reconnect | React state |
| `geminiFlash.js` | REST polling fallback for guidance frames | WebSocket logic |
| `groqCorrection.js` | Braille correction fetch, word explain fetch | debounce timing |
| `groqTTS.js` | Groq TTS fetch, audio playback, Web Speech fallback | what/when to speak |
| `App.jsx` | global state, wires all components, debounce effects | business logic |

## State Shape (App.jsx)

```js
// CV state
const [cvReady, setCvReady] = useState(false);
const [rawText, setRawText] = useState('');
const [correctedText, setCorrectedText] = useState('');
const [blobCount, setBlobCount] = useState(0);
const [confidence, setConfidence] = useState([]);  // number[] per cell

// Guidance state
const [cvGuidance, setCvGuidance] = useState('Point camera at Braille');
const [aiGuidance, setAIGuidance] = useState('');
const [aiGuidanceActive, setAIGuidanceActive] = useState(false);
const [aiGuidanceMode, setAIGuidanceMode] = useState('off'); // 'off' | 'live' | 'flash'

// TTS / output state
const [ttsEnabled, setTtsEnabled] = useState(true);
const [activeTab, setActiveTab] = useState('live'); // 'live' | 'transcript'

// Session
const [sessionLog, setSessionLog] = useState([]);
// shape: [{ timestamp: number, raw: string, corrected: string }]

// Camera
const [torchEnabled, setTorchEnabled] = useState(false);
const [streamReady, setStreamReady] = useState(false);
```

## Service Layer

### geminiLive.js
```
connect(apiKey, onMessage, onError) → void
sendFrame(base64JPEG) → void
disconnect() → void
isConnected() → boolean
```
Manages a single WebSocket instance. Reconnect logic: on unexpected close, wait 2s and retry once. If retry fails, call `onError()` so caller can switch to Flash fallback.

### geminiFlash.js
```
getFrameGuidance(base64Frame, apiKey) → Promise<string>
```
Pure REST. No state. Called by `AIGuidance.jsx` on a `setInterval(1500)` when Live is unavailable.

### groqCorrection.js
```
correctBraille(rawText, apiKey) → Promise<string>
explainWord(word, apiKey) → Promise<string>
```
Both return the original input on any error — never throw to caller.

### groqTTS.js
```
speakWithGroq(text, apiKey) → Promise<void>
cancelSpeech() → void
setFallbackOnly(bool) → void  // force Web Speech if Groq is slow
```
Tracks last spoken text internally. If called with identical text, no-ops.

## CV Parameter Tuning Guide

If decode accuracy is poor on physical Braille:

| Symptom | Adjustment |
|---|---|
| Dots too small to detect | Decrease `minArea` (try 10) |
| Background noise detected as dots | Increase `minCircularity` toward 0.8 |
| Dots merging together | Decrease morphological kernel to 2×2 |
| Shadow causing missed dots | Decrease CLAHE `clipLimit` (2.0 → 1.0) |
| Worn / flat Braille | Increase CLAHE `tileGridSize` (8×8 → 16×16) |
| Too many false cells | Increase `minArea` (try 30–50) |
| Grid misaligned | Check dotSpacing median; may need `* 0.5` instead of `* 0.6` in row cluster |

## Lighting Guidance Thresholds

```js
const DARK_THRESHOLD   = 60;   // mean grayscale < this → "Too dark"
const BRIGHT_THRESHOLD = 200;  // mean grayscale > this → "Too bright"
const BLUR_THRESHOLD   = 100;  // Laplacian variance < this → "Hold steady"
const MIN_BLOBS        = 3;    // fewer → "No Braille detected"
```

## Guidance Priority Stack

When multiple guidance sources fire simultaneously, render priority is:

```
1. AIGuidance pill (Gemini Live / Flash) — TOP, large, animated
2. GuidanceOverlay pill (CV-based) — below AI pill, smaller
3. ConfidenceBar — thin strip, passive, always visible when decoding
```

AI guidance takes voice priority too: if Gemini just spoke, suppress CV TTS for 2s.

## Fallback Chain

```
Gemini Live WebSocket
    │ fails / unavailable
    ▼
Gemini Flash REST (1500ms polling)
    │ API key missing or quota exceeded
    ▼
CV-only guidance (brightness / blur / blob count — always available, zero cost)

Groq TTS (playai-tts)
    │ fails or >2s latency
    ▼
Web Speech API (window.speechSynthesis — offline, always available)

Groq correction (llama-3.1-70b-versatile)
    │ fails
    ▼
Raw CV decode text (shown as-is, no correction badge)
```

## PWA Config

```json
// public/manifest.json
{
  "name": "Sparsh",
  "short_name": "Sparsh",
  "description": "Real-time Braille reader with AI guidance",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Service Worker Strategy (public/sw.js)

```
Cache on install (app shell):
  - /index.html
  - /assets/*.js  (Vite bundle)
  - /assets/*.css
  - /manifest.json
  - /icon-192.png
  - /icon-512.png

Do NOT cache:
  - https://docs.opencv.org/4.8.0/opencv.js  (8MB WASM — too large, let browser cache)
  - Any API calls (Gemini, Groq) — always network

Strategy: Cache-first for app shell, network-only for API calls.
```

## Deployment

| Environment | Camera | AI features | Notes |
|---|---|---|---|
| `localhost:5173` (Vite dev) | ✅ works | ✅ works | No HTTPS needed for localhost |
| Vercel (prod) | ✅ HTTPS auto | ✅ needs env vars set | Set `VITE_GEMINI_API_KEY` + `VITE_GROQ_API_KEY` in Vercel dashboard |
| Netlify (prod) | ✅ HTTPS auto | ✅ needs env vars set | Set in Netlify site settings → Environment |
| HTTP (non-localhost) | ❌ blocked by browser | ❌ | `getUserMedia` requires HTTPS on non-localhost |

Never commit `.env.local`. Set env vars in the hosting platform's dashboard for production.

## Time Budget

| Phase | Est. Time |
|---|---|
| Scaffold + Camera + Torch | 45 min |
| CV Pipeline + Blob draw | 60 min |
| Decode + Confidence | 20 min |
| Groq services (correction + TTS) | 25 min |
| Gemini Live guidance | 35 min |
| Output + Transcript | 20 min |
| Wiring + Polish | 20 min |
| PWA + Deploy + Device test | 15 min |
| **Total** | **4h 00min** |

60 min buffer recommended for: WASM load issues, iOS camera quirks, blob parameter tuning on real Braille, Gemini Live WebSocket debugging.

## Known Limitations

- **Perspective distortion**: cells at extreme angles will misclassify. User must hold phone roughly parallel to page.
- **Worn Braille**: flattened dots may have insufficient relief for camera detection. Torch toggle helps significantly.
- **Grid inference**: assumes standard Braille cell spacing. Non-standard or hand-written spacing needs manual `dotSpacing` override.
- **Gemini Live latency**: ~500–800ms round-trip. Guidance lags behind camera movement slightly.
- **iOS 16 and below**: Web Speech API voice selection limited; Groq TTS preferred.
- **Groq TTS streaming**: current implementation waits for full audio blob before playing. For long text, latency is noticeable. Mitigation: only speak delta (new chars), not full accumulated text.
- **OpenCV.js load time**: ~3–5s on first load over mobile network. Show loading spinner in App.jsx while `cvReady === false`.
