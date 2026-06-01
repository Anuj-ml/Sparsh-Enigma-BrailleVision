# Sparsh — Project Codex Instructions

## What This Is
A mobile-first progressive web app (PWA) named **Sparsh** (Hindi: touch). Uses the device camera to scan real physical embossed or handwritten Braille, detects dots, recognizes cell patterns, converts to English text (Grade 1), corrects via AI, and speaks aloud. Includes real-time AI camera guidance via Gemini Live API.

## Hard Constraints
- Mobile-first. Primary target: Chrome on Android, Safari on iOS.
- No backend for core CV — runs client-side in browser.
- No native app. Pure PWA — installable, offline-capable for core features.
- Must work on REAL physical Braille paper, not synthetic/digital Braille images.
- 4-hour build window. Ship working > perfect.

## Tech Stack (non-negotiable)
- **Frontend**: React + Vite
- **Camera access**: browser MediaDevices API (`getUserMedia`, rear camera)
- **Computer Vision**: OpenCV.js (WASM) from CDN
- **Braille decode**: custom JS lookup table (Grade 1, 64 chars)
- **AI camera guidance**: Gemini Live API (WebSocket streaming, multimodal)
  - Fallback: Gemini Flash REST (`gemini-1.5-flash`) with 1s frame snapshots if Live unavailable
- **AI correction layer**: Groq REST API (`llama-3.1-70b-versatile`)
- **TTS**: Groq PlayAI TTS (`playai-tts`) — primary. Web Speech API — fallback.
- **Styling**: Tailwind CSS
- **State**: React `useState`/`useRef`/`useEffect` only

## Environment Variables
```
VITE_GEMINI_API_KEY=your_gemini_key
VITE_GROQ_API_KEY=your_groq_key
```
Both injected via `.env.local`. Never hardcode keys. Never commit `.env.local`.

## Project Structure
```
/src
  /components
    CameraView.jsx          # camera stream, canvas overlay, capture loop, torch toggle
    BrailleProcessor.js     # all OpenCV.js CV logic (pure JS, no JSX)
    BrailleDecoder.js       # dot pattern → Grade 1 English lookup
    TextOutput.jsx          # scrolling decoded + corrected text, session transcript
    GuidanceOverlay.jsx     # CV-based guidance HUD (brightness, blur, blob count)
    AIGuidance.jsx          # Gemini Live camera coaching overlay
    AICorrectionBadge.jsx   # shows raw vs AI-corrected text diff
    TTSController.jsx       # Groq TTS primary, Web Speech API fallback
    ConfidenceBar.jsx       # per-cell confidence indicator
    SessionTranscript.jsx   # full session log, copyable
  /services
    geminiLive.js           # Gemini Live WebSocket client
    geminiFlash.js          # Gemini Flash REST fallback (1s snapshots)
    groqCorrection.js       # Groq correction + explain API calls
    groqTTS.js              # Groq PlayAI TTS
  App.jsx
  main.jsx
/public
  manifest.json
  sw.js
index.html
```

## CV Pipeline (implement in this order — do NOT skip steps)
1. Capture frame from video element onto offscreen canvas (every 300ms)
2. Convert to grayscale
3. Apply CLAHE — `cv.createCLAHE`, clipLimit=2.0, tileGridSize=8×8
4. Adaptive threshold — `cv.adaptiveThreshold`, ADAPTIVE_THRESH_GAUSSIAN_C, THRESH_BINARY_INV, blockSize=11, C=2
5. Morphological close (3×3 kernel, 1 iteration)
6. Blob detection — `cv.SimpleBlobDetector`, circularity 0.6–1.0, area 20–400px
7. Grid inference — cluster blobs into rows → triplets → 6-bit cells
8. Map each cell to binary string → decode via lookup table
9. Assemble raw character sequence
10. Send raw string to Groq for correction (debounced, 800ms after last change)
11. Output corrected string + speak via Groq TTS

## Gemini Live — AI Camera Guidance

### Primary: Gemini Live WebSocket
```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=VITE_GEMINI_API_KEY
```

**Flow:**
1. On "Start Guidance" button press, open WebSocket connection
2. Send setup message with system prompt (see below)
3. Every 1000ms, capture canvas frame as base64 JPEG (quality 0.6, resize to 640×480 max)
4. Send frame as inline image part in user turn
5. Receive model response text → display in AIGuidance overlay + speak via TTS
6. On "Stop Guidance" button press, close WebSocket

**Setup message:**
```js
{
  setup: {
    model: "models/gemini-2.0-flash-live-001",
    generation_config: {
      response_modalities: ["TEXT"],
      temperature: 0.2
    },
    system_instruction: {
      parts: [{
        text: `You are a real-time camera assistant helping a user scan Braille text with their phone camera.
Analyze each frame and give ONE short, specific instruction (max 8 words).
Focus only on camera positioning and lighting.
Examples:
- "Move closer, dots are too small"
- "Tilt phone slightly to the left"
- "Good position, hold steady"
- "Too dark, move to better lighting"
- "Move up, Braille is cut off at bottom"
- "Braille detected and centered, scanning now"
Never describe the Braille content. Never give long explanations. One instruction per frame.`
      }]
    }
  }
}
```

