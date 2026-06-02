import React from 'react';

/**
 * Standard props for all icons to support styling.
 */
export const iconPropTypes = {
  className: 'w-6 h-6 transition-all duration-200',
};

// 1. Sparsh Logo Icon (Haptic concentric circles + Braille 's' 3x2 pattern)
export function LogoIcon({ className = 'w-8 h-8', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={`${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      {...props}
    >
      {/* Concentric haptic pulse waves */}
      <circle cx="50" cy="50" r="44" opacity="0.15" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="37" opacity="0.3" strokeWidth="1.2" strokeDasharray="6 3" />
      <circle cx="50" cy="50" r="30" opacity="0.45" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="23" opacity="0.6" strokeWidth="1.5" strokeDasharray="10 3" />
      <circle cx="50" cy="50" r="16" opacity="0.8" strokeWidth="1.5" />

      {/* Perfect 3x2 Braille cell (s = 011100) */}
      {/* Column 1: x=38 | Column 2: x=62 */}
      {/* Row 1: y=32 | Row 2: y=50 | Row 3: y=68 */}
      
      {/* Dot 1: Column 1, Row 1 (empty - thin stroke) */}
      <circle cx="38" cy="32" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
      
      {/* Dot 2: Column 1, Row 2 (active - filled) */}
      <circle cx="38" cy="50" r="5.5" fill="currentColor" stroke="none" />
      
      {/* Dot 3: Column 1, Row 3 (active - filled) */}
      <circle cx="38" cy="68" r="5.5" fill="currentColor" stroke="none" />
      
      {/* Dot 4: Column 2, Row 1 (active - filled) */}
      <circle cx="62" cy="32" r="5.5" fill="currentColor" stroke="none" />
      
      {/* Dot 5: Column 2, Row 2 (empty - thin stroke) */}
      <circle cx="62" cy="50" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
      
      {/* Dot 6: Column 2, Row 3 (empty - thin stroke) */}
      <circle cx="62" cy="68" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
    </svg>
  );
}

// 2. Flashlight/Torch Icon
export function TorchIcon({ className = 'w-6 h-6', active = false, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Torch Body */}
      <path d="M18 6h-2l-1.2-2.4a1 1 0 0 0-.8-.6H10a1 1 0 0 0-.8.6L8 6H6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
      <path d="M9 12v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-7" />
      <line x1="12" y1="16" x2="12" y2="16.01" strokeWidth="3" />
      {active ? (
        <>
          {/* Glowing Light Beam lines */}
          <path d="M6 2L3 4" className="text-yellow-400 stroke-2 animate-pulse" />
          <path d="M12 1L12 3" className="text-yellow-400 stroke-2 animate-pulse" />
          <path d="M18 2L21 4" className="text-yellow-400 stroke-2 animate-pulse" />
          <polygon points="6,6 2,1 22,1 18,6" className="fill-yellow-400/20 stroke-none" />
        </>
      ) : null}
    </svg>
  );
}

// 3. Audio Speaker Icon (For TTS enabled)
export function SpeakerIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

// 4. Mute Speaker Icon (For TTS muted/off)
export function MuteIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

// 5. AI Guidance Eye Icon (Gemini multimodal vision helper)
export function AIEyeIcon({ className = 'w-6 h-6', active = false, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Eye shape */}
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      {/* Pupil */}
      <circle cx="12" cy="12" r="3" className={active ? 'fill-indigo-500/20' : ''} />
      {/* AI sparkle/network node connection stars around the eye if active */}
      {active ? (
        <>
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" className="text-indigo-400 stroke-1.5 animate-pulse" />
          <circle cx="12" cy="12" r="6" strokeDasharray="3 3" className="text-indigo-400/60 animate-spin" style={{ transformOrigin: 'center', animationDuration: '8s' }} />
        </>
      ) : null}
    </svg>
  );
}

// 6. Session Transcript/History Icon
export function TranscriptIcon({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

// 7. Chevron Icon for sliding drawers
export function ChevronIcon({ className = 'w-6 h-6', direction = 'up', ...props }) {
  const rotation = {
    up: 'rotate-0',
    down: 'rotate-180',
    left: '-rotate-90',
    right: 'rotate-90',
  }[direction];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${className} ${rotation}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}
