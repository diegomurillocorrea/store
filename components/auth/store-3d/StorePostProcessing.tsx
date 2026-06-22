'use client'

import { EffectComposer, SMAA } from '@react-three/postprocessing'

/** Postprocesado liviano: suaviza contornos sin alterar la escena. */
export function StorePostProcessing() {
  return (
    <EffectComposer multisampling={4}>
      <SMAA />
    </EffectComposer>
  )
}
