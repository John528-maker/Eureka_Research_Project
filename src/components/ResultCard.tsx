import SmallNote from './SmallNote.tsx'
import type { Optimal, Sim } from '../lib/physics.ts'

export const fmtJ = (J: number) => `${J.toFixed(2)} J`

interface Props {
  sim: Sim
  opt: Optimal
  digits: number
}

export default function ResultCard({ sim, opt, digits }: Props) {
  const rows: [string, string][] = [
    ['저장 에너지', `${fmtJ(sim.Estore)} (저장 비율 ${(sim.ratio * 100).toFixed(1)}%)`],
    ['시작 감속도', `${sim.a0.toFixed(2)} m/s² (평균 ${sim.aAvg.toFixed(2)} m/s²)`],
    ['내부저항 열손실', fmtJ(sim.Eloss)],
    ['회생 불가', `${fmtJ(sim.Erest)} (마찰 브레이크 몫)`],
    ['운동에너지 상한', `${fmtJ(sim.Emax)} (운동에너지 × 80%, 기어비와 무관)`],
  ]
  return (
    <section className="panel result" aria-labelledby="result-h">
      <h2 id="result-h">결과</h2>
      <p className="result-opt">
        최적 기어비 <strong className="num-big">{opt.G === null ? '없음' : `1:${opt.G.toFixed(digits)}`}</strong>
      </p>
      {opt.G !== null && !opt.starInside && (
        <SmallNote>
          에너지가 가장 큰 기어비(1:{opt.Gstar.toFixed(digits)})는 감속도가 너무 커서, 허용 구간의 끝 값을 최적으로 골랐어요.
        </SmallNote>
      )}
      <h3 className="result-sub">현재 기어비 1:{sim.G.toFixed(digits)}에서</h3>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
