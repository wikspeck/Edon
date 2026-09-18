import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
  active?: boolean
  shortcut?: string
}

export function IconButton({ label, children, active, shortcut, className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? 'is-active' : ''} ${className}`}
      aria-label={label}
      aria-pressed={active}
      data-tooltip={shortcut ? `${label}  ${shortcut}` : label}
      {...props}
    >
      {children}
    </button>
  )
}
