'use client'

import { Canvas } from '@react-three/fiber'
import clsx from 'clsx'
import { Suspense, useState } from 'react'
import * as THREE from 'three'
import { StoreScene } from '@/components/auth/store-3d/StoreScene'

function configureRenderer(gl: THREE.WebGLRenderer) {
  gl.outputColorSpace = THREE.SRGBColorSpace
  gl.toneMapping = THREE.ACESFilmicToneMapping
  gl.toneMappingExposure = 1
  gl.shadowMap.enabled = true
  gl.shadowMap.type = THREE.PCFShadowMap
}

export function AuthStoreScene() {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div
      className={clsx(
        'absolute inset-0 bg-[#5c6b72] select-none',
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      )}
    >
      <Canvas
        shadows="percentage"
        dpr={[1, 2.5]}
        className="block h-full w-full"
        style={{ width: '100%', height: '100%', display: 'block' }}
        camera={{ position: [5.4, 3.4, 7], fov: 38, near: 0.1, far: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          precision: 'highp',
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: true,
        }}
        onCreated={({ gl }) => {
          configureRenderer(gl)
        }}
      >
        <Suspense fallback={null}>
          <StoreScene onDragChange={setIsDragging} />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/25 px-3 py-1 text-[11px] font-medium tracking-wide text-white/80 backdrop-blur-sm">
        Arrastra para explorar
      </div>
    </div>
  )
}
