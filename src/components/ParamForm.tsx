import Collapsible from './Collapsible.tsx'
import NumberField from './NumberField.tsx'
import SmallNote from './SmallNote.tsx'
import { speedOf, type Params, type TabId } from '../lib/presets.ts'

interface Props {
  tab: TabId
  params: Params
  onParams: (p: Params) => void
}

const RI_MSG = '내부저항은 0보다 큰 값을 넣어 주세요.'

export default function ParamForm({ tab, params: p, onParams }: Props) {
  const set = (patch: Partial<Params>) => onParams({ ...p, ...patch })

  return (
    <section className="panel" aria-labelledby="form-h">
      <h2 id="form-h">입력</h2>
      {tab === 'leaf' ? (
        <>
          <NumberField
            label="휠 반지름"
            unit="m"
            value={p.r}
            onChange={(r) => set({ r })}
            side={
              <button type="button" className="btn" onClick={() => set({ r: 0.32 })}>
                타이어 기준 0.32m
              </button>
            }
          />
          <NumberField label="제동 직전 속도" unit="km/h" value={p.v0_kmh!} onChange={(v0_kmh) => set({ v0_kmh })} />
        </>
      ) : (
        <>
          <NumberField label="바퀴 반지름" unit="cm" scale={100} value={p.r} onChange={(r) => set({ r })} />
          <NumberField label="모형 질량" unit="kg" value={p.m} onChange={(m) => set({ m })} />
          <NumberField
            label="제동 직전 바퀴 회전수"
            unit="rpm"
            value={p.rpm!}
            onChange={(rpm) => set({ rpm })}
            side={<span className="small side-note">속도 {speedOf(p).toFixed(2)} m/s (v = 2π·r·rpm/60)</span>}
            hint={<SmallNote>구동 모터 200rpm, 기어 두 개가 같은 크기(1:1)라고 본 값이에요. 실제로 잰 회전수가 있으면 넣어 주세요.</SmallNote>}
          />
          <NumberField
            label="최소 전압"
            unit="V"
            value={p.V_min}
            onChange={(V_min) => set({ V_min })}
            hint={<SmallNote>배터리 전압 11~12V 중 최소 전압을 12V로 두었어요.</SmallNote>}
          />
        </>
      )}
      <Collapsible title="발전기 설정">
        <NumberField
          label="발전기 상수 k"
          unit="V/rpm"
          value={p.k}
          onChange={(k) => set({ k })}
          hint={
            tab === 'model' && (
              <SmallNote>발전용 모터 200rpm에서 12V가 나온다고 보고 12/200으로 계산한 값</SmallNote>
            )
          }
        />
        <NumberField
          label="내부저항 R_i"
          unit="Ω"
          value={p.R_i}
          onChange={(R_i) => set({ R_i })}
          nonPositiveMsg={RI_MSG}
          hint={
            <SmallNote>
              {tab === 'leaf'
                ? '이상화 가정값(제동 세기 조절용)'
                : '추정값(사양표 정지 전류 1.2A 기준, 12V ÷ 1.2A). 실제 발전기 값을 넣어 주세요.'}
            </SmallNote>
          }
        />
      </Collapsible>
    </section>
  )
}
