'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { generateBackgroundStars } from './constelData'

interface ConstellationsProps {
  selectedYear: number;
  selectedMonth: number;
  selectedDay: number;
  selectedHour: number;
  moonAngle: number;
  sunSign: string; // YENİ: Aktif rünü belirleyen Güneş burcu
  isDay: boolean;
  onRuneClick: (burcIsim: string) => void;
}

interface ZStar { pos: [number, number, number]; color?: string; size?: number }

// GERÇEK ASTERİZMA HATLARINA YAKIN KOORDİNATLAR (stilize, oranlar korunmuş)
const zodiacStars: Record<string, { stars: ZStar[]; links: [number, number][] }> = {
  Koc: {
    // Hamal - Sheratan - Mesarthim eğrisi
    stars: [
      { pos: [2.4, 1.6, 0], color: '#fef3c7', size: 0.55 }, // Hamal
      { pos: [0.6, 0.5, 0.1], size: 0.4 },                  // Sheratan
      { pos: [-0.6, -0.2, 0.2], size: 0.35 },               // Mesarthim
    ],
    links: [[0, 1], [1, 2]],
  },
  Boga: {
    stars: [
      { pos: [0, 0, 0], color: '#f97316', size: 0.9 },        // Aldebaran (göz)
      { pos: [-1.5, 1.5, -0.5], size: 0.4 },
      { pos: [1.5, 1, 0.5], size: 0.4 },
      { pos: [3.5, 2, 0], size: 0.4 },
      { pos: [-2, -2.5, 0], size: 0.4 },
      { pos: [-3.5, 3.5, 0], color: '#bae6fd', size: 0.55 },  // Elnath (boynuz ucu)
      { pos: [4, 4.5, 1], color: '#bae6fd', size: 0.25 },     // Pleiades kümesi
      { pos: [4.3, 4.2, 0.9], color: '#bae6fd', size: 0.2 },
      { pos: [3.8, 4.1, 1.1], color: '#bae6fd', size: 0.2 },
      { pos: [4.1, 3.8, 1.0], color: '#bae6fd', size: 0.25 },
      { pos: [4.6, 4.4, 0.8], color: '#bae6fd', size: 0.2 },
      { pos: [3.6, 4.5, 1.2], color: '#bae6fd', size: 0.2 },
    ],
    // V (Hyades) hattı + boynuz uzantısı; Pleiades bağımsız küme (çizgisiz)
    links: [[5, 1], [1, 0], [0, 2], [2, 3], [1, 4]],
  },
  Ikizler: {
    // İki paralel "merdiven" hattı: Castor ve Pollux
    stars: [
      { pos: [-1.5, 3.5, 0], color: '#e0f2fe', size: 0.5 }, // Castor
      { pos: [-1.7, 1.8, 0.1], size: 0.35 },
      { pos: [-1.9, 0, 0], size: 0.35 },
      { pos: [1.4, 3, 0], color: '#fef9c3', size: 0.5 },    // Pollux
      { pos: [1.2, 1.4, 0.1], size: 0.35 },
      { pos: [1, -0.2, 0], size: 0.35 },
    ],
    links: [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3]],
  },
  Yengec: {
    // Çok sönük, ters-Y şeklinde; ortada Beehive (M44) kümesi
    stars: [
      { pos: [0, 2, 0], size: 0.35 },
      { pos: [-1.6, -1.8, 0], size: 0.35 },  // Al Tarf
      { pos: [1.6, -2.2, 0], size: 0.35 },   // Acubens
      { pos: [0, 0.3, 0.2], size: 0.2, color: '#fef3c7' }, // M44 merkezi
    ],
    links: [[0, 3], [3, 1], [3, 2]],
  },
  Aslan: {
    // "Orak" (Sickle) baş kısmı + Denebola kuyruk üçgeni
    stars: [
      { pos: [0, -2.2, 0], color: '#dbeafe', size: 0.6 },  // Regulus
      { pos: [-0.6, -0.6, 0.1], size: 0.35 },
      { pos: [-1.3, 0.9, 0], size: 0.35 },
      { pos: [-0.7, 2.2, 0], size: 0.35 },
      { pos: [0.4, 2.5, 0.1], size: 0.35 },                // Orağın ucu
      { pos: [3, -0.8, 0], size: 0.45 },                   // Denebola
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5]],
  },
  Basak: {
    // Y biçimi, Spica temelde
    stars: [
      { pos: [0, -3, 0], color: '#bae6fd', size: 0.6 },  // Spica
      { pos: [0, -1, 0.1], size: 0.35 },
      { pos: [-1.8, 0.8, 0], size: 0.35 },
      { pos: [1.8, 1.2, 0], size: 0.35 },
    ],
    links: [[0, 1], [1, 2], [1, 3]],
  },
  Terazi: {
    // Terazi kefesi (yamuk/kiriş şekli)
    stars: [
      { pos: [-2, 1, 0], size: 0.4 },
      { pos: [2, 1.2, 0], size: 0.4 },
      { pos: [1.5, -1.5, 0], size: 0.35 },
      { pos: [-1.5, -1.7, 0], size: 0.35 },
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 0]],
  },
  Akrep: {
    // Meşhur "olta kancası" eğrisi, Antares kafada
    stars: [
      { pos: [-2, 3, 0], color: '#f87171', size: 0.65 },  // Antares
      { pos: [-1.5, 1.5, 0], size: 0.35 },
      { pos: [-0.8, 0, 0], size: 0.35 },
      { pos: [0, -1.5, 0], size: 0.35 },
      { pos: [1, -2.3, -0.3], size: 0.35 },
      { pos: [2, -2, -0.8], size: 0.4 },  // kancanın kıvrılan ucu
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
  Yay: {
    // "Çaydanlık" (Teapot) asterizması
    stars: [
      { pos: [-2, 1, 0], size: 0.35 },     // gaga/spout
      { pos: [-1, 2, 0], size: 0.35 },     // kapak
      { pos: [1.5, 1.8, 0], size: 0.35 },  // sap
      { pos: [-1.5, -1, 0], size: 0.35 },  // gövde sol alt
      { pos: [1, -1.2, 0], size: 0.35 },   // gövde sağ alt
      { pos: [1.8, 0.5, 0], size: 0.35 },  // gövde sağ üst
    ],
    links: [[0, 1], [1, 5], [5, 2], [5, 4], [4, 3], [3, 0]],
  },
  Oglak: {
    // Geniş "V" / deniz-keçisi teknesi
    stars: [
      { pos: [-3, 1, 0], size: 0.4 },   // sol boynuz ucu
      { pos: [-1.2, -1, 0], size: 0.3 },
      { pos: [0, -2, 0], size: 0.35 },  // gövde alt
      { pos: [1.5, -1.2, 0], size: 0.3 },
      { pos: [3, 1.2, 0], size: 0.4 },  // sağ boynuz ucu
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  Kova: {
    // Su testisi (Y) + akan su noktaları
    stars: [
      { pos: [-1.5, 2.5, 0], size: 0.35 },
      { pos: [1.2, 2.7, 0], size: 0.35 },
      { pos: [0, 1, 0], size: 0.35 },   // testi ağzı
      { pos: [0, -1.2, 0], size: 0.3 },
      { pos: [0.6, -2.3, 0], size: 0.25 }, // akan su
      { pos: [1.1, -3.2, -0.2], size: 0.2 },
    ],
    links: [[0, 2], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
  Balik: {
    // İki balık + bağlayan kordon (geniş V)
    stars: [
      { pos: [-4, 1.2, 0], size: 0.35 },
      { pos: [-3.4, 0.2, 0], size: 0.3 },  // balık 1
      { pos: [-1, -1, 0], size: 0.25 },
      { pos: [1, -0.4, 0], size: 0.25 },   // kordon
      { pos: [3.4, 1, 0], size: 0.3 },
      { pos: [4, 2, 0], size: 0.35 },      // balık 2
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
}

const zodiacData = [
  { isim: 'Koc',     rünGörseli: '/runeler/rune_koc.png',     aci: 0 },
  { isim: 'Boga',    rünGörseli: '/runeler/rune_boga.png',    aci: 30 },
  { isim: 'Ikizler', rünGörseli: '/runeler/rune_ikizler.png', aci: 60 },
  { isim: 'Yengec',  rünGörseli: '/runeler/rune_yengec.png',  aci: 90 },
  { isim: 'Aslan',   rünGörseli: '/runeler/rune_aslan.png',   aci: 120 },
  { isim: 'Basak',   rünGörseli: '/runeler/rune_basak.png',   aci: 150 },
  { isim: 'Terazi',  rünGörseli: '/runeler/rune_terazi.png',  aci: 180 },
  { isim: 'Akrep',   rünGörseli: '/runeler/rune_akrep.png',   aci: 210 },
  { isim: 'Yay',     rünGörseli: '/runeler/rune_yay.png',     aci: 240 },
  { isim: 'Oglak',   rünGörseli: '/runeler/rune_oglak.png',   aci: 270 },
  { isim: 'Kova',    rünGörseli: '/runeler/rune_kova.png',    aci: 300 },
  { isim: 'Balik',   rünGörseli: '/runeler/rune_balik.png',   aci: 330 },
]

export default function Constellations({ 
  selectedYear, 
  selectedMonth, 
  selectedDay, 
  selectedHour,
  moonAngle,
  sunSign,
  isDay,
  onRuneClick
}: ConstellationsProps) {
  const groupRef = useRef<THREE.Group>(null)
  const stars = useMemo(() => generateBackgroundStars(300), [])

  const textures: Record<string, any> = {
    Koc: useTexture('/runeler/rune_koc.png'),
    Boga: useTexture('/runeler/rune_boga.png'),
    Ikizler: useTexture('/runeler/rune_ikizler.png'),
    Yengec: useTexture('/runeler/rune_yengec.png'),
    Aslan: useTexture('/runeler/rune_aslan.png'),
    Basak: useTexture('/runeler/rune_basak.png'),
    Terazi: useTexture('/runeler/rune_terazi.png'),
    Akrep: useTexture('/runeler/rune_akrep.png'),
    Yay: useTexture('/runeler/rune_yay.png'),
    Oglak: useTexture('/runeler/rune_oglak.png'),
    Kova: useTexture('/runeler/rune_kova.png'),
    Balik: useTexture('/runeler/rune_balik.png'),
  }

  useFrame(() => {
    if (groupRef.current) {
      const dailyAngle = (selectedHour / 24) * Math.PI * 2
      const dayOfYear = (selectedMonth - 1) * 30.4 + selectedDay
      const seasonalAngle = (dayOfYear / 365.25) * Math.PI * 2
      const precessionAngle = (selectedYear / 25772) * Math.PI * 2

      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        dailyAngle + seasonalAngle + precessionAngle,
        0.05
      )

      const latitudeAngle = (36.4 * Math.PI) / 180
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        latitudeAngle,
        0.05
      )
    }
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

        // AKTİF RÜN ARTIK GÜNEŞ BURCUNA GÖRE BELİRLENİYOR
        const isNear = zodiac.isim === sunSign
        const glowOpacity = isNear ? 1 : 0

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

            {/* 2. TAKIMYILDIZ ÇİZGİLERİ (gerçek asterizma hattı) */}
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

            {/* 3. AKTİF HALE (BEYAZ GLOW) */}
            {isNear && (
              <mesh position={[0, 0, 0.5]}>
                <circleGeometry args={[14, 32]} />
                <meshBasicMaterial 
                  color="#ffffff" 
                  transparent 
                  opacity={0.18} 
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* 4. RÜN GÖRSELİ (kabile moru/fuşya kimliğini korur) */}
            {textures[zodiac.isim] && (
              <mesh 
                position={[0, 0, 1]}
                onClick={(e) => { e.stopPropagation(); onRuneClick(zodiac.isim); }}
              >
                <planeGeometry args={[18, 18]} />
                <meshBasicMaterial 
                  map={textures[zodiac.isim]} 
                  transparent 
                  opacity={(isNear ? 1 : 0.7) * globalOpacity}
                  color={isNear ? '#ffffff' : '#a855f7'}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}