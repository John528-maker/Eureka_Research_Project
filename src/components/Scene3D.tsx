import { useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Line, OrbitControls } from '@react-three/drei'
import type { Group } from 'three'
import Gear from './Gear.tsx'
import Part, { MAT, Tag, type V3 } from './Part.tsx'
import ToggleButton from './ToggleButton.tsx'
import VoltageScreen, { type VoltageReading } from './VoltageScreen.tsx'
import { FRICTION_S, motion, type Phys, type Sim } from '../lib/physics.ts'

// 화면 회전 속도 = 실제 각속도 × SPIN (시간은 실제 속도로 흐름)
const SPIN = 1 / 10
const HOLD_S = 0.8

const PURPLE = '#5B2E8F'
const BROWN = '#B06A2C'
const SHAFT = '#C98A45'
const BLUE = '#1F5FBF'
const BG = '#E7EAEF'
const FLOOR = -1.49

// 기계부 그룹의 위치·회전, 이름표를 놓는 월드 평면 z
const M: V3 = [-1.2, 0, -0.2]
const ROT = (-45 * Math.PI) / 180
const COS = Math.cos(ROT)
const SIN = Math.sin(ROT)
const LZ = 0.8
/** 기계부 그룹 좌표 → 월드 좌표 */
const toWorld = ([x, y, z]: V3): V3 => [M[0] + x * COS + z * SIN, y, M[2] - x * SIN + z * COS]
/** 이름표를 월드 (wx, wy, LZ)에 두는 부품 기준 위치: lw = 월드에 놓인 부품, lm = 기계부 그룹 안 부품 */
const lw = (pos: V3, wx: number, wy: number): V3 => [wx - pos[0], wy - pos[1], LZ - pos[2]]
const lm = (pos: V3, wx: number, wy: number): V3 => {
  const dx = wx - M[0]
  const dz = LZ - M[2]
  return [dx * COS - dz * SIN - pos[0], wy - pos[1], dx * SIN + dz * COS - pos[2]]
}

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

interface RigProps {
  sim: Sim
  p: Phys
  paused: boolean
  showLabels: boolean
  braking: boolean
  onBraking: (b: boolean) => void
  timeEl: RefObject<HTMLSpanElement | null>
}

