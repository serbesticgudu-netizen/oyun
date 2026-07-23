'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { generateBackgroundStars } from './constelData'

interface ConstellationsProps {
  selectedYear: number;
  selectedMonth: number;
  selectedDay: number;
  selectedHour: number;
  moonAngle: number;
  sunSign: string;
  isDay: boolean;
  onRuneClick: (burcIsim: string) => void;
}

interface ZStar { pos: [number, number, number]; color?: string; size?: number }

// GERÇEK ASTERİZMA HATLARINA YAKIN KOORDİNATLAR
const zodiacStars: Record<string, { stars: ZStar[]; links: [number, number][] }> = {
  Koc: {
    stars: [
      { pos: [2.4, 1.6, 0], color: '#fef3c7', size: 0.55 },
      { pos: [0.6, 0.5, 0.1], size: 0.4 },
      { pos: [-0.6, -0.2, 0.2], size: 0.35 },
    ],
    links: [[0, 1], [1, 2]],
  },
  Boga: {
    stars: [
      { pos: [0, 0, 0], color: '#f97316', size: 0.9 },
      { pos: [-1.5, 1.5, -0.5], size: 0.4 },
      { pos: [1.5, 1, 0.5], size: 0.4 },
      { pos: [3.5, 2, 0], size: 0.4 },
      { pos: [-2, -2.5, 0], size: 0.4 },
      { pos: [-3.5, 3.5, 0], color: '#bae6fd', size: 0.55 },
      { pos: [4, 4.5, 1], color: '#bae6fd', size: 0.25 },
      { pos: [4.3, 4.2, 0.9], color: '#bae6fd', size: 0.2 },
      { pos: [3.8, 4.1, 1.1], color: '#bae6fd', size: 0.2 },
      { pos: [4.1, 3.8, 1.0], color: '#bae6fd', size: 0.25 },
      { pos: [4.6, 4.4, 0.8], color: '#bae6fd', size: 0.2 },
      { pos: [3.6, 4.5, 1.2], color: '#bae6fd', size: 0.2 },
    ],
    links: [[5, 1], [1, 0], [0, 2], [2, 3], [1, 4]],
  },
  Ikizler: {
    stars: [
      { pos: [-1.5, 3.5, 0], color: '#e0f2fe', size: 0.5 },
      { pos: [-1.7, 1.8, 0.1], size: 0.35 },
      { pos: [-1.9, 0, 0], size: 0.35 },
      { pos: [1.4, 3, 0], color: '#fef9c3', size: 0.5 },
      { pos: [1.2, 1.4, 0.1], size: 0.35 },
      { pos: [1, -0.2, 0], size: 0.35 },
    ],
    links: [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3]],
  },
  Yengec: {
    stars: [
      { pos: [0, 2, 0], size: 0.35 },
      { pos: [-1.6, -1.8, 0], size: 0.35 },
      { pos: [1.6, -2.2, 0], size: 0.35 },
      { pos: [0, 0.3, 0.2], size: 0.2, color: '#fef3c7' },
    ],
    links: [[0, 3], [3, 1], [3, 2]],
  },
  Aslan: {
    stars: [
      { pos: [0, -2.2, 0], color: '#dbeafe', size: 0.6 },
      { pos: [-0.6, -0.6, 0.1], size: 0.35 },
      { pos: [-1.3, 0.9, 0], size: 0.35 },
      { pos: [-0.7, 2.2, 0], size: 0.35 },
      { pos: [0.4, 2.5, 0.1], size: 0.35 },
      { pos: [3, -0.8, 0], size: 0.45 },
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5]],
  },
  Basak: {
    stars: [
      { pos: [0, -3, 0], color: '#bae6fd', size: 0.6 },
      { pos: [0, -1, 0.1], size: 0.35 },
      { pos: [-1.8, 0.8, 0], size: 0.35 },
      { pos: [1.8, 1.2, 0], size: 0.35 },
    ],
    links: [[0, 1], [1, 2], [1, 3]],
  },
  Terazi: {
    stars: [
      { pos: [-2, 1, 0], size: 0.4 },
      { pos: [2, 1.2, 0], size: 0.4 },
      { pos: [1.5, -1.5, 0], size: 0.35 },
      { pos: [-1.5, -1.7, 0], size: 0.35 },
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 0]],
  },
  Akrep: {
    stars: [
      { pos: [-2, 3, 0], color: '#f87171', size: 0.65 },
      { pos: [-1.5, 1.5, 0], size: 0.35 },
      { pos: [-0.8, 0, 0], size: 0.35 },
      { pos: [0, -1.5, 0], size: 0.35 },
      { pos: [1, -2.3, -0.3], size: 0.35 },
      { pos: [2, -2, -0.8], size: 0.4 },
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
  Yay: {
    stars: [
      { pos: [-2, 1, 0], size: 0.35 },
      { pos: [-1, 2, 0], size: 0.35 },
      { pos: [1.5, 1.8, 0], size: 0.35 },
      { pos: [-1.5, -1, 0], size: 0.35 },
      { pos: [1, -1.2, 0], size: 0.35 },
      { pos: [1.8, 0.5, 0], size: 0.35 },
    ],
    links: [[0, 1], [1, 5], [5, 2], [5, 4], [4, 3], [3, 0]],
  },
  Oglak: {
    stars: [
      { pos: [-3, 1, 0], size: 0.4 },
      { pos: [-1.2, -1, 0], size: 0.3 },
      { pos: [0, -2, 0], size: 0.35 },
      { pos: [1.5, -1.2, 0], size: 0.3 },
      { pos: [3, 1.2, 0], size: 0.4 },
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  Kova: {
    stars: [
      { pos: [-1.5, 2.5, 0], size: 0.35 },
      { pos: [1.2, 2.7, 0], size: 0.35 },
      { pos: [0, 1, 0], size: 0.35 },
      { pos: [0, -1.2, 0], size: 0.3 },
      { pos: [0.6, -2.3, 0], size: 0.25 },
      { pos: [1.1, -3.2, -0.2], size: 0.2 },
    ],
    links: [[0, 2], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
  Balik: {
    stars: [
      { pos: [-4, 1.2, 0], size: 0.35 },
      { pos: [-3.4, 0.2, 0], size: 0.3 },
      { pos: [-1, -1, 0], size: 0.25 },
      { pos: [1, -0.4, 0], size: 0.25 },
      { pos: [3.4, 1, 0], size: 0.3 },
      { pos: [4, 2, 0], size: 0.35 },
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
}

const zodiacData = [
  { isim: 'Koc',     aci: 0 },
  { isim: 'Boga',    aci: 30 },
  { isim: 'Ikizler', aci: 60 },
  { isim: 'Yengec',  aci: 90 },
  { isim: 'Aslan',   aci: 120 },
  { isim: 'Basak',   aci: 150 },
  { isim: 'Terazi',  aci: 180 },
  { isim: 'Akrep',   aci: 210 },
  { isim: 'Yay',     aci: 240 },
  { isim: 'Oglak',   aci: 270 },
  { isim: 'Kova',    aci: 300 },
  { isim: 'Balik',   aci: 330 },
]

// SANTORİNİ ENLEMİ — tek doğruluk kaynağı burada
const OBSERVER_LATITUDE_DEG = 36.4

/**
 * RÜN GÖRSELİ — hataya dayanıklı yükleyici.
 * useTexture (Suspense) yerine kendi THREE.TextureLoader'ını kullanır.
 * Dosya 404 verirse SESSİZCE KAYBOLMAZ, parlayan yedek sigil gösterir.
 */
function ZodiacRune({
  isim,
  isNear,
  onClick,
}: {
  isim: string
  isNear: boolean
  onClick: () => void
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const loader = new THREE.TextureLoader()
    loader.load(
      `/runeler/rune_${isim.toLowerCase()}.png`,
      (tex) => { if (alive) setTexture(tex) },
      undefined,
      () => { if (alive) setFailed(true) } // 404 / bozuk dosya -> sessizce yut, yedek göster
    )
    return () => { alive = false }
  }, [isim])

  if (!texture || failed) {
    // YEDEK SİGİL: dosya eksikse bile burç asla "yok" görünmez
    return (
      <mesh position={[0, 0, 1]} onClick={(e) => { e.stopPropagation(); onClick() }}>
        <circleGeometry args={[7, 32]} />
        <meshBasicMaterial
          color={isNear ? '#ffffff' : '#a855f7'}
          transparent
          opacity={isNear ? 0.9 : 0.45}
          depthWrite={false}
        />
      </mesh>
    )
  }

  return (
    <mesh position={[0, 0, 1]} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <planeGeometry args={[18, 18]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={isNear ? 1 : 0.7}
        color={isNear ? '#ffffff' : '#a855f7'}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function Constellations({
  selectedYear,
  selectedMonth,
  selectedDay,
  selectedHour,
  sunSign,
  isDay,
  onRuneClick
}: ConstellationsProps) {
  const groupRef = useRef<THREE.Group>(null)
  const stars = useMemo(() => generateBackgroundStars(300), [])

  // DÜNYA'NIN EĞİK DÖNÜŞ EKSENİ — tek vektör, tek doğru referans
  // Kuzey Gök Kutbu, ufuktan enlem kadar yükseklikte durur.
  const poleAxis = useMemo(() => {
    const lat = (OBSERVER_LATITUDE_DEG * Math.PI) / 180
    return new THREE.Vector3(0, Math.sin(lat), Math.cos(lat)).normalize()
  }, [])

  const targetQuat = useMemo(() => new THREE.Quaternion(), [])

  // GÖK KUBBENİN GERÇEK DÖNÜŞÜ — tek eksen etrafında, tek adımda
  useFrame(() => {
    if (!groupRef.current) return

    const dailyAngle = (selectedHour / 24) * Math.PI * 2
    const dayOfYear = (selectedMonth - 1) * 30.4 + selectedDay
    const seasonalAngle = (dayOfYear / 365.25) * Math.PI * 2
    const precessionAngle = (selectedYear / 25772) * Math.PI * 2

    const totalAngle = dailyAngle + seasonalAngle + precessionAngle

    targetQuat.setFromAxisAngle(poleAxis, totalAngle)
    groupRef.current.quaternion.slerp(targetQuat, 0.08)
  })

  const globalOpacity = isDay ? 0 : 1;

  return (
    <group ref={groupRef} visible={!isDay}>
      {/* Arka Plan Yıldızları */}
      {stars.map((star, i) => (
        <mesh key={i} position={[star.x, star.y, star.z]}>
          <sphereGeometry args={[star.size, 6, 6]} />
          <meshBasicMaterial color="#f4e9ff" transparent opacity={star.brightness * 0.3 * globalOpacity} />
        </mesh>
      ))}

      {/* 12 ZODYAK ALANI */}
      {zodiacData.map((zodiac) => {
        const rad = (zodiac.aci * Math.PI) / 180
        const radius = 90

        const bx = Math.cos(rad) * radius
        const by = Math.sin(rad) * (radius * 0.5)
        const bz = Math.sin(rad) * -radius

        const isNear = zodiac.isim === sunSign
        const asterism = zodiacStars[zodiac.isim]

        return (
          <group key={zodiac.isim} position={[bx, by, bz]}>
            {/* 1. GERÇEK ASTERİZMA YILDIZLARI (BEYAZ PARLAMA) */}
            {asterism.stars.map((star, idx) => (
              <mesh key={idx} position={star.pos}>
                <sphereGeometry args={[star.size ?? (isNear ? 0.6 : 0.35), 8, 8]} />
                <meshBasicMaterial
                  color={isNear ? '#ffffff' : (star.color ?? '#c9d6ff')}
                  transparent
                  opacity={isNear ? 1 : 0.55}
                />
              </mesh>
            ))}

            {/* 2. TAKIMYILDIZ ÇİZGİLERİ */}
            {asterism.links.map(([a, b], idx) => (
              <Line
                key={idx}
                points={[asterism.stars[a].pos, asterism.stars[b].pos]}
                color={isNear ? '#ffffff' : '#8b93b8'}
                transparent
                opacity={isNear ? 0.9 : 0.25}
                lineWidth={isNear ? 1.5 : 0.75}
              />
            ))}

            {/* 3. AKTİF HALE */}
            {isNear && (
              <mesh position={[0, 0, 0.5]}>
                <circleGeometry args={[14, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.18} depthWrite={false} />
              </mesh>
            )}

            {/* 4. RÜN GÖRSELİ — artık hataya dayanıklı yükleniyor */}
            <ZodiacRune
              isim={zodiac.isim}
              isNear={isNear}
              onClick={() => onRuneClick(zodiac.isim)}
            />
          </group>
        )
      })}
    </group>
  )
}