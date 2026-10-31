import type { ReactNode } from 'react'

export default function SmallNote({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p className="small" id={id}>
      {children}
    </p>
  )
}
