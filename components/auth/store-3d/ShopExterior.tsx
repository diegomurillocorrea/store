'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import { SHOP_PALETTE } from '@/components/auth/store-3d/types'

export function ShopExterior() {
  const lampRef = useRef<THREE.PointLight>(null)
  const elapsedRef = useRef(0)

  useFrame((_, delta) => {
    elapsedRef.current += delta
    if (lampRef.current) {
      lampRef.current.intensity = 2 + Math.sin(elapsedRef.current * 1.4) * 0.12
    }
  })

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.4]} receiveShadow>
        <planeGeometry args={[16, 11]} />
        <meshStandardMaterial color={SHOP_PALETTE.pavement} roughness={0.86} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -2.5]} receiveShadow>
        <planeGeometry args={[16, 9]} />
        <meshStandardMaterial color="#8a9a8e" roughness={0.9} />
      </mesh>

      <group position={[-2.8, 0, 2.3]}>
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.18, 0.28, 14]} />
          <meshStandardMaterial color={SHOP_PALETTE.pot} roughness={0.68} />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshStandardMaterial color={SHOP_PALETTE.foliage} roughness={0.72} />
        </mesh>
      </group>

      <group position={[2.65, 1.95, 1.78]}>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.1, 0.35, 0.1]} />
          <meshStandardMaterial color={SHOP_PALETTE.windowFrame} metalness={0.55} roughness={0.38} />
        </mesh>
        <mesh position={[0, 0.2, 0.12]}>
          <sphereGeometry args={[0.11, 14, 14]} />
          <meshStandardMaterial
            color={SHOP_PALETTE.warmLight}
            emissive={SHOP_PALETTE.warmLight}
            emissiveIntensity={1.3}
          />
        </mesh>
        <pointLight ref={lampRef} position={[0, 0.2, 0.25]} intensity={2} color={SHOP_PALETTE.warmLight} distance={5.5} decay={2} />
      </group>

      <group position={[2.95, 0.55, 1.65]} rotation={[0, -0.35, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.38, 0.3, 0.2]} />
          <meshStandardMaterial color={SHOP_PALETTE.emerald} roughness={0.52} />
        </mesh>
        <mesh position={[0, 0.22, 0.04]}>
          <boxGeometry args={[0.32, 0.09, 0.02]} />
          <meshStandardMaterial color={SHOP_PALETTE.cream} roughness={0.75} />
        </mesh>
      </group>

      <mesh position={[-2.2, 0.18, 2.05]} rotation={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.32, 0.26, 0.16]} />
        <meshStandardMaterial color={SHOP_PALETTE.blush} roughness={0.55} />
      </mesh>
    </group>
  )
}
