'use client'

import { OrbitControls } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

const TARGET: [number, number, number] = [0, 1.95, 0]
const IDLE_RESUME_MS = 4500

type StoreControlsProps = {
  onDragChange?: (isDragging: boolean) => void
}

export function StoreControls({ onDragChange }: StoreControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pauseAutoRotate = () => {
    const controls = controlsRef.current
    if (controls) controls.autoRotate = false
    onDragChange?.(true)
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
  }

  const scheduleResume = () => {
    onDragChange?.(false)
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => {
      if (controlsRef.current) controlsRef.current.autoRotate = true
    }, IDLE_RESUME_MS)
  }

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }
  }, [])

  return (
    <OrbitControls
      ref={controlsRef}
      target={TARGET}
      enableDamping
      dampingFactor={0.06}
      autoRotate
      autoRotateSpeed={0.5}
      enablePan={false}
      enableZoom
      zoomSpeed={0.65}
      rotateSpeed={0.75}
      minDistance={3.8}
      maxDistance={11.5}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI - 0.12}
      onStart={pauseAutoRotate}
      onEnd={scheduleResume}
      makeDefault
    />
  )
}
