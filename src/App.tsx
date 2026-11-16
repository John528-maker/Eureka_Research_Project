import { useState } from 'react'
import Header from './components/Header.tsx'
import SimPanel from './components/SimPanel.tsx'
import { optimal, simulate, sweepG } from './lib/physics.ts'
import { model, toSI, type Params } from './lib/presets.ts'

const defaultG = (p: Params) => {
  const opt = optimal(sweepG(toSI(p), p.gRange, p.gStep))
  if (opt.G !== null) return opt.G
  const [lo, hi] = p.gRange
  return Math.min(hi, Math.max(lo, simulate(toSI(p), lo).Gstar))
}

export default function App() {
  const [params, setParams] = useState<Params>(model)
  const [G, setG] = useState(() => defaultG(model))

  return (
    <div className="page">
      <Header />
      <h2 className="model-heading" id="model-h">cm 모형</h2>
      <SimPanel params={params} onParams={setParams} G={G} onG={setG} />
    </div>
  )
}
