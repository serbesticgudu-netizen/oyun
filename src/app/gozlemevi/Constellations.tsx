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
    // Hamal - Sheratan - Mesarthim gerçek eğrisi
    stars: [
      { pos: [3.05, 3.41, 0], color: '#fef3c7', size: 0.55 }, // Hamal (α)
      { pos: [-1.33, -0.57, 0.1], size: 0.4 },                // Sheratan (β)
      { pos: [-1.72, -2.84, 0.15], size: 0.35 },              // Mesarthim (γ)
    ],
    links: [[0, 1], [1, 2]],
  },

  // BOĞA AYNI KALIYOR — SEN VERMİŞTİN, DOKUNMADIM
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
    // Castor & Pollux başlar, Wasat/Alhena ve Mebsuta/Tejat ayaklara iner
    stars: [
      { pos: [3.56, 3.88, 0], color: '#e0f2fe', size: 0.5 },   // Castor (α)
      { pos: [4.81, 1.90, 0.1], color: '#fef9c3', size: 0.5 }, // Pollux (β)
      { pos: [1.87, -1.20, 0], size: 0.35 },                   // Wasat (δ)
      { pos: [-3.08, -4.06, 0], size: 0.35 },                  // Alhena (γ, Castor'un ayağı)
      { pos: [-2.36, 0.41, 0.1], size: 0.35 },                 // Mebsuta (ε)
      { pos: [-4.80, -0.93, 0], size: 0.35 },                  // Tejat (μ, Pollux'un ayağı)
    ],
    links: [[0, 1], [0, 2], [2, 3], [1, 4], [4, 5]],
  },

  Yengec: {
    // Sönük ters-Y; ortada Beehive (M44) kümesi
    stars: [
      { pos: [4.30, -4.21, 0], size: 0.35 },                  // Acubens (α)
      { pos: [-5.79, -6.88, 0], size: 0.35 },                 // Altarf (β)
      { pos: [0.65, 5.40, 0.1], size: 0.35 },                 // Asellus Borealis (γ)
      { pos: [0.98, 2.09, 0], size: 0.35 },                   // Asellus Australis (δ)
      { pos: [-0.14, 3.60, 0.2], color: '#fef3c7', size: 0.2 }, // M44 (Beehive kümesi)
    ],
    links: [[2, 3], [3, 0], [3, 1]],
  },

  Aslan: {
    // Sickle (orak) kancası + Zosma-Chertan-Denebola kuyruk üçgeni
    stars: [
      { pos: [-3.88, -1.82, 0], color: '#dbeafe', size: 0.6 }, // Regulus (α)
      { pos: [-3.98, 0.10, 0], size: 0.35 },                   // Eta Leo
      { pos: [-2.77, 1.33, 0.1], size: 0.35 },                 // Algieba (γ)
      { pos: [2.42, 1.60, 0], size: 0.4 },                      // Zosma (δ)
      { pos: [2.43, -0.43, 0], size: 0.35 },                    // Chertan (θ)
      { pos: [5.77, -0.78, 0], size: 0.45 },                    // Denebola (β)
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 3]],
  },

  Basak: {
    // Y şekli — kollar Vindemiatrix ve Zavijava'dan Porrima'da birleşir, gövde Heze-Spica'ya iner
    stars: [
      { pos: [3.02, -4.66, 0], color: '#bae6fd', size: 0.6 },  // Spica (α)
      { pos: [-6.43, 0.51, 0], size: 0.4 },                     // Zavijava (β)
      { pos: [-1.34, -0.77, 0.1], size: 0.35 },                 // Porrima (γ, Y'nin birleşim noktası)
      { pos: [0.06, 1.16, 0], size: 0.35 },                     // Auva (δ)
      { pos: [0.72, 4.19, 0], size: 0.35 },                     // Vindemiatrix (ε)
      { pos: [3.97, -0.43, 0.1], size: 0.35 },                  // Heze (ζ)
    ],
    links: [[4, 3], [3, 2], [1, 2], [2, 5], [5, 0]],
  },

  Terazi: {
    // Uçurtma biçimli dörtgen (kefe hattı)
    stars: [
      { pos: [-2.53, 0.18, 0], size: 0.4 },   // Zubenelgenubi (α)
      { pos: [0.62, 3.49, 0], size: 0.4 },    // Zubeneschamali (β)
      { pos: [2.84, 0.78, 0.1], size: 0.35 }, // Zubenelakrab (γ)
      { pos: [-0.93, -4.46, 0], size: 0.35 }, // Brachium (σ)
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 0]],
  },

  Akrep: {
    // Meşhur olta kancası — Antares kalpte, uçta Shaula/Lesath ("kedi gözleri") çifti
    stars: [
      { pos: [-6.40, 7.38, 0], size: 0.4 },                    // Graffias (β1)
      { pos: [-7.26, 5.21, 0.1], size: 0.4 },                  // Dschubba (δ)
      { pos: [-2.39, 2.28, 0], color: '#f87171', size: 0.65 }, // Antares (α, kalp)
      { pos: [-1.30, 0.91, 0], size: 0.35 },                   // τ Sco
      { pos: [1.09, -3.77, -0.1], size: 0.35 },                // ε Sco
      { pos: [8.37, -5.93, -0.3], size: 0.4 },                 // Shaula (λ)
      { pos: [7.89, -6.08, -0.3], size: 0.4 },                 // Lesath (υ)
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
  },

  Yay: {
    // "Çaydanlık" (Teapot) asterizması — çok bilinen 8 yıldızlı kapalı şekil
    stars: [
      { pos: [-3.52, -0.88, 0], size: 0.35 },  // Kaus Media (δ)
      { pos: [-2.88, -5.02, 0], size: 0.35 },  // Kaus Australis (ε)
      { pos: [-2.13, 3.13, 0.1], size: 0.35 }, // Kaus Borealis (λ)
      { pos: [3.30, 2.33, 0], size: 0.35 },    // Nunki (σ)
      { pos: [4.76, -0.93, 0], size: 0.35 },   // Ascella (ζ)
      { pos: [1.39, 1.70, 0.1], size: 0.3 },   // Phi Sgr
      { pos: [5.63, 1.08, 0], size: 0.3 },     // Tau Sgr
      { pos: [-6.54, -1.42, 0], size: 0.4 },   // Alnasl (γ, gaga ucu)
    ],
    links: [[7, 0], [0, 2], [2, 5], [5, 3], [3, 6], [6, 4], [4, 1], [1, 0]],
  },

  Oglak: {
    // Deniz-keçisi teknesi — Algedi/Dabih boynuz çifti, Nashira/Deneb Algedi kuyruk
    stars: [
      { pos: [-8.92, 3.14, 0], size: 0.4 },   // Algedi (α2)
      { pos: [-8.38, 1.42, 0.1], size: 0.4 }, // Dabih (β)
      { pos: [6.20, -0.03, 0], size: 0.35 },  // Nashira (γ)
      { pos: [7.48, 0.38, 0], size: 0.35 },   // Deneb Algedi (δ)
      { pos: [3.72, -4.45, 0], size: 0.3 },   // ζ Cap
      { pos: [-0.10, -0.46, 0.1], size: 0.3 },// θ Cap
    ],
    links: [[0, 1], [1, 5], [5, 4], [4, 2], [2, 3]],
  },

  Kova: {
    // Su testisi (Y) + akan su hattı
    stars: [
      { pos: [-2.83, 3.09, 0], size: 0.35 },  // Sadalmelik (α)
      { pos: [-8.15, -0.19, 0], size: 0.4 },  // Sadalsuud (β)
      { pos: [-0.35, 2.42, 0.1], size: 0.3 }, // Sadachbia (γ)
      { pos: [4.78, -6.60, 0], size: 0.25 },  // Skat (δ)
      { pos: [0.77, 3.28, 0.1], size: 0.3 },  // ζ Aqr (testi ağzı)
      { pos: [1.78, 3.21, 0], size: 0.3 },    // η Aqr (testi ağzı)
      { pos: [3.99, -5.21, 0], size: 0.25 },  // τ Aqr (akan su)
    ],
    links: [[1, 0], [0, 4], [4, 5], [5, 6], [6, 3]],
  },

  Balik: {
    // Circlet (batı balığı, beşgen) + kordon + doğu balığı
    stars: [
      { pos: [-4.36, -0.64, 0], size: 0.3 },  // γ Psc
      { pos: [-3.46, 0.39, 0.1], size: 0.3 }, // θ Psc
      { pos: [-2.47, 0.14, 0], size: 0.25 },  // ι Psc
      { pos: [-2.27, -1.15, 0], size: 0.25 }, // λ Psc
      { pos: [-3.55, -1.32, 0.1], size: 0.3 },// κ Psc (Circlet kapanışı)
      { pos: [9.32, -0.81, 0], size: 0.4 },   // Alrescha (α, düğüm)
      { pos: [6.79, 3.38, 0], size: 0.35 },   // η Psc (doğu balığı)
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [4, 5], [5, 6]],
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

const globalOpacity = 1; // Artık gündüz de tam görünür
return (
  <group ref={groupRef} visible={true}>
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