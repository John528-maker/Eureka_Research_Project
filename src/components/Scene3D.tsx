import { useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Group } from 'three'
import Gear from './Gear.tsx'
import Part, { Tag } from './Part.tsx'
import ToggleButton from './ToggleButton.tsx'
import VoltageScreen from './VoltageScreen.tsx'
import { distance, velocity, type Phys, type Sim } from '../lib/physics.ts'
import type { TabId } from '../lib/presets.ts'

// 화면 회전 속도 = 실제 각속도 × SPIN (시간은 실제 속도로 흐름)
const SPIN: Record<TabId, number> = { leaf: 1 / 100, model: 1 / 10 }
const FRICTION_S = 1
const HOLD_S = 0.8

const PURPLE = '#6B3FA0'
const BROWN = '#8B5A2B'
const BLUE = '#1F5FBF'

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

interface RigProps {
  tab: TabId
  sim: Sim
  p: Phys
  paused: boolean
  showLabels: boolean
  braking: boolean
  onBraking: (b: boolean) => void
  timeEl: RefObject<HTMLSpanElement | null>
}

function Rig({ tab, sim, p, paused, showLabels, braking, onBraking, timeEl }: RigProps) {
  const t = useRef(0)
  const wheel = useRef<Group>(null)
  const upper = useRef<Group>(null)
  const lower = useRef<Group>(null)
  const roller = useRef<Group>(null)
  const volt = useRef<HTMLSpanElement>(null)
  const lastBraking = useRef(false)

  useEffect(() => {
    t.current = 0
  }, [sim, p])

  const T1 = sim.charging ? sim.tEnd : 0
  const v1 = sim.charging ? sim.vth : p.v0

  useFrame((_, dt) => {
    if (!paused) t.current += Math.min(dt, 0.1)
    if (t.current > T1 + FRICTION_S + HOLD_S) t.current = 0
    const tt = t.current
    let s: number // 이동 거리 [m]
    let v: number
    if (tt <= T1) {
      s = distance(sim, p.v0, tt)
      v = velocity(sim, p.v0, tt)
    } else {
      const u = Math.min(tt - T1, FRICTION_S)
      s = distance(sim, p.v0, T1) + v1 * u - (v1 * u * u) / (2 * FRICTION_S)
      v = v1 * (1 - u / FRICTION_S)
    }
    const th = (SPIN[tab] * s) / p.r
    if (wheel.current) wheel.current.rotation.z = -th
    if (upper.current) upper.current.rotation.z = -th
    if (lower.current) lower.current.rotation.z = th * sim.G
    if (roller.current) roller.current.rotation.z = th * sim.G
    if (volt.current) volt.current.textContent = `${(sim.c * v).toFixed(1)} V`
    if (timeEl.current) timeEl.current.textContent = tt.toFixed(1)
    const b = tt > T1
    if (b !== lastBraking.current) {
      lastBraking.current = b
      onBraking(b)
    }
  })

  const R1 = 0.6
  const R2 = R1 / Math.min(Math.max(sim.G, 1), 4)
  const A: [number, number] = [-1.4, 0.9]
  const By = A[1] - (R1 + R2)
  const baseTop = By - 0.22
  const L = showLabels
  const gDigits = Number.isInteger(sim.G * 10) ? 1 : 2

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 6]} intensity={1.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.6, -1.5, -0.2]}>
        <planeGeometry args={[7, 3.4]} />
        <meshStandardMaterial color="#E6EAEF" />
      </mesh>

      {/* 왼쪽: 바퀴·기어·발전기 */}
      <Part position={[A[0], 0.3, 0.1]} box={[1.6, 2.6, 0.1]} color={BROWN} label="지지대" labelAt={[0.55, -1.15, 0.1]} showLabel={L} />
      <Gear ref={upper} radius={R1} position={[A[0], A[1], 0.25]} label="바퀴 쪽 기어" labelAt={[R1 + 0.6, 0.35, 0]} showLabel={L} />
      <Gear
        ref={lower}
        radius={R2}
        position={[A[0], By, 0.25]}
        label={`기어 1:${sim.G.toFixed(gDigits)}`}
        labelAt={[-(R2 + 0.6), -0.1, 0]}
        showLabel={L}
      />
      <Part position={[A[0], A[1], -0.45]} cyl={{ r: 0.04, len: 1.8 }} color="#9AA3AD" label="나사축" labelAt={[-0.7, 0.75, 0.9]} showLabel={L} />
      <Part ref={wheel} position={[A[0], A[1], -0.75]} cyl={{ r: 1.1, len: 0.12 }} color={PURPLE} label="메인 바퀴" labelAt={[-0.4, 1.3, 0]} showLabel={L}>
        <mesh position={[0.55, 0, 0.07]}>
          <boxGeometry args={[1.0, 0.08, 0.01]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </Part>
      <Part position={[A[0], -0.225, -1.35]} box={[0.16, 2.55, 0.16]} color={BROWN} label="세로 기둥" labelAt={[-0.45, -0.6, 0]} showLabel={L} />
      <Part position={[A[0] + 0.28, A[1] - 0.45, -1.35]} box={[0.22, 0.22, 0.22]} color="#3A4048" label="바퀴 속도 센서" labelAt={[-0.85, 0.05, 0]} showLabel={L} />
      <Part position={[A[0], By, -0.4]} cyl={{ r: 0.22, len: 0.3 }} color={PURPLE} ref={roller} label={tab === 'model' ? '제동장치(발전기 JGB37-520)' : '제동장치(발전기)'} labelAt={[1.3, -0.15, 0.4]} showLabel={L}>
        <mesh position={[0.11, 0, 0.16]}>
          <boxGeometry args={[0.2, 0.05, 0.01]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </Part>
      <Part position={[A[0], (baseTop - 1.5) / 2, -0.4]} box={[0.7, baseTop + 1.5, 0.6]} color={BLUE} label="받침" labelAt={[-0.6, -0.3, 0.4]} showLabel={L} />

      {/* 오른쪽: 전기 부품 */}
      <Part position={[1.4, -1.46, 0.4]} box={[1.8, 0.08, 1.0]} color="#EEEBE2" label="브레드보드" labelAt={[0.4, -0.25, 0.6]} showLabel={L} />
      <Part position={[0.9, -1.33, 0.4]} box={[0.5, 0.18, 0.45]} color="#C62828" label="모터드라이버" labelAt={[0, 0.35, 0]} showLabel={L} />
      <Part position={[2.9, -1.47, 0.5]} box={[0.9, 0.06, 0.65]} color="#0F7A80" label="아두이노" labelAt={[0, 0.3, 0.2]} showLabel={L} />
      <Part
        position={[1.6, -1.2, -0.75]}
        box={[1.2, 0.6, 0.55]}
        color="#2F3B45"
        label={tab === 'leaf' ? '배터리팩(리프 30kWh 축소 표시)' : '배터리팩 11~12V(종류 미확인)'}
        labelAt={[-0.3, 0.5, 0]}
        showLabel={L}
      />
      <VoltageScreen position={[3.0, -0.15, -0.2]} showLabel={L} valueRef={volt} />

      {<Tag position={[A[0] + 1.2, A[1] + 1.15, -0.75]} visible={braking}><strong className="tag-accent">여기부터 마찰 브레이크</strong></Tag>}

      <OrbitControls makeDefault target={[0.4, -0.1, -0.3]} enablePan={false} minDistance={4} maxDistance={14} />
    </>
  )
}

