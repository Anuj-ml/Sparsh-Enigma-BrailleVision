# AGENTS.md — Sparsh Agent Instructions

## Agent Role
You are a focused implementation agent building **Sparsh** exactly as specified in CLAUDE.md. No scope creep. Build phases in strict order. Stop and report after each phase.

## Build Order (strict — do not reorder)

### Phase 1 — Scaffold (20 min)
1. `npm create vite@latest sparsh -- --template react`
2. Install: `tailwindcss postcss autoprefixer`
3. Configure Tailwind
4. Add OpenCV.js in `index.html`: `<script async src="https://docs.opencv.org/4.8.0/opencv.js"></script>`
5. Create `.env.local` with placeholders:
   ```
   VITE_GEMINI_API_KEY=your_gemini_key_here
   VITE_GROQ_API_KEY=your_groq_key_here
   ```
6. Add `.env.local` to `.gitignore`
7. Create full file structure from CLAUDE.md exactly
8. Add PWA manifest (`public/manifest.json`) and stub service worker (`public/sw.js`)

### Phase 2 — Camera + Torch (25 min)
9. Build `CameraView.jsx`:
   - `useRef` for video + canvas
   - `getUserMedia` with `facingMode: environment`, 1280×720 ideal
   - `<video autoPlay muted playsInline>` — all three required for iOS
   - Canvas overlay absolutely positioned over video, sized to match on `loadedmetadata`
   - Torch toggle button: calls `track.applyConstraints({ advanced: [{ torch }] })`
   - Expose canvas ref to parent for frame capture

### Phase 3 — CV Pipeline (60 min)
10. Build `BrailleProcessor.js` (pure JS class, no React):
    - `init()` — polls `window.cv && window.cv.Mat` every 100ms, resolves promise when ready
    - `processFrame(imageData)` — full 10-step pipeline from CLAUDE.md
    - Returns `{ chars: string[], blobs: [{x,y,r}], guidance: string, confidence: number[], rawString: string }`
    - **Every `cv.Mat` MUST be deleted after use — no exceptions**
11. Wire into 300ms capture loop in `CameraView`
12. Draw blob circles on canvas overlay (green circles, radius from blob)
13. Build `ConfidenceBar.jsx` — receives `confidence[]` array, renders colored dot strip

### Phase 4 — Decode (20 min)
14. Build `BrailleDecoder.js`:
    - Full 64-entry Grade 1 lookup table as specified in CLAUDE.md
    - `decode(binaryString)` → char or '?'
    - `decodeSequence(cells[])` → `{ text: string, confidence: number[] }`
    - ES module export

### Phase 5 — Groq Services (25 min)
15. Build `groqCorrection.js`:
    - `correctBraille(rawText)` — exact implementation from CLAUDE.md
    - `explainWord(word)` — uses `llama-3.1-8b-instant`
    - Both functions handle fetch errors gracefully, return input on failure
16. Build `groqTTS.js`:
    - `speakWithGroq(text)` — exact implementation from CLAUDE.md
    - Falls back to `window.speechSynthesis` if fetch fails or takes >2s
    - `cancelSpeech()` — stops current audio + cancels speechSynthesis
17. Build `TTSController.jsx` — toggle button, calls groqTTS, shows mute state

### Phase 6 — Gemini Live Camera Guidance (35 min)
18. Build `geminiLive.js`:
    - `connect(apiKey, onMessage, onError)` — opens WebSocket to Gemini Live endpoint
    - Sends setup message with system prompt from CLAUDE.md on open
    - `sendFrame(base64JPEG)` — sends user turn with image
    - `disconnect()` — closes WebSocket cleanly
    - On error or close: sets `isLiveAvailable = false`, signals caller to use fallback
19. Build `geminiFlash.js`:
    - `getFrameGuidance(base64Frame)` — REST fallback from CLAUDE.md
    - Returns guidance string
