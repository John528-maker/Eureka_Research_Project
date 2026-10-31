import type { ReactNode } from 'react'

export default function Message({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <p className={`message message-${tone}`} role="status">
      {tone === 'warn' && <span aria-hidden="true">! </span>}
      {children}
    </p>
  )
}
