'use client'

import { SHOP_PALETTE } from '@/components/auth/store-3d/types'

const W = 4.4
const D = 3.5
const H = 2.75
const WALL = 0.22
const BASE = 0.28
const halfW = W / 2
const halfD = D / 2
const FACADE_Z = halfD - WALL / 2
const WALL_FRONT_Z = halfD
const OVERLAY_GAP = 0.015
const OVERLAY_DEPTH = 0.1
const OVERLAY_Z = WALL_FRONT_Z + OVERLAY_GAP + OVERLAY_DEPTH / 2

const overlayProps = {
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -4,
} as const

const wallMat = { color: SHOP_PALETTE.wall, roughness: 0.78, metalness: 0.04 }
const trimMat = { color: SHOP_PALETTE.wallTrim, roughness: 0.72, metalness: 0.06 }
const frameMat = { color: SHOP_PALETTE.windowFrame, roughness: 0.5, metalness: 0.12 }

function WindowBay({
  position,
  products,
}: {
  position: [number, number, number]
  products: string[]
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[1.18, 1.28, 0.24]} />
        <meshStandardMaterial color="#d8cfc4" roughness={0.85} />
      </mesh>

      <mesh position={[0, 0, 0.04]} castShadow>
        <boxGeometry args={[1.22, 1.32, 0.14]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>

      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[0.96, 1.06, 0.03]} />
        <meshStandardMaterial
          color={SHOP_PALETTE.glass}
          transparent
          opacity={0.32}
          roughness={0.04}
          metalness={0.15}
        />
      </mesh>

      <mesh position={[0, 0, 0.16]}>
        <boxGeometry args={[0.05, 1.06, 0.03]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>

      <mesh position={[0, -0.72, 0.14]} castShadow receiveShadow>
        <boxGeometry args={[1.28, 0.1, 0.22]} />
        <meshStandardMaterial {...trimMat} />
      </mesh>

      <mesh position={[0, 0.72, 0.1]} castShadow>
        <boxGeometry args={[1.24, 0.08, 0.16]} />
        <meshStandardMaterial {...frameMat} />
      </mesh>

      {products.map((color, i) => (
        <mesh key={i} position={[-0.3 + i * 0.3, -0.05 + (i % 2) * 0.12, 0.02]} castShadow>
          <boxGeometry args={[0.15, 0.2 + (i % 2) * 0.05, 0.12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} roughness={0.42} />
        </mesh>
      ))}
    </group>
  )
}

export function ShopBuilding() {
  const bodyY = BASE + H / 2

  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 1.6, 0.24, D + 1.8]} />
        <meshStandardMaterial color={SHOP_PALETTE.curb} roughness={0.82} metalness={0.08} />
      </mesh>

      <mesh position={[0, 0.26, 0]} receiveShadow>
        <boxGeometry args={[W + 0.9, 0.08, D + 1.1]} />
        <meshStandardMaterial color={SHOP_PALETTE.pavement} roughness={0.75} />
      </mesh>

      <mesh position={[-halfW + WALL / 2, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL, H, D]} />
        <meshStandardMaterial {...trimMat} />
      </mesh>

      <mesh position={[halfW - WALL / 2, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL, H, D]} />
        <meshStandardMaterial {...trimMat} />
      </mesh>

      <mesh position={[0, bodyY, -halfD + WALL / 2]} castShadow receiveShadow>
        <boxGeometry args={[W, H, WALL]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>

      <mesh position={[0, bodyY, -halfD + WALL + 0.04]} receiveShadow>
        <boxGeometry args={[1.2, 0.8, 0.06]} />
        <meshStandardMaterial color={SHOP_PALETTE.charcoal} roughness={0.6} metalness={0.25} />
      </mesh>

      <mesh position={[-halfW + 0.08, bodyY, OVERLAY_Z]} castShadow>
        <boxGeometry args={[0.16, H, OVERLAY_DEPTH]} />
        <meshStandardMaterial
          color={SHOP_PALETTE.emerald}
          roughness={0.55}
          metalness={0.1}
          {...overlayProps}
        />
      </mesh>
      <mesh position={[halfW - 0.08, bodyY, OVERLAY_Z]} castShadow>
        <boxGeometry args={[0.16, H, OVERLAY_DEPTH]} />
        <meshStandardMaterial
          color={SHOP_PALETTE.emerald}
          roughness={0.55}
          metalness={0.1}
          {...overlayProps}
        />
      </mesh>

      <mesh position={[-1.38, bodyY, FACADE_Z]} castShadow receiveShadow>
        <boxGeometry args={[0.95, H, WALL]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[1.38, bodyY, FACADE_Z]} castShadow receiveShadow>
        <boxGeometry args={[0.95, H, WALL]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[0, BASE + 0.95, OVERLAY_Z]} castShadow>
        <boxGeometry args={[1.05, 0.65, OVERLAY_DEPTH]} />
        <meshStandardMaterial {...trimMat} {...overlayProps} />
      </mesh>
      <mesh position={[-0.58, BASE + 2.15, OVERLAY_Z]} castShadow>
        <boxGeometry args={[0.62, 0.62, OVERLAY_DEPTH]} />
        <meshStandardMaterial {...wallMat} {...overlayProps} />
      </mesh>
      <mesh position={[0.58, BASE + 2.15, OVERLAY_Z]} castShadow>
        <boxGeometry args={[0.62, 0.62, OVERLAY_DEPTH]} />
        <meshStandardMaterial {...wallMat} {...overlayProps} />
      </mesh>

      <WindowBay
        position={[-1.38, BASE + 1.62, WALL_FRONT_Z + OVERLAY_GAP + 0.07]}
        products={[SHOP_PALETTE.product1, SHOP_PALETTE.product2, SHOP_PALETTE.product3]}
      />
      <WindowBay
        position={[1.38, BASE + 1.62, WALL_FRONT_Z + OVERLAY_GAP + 0.07]}
        products={[SHOP_PALETTE.product4, SHOP_PALETTE.product5, SHOP_PALETTE.product1]}
      />

      <group position={[0, BASE + 1.08, WALL_FRONT_Z + OVERLAY_GAP + 0.09]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.96, 1.62, 0.18]} />
          <meshStandardMaterial color={SHOP_PALETTE.doorFrame} roughness={0.58} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0, 0.1]} castShadow>
          <boxGeometry args={[0.78, 1.44, 0.1]} />
          <meshStandardMaterial color={SHOP_PALETTE.door} roughness={0.68} metalness={0.05} />
        </mesh>
        <mesh position={[0, -0.55, 0.16]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.08, 0.22]} />
          <meshStandardMaterial {...trimMat} />
        </mesh>
        <mesh position={[0.26, -0.05, 0.18]}>
          <sphereGeometry args={[0.045, 14, 14]} />
          <meshStandardMaterial
            color={SHOP_PALETTE.emerald}
            emissive={SHOP_PALETTE.emerald}
            emissiveIntensity={0.45}
            metalness={0.85}
            roughness={0.15}
          />
        </mesh>
      </group>

      <mesh position={[0, BASE + 0.34, halfD + 0.38]} receiveShadow>
        <boxGeometry args={[1.25, 0.1, 0.42]} />
        <meshStandardMaterial color={SHOP_PALETTE.pavement} roughness={0.7} />
      </mesh>
      <mesh position={[0, BASE + 0.22, halfD + 0.58]} receiveShadow>
        <boxGeometry args={[1.25, 0.1, 0.1]} />
        <meshStandardMaterial color={SHOP_PALETTE.curb} roughness={0.8} />
      </mesh>

      <mesh position={[0, BASE + H + 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.35, 0.12, D + 0.55]} />
        <meshStandardMaterial color={SHOP_PALETTE.roof} roughness={0.48} metalness={0.18} />
      </mesh>

      <group position={[0, BASE + H + 0.12, 0]}>
        <mesh position={[-1.15, 0.275, -0.01]} rotation={[0, 0, 0.32]} castShadow>
          <boxGeometry args={[2.5, 0.16, D + 0.65]} />
          <meshStandardMaterial color={SHOP_PALETTE.roof} roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[1.15, 0.275, 0.01]} rotation={[0, 0, -0.32]} castShadow>
          <boxGeometry args={[2.5, 0.16, D + 0.65]} />
          <meshStandardMaterial color={SHOP_PALETTE.roof} roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.58, 0.04]} castShadow>
          <boxGeometry args={[0.24, 0.12, D + 0.45]} />
          <meshStandardMaterial
            color={SHOP_PALETTE.roofTrim}
            roughness={0.38}
            metalness={0.25}
            {...overlayProps}
          />
        </mesh>
        <mesh position={[0, 0.1, halfD + 0.36]} castShadow>
          <boxGeometry args={[W + 0.55, 0.12, 0.55]} />
          <meshStandardMaterial
            color={SHOP_PALETTE.roofTrim}
            roughness={0.4}
            metalness={0.22}
            {...overlayProps}
          />
        </mesh>
        <mesh position={[0, 0.08, -halfD - 0.16]} castShadow>
          <boxGeometry args={[W + 0.4, 0.1, 0.28]} />
          <meshStandardMaterial color={SHOP_PALETTE.roof} roughness={0.5} />
        </mesh>
      </group>

    </group>
  )
}
