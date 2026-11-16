import { useEffect, useMemo, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { MAT, Tag, type V3 } from './Part.tsx'

export interface VoltageReading {
  voltage: number
  charging: boolean
}

interface Props {
  position: V3
  showLabel: boolean
  readingRef: RefObject<VoltageReading>
}

const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif'

function createDisplay() {
  const canvas = document.createElement('canvas')
  // 패널(1.1 × 0.64)과 같은 비율로 그려 글자와 화면이 함께 원근 변환되게 한다.
  canvas.width = 880
  canvas.height = 512
  const context = canvas.getContext('2d')
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  let lastReading = ''

  const draw = ({ voltage, charging }: VoltageReading) => {
    const value = voltage.toFixed(1)
    const key = `${value}:${charging}`
    if (!context || key === lastReading) return
    lastReading = key

    const color = charging ? '#8EF0A0' : '#FDBA74'
    context.fillStyle = '#0B141B'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    context.fillStyle = '#CBD5E1'
    context.font = `500 48px ${FONT}`
    context.fillText('기전력 e(t)', 54, 82)
    context.fillStyle = '#263641'
    context.fillRect(54, 134, 772, 2)

    context.fillStyle = color
    context.textAlign = 'center'
    context.font = `800 144px ${FONT}`
    context.fillText(`${value} V`, 440, 260, 772)

    context.fillStyle = charging ? '#142C23' : '#30251D'
    context.fillRect(54, 374, 772, 86)
    context.fillStyle = color
    context.beginPath()
    context.arc(94, 417, 10, 0, 2 * Math.PI)
    context.fill()
    context.font = `600 44px ${FONT}`
    context.fillText(charging ? '회생 충전' : '충전 중지', 440, 417)
    texture.needsUpdate = true
  }

  return { texture, draw }
}

export default function VoltageScreen({ position, showLabel, readingRef }: Props) {
  const display = useMemo(createDisplay, [])

  useEffect(() => () => display.texture.dispose(), [display])
  useFrame(() => display.draw(readingRef.current))

  return (
    <group position={position} rotation={[0, -0.18, 0]}>
      {/* 유광 베젤 */}
      <RoundedBox args={[1.24, 0.78, 0.08]} radius={0.03} smoothness={4} castShadow>
        <meshPhysicalMaterial color="#111318" {...MAT.paint} />
      </RoundedBox>
      {/* 숫자와 상태를 3D 패널 자체의 텍스처로 표시한다. */}
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[1.1, 0.64]} />
        <meshBasicMaterial map={display.texture} toneMapped={false} />
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
      <Tag position={[0.4, 0.72, 0]} anchor={[0, 0.39, 0]} visible={showLabel}>
        출력 화면
      </Tag>
    </group>
  )
}
