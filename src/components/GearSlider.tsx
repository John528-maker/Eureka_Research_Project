import { useId } from 'react'

interface Props {
  G: number
  range: [number, number]
  step: number
  optimalG: number | null
  onChange: (g: number) => void
}

export default function GearSlider({ G, range, step, optimalG, onChange }: Props) {
  const id = useId()
  const digits = step < 0.1 ? 2 : 1
  return (
    <section className="panel slider" aria-labelledby={`${id}-l`}>
      <div className="slider-head">
        <label htmlFor={id} id={`${id}-l`}>
          기어비 G = <output htmlFor={id} className="num-big">1:{G.toFixed(digits)}</output>
        </label>
        <button type="button" className="btn btn-primary" disabled={optimalG === null} onClick={() => optimalG !== null && onChange(optimalG)}>
          최적 기어비 적용
        </button>
      </div>
      <input
        id={id}
        type="range"
        min={range[0]}
        max={range[1]}
        step={step}
        value={G}
        aria-valuetext={`1:${G.toFixed(digits)}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="slider-scale small" aria-hidden="true">
        <span>1:{range[0]}</span>
        <span>1:{range[1]}</span>
      </div>
    </section>
  )
}
