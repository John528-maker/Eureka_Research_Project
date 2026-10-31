import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

interface Props {
  label: string
  unit: string
  value: number
  onChange: (v: number) => void
  scale?: number // 표시 단위 = 저장값 × scale (예: m → cm)
  nonPositiveMsg?: string
  side?: ReactNode
  hint?: ReactNode
}

const fmt = (x: number) => String(+x.toPrecision(10))

export default function NumberField({ label, unit, value, onChange, scale = 1, nonPositiveMsg, side, hint }: Props) {
  const id = useId()
  const [text, setText] = useState(fmt(value * scale))
  const last = useRef(value)

  useEffect(() => {
    if (value !== last.current) {
      last.current = value
      setText(fmt(value * scale))
    }
  }, [value, scale])

  const trimmed = text.trim()
  const num = Number(trimmed)
  const error =
    trimmed === ''
      ? { msg: '값을 넣으면 바로 다시 계산해요.', warn: false }
      : !Number.isFinite(num)
        ? { msg: '0보다 큰 숫자를 넣어 주세요.', warn: true }
        : num <= 0
          ? { msg: nonPositiveMsg ?? '0보다 큰 숫자를 넣어 주세요.', warn: true }
          : null

  const update = (t: string) => {
    setText(t)
    const n = Number(t.trim())
    if (t.trim() !== '' && Number.isFinite(n) && n > 0) {
      last.current = n / scale
      onChange(n / scale)
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-row">
        <span className="input-wrap" data-invalid={error?.warn || undefined}>
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={text}
            aria-invalid={error?.warn || undefined}
            aria-describedby={`${id}-msg ${id}-hint`}
            onChange={(e) => update(e.target.value)}
          />
          <span className="unit">{unit}</span>
        </span>
        {side}
      </div>
      <div id={`${id}-msg`} aria-live="polite">
        {error && (
          <p className={error.warn ? 'field-error' : 'small'}>
            {error.warn && <span aria-hidden="true">! </span>}
            {error.msg}
          </p>
        )}
      </div>
      <div id={`${id}-hint`}>{hint}</div>
    </div>
  )
}
