export function BrandMark({ size = 24 }: { size?: number }) {
  return <svg className="brand-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6H9a5 5 0 0 0 0 10h10M5 11h11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" /><circle cx="19" cy="11" r="1.5" fill="currentColor" /></svg>
}
