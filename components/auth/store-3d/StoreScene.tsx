'use client'

import { ContactShadows } from '@react-three/drei'
import { ShopBuilding } from '@/components/auth/store-3d/ShopBuilding'
import { ShopExterior } from '@/components/auth/store-3d/ShopExterior'
import { ShopInterior } from '@/components/auth/store-3d/ShopInterior'
import { ShopSign } from '@/components/auth/store-3d/ShopSign'
import { StoreControls } from '@/components/auth/store-3d/StoreControls'
import { StoreLights } from '@/components/auth/store-3d/StoreLights'

type StoreSceneProps = {
  onDragChange?: (isDragging: boolean) => void
}

export function StoreScene({ onDragChange }: StoreSceneProps) {
  return (
    <>
      <color attach="background" args={['#5c6b72']} />
      <fog attach="fog" args={['#6b7a82', 11, 30]} />

      <StoreLights />
      <ShopExterior />

      <group position={[0, 0, 0]}>
        <ShopBuilding />
        <ShopInterior />
        <ShopSign />
      </group>

      <ContactShadows
        position={[0, 0.02, 1.3]}
        opacity={0.38}
        scale={12}
        blur={4.5}
        far={4.5}
        color="#1a1510"
        resolution={512}
      />

      <StoreControls onDragChange={onDragChange} />
    </>
  )
}
