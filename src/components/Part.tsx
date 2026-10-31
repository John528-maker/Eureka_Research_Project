import type { ReactNode, Ref } from 'react'
import { Html } from '@react-three/drei'
import type { Group } from 'three'

type V3 = [number, number, number]

interface Props {
  position: V3
  label?: string
  labelAt?: V3 // 부품 기준 이름표 위치
  showLabel: boolean
  box?: V3
  cyl?: { r: number; len: number } // z축 방향 원기둥
  color?: string
  ref?: Ref<Group>
  children?: ReactNode
}

// Html은 자체 React 루트를 가지므로 렌더 중 언마운트하면 경고가 난다. 숨김은 CSS로 처리.
export function Tag({ position, visible = true, children }: { position: V3; visible?: boolean; children: ReactNode }) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} className="tag3d" style={{ visibility: visible ? 'visible' : 'hidden' }}>
      {children}
    </Html>
  )
}

export default function Part({ position, label, labelAt = [0, 0.3, 0], showLabel, box, cyl, color, ref, children }: Props) {
  return (
    <group position={position}>
      <group ref={ref}>
        {box && (
          <mesh>
            <boxGeometry args={box} />
            <meshStandardMaterial color={color} />
          </mesh>
        )}
        {cyl && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[cyl.r, cyl.r, cyl.len, 48]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )}
        {children}
      </group>
      {label && <Tag position={labelAt} visible={showLabel}>{label}</Tag>}
    </group>
  )
}
