'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

interface LunarGlobeProps {
  phase: number;
  isDay: boolean;
}

export default function LunarGlobe({ phase, isDay }: LunarGlobeProps) {
  const globeRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.DirectionalLight>(null)

  const [colorMap, bumpMap] = useTexture([
    '/moon_color.jpg',
    '/moon_bump.jpg'
  ])

  // Ay'ın yörünge açısı
  const moonOrbitAngle = phase * Math.PI * 2
  const orbitRadius = 4.5  
  const distance = -8     

  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0003
    }

    if (lightRef.current) {
      // OPTİK DÜZELTME: Işığın Z eksenindeki açısını düzelttik.
      // Faz = 0 (Dolunay) iken ışık Z: +15 (Kameranın arkasından) vurarak Ay'ı tam aydınlatır.
      // Faz = 0.5 (Yeni Ay) iken ışık Z: -15 (Ay'ın arkasından) vurarak Ay'ı karanlık yapar.
      const lightAngle = phase * Math.PI * 2
      const radius = 15
      lightRef.current.position.x = Math.sin(lightAngle) * radius
      lightRef.current.position.z = Math.cos(lightAngle) * radius
    }
  })

  const opacity = isDay ? 0.25 : 0.95;

  return (
    <group>
      {/* Güneş Işığı */}
      <directionalLight 
        ref={lightRef} 
        intensity={isDay ? 1.0 : 2.5} 
        color="#fffdeb" 
        castShadow 
      />

      {/* Ortam Işığı (Karanlık tarafın loşluğu) */}
      <ambientLight intensity={0.08} color="#110c30" />

      {/* 3D Ay */}
      <mesh 
        ref={globeRef} 
        position={[
          Math.cos(moonOrbitAngle) * orbitRadius, 
          Math.sin(moonOrbitAngle) * (orbitRadius * 0.4), 
          distance
        ]} 
        castShadow 
        receiveShadow
      >
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial 
          map={colorMap}        
          bumpMap={bumpMap}     
          bumpScale={0.12}      
          roughness={0.9}       
          metalness={0.02}      
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  )
}