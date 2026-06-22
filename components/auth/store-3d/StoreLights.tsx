'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import { SHOP_PALETTE } from '@/components/auth/store-3d/types'

export function StoreLights() {
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const fillRef = useRef<THREE.DirectionalLight>(null)
  const rimRef = useRef<THREE.DirectionalLight>(null)
  const elapsedRef = useRef(0)

  useFrame((_, delta) => {
    elapsedRef.current += delta
    const t = elapsedRef.current
    if (sunRef.current) sunRef.current.intensity = 2.1 + Math.sin(t * 0.5) * 0.08
    if (fillRef.current) fillRef.current.intensity = 1 + Math.sin(t * 0.7 + 1) * 0.05
    if (rimRef.current) rimRef.current.intensity = 0.55 + Math.sin(t * 0.9) * 0.04
  })

  return (
    <>
      <ambientLight intensity={0.55} color={SHOP_PALETTE.cream} />
      <hemisphereLight args={[SHOP_PALETTE.cream, '#5a6570', 0.6]} />

      <directionalLight
        ref={sunRef}
        position={[7, 9, 6]}
        intensity={2.1}
        color={SHOP_PALETTE.warmLight}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={22}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.00025}
        shadow-normalBias={0.015}
      />

      <directionalLight
        ref={fillRef}
        position={[-5, 6, 4]}
        intensity={1}
        color="#ffffff"
      />

      <directionalLight
        ref={rimRef}
        position={[0, 3, -6]}
        intensity={0.55}
        color={SHOP_PALETTE.emerald}
      />

      <spotLight
        position={[0, 7, 5]}
        angle={0.5}
        penumbra={0.75}
        intensity={1.6}
        color={SHOP_PALETTE.warmLight}
      />
    </>
  )
}
