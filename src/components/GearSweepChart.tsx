import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import ChartCard, { baseOptions, C, tag } from './ChartCard.tsx'
import { simulate, type Optimal, type Phys, type Sweep } from '../lib/physics.ts'

interface Props {
  p: Phys
  sweep: Sweep
  opt: Optimal
  G: number
  range: [number, number]
}

const GRAY = '#8A939C'

export default function GearSweepChart({ p, sweep, opt, G, range }: Props) {
  const starE = simulate(p, opt.Gstar).Estore
  const optE = opt.G !== null ? simulate(p, opt.G).Estore : 0

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: '저장 에너지',
          data: sweep.points.map((q) => ({ x: q.G, y: q.Estore })),
          borderColor: C.main,
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: '최적 기어비',
          data: opt.G !== null ? [{ x: opt.G, y: optE }] : [],
          pointStyle: 'star' as const,
          pointRadius: 12,
          pointBorderWidth: 2,
          borderColor: C.accent,
          backgroundColor: C.accent,
          showLine: false,
        },
      ],
    }),
    [sweep, opt.G, optE],
  )

  const options = useMemo(() => {
    const o = baseOptions('기어비 G (1:n)', '저장 에너지 (J)')
    o.scales!.x!.min = range[0]
    o.scales!.x!.max = range[1]
    o.scales!.y!.min = 0
    o.scales!.y!.suggestedMax = Math.max(...sweep.points.map((q) => q.Estore), starE) * 1.15
    const starColor = opt.starInside ? C.accent : GRAY
    o.plugins = {
      tooltip: { callbacks: { label: (c) => `1:${c.parsed.x} · ${c.parsed.y!.toPrecision(3)} J` } },
      annotation: {
        annotations: {
          ...(opt.lo !== null && {
            band: {
              type: 'box',
              xMin: opt.lo,
              xMax: opt.hi!,
              backgroundColor: 'rgba(194,65,12,0.12)',
              borderWidth: 0,
              label: { ...tag('적정 감속도 구간', C.accent), position: { x: 'center', y: 'end' } },
            },
            bandLo: { type: 'line', xMin: opt.lo, xMax: opt.lo, borderColor: C.accent, borderWidth: 1 },
            bandHi: { type: 'line', xMin: opt.hi!, xMax: opt.hi!, borderColor: C.accent, borderWidth: 1 },
          }),
          gstar: {
            type: 'point',
            xValue: opt.Gstar,
            yValue: starE,
            radius: 5,
            backgroundColor: '#FFFFFF',
            borderColor: starColor,
            borderWidth: 2,
          },
          gstarTag: {
            type: 'label',
            xValue: opt.Gstar,
            yValue: starE,
            yAdjust: -20,
            ...tag('G*', starColor),
          },
          current: {
            type: 'line',
            xMin: G,
            xMax: G,
            borderColor: C.text,
            borderWidth: 1.5,
            label: { ...tag(`현재 1:${G}`, C.text), position: 'end' },
          },
        },
      },
    }
    return o
  }, [opt, starE, G, range, sweep])

  return (
    <ChartCard
      title="기어비별 저장 에너지"
      aside="별표는 최적 기어비, 원(G*)은 감속도 제한이 없을 때의 최대점이에요."
      label={`기어비 ${range[0]}~${range[1]}에서 저장 에너지 곡선. 적정 감속도 구간 ${opt.lo ?? '없음'}~${opt.hi ?? ''}, 최적 ${opt.G ?? '없음'}`}
    >
      <Line data={data} options={options} />
    </ChartCard>
  )
}