**User turn message (each frame):**
```js
{
  client_content: {
    turns: [{
      role: "user",
      parts: [
        { inline_data: { mime_type: "image/jpeg", data: base64FrameData } },
        { text: "Camera frame. Give one positioning instruction." }
      ]
    }],
    turn_complete: true
  }
}
```

**Receiving response:**
```js
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const text = data?.serverContent?.modelTurn?.parts?.[0]?.text;
  if (text) setAIGuidance(text);
};
```

### Fallback: Gemini Flash REST (if Live WebSocket fails)
```js
// geminiFlash.js
async function getFrameGuidance(base64Frame) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: base64Frame } },
            { text: "Give one short camera positioning instruction (max 8 words) to help scan Braille better." }
          ]
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 30 }
      })
    }
  );
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
```
Poll this every 1500ms when Live is unavailable.

## Groq — AI Correction Layer

### Braille decode correction
```js
// groqCorrection.js
async function correctBraille(rawText) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a Braille OCR correction engine. The user provides noisy raw text decoded from physical Braille via computer vision. Correct spelling errors, fill in likely missing characters, and return the most probable intended English text. Return ONLY the corrected text, nothing else. Do not explain. Do not add punctuation that wasn't implied.`
        },
        { role: 'user', content: rawText }
      ],
      max_tokens: 200,
      temperature: 0.1
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || rawText;
}
```
Debounce: call only when rawText hasn't changed for 800ms and is ≥ 3 chars.

### Word explain (tap-to-explain)
```js
async function explainWord(word) {
  // same fetch structure, different system prompt
  // system: "Give a simple one-sentence definition of the word. Max 15 words."
  // user: word
  // model: llama-3.1-8b-instant (faster, cheaper for simple lookup)
}
```

## Groq TTS
```js
// groqTTS.js
async function speakWithGroq(text) {
  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'playai-tts',
      input: text,
      voice: 'Celeste-PlayAI',
      response_format: 'wav'
    })
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play();
}
```
Fallback to `window.speechSynthesis` if Groq TTS fails or is slow (>2s).

## Additional Features

### Torch/Flashlight Toggle
```js
const track = stream.getVideoTracks()[0];
await track.applyConstraints({ advanced: [{ torch: enabled }] });
```
Show torch toggle button in camera UI. Improves dot shadow detection significantly.

### Per-cell Confidence
- After grid inference, for each 6-bit cell compute: `confidence = matchedDots / 6`
- Store alongside decoded char
- `ConfidenceBar.jsx` renders colored dots per cell: green (>0.8), amber (0.5–0.8), red (<0.5)
- Red cells = candidates for AI correction highlight

### Session Transcript
- Accumulate all corrected decoded text in session array `[{timestamp, raw, corrected}]`
- `SessionTranscript.jsx` — slide-up panel, shows full session, copy-to-clipboard button
- Persisted in `sessionStorage` (cleared on tab close, no backend needed)

### Haptic Feedback
```js
// On successful Braille detection (blob count > 0 for first time)
navigator.vibrate && navigator.vibrate(50);
// On successful decode
navigator.vibrate && navigator.vibrate([50, 30, 50]);
```

## Guidance System (CV-based, runs independently of Gemini)
Runs every frame, no API cost:
- Brightness: mean grayscale < 60 → "Too dark". > 200 → "Too bright".
- Blur: Laplacian variance < 100 → "Hold steady".
- Blob count > 0 → "Braille detected ✓" (green). 0 blobs → "No Braille — adjust angle".

AIGuidance overlay (Gemini) renders ABOVE this with more specific instructions.

## Braille Grade 1 Decode Table
Dot positions:
```
1 4
2 5
3 6
```
Binary: dot1+dot2+dot3+dot4+dot5+dot6

Full 26-letter map:
100000→a, 110000→b, 100100→c, 100110→d, 100010→e,
110100→f, 110110→g, 110010→h, 010100→i, 010110→j,
101000→k, 111000→l, 101100→m, 101110→n, 101010→o,
111100→p, 111110→q, 111010→r, 011100→s, 011110→t,
101001→u, 111001→v, 010111→w, 101101→x, 101111→y, 101011→z,
000000→(space)

Implement all 64 entries including numbers indicator (001111), capital indicator (000001), punctuation.

## UI Requirements (mobile-first)
- Full-screen camera view as background
- Top bar: "Sparsh" wordmark + CV status dot + torch toggle
- Floating AI guidance pill (Gemini): top-center, large, animated
- CV guidance pill: below AI guidance, smaller, gray/amber/green
- Confidence bar: thin strip above bottom sheet
- Bottom sheet: decoded text (raw + corrected side by side), scrollable
- Bottom sheet tabs: "Live" | "Transcript"
- TTS toggle + AI guidance toggle: bottom right FAB group
- No modals. Single screen.

## What NOT to build
- Grade 2 Braille
- User accounts
- Multi-language Braille
- Desktop layout
- Image upload mode

## Definition of Done
- [ ] Camera opens, rear-facing, on page load
- [ ] CV blob circles visible on overlay
- [ ] ≥10 Braille characters decoded correctly on physical page
- [ ] Gemini Live guidance appears and updates in real time
- [ ] Groq correction visibly improves raw CV output
- [ ] Groq TTS speaks corrected text
- [ ] Torch toggle works on Android
- [ ] Session transcript panel opens and shows history
- [ ] Haptic feedback on decode
- [ ] PWA installable, works offline (core CV only, AI features need network)
