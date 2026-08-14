export default function Crest({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#F7F0DC" stroke="#332B22" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="12" fill="none" stroke="#332B22" strokeWidth="1.5" />
      <line x1="20" y1="4" x2="20" y2="36" stroke="#332B22" strokeWidth="1.5" />
      <line x1="4" y1="20" x2="36" y2="20" stroke="#332B22" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4" fill="#D3A22C" stroke="#332B22" strokeWidth="1.5" />
    </svg>
  );
}