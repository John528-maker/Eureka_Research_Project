import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import ChartCard, { baseOptions, C, tag } from './ChartCard.tsx'
import { fmtJ } from './ResultCard.tsx'
import { velocity, type Phys, type Sim } from '../lib/physics.ts'

export default function EnvelopeChart({ p, sim, kJ }: { p: Phys; sim: Sim; kJ: boolean }) {
  const tMax = sim.charging ? sim.tEnd : 1

  const data = useMemo(() => {
    const pts = Array.from({ length: 201 }, (_, i) => {
      const t = (tMax * i) / 200
      return { x: t, y: sim.c * velocity(sim, p.v0, t) }
    })
    return {
      datasets: [
        {
          data: pts,
          borderColor: C.main,
          borderWidth: 2,
          pointRadius: 0,
          fill: { target: { value: p.Vmin }, above: 'rgba(31,95,191,0.18)', below: 'transparent' },
        },
      ],
    }
  }, [p, sim, tMax])

  const options = useMemo(() => {
    const o = baseOptions('시간 (s)', '기전력 (V)')
    o.scales!.x!.min = 0
    o.scales!.x!.max = tMax
    o.scales!.y!.min = 0
    o.scales!.y!.suggestedMax = Math.max(sim.e0, p.Vmin) * 1.15
    o.plugins = {
      tooltip: { callbacks: { label: (c) => `${c.parsed.y!.toFixed(1)} V` } },
      annotation: {
        annotations: {
          vmin: {
            type: 'line',
            yMin: p.Vmin,
            yMax: p.Vmin,
            borderColor: C.accent,
            borderDash: [6, 4],
            borderWidth: 2,
            label: { ...tag(`최소 전압 ${p.Vmin}V`, C.accent), position: 'end', yAdjust: 16 },
          },
          ...(sim.charging && {
            store: {
              type: 'label',
              xValue: tMax * 0.04,
              yValue: (sim.e0 + p.Vmin) / 2,
              position: 'start',
              ...tag('기전력이 최소 전압보다 높은 구간만 저장', C.main),
            },
          }),
        },
      },
    }
    return o
  }, [p.Vmin, sim, tMax])

  return (
    <ChartCard
      title="전체 제동 구간"
      aside={`이 기어비에서 배터리에 저장되는 에너지: ${fmtJ(sim.Estore, kJ)}`}
      note="교류 파형은 시각화용 단순화예요(실제 출력은 직류에 가까움)."
      label={`기전력 e(t)가 ${sim.e0.toFixed(1)}V에서 시작해 최소 전압 ${p.Vmin}V 쪽으로 줄어드는 그래프`}
    >
      <Line data={data} options={options} />
    </ChartCard>
  )
}
