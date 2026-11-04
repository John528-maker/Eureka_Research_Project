import { lazy, Suspense, useMemo } from 'react'
import Collapsible from './Collapsible.tsx'
import EnvelopeChart from './EnvelopeChart.tsx'
import GearSlider from './GearSlider.tsx'
import GearSweepChart from './GearSweepChart.tsx'
import Message from './Message.tsx'
import ParamForm from './ParamForm.tsx'
import ResultCard from './ResultCard.tsx'
import SmallNote from './SmallNote.tsx'
import WaveZoomChart from './WaveZoomChart.tsx'
import { optimal, simulate, sweepG, verify } from '../lib/physics.ts'
import { toSI, type Params, type TabId } from '../lib/presets.ts'

const Scene3D = lazy(() => import('./Scene3D.tsx'))

const NOTES: Record<TabId, string> = {
  leaf: '기준차량: 닛산 리프 2017년형 30kWh · 공차중량 1521kg(트림 미확인, 1,507~1,545kg 범위) · 휠 반지름 0.216m(타이어 약 0.32m) · 최소 전압 240V · 배터리 용량 30kWh · 발전기 효율 80%',
  model: '발전기 JGB37-520(감속기 내장) · k는 출력축 기준 · 화면의 G는 바깥 기어만 · k는 제공값 · R_i는 추정값 · η는 가정값',
}

interface Props {
  tab: TabId
  params: Params
  onParams: (p: Params) => void
  G: number
  onG: (g: number) => void
}

export default function SimPanel({ tab, params, onParams, G, onG }: Props) {
  const p = useMemo(() => toSI(params), [params])
  const sim = useMemo(() => simulate(p, G), [p, G])
  const sweep = useMemo(() => sweepG(p, params.gRange, params.gStep), [p, params.gRange, params.gStep])
  const opt = useMemo(() => optimal(sweep), [sweep])
  const digits = params.gStep < 0.1 ? 2 : 1
  const kJ = tab === 'leaf'

  if (import.meta.env.DEV) {
    const { storeErr, balanceErr } = verify(p, G)
    console.assert(storeErr < 0.01, 'RK4 E_store 오차 1% 초과', storeErr)
    console.assert(balanceErr < 0.01, '에너지 수지 오차 1% 초과', balanceErr)
  }

  return (
    <div className="sim" role="tabpanel" id="tabpanel" aria-labelledby={`tab-${tab}`}>
      <SmallNote>{NOTES[tab]}</SmallNote>
      <div className="cols">
        <div className="col-left">
          <div className="o-scene">
            <Suspense fallback={(
                <div className="scene">
                  <p className="scene-msg">3D 장면을 준비하는 중이에요.</p>
                </div>
              )}>
              <Scene3D tab={tab} sim={sim} p={p} />
            </Suspense>
          </div>
          <div className="o-result">
            <ResultCard sim={sim} opt={opt} kJ={kJ} digits={digits} />
          </div>
        </div>
        <div className="col-right">
          <div className="o-form">
            <ParamForm key={tab} tab={tab} params={params} onParams={onParams} />
          </div>
          <div className="o-slider">
            <GearSlider G={G} range={params.gRange} step={params.gStep} optimalG={opt.G} onChange={onG} />
            {opt.G === null && (
              <Message tone="warn">
                시작 감속도가 1~2.5 m/s² 안에 드는 기어비가 없어요. 속도나 내부저항을 바꿔 보세요.
              </Message>
            )}
            {!sim.charging && (
              <Message tone="warn">
                이 기어비에서는 기전력이 최소 전압({p.Vmin}V)에 닿지 않아 저장되는 에너지가 없어요. 기어비를 올려 보세요.
              </Message>
            )}
          </div>
          <div className="o-charts">
            <WaveZoomChart p={p} sim={sim} />
            <EnvelopeChart p={p} sim={sim} kJ={kJ} />
            <GearSweepChart p={p} sweep={sweep} opt={opt} G={G} range={params.gRange} />
          </div>
          <div className="o-method">
            <Collapsible title="계산 방법">
              <ul className="method">
                <li>k_t = k·60/(2π) [V·s/rad], G = n_발전기/n_바퀴, c = k_t·G/r [V·s/m], 기전력 e = c·v</li>
                <li>e &gt; V_min이면 I = (e − V_min)/R_i, 아니면 I = 0. 제동력 F = c·I, 감속도 a = F/m</li>
                <li>v_th = V_min/c, τ = m·R_i/c²</li>
                <li>e0 = c·v0 &gt; V_min이면 v(t) = v_th + (v0 − v_th)·exp(−t/τ), 종료 시각 t_end = 5τ</li>
                <li>저장 판정: e0 ≤ V_min이면 제동·저장 없음. 기전력이 최소 전압보다 높은 동안만 배터리에 충전</li>
                <li>저장 에너지 E_store = η·m·v_th·(v0 − v_th) (e0 ≤ V_min이면 0)</li>
                <li>내부저항 열손실 E_loss = ½·m·(v0 − v_th)²</li>
                <li>회생 불가 운동에너지 E_rest = ½·m·v_th² (마찰 브레이크 몫)</li>
                <li>운동에너지 상한 E_max = η·½·m·v0² (기어비와 무관), 저장 비율 = E_store/E_max</li>
                <li>시작 감속도 a0 = c·(e0 − V_min)/(R_i·m), 평균 감속도 = (v0 − v(t_end))/t_end</li>
                <li>무제약 최적 G* = 2·V_min·r/(k_t·v0) (이때 e0 = 2·V_min, E_store = η·¼·m·v0²)</li>
                <li>
                  최적 기어비: 1 ≤ a0 ≤ 2.5 m/s²인 G 중 E_store가 가장 큰 값(리프 1~20을 0.1 간격, 모형 1~10을 0.01 간격으로
                  계산)
                </li>
                <li>교류 파형: f = G·v(t)/(2π·r), 전압 = e(t)·sin(2π∫f dt)</li>
              </ul>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  )
}
