'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import { SHOP_PALETTE } from '@/components/auth/store-3d/types'

const BASE = 0.28

function ShelfProduct({
  position,
  color,
  size = [0.18, 0.22, 0.14] as [number, number, number],
}: {
  position: [number, number, number]
  color: string
  size?: [number, number, number]
}) {
  const ref = useRef<THREE.Mesh>(null)
  const phase = useRef(position[0] * 2 + position[1])
  const elapsedRef = useRef(0)

  useFrame((_, delta) => {
    if (!ref.current) return
    elapsedRef.current += delta
    ref.current.rotation.y = Math.sin(elapsedRef.current * 0.5 + phase.current) * 0.05
  })

  return (
    <mesh ref={ref} position={position} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.42} metalness={0.1} emissive={color} emissiveIntensity={0.07} />
    </mesh>
  )
}

function InteriorShelf({ position, products }: { position: [number, number, number]; products: string[] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.65, 0.07, 0.4]} />
        <meshStandardMaterial color={SHOP_PALETTE.doorFrame} roughness={0.52} metalness={0.12} />
      </mesh>
      <mesh position={[0, -0.04, -0.08]} castShadow>
        <boxGeometry args={[1.6, 0.04, 0.06]} />
        <meshStandardMaterial color={SHOP_PALETTE.charcoal} roughness={0.6} />
      </mesh>
      {products.map((color, i) => (
        <ShelfProduct
          key={i}
          position={[-0.55 + i * 0.38, 0.18, 0.06]}
          color={color}
          size={[0.17, 0.22 + (i % 2) * 0.05, 0.13]}
        />
      ))}
    </group>
  )
}

export function ShopInterior() {
  return (
    <group position={[0, BASE, 0]}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[3.9, 0.04, 3]} />
        <meshStandardMaterial color={SHOP_PALETTE.floor} roughness={0.58} metalness={0.05} />
      </mesh>

      <InteriorShelf position={[-1.25, 0.9, -0.85]} products={[SHOP_PALETTE.product1, SHOP_PALETTE.product2, SHOP_PALETTE.product3]} />
      <InteriorShelf position={[0, 1.55, -0.85]} products={[SHOP_PALETTE.product4, SHOP_PALETTE.product5, SHOP_PALETTE.product1]} />
      <InteriorShelf position={[1.25, 0.9, -0.85]} products={[SHOP_PALETTE.product3, SHOP_PALETTE.product2, SHOP_PALETTE.product4]} />

      <group position={[0.95, 0, 0.55]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.45, 1, 0.58]} />
          <meshStandardMaterial color={SHOP_PALETTE.doorFrame} roughness={0.48} metalness={0.18} />
        </mesh>
        <mesh position={[0, 1.04, 0]} castShadow>
          <boxGeometry args={[1.5, 0.07, 0.62]} />
          <meshStandardMaterial color={SHOP_PALETTE.wallTrim} roughness={0.32} metalness={0.25} />
        </mesh>
        <mesh position={[-0.38, 1.2, -0.06]} castShadow>
          <boxGeometry args={[0.48, 0.34, 0.05]} />
          <meshStandardMaterial
            color={SHOP_PALETTE.emerald}
            emissive={SHOP_PALETTE.emerald}
            emissiveIntensity={0.75}
            roughness={0.18}
          />
        </mesh>
        <ShelfProduct position={[0.22, 1.12, 0.12]} color={SHOP_PALETTE.cream} size={[0.15, 0.2, 0.11]} />
        <ShelfProduct position={[0.48, 1.1, 0.06]} color={SHOP_PALETTE.product2} size={[0.13, 0.17, 0.12]} />
      </group>

      <mesh position={[0, 1.4, -1.48]} receiveShadow>
        <boxGeometry args={[3.7, 2.6, 0.06]} />
        <meshStandardMaterial color={SHOP_PALETTE.interiorWall} roughness={0.88} />
      </mesh>

      <pointLight position={[0, 2.1, 0.2]} intensity={2.8} color={SHOP_PALETTE.warmLight} distance={6.5} decay={2} />
      <pointLight position={[-1.4, 1.9, 0.4]} intensity={1.4} color={SHOP_PALETTE.warmLight} distance={4.5} decay={2} />
      <pointLight position={[1.4, 1.9, 0.4]} intensity={1.4} color={SHOP_PALETTE.warmLight} distance={4.5} decay={2} />
    </group>
  )
}
