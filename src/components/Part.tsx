import type { ReactNode, Ref } from 'react'
import { Html, Line, RoundedBox } from '@react-three/drei'
import type { Group } from 'three'

export type V3 = [number, number, number]

/** 재질 프리셋: 스튜디오 조명(Environment)에서 읽히는 PBR 값 */
export const MAT = {
  paint: { roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 },
  matte: { roughness: 0.78, metalness: 0.02, clearcoat: 0, clearcoatRoughness: 0 },
  steel: { roughness: 0.32, metalness: 1, clearcoat: 0, clearcoatRoughness: 0 },
  anodized: { roughness: 0.28, metalness: 0.75, clearcoat: 0.4, clearcoatRoughness: 0.2 },
  plastic: { roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25 },
} as const
export type Mat = (typeof MAT)[keyof typeof MAT]

interface TagProps {
  position: V3
  anchor?: V3
  visible?: boolean
  accent?: boolean
  children: ReactNode
}

// Html은 자체 React 루트를 가지므로 렌더 중 언마운트하지 않고 CSS로 숨김/표시 전환.
export function Tag({ position, anchor, visible = true, accent = false, children }: TagProps) {
  return (
    <group>
      {anchor && visible && (
        <>
          <Line points={[anchor, position]} color={accent ? '#C2410C' : '#5C6670'} lineWidth={1} />
          <mesh position={anchor}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshBasicMaterial color={accent ? '#C2410C' : '#1F5FBF'} />
          </mesh>
        </>
      )}
      <Html
        position={position}
        center
        zIndexRange={[20, 0]}
        className={`tag3d${accent ? ' tag3d-accent' : ''}`}
        style={{ opacity: visible ? 1 : 0, visibility: visible ? 'visible' : 'hidden' }}
      >
        {children}
      </Html>
    </group>
  )
}

interface Props {
  position: V3
  label?: string
  labelAt?: V3 // 부품 기준 이름표 위치
  anchorAt?: V3 // 부품 기준 지시선 시작점
  showLabel: boolean
  box?: V3
  cyl?: { r: number; len: number } // z축 방향 원기둥
  color?: string
  mat?: Mat
  ref?: Ref<Group>
  children?: ReactNode
}

export default function Part({
  position,
  label,
  labelAt = [0, 0.45, 0],
  anchorAt = [0, 0, 0],
  showLabel,
  box,
  cyl,
  color,
  mat = MAT.plastic,
  ref,
  children,
}: Props) {
  return (
    <group position={position}>
      <group ref={ref}>
        {box && (
          <RoundedBox args={box} radius={Math.min(0.025, Math.min(...box) * 0.2)} smoothness={4} castShadow receiveShadow>
            <meshPhysicalMaterial color={color} {...mat} />
          </RoundedBox>
        )}
        {cyl && (
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[cyl.r, cyl.r, cyl.len, 72]} />
            <meshPhysicalMaterial color={color} {...mat} />
          </mesh>
        )}
        {children}
      </group>
      {label && (
        <Tag position={labelAt} anchor={anchorAt} visible={showLabel}>
          {label}
        </Tag>
      )}
    </group>
  )
}