20. Build `AIGuidance.jsx`:
    - "Start AI Guidance" toggle button
    - On start: attempt Gemini Live connect; on failure switch to Flash polling
    - Captures canvas frame as base64 JPEG (640×480 max, quality 0.6) every 1000ms
    - Displays guidance text in large floating pill, top-center
    - Speaks guidance via TTS (short debounce — don't re-speak same text)
    - Shows "● LIVE" or "● AI" indicator depending on which mode is active

### Phase 7 — Output + Transcript (20 min)
21. Build `TextOutput.jsx`:
    - Two columns: raw CV text (gray) + Groq corrected text (white)
    - Auto-scrolls to bottom
    - Tap any word → calls `explainWord()` → shows tooltip
22. Build `SessionTranscript.jsx`:
    - Slide-up panel (bottom sheet tab)
    - Shows `[{timestamp, raw, corrected}]` from `sessionStorage`
    - Copy-all button
23. Build `GuidanceOverlay.jsx`:
    - CV-based guidance pill (below AI pill)
    - Color logic: green / amber / gray per CLAUDE.md thresholds

### Phase 8 — Wiring + Polish (20 min)
24. Wire everything in `App.jsx`:
    - State shape exactly as in ARCHITECTURE.md
    - Correction debounce: call `correctBraille` 800ms after rawText stops changing
    - Haptic: `navigator.vibrate([50,30,50])` on new decoded chars
    - Pass all props down — no prop drilling more than 2 levels
25. Full-screen mobile layout:
    - Camera fills viewport
    - Top bar: "Sparsh" + status dot + torch icon
    - AI guidance pill centered top
    - CV guidance pill below it
    - Confidence bar above bottom sheet
    - Bottom sheet with Live/Transcript tabs
    - FAB group bottom-right: TTS toggle + AI guidance toggle

### Phase 9 — PWA + Deploy (15 min)
26. Complete `public/manifest.json` per CLAUDE.md
27. Complete `public/sw.js` — cache app shell; skip caching OpenCV.js (too large)
28. `npm run build`
29. Deploy: `npx vercel --prod` or `npx netlify deploy --prod --dir=dist`
30. Test on physical mobile device over HTTPS
31. Verify PWA install prompt

---

## Critical Rules

### Memory Management (cv.Mat)
```js
const gray = new cv.Mat();
cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
// use gray...
gray.delete(); // MANDATORY — WASM heap will OOM without this
```
Use try/finally to guarantee deletion:
```js
const mat = new cv.Mat();
try {
  // operations
} finally {
  mat.delete();
}
```

### OpenCV.js Readiness
```js
function waitForOpenCV() {
  return new Promise(resolve => {
    const check = () => {
      if (window.cv && window.cv.Mat) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
}
```

### iOS Safari Camera
```jsx
<video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
```

### Canvas Sizing
```js
video.addEventListener('loadedmetadata', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
});
```

### Frame to Base64 for Gemini
```js
function captureFrameAsBase64(video, maxWidth = 640) {
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const w = Math.floor(video.videoWidth * scale);
  const h = Math.floor(video.videoHeight * scale);
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  offscreen.getContext('2d').drawImage(video, 0, 0, w, h);
  return offscreen.toDataURL('image/jpeg', 0.6).split(',')[1];
}
```

### Gemini Live WebSocket — Connection Pattern
```js
const ws = new WebSocket(
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`
);
ws.onopen = () => ws.send(JSON.stringify({ setup: { ... } }));
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  const text = data?.serverContent?.modelTurn?.parts?.[0]?.text;
  if (text) onMessage(text);
};
ws.onerror = () => onError();
ws.onclose = () => onError();
```

### Grid Inference Algorithm (use verbatim)
```js
function inferGrid(blobs) {
  if (blobs.length < 6) return [];
  blobs.sort((a, b) => a.y - b.y);
  const yDists = [];
  for (let i = 1; i < blobs.length; i++) {
    const d = blobs[i].y - blobs[i-1].y;
    if (d > 2) yDists.push(d);
  }
  yDists.sort((a, b) => a - b);
  const dotSpacing = yDists[Math.floor(yDists.length / 2)] || 20;
  const rows = [];
  let currentRow = [blobs[0]];
  for (let i = 1; i < blobs.length; i++) {
    if (blobs[i].y - currentRow[0].y < dotSpacing * 0.6) {
      currentRow.push(blobs[i]);
    } else {
      rows.push(currentRow);
      currentRow = [blobs[i]];
    }
  }
  rows.push(currentRow);
  const cells = [];
  for (let r = 0; r + 2 < rows.length; r += 3) {
    const triplet = [...rows[r], ...rows[r+1], ...rows[r+2]];
    triplet.sort((a, b) => a.x - b.x);
    const xVals = triplet.map(b => b.x);
    const midX = (Math.min(...xVals) + Math.max(...xVals)) / 2;
    const left = triplet.filter(b => b.x < midX).sort((a, b) => a.y - b.y);
    const right = triplet.filter(b => b.x >= midX).sort((a, b) => a.y - b.y);
    const bits = [
      left[0] ? '1' : '0', left[1] ? '1' : '0', left[2] ? '1' : '0',
      right[0] ? '1' : '0', right[1] ? '1' : '0', right[2] ? '1' : '0',
    ];
    cells.push(bits.join(''));
  }
  return cells;
}
```

### Blob Detection Config
```js
const params = new cv.SimpleBlobDetector_Params();
params.filterByArea = true;
params.minArea = 20;
params.maxArea = 400;
params.filterByCircularity = true;
params.minCircularity = 0.6;
params.filterByConvexity = false;
params.filterByInertia = false;
const detector = cv.SimpleBlobDetector.create(params);
```

### Groq Correction Debounce
```js
useEffect(() => {
  if (!rawText || rawText.length < 3) return;
  const timer = setTimeout(async () => {
    const corrected = await correctBraille(rawText);
    setCorrectedText(corrected);
    speakWithGroq(corrected);
  }, 800);
  return () => clearTimeout(timer);
}, [rawText]);
```

## Non-Goals
- Grade 2 Braille
- User auth / persistence beyond sessionStorage
- Multi-language
- Desktop layout optimization
- Image upload

## Reference URLs
- Gemini Live API: https://ai.google.dev/api/multimodal-live
- Groq API: https://console.groq.com/docs/openai
- Groq TTS: https://console.groq.com/docs/text-speech
- OpenCV.js: https://docs.opencv.org/4.8.0/d5/d10/tutorial_js_root.html
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
