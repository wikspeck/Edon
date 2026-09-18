export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5.5h9.4L19 10v8.5H5z" fill="currentColor" />
      <path d="M8 9h8v2H8zm0 4h5v2H8z" fill="var(--surface-0)" />
    </svg>
  )
}
