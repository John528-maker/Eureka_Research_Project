import type { Ref } from 'react'
import { Html } from '@react-three/drei'
import { Tag } from './Part.tsx'

interface Props {
  position: [number, number, number]
  showLabel: boolean
  valueRef: Ref<HTMLSpanElement>
}

export default function VoltageScreen({ position, showLabel, valueRef }: Props) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.0, 0.64, 0.06]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
      <mesh position={[0, -0.6, -0.1]}>
        <boxGeometry args={[0.08, 0.6, 0.08]} />
        <meshStandardMaterial color="#5C6670" />
      </mesh>
      <Html position={[0, 0, 0.04]} center zIndexRange={[20, 0]} className="tft">
        <span ref={valueRef}>0.0 V</span>
      </Html>
      <Tag position={[0, 0.5, 0]} visible={showLabel}>출력 화면</Tag>
    </group>
  )
}
