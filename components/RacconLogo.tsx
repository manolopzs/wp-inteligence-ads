export function RacconMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  // ViewBox tightened to content bounds (y: 6-36, x: 6-34) for proper vertical centering
  return (
    <svg
      width={size}
      height={size}
      viewBox="4 5 32 33"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Ears */}
      <path d="M7 16 L9 7 L15 13" fill="#7c3aed" />
      <path d="M33 16 L31 7 L25 13" fill="#7c3aed" />

      {/* Head */}
      <circle cx="20" cy="22" r="13" fill="#7c3aed" />

      {/* Eye mask band */}
      <rect x="7" y="16" width="26" height="10" rx="5" fill="#1e1b4b" opacity="0.55" />

      {/* Left eye white */}
      <circle cx="14" cy="21" r="3.5" fill="white" />
      {/* Left pupil */}
      <circle cx="14" cy="21" r="1.5" fill="#1e1b4b" />
      {/* Left eye shine */}
      <circle cx="15" cy="20" r="0.7" fill="white" />

      {/* Right eye white */}
      <circle cx="26" cy="21" r="3.5" fill="white" />
      {/* Right pupil */}
      <circle cx="26" cy="21" r="1.5" fill="#1e1b4b" />
      {/* Right eye shine */}
      <circle cx="27" cy="20" r="0.7" fill="white" />

      {/* Nose */}
      <ellipse cx="20" cy="27" rx="2" ry="1.3" fill="#1e1b4b" opacity="0.5" />
    </svg>
  )
}

export function RacconWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <RacconMark size={32} />
      <span className="text-xl font-bold tracking-tight text-white">Raccon</span>
    </div>
  )
}
