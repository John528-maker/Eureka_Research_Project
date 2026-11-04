import { useMemo, type Ref } from 'react'
import { ExtrudeGeometry, Shape, type Group } from 'three'
import { MAT, Tag, type V3 } from './Part.tsx'

interface Props {
  radius: number // 피치 반지름
  position: V3
  label: string
  labelAt: V3
  anchorAt?: V3
  showLabel: boolean
  ref?: Ref<Group>
}

const DEPTH = 0.14
const TOOTH = 0.052

export default function Gear({ radius, position, label, labelAt, anchorAt, showLabel, ref }: Props) {
  const geo = useMemo(() => {
    // 같은 이 크기(모듈)로 맞물리도록 잇수는 반지름에 비례
    const n = Math.max(8, Math.round(radius * 36))
    const s = new Shape()
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const w = Math.PI / n
      const pts: [number, number][] = [
        [radius - TOOTH, a],
        [radius + TOOTH, a + w * 0.25],
        [radius + TOOTH, a + w * 0.75],
        [radius - TOOTH, a + w],
      ]
      pts.forEach(([rr, aa], j) => {
        const x = rr * Math.cos(aa)
        const y = rr * Math.sin(aa)
        if (i === 0 && j === 0) s.moveTo(x, y)
        else s.lineTo(x, y)
      })
      s.absarc(0, 0, radius - TOOTH, a + w, a + 2 * w, false)
    }
    // 베벨로 모서리에 하이라이트가 맺혀 톱니 윤곽이 조명만으로 읽힌다
    const g = new ExtrudeGeometry(s, {
      depth: DEPTH - 0.02,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    })
    g.translate(0, 0, -(DEPTH - 0.02) / 2)
    return g
  }, [radius])

  const hubR = Math.min(0.11, radius * 0.32)

  return (
    <group position={position}>
      <group ref={ref}>
        <mesh geometry={geo} castShadow receiveShadow>
          <meshPhysicalMaterial color="#1F5FBF" {...MAT.anodized} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[hubR, hubR, DEPTH + 0.03, 32]} />
          <meshPhysicalMaterial color="#D8DEE6" {...MAT.steel} />
        </mesh>
        {/* 회전 방향·속도를 읽기 위한 비대칭 기준 마커 */}
        <mesh position={[radius * 0.48, 0, DEPTH / 2 + 0.006]}>
          <boxGeometry args={[radius * 0.62, 0.05, 0.012]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.6} />
        </mesh>
        <mesh position={[radius * 0.7, 0, DEPTH / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.036, 0.036, 0.016, 20]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.4} />
        </mesh>
      </group>
      <Tag position={labelAt} anchor={anchorAt ?? [0, 0, DEPTH / 2]} visible={showLabel}>
        {label}
      </Tag>
    </group>
  )
}
