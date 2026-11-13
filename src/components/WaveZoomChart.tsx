import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { Line } from 'react-chartjs-2'
import ChartCard, { baseOptions, C, tag } from './ChartCard.tsx'
import { FRICTION_S, motion, type Phys, type Sim } from '../lib/physics.ts'

const CYCLES = 16 // 한 화면에 담는 파형 수(시작 주파수 기준)
const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi)

export default function WaveZoomChart({ p, sim }: { p: Phys; sim: Sim }) {
  const T1 = sim.charging ? sim.tEnd : 0
  const total = T1 + FRICTION_S
  const f0 = (sim.G * p.v0) / (2 * Math.PI * p.r)
  const W = Math.min(total, CYCLES / f0)
  const [t0, setT0] = useState(0)
  const start = clamp(t0, 0, total - W)
  const drag = useRef<{ x: number; t: number } | null>(null)
  const fmt = (t: number) => t.toFixed(W < 0.1 ? 3 : 2)

  const data = useMemo(() => {
    // 위상 = 2π∫f dt = (G/r)·∫v dt
    const pts = Array.from({ length: 801 }, (_, i) => {
      const t = start + (W * i) / 800
      const { v, s } = motion(sim, p.v0, t)
      return { x: t, y: sim.c * v * Math.sin((sim.G / p.r) * s) }
    })
    return { datasets: [{ data: pts, borderColor: C.main, borderWidth: 1.5, pointRadius: 0 }] }
  }, [p, sim, start, W])

  const options = useMemo(() => {
    const o = baseOptions('시간 (s)', '전압 (V)')
    const A = Math.ceil(Math.max(sim.e0, p.Vmin) * 1.2)
    o.scales!.x!.min = start
    o.scales!.x!.max = start + W
    o.scales!.x!.ticks = { maxTicksLimit: 6 }
    // 넘겨 보는 동안 세로축이 흔들리지 않게 고정
    o.scales!.y!.min = -A
    o.scales!.y!.max = A
    o.scales!.y!.ticks = { includeBounds: false }
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
          brake: {
            type: 'line',
            xMin: T1,
            xMax: T1,
            borderColor: C.sub,
            borderWidth: 2,
            label: { ...tag('여기부터 마찰 브레이크', C.sub), position: 'start' },
          },
        },
      },
    }
    return o
  }, [p.Vmin, sim.e0, start, W, T1])

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    setT0(clamp(drag.current.t - ((e.clientX - drag.current.x) / e.currentTarget.clientWidth) * W, 0, total - W))
  }

  return (
    <ChartCard
      title="교류 파형 (정지할 때까지)"
      aside="그래프를 좌우로 끌거나 아래 막대를 움직여 넘겨 보세요."
      label={`제동 시작부터 정지(${fmt(total)}초)까지의 교류 파형 중 ${fmt(start)}~${fmt(start + W)}초 구간. 최대 진폭 ${sim.e0.toFixed(1)}V, 최소 전압 ${p.Vmin}V`}
      note={
        <>
          <input
            type="range"
            min={0}
            max={total - W}
            step="any"
            value={start}
            disabled={total <= W}
            aria-label="파형에서 볼 구간"
            aria-valuetext={`${fmt(start)}초부터 ${fmt(start + W)}초까지`}
            onChange={(e) => setT0(Number(e.target.value))}
          />
          지금 보는 구간 {fmt(start)}~{fmt(start + W)} s / 정지 {fmt(total)} s (회생 구간 0~{fmt(T1)} s, 이후 마찰 브레이크{' '}
          {FRICTION_S} s)
        </>
      }
    >
      <div
        className="wave-drag"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, t: start }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <Line data={data} options={options} />
      </div>
    </ChartCard>
  )
}
