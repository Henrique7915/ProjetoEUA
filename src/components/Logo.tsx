export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="vg-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--brand-400))" />
          <stop offset="1" stopColor="rgb(var(--brand-700))" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#vg-logo)" />
      <path d="M14 35.5 50 18l-9.5 30-9-9.5-6 7v-9.5L44 22.5 27.5 33.5z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="48.5" cy="46.5" r="5" fill="rgb(var(--accent-400))" />
    </svg>
  )
}
