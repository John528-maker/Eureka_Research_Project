import { useRef, type KeyboardEvent } from 'react'
import type { TabId } from '../lib/presets.ts'

interface Props {
  tabs: { id: TabId; label: string }[]
  active: TabId
  onChange: (id: TabId) => void
}

export default function TabBar({ tabs, active, onChange }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const j = (i + d + tabs.length) % tabs.length
    onChange(tabs[j].id)
    refs.current[j]?.focus()
  }

  return (
    <div className="tabbar" role="tablist" aria-label="시나리오">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el
          }}
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={t.id === active}
          aria-controls="tabpanel"
          tabIndex={t.id === active ? 0 : -1}
          className="tab"
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
