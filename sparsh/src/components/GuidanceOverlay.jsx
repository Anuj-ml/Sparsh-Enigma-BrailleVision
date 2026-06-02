const DARK_THRESHOLD = 60;
const BRIGHT_THRESHOLD = 200;
const BLUR_THRESHOLD = 100;

export default function GuidanceOverlay({
  guidance = 'Point camera at Braille',
  brightness = 128,
  blurVariance = 120,
  blobCount = 0,
}) {
  let colorClass = 'bg-zinc-700/70 text-zinc-100';
  if (blobCount > 0 && brightness >= DARK_THRESHOLD && brightness <= BRIGHT_THRESHOLD && blurVariance >= BLUR_THRESHOLD) {
    colorClass = 'bg-emerald-600/80 text-white';
  } else if (brightness < DARK_THRESHOLD || brightness > BRIGHT_THRESHOLD || blurVariance < BLUR_THRESHOLD) {
    colorClass = 'bg-amber-500/80 text-black';
  }

  return (
    <div className={`absolute left-1/2 top-28 z-20 -translate-x-1/2 rounded-full px-4 py-2 text-sm ${colorClass}`}>
      {guidance}
    </div>
  );
}