export default function Scene3D({ tab, sim, p }: { tab: TabId; sim: Sim; p: Phys }) {
  const [webgl] = useState(hasWebGL)
  const [showLabels, setShowLabels] = useState(true)
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [ready, setReady] = useState(false)
  const [braking, setBraking] = useState(false)
  const timeEl = useRef<HTMLSpanElement>(null)

  return (
    <section className="panel scene-panel" aria-labelledby="scene-h">
      <h2 id="scene-h">제동 장치 3D</h2>
      <div className="scene">
        {webgl ? (
          <>
            <Canvas camera={{ position: [0.7, 1.5, 7.6], fov: 50 }} dpr={[1, 2]} onCreated={() => setReady(true)}>
              <Rig tab={tab} sim={sim} p={p} paused={paused} showLabels={showLabels} braking={braking} onBraking={setBraking} timeEl={timeEl} />
            </Canvas>
            {!ready && <p className="scene-msg">3D 장면을 준비하는 중이에요.</p>}
          </>
        ) : (
          <p className="scene-msg">이 브라우저에서는 3D 장면을 보여 줄 수 없어요. 그래프와 결과는 그대로 쓸 수 있어요.</p>
        )}
      </div>
      {webgl && (
        <>
          <div className="scene-bar">
            <ToggleButton pressed={showLabels} onToggle={() => setShowLabels(!showLabels)} on="이름표 끄기" off="이름표 켜기" />
            <ToggleButton pressed={paused} onToggle={() => setPaused(!paused)} on="애니메이션 재생" off="애니메이션 멈춤" />
          </div>
          <p className="small">
            회전은 실제의 1/{1 / SPIN[tab]} 속도로 보여 줘요(시간은 실제와 같음). 재생 시각 <span ref={timeEl}>0.0</span> s
            (회생 구간 0~{(sim.charging ? sim.tEnd : 0).toFixed(1)} s, 이후 마찰 브레이크 {FRICTION_S} s)
          </p>
          <p className="small scene-hint">
            {braking ? '이 속도 아래에서는 전압이 낮아 충전되지 않아요. 남은 에너지는 마찰 브레이크가 맡아요.' : ' '}
          </p>
        </>
      )}
    </section>
  )
}
