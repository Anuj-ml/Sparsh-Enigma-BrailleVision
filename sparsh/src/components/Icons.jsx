import React from 'react';

/**
 * Standard props for all icons to support styling.
 */
export const iconPropTypes = {
  className: 'w-6 h-6 transition-all duration-200',
};

// 1. Sparsh Logo Icon (Viewfinder + Braille 's' pattern)
export function LogoIcon({ className = 'w-8 h-8', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={`${className}`}
      fill="none"
      stroke="currentColor"
      {...props}
    >
      {/* Outer viewfinder frame */}
      <rect x="18" y="18" width="64" height="64" rx="14" strokeWidth="2.5" stroke="currentColor" opacity="0.3" />
      <path d="M 28 18 L 18 18 L 18 28" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 72 18 L 82 18 L 82 28" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 28 82 L 18 82 L 18 72" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 72 82 L 82 82 L 82 72" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Braille dots representing 's' (011100) */}
      {/* Dot 1 (empty outline) */}
      <circle cx="38" cy="35" r="4" strokeWidth="1.5" stroke="currentColor" opacity="0.3" />
      {/* Dot 2 (filled) */}
      <circle cx="38" cy="50" r="5.5" fill="currentColor" stroke="none" />
      {/* Dot 3 (filled) */}
      <circle cx="38" cy="65" r="5.5" fill="currentColor" stroke="none" />
      {/* Dot 4 (filled) */}
      <circle cx="62" cy="35" r="5.5" fill="currentColor" stroke="none" />
      {/* Dot 5 (empty outline) */}
      <circle cx="62" cy="50" r="4" strokeWidth="1.5" stroke="currentColor" opacity="0.3" />
      {/* Dot 6 (empty outline) */}
      <circle cx="62" cy="65" r="4" strokeWidth="1.5" stroke="currentColor" opacity="0.3" />
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
