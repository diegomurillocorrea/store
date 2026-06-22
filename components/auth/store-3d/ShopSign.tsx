'use client'

import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import { SHOP_PALETTE } from '@/components/auth/store-3d/types'

const BASE = 0.28

function AwningStripes() {
  const stripes = []
  for (let i = 0; i < 9; i++) {
    stripes.push(
      <mesh key={i} position={[-1.2 + i * 0.3, 0, 0.05 + i * 0.002]}>
        <boxGeometry args={[0.14, 0.42, 0.05]} />
        <meshStandardMaterial
          color={i % 2 === 0 ? SHOP_PALETTE.awningA : SHOP_PALETTE.awningB}
          roughness={0.55}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-4}
        />
      </mesh>
    )
  }
  return <group>{stripes}</group>
}

export function ShopSign() {
  const glowRef = useRef<THREE.PointLight>(null)
  const bracketRef = useRef<THREE.Group>(null)
  const elapsedRef = useRef(0)

  useFrame((_, delta) => {
    elapsedRef.current += delta
    if (glowRef.current) {
      glowRef.current.intensity = 1.5 + Math.sin(elapsedRef.current * 1.2) * 0.15
    }
  })

  return (
    <group position={[0, BASE + 2.72, 1.82]}>
      <mesh position={[-1.05, -0.15, -0.08]} castShadow>
        <boxGeometry args={[0.1, 0.35, 0.1]} />
        <meshStandardMaterial color={SHOP_PALETTE.windowFrame} metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[1.05, -0.15, -0.08]} castShadow>
        <boxGeometry args={[0.1, 0.35, 0.1]} />
        <meshStandardMaterial color={SHOP_PALETTE.windowFrame} metalness={0.4} roughness={0.45} />
      </mesh>

      <group ref={bracketRef}>
        <mesh position={[0, 0, -0.06]} castShadow>
          <boxGeometry args={[2.55, 0.62, 0.12]} />
          <meshStandardMaterial color={SHOP_PALETTE.signBg} roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0, -0.14]} castShadow>
          <boxGeometry args={[2.65, 0.72, 0.06]} />
          <meshStandardMaterial color={SHOP_PALETTE.charcoal} roughness={0.55} />
        </mesh>

        <Html
          transform
          position={[0, 0, 0.1]}
          center
          distanceFactor={5}
          zIndexRange={[100, 0]}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          <div className="w-48 select-none text-center antialiased subpixel-antialiased">
            <p className="text-2xl font-bold tracking-wide text-emerald-500">STORE</p>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-stone-100">POS · INVENTARIO</p>
          </div>
        </Html>

        <pointLight ref={glowRef} position={[0, 0, 0.55]} intensity={1.5} color={SHOP_PALETTE.emerald} distance={3.5} />
      </group>

      <group position={[0, -0.48, 0.16]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[2.7, 0.08, 0.55]} />
          <meshStandardMaterial color={SHOP_PALETTE.roofTrim} roughness={0.38} metalness={0.2} />
        </mesh>
        <AwningStripes />
      </group>
    </group>
  )
}
