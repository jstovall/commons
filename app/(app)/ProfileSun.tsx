import Link from "next/link";

export default function ProfileSun({ initials }: { initials: string }) {
  return (
    <Link
      href="/profile"
      aria-label="Your profile"
      className="relative flex h-11 w-11 items-center justify-center"
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 h-11 w-11" aria-hidden="true">
        <g stroke="#EFE6CE" strokeWidth="2" strokeLinecap="round" opacity="0.85">
          <line x1="39" y1="22" x2="43" y2="22" />
          <line x1="34" y1="34" x2="36.9" y2="36.9" />
          <line x1="22" y1="39" x2="22" y2="43" />
          <line x1="10" y1="34" x2="7.2" y2="36.9" />
          <line x1="5" y1="22" x2="1" y2="22" />
          <line x1="10" y1="10" x2="7.2" y2="7.2" />
          <line x1="22" y1="5" x2="22" y2="1" />
          <line x1="34" y1="10" x2="36.9" y2="7.2" />
        </g>
      </svg>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-1 bg-commons-ochre font-mono text-xs font-bold text-commons-ink shadow-[2px_2px_0_#332B22]">
        {initials}
      </div>
    </Link>
  );
}