import { useMemo, type Ref } from 'react'
import { ExtrudeGeometry, Shape, type Group } from 'three'
import { Tag } from './Part.tsx'

interface Props {
  radius: number // 피치 반지름
  position: [number, number, number]
  label: string
  labelAt: [number, number, number]
  showLabel: boolean
  ref?: Ref<Group>
}

const DEPTH = 0.12
const TOOTH = 0.05

export default function Gear({ radius, position, label, labelAt, showLabel, ref }: Props) {
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
    const g = new ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: false, curveSegments: 4 })
    g.translate(0, 0, -DEPTH / 2)
    return g
  }, [radius])

  return (
    <group position={position}>
      <group ref={ref}>
        <mesh geometry={geo}>
          <meshStandardMaterial color="#1F5FBF" />
        </mesh>
        <mesh position={[radius * 0.5, 0, DEPTH / 2 + 0.005]}>
          <boxGeometry args={[radius * 0.6, 0.04, 0.01]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>
      <Tag position={labelAt} visible={showLabel}>{label}</Tag>
    </group>
  )
}
