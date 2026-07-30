'use client'

import React, { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Float } from '@react-three/drei'
import * as THREE from 'three'

interface SocketItemProps {
  url: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}

function SocketItem({ url, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: SocketItemProps) {
  const { scene } = useGLTF(url)
  const clonedScene = React.useMemo(() => scene.clone(true), [scene])

  return (
    <group position={position} rotation={rotation} scale={typeof scale === 'number' ? [scale, scale, scale] : scale}>
      <primitive object={clonedScene} />
    </group>
  )
}

interface BustProps {
  bodyUrl?: string | null
  maskeUrl?: string | null
  aksesuarUrl?: string | null
}

function BustScene({ bodyUrl, maskeUrl, aksesuarUrl }: BustProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.25
    }
  })

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      {/* 1. BAZ GÖVDE VEYA MİSTİK OBSİDYEN BÜST */}
      {bodyUrl ? (
        <SocketItem url={bodyUrl} scale={1} />
      ) : (
        <group>
          {/* Antik Altın Kaide */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.6, 0.12, 32]} />
            <meshStandardMaterial color="#18181b" roughness={0.2} metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.25, 0.4, 0.25, 32]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.3} metalness={0.8} />
          </mesh>

          {/* Göğüs / Omuz */}
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.24, 0.14, 0.75, 32]} />
            <meshStandardMaterial color="#09090b" roughness={0.1} metalness={0.95} />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[0.65, 0.08, 0.22]} />
            <meshStandardMaterial color="#27272a" roughness={0.2} metalness={0.8} />
          </mesh>

          {/* Kafa Soketi */}
          <mesh position={[0, 1.4, 0]}>
            <sphereGeometry args={[0.18, 32, 32]} />
            <meshStandardMaterial color="#18181b" roughness={0.1} metalness={0.9} />
          </mesh>
        </group>
      )}

      {/* 2. MASKE SOKETİ */}
      {maskeUrl && (
        <SocketItem 
          url={maskeUrl} 
          position={[0, 1.42, 0.04]} 
          rotation={[0, 0, 0]} 
          scale={0.75} 
        />
      )}

      {/* 3. AKSESUAR SOKETİ */}
      {aksesuarUrl && (
        <SocketItem 
          url={aksesuarUrl} 
          position={[0.4, 0.6, 0.15]} 
          rotation={[0, 0.2, 0]} 
          scale={0.65} 
        />
      )}
    </group>
  )
}

export default function CharacterBust({ bodyUrl, maskeUrl, aksesuarUrl }: BustProps) {
  return (
    <div className="w-full h-full min-h-[300px] relative rounded-lg border border-white/10 overflow-hidden bg-gradient-to-b from-black via-fuchsia-950/20 to-black shadow-[0_0_30px_rgba(168,85,247,0.15)]">
      <Canvas camera={{ position: [0, 0.2, 3.2], fov: 45 }} style={{ width: '100%', height: '100%' }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[-2.5, 2, 2]} intensity={2.5} color="#e879f9" />
        <pointLight position={[2.5, -1, -2]} intensity={2.0} color="#22d3ee" />
        <spotLight position={[0, 4, 2]} intensity={3.0} angle={0.5} penumbra={1} color="#fbbf24" />

        <Suspense fallback={null}>
          <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
            <BustScene 
              bodyUrl={bodyUrl}
              maskeUrl={maskeUrl}
              aksesuarUrl={aksesuarUrl}
            />
          </Float>
        </Suspense>

        <OrbitControls 
          enableZoom={true} 
          maxDistance={4.5} 
          minDistance={2} 
          enablePan={false} 
          maxPolarAngle={Math.PI / 2 + 0.1} 
        />
      </Canvas>

      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 bg-black/70 border border-white/10 rounded text-[9px] text-fuchsia-300 tracking-widest uppercase backdrop-blur-sm pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-ping" />
        3D Büst
      </div>
    </div>
  )
}