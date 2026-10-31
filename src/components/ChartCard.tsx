import type { ReactNode } from 'react'
import { Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip, type ChartOptions } from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'

ChartJS.register(LinearScale, PointElement, LineElement, Filler, Tooltip, annotationPlugin)
ChartJS.defaults.font.family = 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
ChartJS.defaults.font.size = 14
ChartJS.defaults.color = '#5C6670'

export const C = { text: '#1A1A1A', sub: '#5C6670', main: '#1F5FBF', accent: '#C2410C', face: '#F3F5F8', grid: '#E1E5EA' }

export const baseOptions = (x: string, y: string): ChartOptions<'line'> => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  parsing: false,
  normalized: true,
  interaction: { mode: 'nearest', intersect: false, axis: 'x' },
  scales: {
    x: { type: 'linear', title: { display: true, text: x }, grid: { color: C.grid } },
    y: { type: 'linear', title: { display: true, text: y }, grid: { color: C.grid } },
  },
})

/** chartjs-plugin-annotation 의 이름표 공통 스타일 */
export const tag = (content: string, color: string) => ({
  display: true,
  content,
  color,
  backgroundColor: 'rgba(255,255,255,0.9)',
  font: { size: 14 },
  padding: 4,
})

interface Props {
  title: ReactNode
  aside?: ReactNode
  note?: ReactNode
  label: string
  children: ReactNode
}

export default function ChartCard({ title, aside, note, label, children }: Props) {
  return (
    <section className="panel chart-card">
      <div className="chart-head">
        <h2>{title}</h2>
        {aside && <span className="small">{aside}</span>}
      </div>
      <div className="chart-box" role="img" aria-label={label}>
        {children}
      </div>
      {note && <p className="small">{note}</p>}
    </section>
  )
}