function Rig({ sim, p, paused, showLabels, braking, onBraking, timeEl }: RigProps) {
  const t = useRef(0)
  const wheel = useRef<Group>(null)
  const upper = useRef<Group>(null)
  const lower = useRef<Group>(null)
  const roller = useRef<Group>(null)
  const reading = useRef<VoltageReading>({ voltage: sim.e0, charging: sim.charging })
  const lastBraking = useRef(false)

  useEffect(() => {
    t.current = 0
  }, [sim, p])

  const T1 = sim.charging ? sim.tEnd : 0

  useFrame((_, dt) => {
    if (!paused) t.current += Math.min(dt, 0.1)
    if (t.current > T1 + FRICTION_S + HOLD_S) t.current = 0
    const tt = t.current
    const { s, v } = motion(sim, p.v0, tt)
    const th = (SPIN * s) / p.r
    if (wheel.current) wheel.current.rotation.z = -th
    if (upper.current) upper.current.rotation.z = -th
    if (lower.current) lower.current.rotation.z = th // 구동 기어 쌍은 같은 크기(1:1)
    if (roller.current) roller.current.rotation.z = th * sim.G
    if (timeEl.current) timeEl.current.textContent = tt.toFixed(1)
    const b = tt > T1
    reading.current.voltage = sim.c * v
    reading.current.charging = sim.charging && !b
    if (b !== lastBraking.current) {
      lastBraking.current = b
      onBraking(b)
    }
  })

  // 기계부 치수(그룹 좌표, 축은 z 방향). 실물: 기둥 2개 사이 나사축에 기어와 메인 바퀴,
  // 구동 모터 기어가 축 기어에 맞물리고, 발전용 모터의 작은 바퀴가 메인 바퀴 아래 테두리에 닿는다.
  const YC = 0.7 // 축 높이
  const RW = 0.72 // 메인 바퀴 반지름
  const RG = 0.4 // 구동 기어 반지름(두 기어 같은 크기)
  const ZG = 0.74
  const ZW = -0.1
  const ZP = 1.05
  // ponytail: 발전기 바퀴는 1:1.15~1:4까지만 크기를 바꿔 그림(그 밖은 장면에 안 들어감). 회전 속도는 실제 G를 씀.
  const Rr = RW / Math.min(Math.max(sim.G, 1.15), 4)
  const Ry = YC - RW - Rr
  const DM: [number, number] = [2 * RG * Math.cos(0.7), YC - 2 * RG * Math.sin(0.7)]
  const ARM_TOP = FLOOR + 0.16
  const PILLAR_H = YC + 0.34 - FLOOR
  const PILLAR_Y = (YC + 0.34 + FLOOR) / 2
  const L = showLabels
  const gDigits = Number.isInteger(sim.G * 10) ? 1 : 2

  const pGearA: V3 = [0, YC, ZG]
  const pGearB: V3 = [DM[0], DM[1], ZG]
  const pDrive: V3 = [DM[0], DM[1], ZG + 0.4]
  const pShaft: V3 = [0, YC, 0]
  const pWheel: V3 = [0, YC, ZW]
  const pPillar: V3 = [0, PILLAR_Y, -ZP]
  const pRoller: V3 = [0, Ry, ZW]
  const pGen: V3 = [0, Ry, ZW + 0.4]
  const pArm: V3 = [0.45, FLOOR + 0.08, ZW + 0.4]
  const pBoard: V3 = [1.5, -1.44, 0.6]
  const pDriver: V3 = [0.75, -1.3, 0.3]
  const pIna1: V3 = [0.44, -1.46, 0.75]
  const pIna2: V3 = [0.1, -1.46, 0.75]
  const pArduino: V3 = [2.45, -1.44, 0.55]
  const pBattery: V3 = [1.3, -1.37, -0.7]

  return (
    <>
      {/* 스튜디오 셋업: 이음새 없는 배경(안개로 지평선 소거) + 소프트박스 환경광 + 키 라이트 그림자 + 접지 그림자 */}
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 10.5, 18]} />
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

      {/* 기계부: 실물 사진처럼 기어 쪽 끝이 앞-왼쪽으로 오도록 돌려 둠 */}
      <group position={M} rotation={[0, ROT, 0]}>
        {/* 기둥 2개(베어링) */}
        {[ZP, -ZP].map((z) => (
          <Part
            key={z}
            position={[0, PILLAR_Y, z]}
            box={[0.5, PILLAR_H, 0.16]}
            color={BROWN}
            mat={MAT.matte}
            label={z < 0 ? '지지대' : undefined}
            anchorAt={[0.2, PILLAR_H / 2 - 0.2, 0.08]}
            labelAt={lm(pPillar, 0.44, 1.58)}
            showLabel={L}
          >
            <mesh position={[0, YC - PILLAR_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.17, 0.17, 0.18, 32]} />
              <meshPhysicalMaterial color="#B8BEC6" {...MAT.steel} />
            </mesh>
          </Part>
        ))}

        <Part
          position={pShaft}
          cyl={{ r: 0.075, len: 2.3 }}
          color={SHAFT}
          mat={MAT.matte}
          label="나사축"
          anchorAt={[0, 0.075, -0.6]}
          labelAt={lm(pShaft, -0.17, 2.06)}
          showLabel={L}
        />

        {/* 구동부: 모터 기어 ↔ 축 기어(같은 크기) */}
        <Gear
          ref={upper}
          radius={RG}
          position={pGearA}
          label="바퀴 쪽 기어"
          anchorAt={[0, RG, 0.07]}
          labelAt={lm(pGearA, -2.09, 1.82)}
          showLabel={L}
        />
        <Gear
          ref={lower}
          radius={RG}
          position={pGearB}
          label="모터 쪽 기어"
          anchorAt={[0, -RG, 0.07]}
          labelAt={lm(pGearB, -2.19, -0.65)}
          showLabel={L}
        />
        <Part
          position={pDrive}
          cyl={{ r: 0.17, len: 0.5 }}
          color="#9AA3AD"
          mat={MAT.steel}
          label="구동용 모터"
          anchorAt={[0, 0.2, 0.2]}
          labelAt={lm(pDrive, -2.21, -0.17)}
          showLabel={L}
        >
          <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 24]} />
            <meshPhysicalMaterial color="#B8BEC6" {...MAT.steel} />
          </mesh>
          {[-0.13, 0.13].map((z) => (
            <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.23, 0.23, 0.11, 40]} />
              <meshPhysicalMaterial color="#F4B6C8" {...MAT.matte} />
            </mesh>
          ))}
        </Part>
        <Part position={[DM[0], (DM[1] + FLOOR) / 2, ZG + 0.4]} box={[0.42, DM[1] - FLOOR, 0.38]} color={BROWN} mat={MAT.matte} showLabel={false} />

        {/* 메인 바퀴: 보라 타이어 + 파란 옆면, 회전 마커 */}
        <Part
          ref={wheel}
          position={pWheel}
          cyl={{ r: RW, len: 0.3 }}
          color={PURPLE}
          mat={MAT.paint}
          label="메인 바퀴"
          anchorAt={[0, RW, 0]}
          labelAt={lm(pWheel, -1.35, 2.24)}
          showLabel={L}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[RW - 0.07, RW - 0.07, 0.315, 72]} />
            <meshPhysicalMaterial color={BLUE} {...MAT.paint} />
          </mesh>
          <mesh position={[RW * 0.5, 0, 0.16]}>
            <boxGeometry args={[RW * 0.7, 0.09, 0.012]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[RW * 0.8, 0, 0.165]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
            <meshStandardMaterial color="#F59E0B" />
          </mesh>
        </Part>

        {/* 발전부: 발전기 바퀴(크기 = 기어비)가 메인 바퀴 아래 테두리에 닿아 돌아감 */}
        <Part
          ref={roller}
          position={pRoller}
          cyl={{ r: Rr, len: 0.2 }}
          color={PURPLE}
          mat={MAT.paint}
          label={`발전기 바퀴 1:${sim.G.toFixed(gDigits)}`}
          anchorAt={[Rr * 0.9, Rr * 0.3, -0.1]}
          labelAt={lm(pRoller, 0.65, 1.1)}
          showLabel={L}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[Rr - 0.04, Rr - 0.04, 0.212, 48]} />
            <meshPhysicalMaterial color={BLUE} {...MAT.paint} />
          </mesh>
          <mesh position={[Rr * 0.5, 0, 0.11]}>
            <boxGeometry args={[Rr * 0.7, 0.05, 0.012]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </Part>
        <Part
          position={pGen}
          cyl={{ r: 0.13, len: 0.36 }}
          color="#9AA3AD"
          mat={MAT.steel}
          label="발전용 모터"
          anchorAt={[-0.1, -0.22, 0.14]}
          labelAt={lm(pGen, -2.32, -1.88)}
          showLabel={L}
        >
          <mesh position={[0, 0, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.3, 24]} />
            <meshPhysicalMaterial color="#B8BEC6" {...MAT.steel} />
          </mesh>
          {[-0.1, 0.1].map((z) => (
            <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.2, 0.09, 40]} />
              <meshPhysicalMaterial color={BROWN} {...MAT.matte} />
            </mesh>
          ))}
        </Part>
        <Part position={[0, (Ry + ARM_TOP) / 2, ZW + 0.4]} box={[0.38, Ry - ARM_TOP, 0.3]} color={BROWN} mat={MAT.matte} showLabel={false} />
        <Part
          position={pArm}
          box={[1.3, 0.16, 0.44]}
          color={BLUE}
          mat={MAT.paint}
          label="받침"
          anchorAt={[0.75, 0.37, 0.3]}
          labelAt={lm(pArm, -1.06, -1.88)}
          showLabel={L}
        >
          <mesh position={[0.75, 0.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.4, 0.4, 0.8]} />
            <meshPhysicalMaterial color={BLUE} {...MAT.paint} />
          </mesh>
        </Part>

        <Tag position={lm([0, 0, 0], -0.85, 2.72)} anchor={[0, YC + RW * 0.7, ZW + 0.16]} visible={braking} accent>
          <strong className="tag-accent">여기부터 마찰 브레이크</strong>
        </Tag>
      </group>

      {/* 오른쪽: 전기 부품 및 배선 */}
      <Part
        position={pBoard}
        box={[1.3, 0.1, 0.8]}
        color="#F5F2EB"
        mat={MAT.matte}
        label="브레드보드"
        anchorAt={[0.15, -0.04, 0.4]}
        labelAt={lw(pBoard, 1.52, -1.88)}
        showLabel={L}
      >
        <mesh position={[0, 0.052, 0]}>
          <boxGeometry args={[1.18, 0.01, 0.06]} />
          <meshStandardMaterial color="#CBD5E1" />
        </mesh>
        <mesh position={[0, 0.052, 0.3]}>
          <boxGeometry args={[1.18, 0.01, 0.03]} />
          <meshStandardMaterial color="#EF4444" />
        </mesh>
        <mesh position={[0, 0.052, -0.3]}>
          <boxGeometry args={[1.18, 0.01, 0.03]} />
          <meshStandardMaterial color="#3B82F6" />
        </mesh>
      </Part>

      <Part
        position={pDriver}
        box={[0.46, 0.24, 0.44]}
        color="#C62828"
        label="모터드라이버(L298N)"
        anchorAt={[0, -0.08, 0.22]}
        labelAt={lw(pDriver, 0.92, -2.3)}
        showLabel={L}
      >
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.22, 0.12, 0.3]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
      </Part>

      {/* INA219 전류·전압 센서 2개: ① 구동 쪽, ② 발전 쪽 (이름표는 하나로 묶음) */}
      {(
        [
          [pIna1, undefined, undefined],
          [pIna2, 'INA219 ①·②', lw(pIna2, 0.02, -1.88)],
        ] as const
      ).map(([pos, label, at]) => (
        <Part key={pos[0]} position={pos} box={[0.26, 0.05, 0.22]} color="#2563EB" mat={MAT.matte} label={label} anchorAt={[0, 0.03, 0]} labelAt={at} showLabel={L}>
          <mesh position={[-0.07, 0.06, 0]}>
            <boxGeometry args={[0.09, 0.08, 0.12]} />
            <meshStandardMaterial color="#16A34A" />
          </mesh>
        </Part>
      ))}

      <Part
        position={pArduino}
        box={[0.92, 0.1, 0.66]}
        color="#0F7A80"
        mat={MAT.matte}
        label="아두이노"
        anchorAt={[0.06, 0.05, 0.3]}
        labelAt={lw(pArduino, 2.73, -1.88)}
        showLabel={L}
      >
        <mesh position={[-0.36, 0.08, -0.14]}>
          <boxGeometry args={[0.18, 0.1, 0.16]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.5} roughness={0.2} />
        </mesh>
      </Part>

      {/* 배터리팩: 실물은 건전지 홀더 */}
      <Part
        position={pBattery}
        box={[1.1, 0.24, 0.56]}
        color="#20262D"
        mat={MAT.plastic}
        label="배터리팩 12V"
        anchorAt={[0, 0.12, 0]}
        labelAt={lw(pBattery, 0.88, 0.67)}
        showLabel={L}
      >
        {[-0.36, -0.12, 0.12, 0.36].map((x) => (
          <mesh key={x} position={[x, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.5, 20]} />
            <meshPhysicalMaterial color="#B87333" {...MAT.anodized} />
          </mesh>
        ))}
      </Part>

      <VoltageScreen position={[2.5, -0.22, -0.5]} showLabel={L} readingRef={reading} />

      {/* 배선: 발전용 모터 → INA219 ② → 브레드보드 / 배터리 → INA219 ① → L298N → 구동용 모터 */}
      <Line points={[toWorld([0, Ry, ZW + 0.58]), [pIna2[0] - 0.3, -1.4, pIna2[2]], pIna2, [pBoard[0] - 0.5, -1.38, pBoard[2]]]} color="#C2410C" lineWidth={2} />
      <Line points={[[pBattery[0] - 0.5, -1.3, pBattery[2] + 0.2], pIna1, pDriver, [-0.2, -1.4, 1.5], toWorld([DM[0], DM[1], ZG + 0.65])]} color="#1F5FBF" lineWidth={2} />
      <Line points={[[pArduino[0], -1.38, pArduino[2] - 0.3], [2.5, -0.85, -0.5]]} color="#0F7A80" lineWidth={1.8} />

      <OrbitControls makeDefault target={[0.12, -0.05, -0.2]} enablePan={false} minDistance={4} maxDistance={14} maxPolarAngle={Math.PI / 2 - 0.04} />
    </>
  )
}

export default function Scene3D({ sim, p }: { sim: Sim; p: Phys }) {
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
            <Canvas shadows camera={{ position: [0.22, 1.7, 8.6], fov: 42 }} dpr={[1, 2]} onCreated={() => setReady(true)}>
              <Rig sim={sim} p={p} paused={paused} showLabels={showLabels} braking={braking} onBraking={setBraking} timeEl={timeEl} />
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
            회전은 실제의 1/{1 / SPIN} 속도로 보여 줘요(시간은 실제와 같음). 재생 시각 <span ref={timeEl}>0.0</span> s
            (회생 구간 0~{(sim.charging ? sim.tEnd : 0).toFixed(1)} s, 이후 마찰 브레이크 {FRICTION_S} s)
            {` · 이 기어비의 발전기 바퀴 지름 ${((200 * p.r) / sim.G).toFixed(1)} cm`}
          </p>
          <p className="small scene-hint">
            {braking ? '이 속도 아래에서는 전압이 낮아 충전되지 않아요. 남은 에너지는 마찰 브레이크가 맡아요.' : ' '}
          </p>
        </>
      )}
    </section>
  )
}
