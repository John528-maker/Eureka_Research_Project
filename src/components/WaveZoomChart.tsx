import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import ChartCard, { baseOptions, C, tag } from './ChartCard.tsx'
import { distance, velocity, type Phys, type Sim } from '../lib/physics.ts'

const T = 0.2

export default function WaveZoomChart({ p, sim }: { p: Phys; sim: Sim }) {
  const data = useMemo(() => {
    // 위상 = 2π∫f dt = (G/r)·∫v dt
    const cycles = (sim.G / p.r) * distance(sim, p.v0, T) / (2 * Math.PI)
    const n = Math.min(2000, Math.max(200, Math.ceil(cycles * 40)))
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const t = (T * i) / n
      return { x: t, y: sim.c * velocity(sim, p.v0, t) * Math.sin((sim.G / p.r) * distance(sim, p.v0, t)) }
    })
    return { datasets: [{ data: pts, borderColor: C.main, borderWidth: 1.5, pointRadius: 0 }] }
  }, [p, sim])

  const options = useMemo(() => {
    const o = baseOptions('시간 (s)', '전압 (V)')
    o.scales!.x!.min = 0
    o.scales!.x!.max = T
    o.plugins = {
      tooltip: { enabled: false },
      annotation: {
        annotations: {
          vmin: {
            type: 'line',
            yMin: p.Vmin,
            yMax: p.Vmin,
            borderColor: C.accent,
            borderDash: [6, 4],
            borderWidth: 2,
            label: { ...tag(`최소 전압 ${p.Vmin}V`, C.accent), position: 'end' },
          },
        },
      },
    }
    return o
  }, [p.Vmin])

  return (
    <ChartCard
      title="시작 0.2초 확대 파형"
      aside="파형이 촘촘해서 앞부분만 확대했어요."
      label={`제동 시작 0.2초 동안의 교류 파형. 최대 진폭 ${sim.e0.toFixed(1)}V, 최소 전압 ${p.Vmin}V`}
    >
      <Line data={data} options={options} />
    </ChartCard>
  )
}
