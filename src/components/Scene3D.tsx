import { useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Line, OrbitControls } from '@react-three/drei'
import type { Group } from 'three'
import Gear from './Gear.tsx'
import Part, { MAT, Tag } from './Part.tsx'
import ToggleButton from './ToggleButton.tsx'
import VoltageScreen from './VoltageScreen.tsx'
import { distance, velocity, type Phys, type Sim } from '../lib/physics.ts'
import type { TabId } from '../lib/presets.ts'

// 화면 회전 속도 = 실제 각속도 × SPIN (시간은 실제 속도로 흐름)
const SPIN: Record<TabId, number> = { leaf: 1 / 100, model: 1 / 10 }
const FRICTION_S = 1
const HOLD_S = 0.8

const PURPLE = '#5B2E8F'
const BROWN = '#7A4A22'
const BLUE = '#1F5FBF'
const BG = '#E7EAEF'
const FLOOR = -1.49

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

  const R1 = 0.52
  const R2 = R1 / Math.min(Math.max(sim.G, 1), 4)
  const A: [number, number] = [-1.12, 0.78]
  const By = A[1] - (R1 + R2)
  const baseTop = By - 0.22
  const L = showLabels
  const gDigits = Number.isInteger(sim.G * 10) ? 1 : 2

  return (
    <>
      {/* 스튜디오 셋업: 이음새 없는 배경(안개로 지평선 소거) + 소프트박스 환경광 + 키 라이트 그림자 + 접지 그림자 */}
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 9.5, 17]} />
      <Environment resolution={256} environmentIntensity={1.1}>
        <Lightformer form="rect" intensity={3} position={[0, 6, 1]} rotation={[-Math.PI / 2, 0, 0]} scale={[9, 5, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[-6, 2.5, 4]} rotation={[0, Math.PI / 3, 0]} scale={[5, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#DCE8FF" position={[6, 2, -5]} rotation={[0, -Math.PI / 2.4, 0]} scale={[4, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[0, 1.5, 9]} rotation={[0, 0, 0]} scale={[8, 5, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[0, -4, 3]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 4, 1]} />
      </Environment>
      <ambientLight intensity={0.25} />
      <directionalLight
        castShadow
        position={[3.2, 6, 5]}
        intensity={1.6}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, FLOOR, -0.4]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#F1F3F6" roughness={0.95} metalness={0} />
      </mesh>
      <ContactShadows position={[0.3, FLOOR + 0.004, -0.4]} opacity={0.55} scale={9} blur={2.6} far={2.6} resolution={1024} color="#1A2230" />

      {/* 왼쪽: 바퀴·기어·발전기 (슬림 브래킷 지지대로 뒤쪽 바퀴·발전기 시야 확보) */}
      <Part
        position={[A[0], -0.25, 0.12]}
        box={[0.42, 2.46, 0.12]}
        color={BROWN}
        mat={MAT.matte}
        label="지지대"
        anchorAt={[-0.2, -0.42, 0.06]}
        labelAt={[-0.78, -0.42, 0.25]}
        showLabel={L}
      >
        <mesh position={[0, -1.17, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.84, 0.12, 0.32]} />
          <meshPhysicalMaterial color={BROWN} {...MAT.matte} />
        </mesh>
      </Part>

      <Gear
        ref={upper}
        radius={R1}
        position={[A[0], A[1], 0.34]}
        label="바퀴 쪽 기어"
        anchorAt={[0.15, R1 * 0.9, 0.07]}
        labelAt={[0.52, 1.02, 0.2]}
        showLabel={L}
      />

      <Gear
        ref={lower}
        radius={R2}
        position={[A[0], By, 0.34]}
        label={`기어 1:${sim.G.toFixed(gDigits)}`}
        anchorAt={[-R2 * 0.85, 0, 0.07]}
        labelAt={[-0.72, 0.1, 0.35]}
        showLabel={L}
      />

      {/* 위 기어·메인 바퀴·세로 기둥을 관통하는 나사축 */}
      <Part
        position={[A[0], A[1], -0.5]}
        cyl={{ r: 0.045, len: 1.9 }}
        color="#B8BEC6"
        mat={MAT.steel}
        label="나사축"
        anchorAt={[0.02, 0.05, 0.05]}
        labelAt={[0.72, 1.52, 0.05]}
        showLabel={L}
      />

      {/* 메인 바퀴: 십자 스포크와 회전 마커 */}
      <Part
        ref={wheel}
        position={[A[0], A[1], -0.78]}
        cyl={{ r: 0.96, len: 0.14 }}
        color={PURPLE}
        mat={MAT.paint}
        label="메인 바퀴"
        anchorAt={[-0.32, 0.9, 0]}
        labelAt={[-0.62, 1.48, 0]}
        showLabel={L}
      >
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.17, 32]} />
          <meshPhysicalMaterial color="#D8DEE6" {...MAT.steel} />
        </mesh>
        <mesh position={[0, 0, 0.075]}>
          <boxGeometry args={[1.74, 0.065, 0.015]} />
          <meshStandardMaterial color="#E9D5FF" />
        </mesh>
        <mesh position={[0, 0, 0.075]}>
          <boxGeometry args={[0.065, 1.74, 0.015]} />
          <meshStandardMaterial color="#E9D5FF" />
        </mesh>
        <mesh position={[0.48, 0, 0.082]}>
          <boxGeometry args={[0.82, 0.1, 0.02]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.78, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
          <meshStandardMaterial color="#F59E0B" />
        </mesh>
      </Part>

      <Part
        position={[A[0], -0.25, -1.36]}
        box={[0.18, 2.46, 0.18]}
        color={BROWN}
        mat={MAT.matte}
        label="세로 기둥"
        anchorAt={[-0.09, 0.72, 0]}
        labelAt={[-0.82, 1.25, 0.1]}
        showLabel={L}
      />

      <Part
        position={[A[0] + 0.3, A[1] - 0.36, -1.3]}
        box={[0.26, 0.22, 0.24]}
        color="#334155"
        mat={MAT.matte}
        label="바퀴 속도 센서"
        anchorAt={[0.13, 0.08, 0.1]}
        labelAt={[1.05, 0.92, 0.1]}
        showLabel={L}
      >
        <mesh position={[-0.11, 0.04, 0.13]}>
          <boxGeometry args={[0.07, 0.07, 0.07]} />
          <meshStandardMaterial color="#38BDF8" />
        </mesh>
      </Part>

      {/* 아래 기어 축과 발전기 롤러 */}
      <mesh position={[A[0], By, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.88, 32]} />
        <meshPhysicalMaterial color="#B8BEC6" {...MAT.steel} />
      </mesh>

      <Part
        position={[A[0], By, -0.36]}
        cyl={{ r: 0.22, len: 0.4 }}
        color={PURPLE}
        mat={MAT.paint}
        ref={roller}
        label={tab === 'model' ? '제동장치(발전기 JGB37-520)' : '제동장치(발전기)'}
        anchorAt={[0.16, -0.14, 0.08]}
        labelAt={[0.9, -1.48 - By, 0.65]}
        showLabel={L}
      >
        <mesh position={[0.11, 0, 0.21]}>
          <boxGeometry args={[0.2, 0.05, 0.015]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.16, 0, 0.215]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.018, 12]} />
          <meshStandardMaterial color="#F59E0B" />
        </mesh>
      </Part>

      <Part
        position={[A[0], (baseTop - 1.48) / 2, -0.36]}
        box={[0.62, Math.max(0.2, baseTop + 1.48), 0.52]}
        color={BLUE}
        mat={MAT.paint}
        label="받침"
        anchorAt={[-0.31, -0.1, 0.2]}
        labelAt={[-0.86, -0.45, 0.35]}
        showLabel={L}
      />

      {/* 오른쪽: 전기 부품 및 배선 */}
      <Part
        position={[0.98, -1.42, 0.5]}
        box={[1.45, 0.1, 0.86]}
        color="#F5F2EB"
        mat={MAT.matte}
        label="브레드보드"
        anchorAt={[0.15, -0.04, 0.42]}
        labelAt={[0.2, -0.58, 0.72]}
        showLabel={L}
      >
        <mesh position={[0, 0.052, 0]}>
          <boxGeometry args={[1.32, 0.01, 0.06]} />
          <meshStandardMaterial color="#CBD5E1" />
        </mesh>
        <mesh position={[0, 0.052, 0.33]}>
          <boxGeometry args={[1.32, 0.01, 0.03]} />
          <meshStandardMaterial color="#EF4444" />
        </mesh>
        <mesh position={[0, 0.052, -0.33]}>
          <boxGeometry args={[1.32, 0.01, 0.03]} />
          <meshStandardMaterial color="#3B82F6" />
        </mesh>
      </Part>

      <Part
        position={[0.55, -1.24, 0.44]}
        box={[0.48, 0.24, 0.45]}
        color="#C62828"
        label="모터드라이버"
        anchorAt={[0, -0.08, 0.22]}
        labelAt={[-0.25, -0.35, 0.55]}
        showLabel={L}
      >
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.22, 0.12, 0.3]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
      </Part>

      <Part
        position={[2.12, -1.41, 0.5]}
        box={[0.92, 0.1, 0.66]}
        color="#0F7A80"
        mat={MAT.matte}
        label="아두이노"
        anchorAt={[0.06, 0.05, 0.3]}
        labelAt={[0.02, -0.22, 0.52]}
        showLabel={L}
      >
        <mesh position={[-0.36, 0.08, -0.14]}>
          <boxGeometry args={[0.18, 0.1, 0.16]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.5} roughness={0.2} />
        </mesh>
      </Part>

      <Part
        position={[1.08, -1.14, -0.68]}
        box={[1.16, 0.62, 0.54]}
        color="#2F3B45"
        mat={MAT.paint}
        label={tab === 'leaf' ? '배터리팩(리프 30kWh 축소 표시)' : '배터리팩 11~12V(종류 미확인)'}
        anchorAt={[0, 0.31, 0]}
        labelAt={[0.15, 0.88, 0.05]}
        showLabel={L}
      >
        <mesh position={[-0.34, 0.33, 0.15]}>
          <boxGeometry args={[0.11, 0.06, 0.11]} />
          <meshStandardMaterial color="#EF4444" />
        </mesh>
        <mesh position={[0.34, 0.33, 0.15]}>
          <boxGeometry args={[0.11, 0.06, 0.11]} />
          <meshStandardMaterial color="#1F5FBF" />
        </mesh>
      </Part>

      <VoltageScreen position={[2.15, -0.22, -0.22]} showLabel={L} valueRef={volt} braking={braking} />

      {/* 부품 간 전력·신호 연결 배선 */}
      <Line
        points={[
          [A[0] + 0.2, By, -0.36],
          [0.02, -1.18, 0.1],
          [0.34, -1.22, 0.44],
        ]}
        color="#C2410C"
        lineWidth={2}
      />
      <Line
        points={[
          [0.7, -1.2, 0.22],
          [0.95, -1.1, -0.39],
        ]}
        color="#1F5FBF"
        lineWidth={2}
      />
      <Line
        points={[
          [2.12, -1.36, 0.22],
          [2.15, -0.85, -0.22],
        ]}
        color="#0F7A80"
        lineWidth={1.8}
      />

      <Tag
        position={[1.08, 1.82, -0.3]}
        anchor={[A[0] + 0.62, A[1] + 0.62, -0.72]}
        visible={braking}
        accent
      >
        <strong className="tag-accent">여기부터 마찰 브레이크</strong>
      </Tag>

      <OrbitControls makeDefault target={[0.12, -0.05, -0.2]} enablePan={false} minDistance={4} maxDistance={14} maxPolarAngle={Math.PI / 2 - 0.04} />
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
            <Canvas shadows camera={{ position: [0.22, 1.55, 7.6], fov: 42 }} dpr={[1, 2]} onCreated={() => setReady(true)}>
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
