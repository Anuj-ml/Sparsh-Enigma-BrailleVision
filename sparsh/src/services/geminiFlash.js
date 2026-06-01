export async function getFrameGuidance(base64Frame) {
  if (!base64Frame) return '';

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: 'image/jpeg', data: base64Frame } },
                {
                  text: 'Give one short camera positioning instruction (max 8 words) to help scan Braille better.',
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 30 },
        }),
      }
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (error) {
    return '';
  }
}
