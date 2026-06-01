let activeAudio = null;

function speakWithWebSpeech(text) {
  if (!window.speechSynthesis || !text) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

export async function speakWithGroq(text) {
  if (!text) return;

  const requestPromise = fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'playai-tts',
      input: text,
      voice: 'Celeste-PlayAI',
      response_format: 'wav',
    }),
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Groq TTS timeout')), 2000);
  });

  try {
    const res = await Promise.race([requestPromise, timeoutPromise]);
    if (!res.ok) throw new Error('Groq TTS request failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    activeAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (activeAudio === audio) activeAudio = null;
    };
    await audio.play();
  } catch (error) {
    speakWithWebSpeech(text);
  }
}

export function cancelSpeech() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
