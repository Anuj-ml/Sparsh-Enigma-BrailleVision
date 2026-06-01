export async function correctBraille(rawText) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              "You are a Braille OCR correction engine. The user provides noisy raw text decoded from physical Braille via computer vision. Correct spelling errors, fill in likely missing characters, and return the most probable intended English text. Return ONLY the corrected text, nothing else. Do not explain. Do not add punctuation that wasn't implied.",
          },
          { role: 'user', content: rawText },
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || rawText;
  } catch (error) {
    return rawText;
  }
}

export async function explainWord(word) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'Give a simple one-sentence definition of the word. Max 15 words.',
          },
          { role: 'user', content: word },
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || word;
  } catch (error) {
    return word;
  }
}
