import { useId, useState, type ReactNode } from 'react'

export default function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <section className="collapsible">
      <h3>
        <button type="button" className="collapsible-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          <span className="chev" aria-hidden="true">
            {open ? '−' : '+'}
          </span>
          {title}
        </button>
      </h3>
      <div id={id} hidden={!open} className="collapsible-body">
        {children}
      </div>
    </section>
  )
}
