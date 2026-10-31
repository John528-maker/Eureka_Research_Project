import { useState } from 'react'
import Header from './components/Header.tsx'
import TabBar from './components/TabBar.tsx'
import SimPanel from './components/SimPanel.tsx'
import { optimal, simulate, sweepG } from './lib/physics.ts'
import { presets, toSI, type Params, type TabId } from './lib/presets.ts'

const TABS: { id: TabId; label: string }[] = [
  { id: 'leaf', label: '닛산 리프 실차' },
  { id: 'model', label: 'cm 모형' },
]

const defaultG = (p: Params) => {
  const opt = optimal(sweepG(toSI(p), p.gRange, p.gStep))
  if (opt.G !== null) return opt.G
  const [lo, hi] = p.gRange
  return Math.min(hi, Math.max(lo, simulate(toSI(p), lo).Gstar))
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('leaf')
  const [paramsByTab, setParamsByTab] = useState<Record<TabId, Params>>(presets)
  const [gByTab, setGByTab] = useState<Record<TabId, number>>(() => ({
    leaf: defaultG(presets.leaf),
    model: defaultG(presets.model),
  }))

  return (
    <div className="page">
      <Header />
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <SimPanel
        key={activeTab}
        tab={activeTab}
        params={paramsByTab[activeTab]}
        onParams={(p) => setParamsByTab((s) => ({ ...s, [activeTab]: p }))}
        G={gByTab[activeTab]}
        onG={(g) => setGByTab((s) => ({ ...s, [activeTab]: g }))}
      />
    </div>
  )
}
