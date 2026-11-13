import type { Ref } from 'react'
import { Html, RoundedBox } from '@react-three/drei'
import { MAT, Tag, type V3 } from './Part.tsx'

interface Props {
  position: V3
  showLabel: boolean
  valueRef: Ref<HTMLSpanElement>
  braking?: boolean
}

export default function VoltageScreen({ position, showLabel, valueRef, braking = false }: Props) {
  return (
    <group position={position} rotation={[0, -0.18, 0]}>
      {/* 유광 베젤 */}
      <RoundedBox args={[1.24, 0.78, 0.08]} radius={0.03} smoothness={4} castShadow>
        <meshPhysicalMaterial color="#111318" {...MAT.paint} />
      </RoundedBox>
      {/* 디스플레이 패널 */}
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[1.1, 0.64]} />
        <meshBasicMaterial color="#0B141B" />
      </mesh>
      {/* 거치대 */}
      <mesh position={[0, -0.64, -0.06]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.56, 24]} />
        <meshPhysicalMaterial color="#B8BEC6" {...MAT.steel} />
      </mesh>
      <mesh position={[0, -0.92, -0.04]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.28, 0.05, 48]} />
        <meshPhysicalMaterial color="#2A2F36" {...MAT.paint} />
      </mesh>
      <Html position={[0, 0, 0.06]} center zIndexRange={[20, 0]} className={`tft${braking ? ' tft-low' : ''}`}>
        <span className="tft-sub">{braking ? '충전 중지' : '기전력 e(t)'}</span>
        <span ref={valueRef} className="tft-val">
          0.0 V
        </span>
      </Html>
      <Tag position={[0.4, 0.72, 0]} anchor={[0, 0.39, 0]} visible={showLabel}>
        출력 화면
      </Tag>
    </group>
  )
}
