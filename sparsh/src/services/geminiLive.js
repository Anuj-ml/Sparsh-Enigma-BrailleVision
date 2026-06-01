const WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

const SYSTEM_PROMPT = `You are a real-time camera assistant helping a user scan Braille text with their phone camera.
Analyze each frame and give ONE short, specific instruction (max 8 words).
Focus only on camera positioning and lighting.
Examples:
- "Move closer, dots are too small"
- "Tilt phone slightly to the left"
- "Good position, hold steady"
- "Too dark, move to better lighting"
- "Move up, Braille is cut off at bottom"
- "Braille detected and centered, scanning now"
Never describe the Braille content. Never give long explanations. One instruction per frame.`;

let socket = null;
let isConnected = false;
export let isLiveAvailable = true;

export function connect(apiKey, onMessage, onError) {
  if (!apiKey) {
    isLiveAvailable = false;
    onError?.(new Error('Missing Gemini API key'));
    return;
  }

  disconnect();
  isLiveAvailable = true;

  socket = new WebSocket(`${WS_URL}?key=${apiKey}`);

  socket.onopen = () => {
    isConnected = true;
    socket.send(
      JSON.stringify({
        setup: {
          model: 'models/gemini-2.0-flash-live-001',
          generation_config: {
            response_modalities: ['TEXT'],
            temperature: 0.2,
          },
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
        },
      })
    );
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const text = data?.serverContent?.modelTurn?.parts?.[0]?.text;
      if (text) {
        onMessage?.(text.trim());
      }
    } catch (error) {
      // Ignore parse errors for non-text frames.
    }
  };

  socket.onerror = () => {
    isConnected = false;
    isLiveAvailable = false;
    onError?.(new Error('Gemini Live socket error'));
  };

  socket.onclose = () => {
    isConnected = false;
    isLiveAvailable = false;
    onError?.(new Error('Gemini Live connection closed'));
  };
}

export function sendFrame(base64JPEG) {
  if (!socket || !isConnected || !base64JPEG) return;
  socket.send(
    JSON.stringify({
      client_content: {
        turns: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: 'image/jpeg', data: base64JPEG } },
              { text: 'Camera frame. Give one positioning instruction.' },
            ],
          },
        ],
        turn_complete: true,
      },
    })
  );
}

export function disconnect() {
  if (socket) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  isConnected = false;
}
