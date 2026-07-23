'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ayFaziniHesapla, AyFazi } from '@/lib/ay'
import LunarGlobe from './LunarGlobe'
import Constellations from './Constellations'
import styles from './gozlemevi.module.css'
import { getSunZodiacSign } from '@/lib/zodiac'

// 12 Burcun KÜRE Ansiklopedisi Bilgileri (Bütünleştirilmiş Eksiksiz Kütüphane)
const burcLore: Record<string, { baslik: string; yildizlar: string; cisimler: string; mitoloji: string }> = {
  Koc: {
    baslik: "Koç Takımyıldızı (Aries)",
    yildizlar: "Hamal (Takımyıldızın en parlak turuncu devi) ve Sheratan.",
    cisimler: "NGC 772 sarmal galaksisi (Kozmik bir fırtına girdabı).",
    mitoloji: "Yunan mitolojisinde Phrixus ve Helle'yi kurtaran Altın Postlu Koç efsanesini simgeler. Kabilenin uyanışının ve bahar ekinoksunun başlangıç kapısıdır."
  },
  Boga: {
    baslik: "Boğa Takımyıldızı (Taurus)",
    yildizlar: "Aldebaran (Boğa'nın parlayan kırmızı gözü, kırmızı dev) ve Elnath (Kuzey boynuzunun ucundaki mavi dev).",
    cisimler: "Ülker Yıldız Kümesi (Pleiades - Yedi Kardeşler), Hyades Kümesi ve Yengeç Bulutsusu (Crab Nebula - M1 Süpernova kalıntısı).",
    mitoloji: "Zeus'un Europa'yı kaçırmak için büründüğü göz alıcı beyaz boğayı simgeler. Sümer ve Babil'de tarımsal bereketin ve yeni yılın sembolüdür."
  },
  Ikizler: { 
    baslik: "İkizler Takımyıldızı (Gemini)", 
    yildizlar: "Castor ve Pollux (Ölümlü ve ölümsüz iki kardeş ruhu temsil eden ikiz yıldızlar).", 
    cisimler: "M35 açık yıldız kümesi ve Eskimo Bulutsusu (NGC 2392).", 
    mitoloji: "Leda'nın ikiz çocukları Castor ve Pollux'u simgeler. İki dünya arasındaki dengenin ve kabilenin çift ruhlu yapısının sembolüdür." 
  },
  Yengec: {
    baslik: "Yengeç Takımyıldızı (Cancer)",
    yildizlar: "Tarf ve Acubens (Kabilenin koruyucu kıskacı).",
    cisimler: "Arı Kovanı Yıldız Kümesi (Praesepe - M44, gökyüzünün en parlak açık kümelerinden biri).",
    mitoloji: "Herakles'in Hydra ile savaşı sırasında Hera tarafından gönderilen dev yengeci simgeler. Koruyucu kabuğun ve kabilenin saklı sığınağının temsilcisidir."
  },
  Aslan: {
    baslik: "Aslan Takımyıldızı (Leo)",
    yildizlar: "Regulus (Kraliyet Yıldızı, mavi-beyaz dev) ve Denebola (Aslan'ın kuyruğu).",
    cisimler: "M66 Galaksi Grubu (Aslan Üçlüsü) ve kozmik aslan gözü halkaları.",
    mitoloji: "Herakles'in ilk görevi olan, derisine hiçbir silahın işlemediği yenilmez Nemea Aslanı'nı simgeler. Ateşin, egemenliğin ve Theia'nın saf gücünün sembolüdür."
  },
  Basak: {
    baslik: "Başak Takımyıldızı (Virgo)",
    yildizlar: "Spica (Göklerin en parlak mavi devlerinden biri) ve Zawijah.",
    cisimler: "Başak Galaksi Kümesi (Virgo Cluster - Samanyolu'nun da dahil olduğu devasa galaksi ailesi).",
    mitoloji: "Adaletin simgesi Astraea veya bereket tanrıçası Demeter'i simgeler. Kadim kozmik yasaların kâtipleri ve kabilenin koruyucu bilgeleridir."
  },
  Terazi: {
    baslik: "Terazi Takımyıldızı (Libra)",
    yildizlar: "Zubeneschamali (Kuzey kefesi, gökyüzünün nadir yeşilimsi parlayan yıldızı) ve Zubenelgenubi.",
    cisimler: "NGC 5897 küresel yıldız kümesi.",
    mitoloji: "Göklerin adalet terazisini simgeler. Gaia ve Theia arasındaki dengenin, iki kız kardeşin eşit ağırlıktaki kozmik tartısının sembolüdür."
  },
  Akrep: {
    baslik: "Akrep Takımyıldızı (Scorpio)",
    yildizlar: "Antares (Akrep'in parlayan kırmızı kalbi, Mars'ın rakibi) ve Shaula.",
    cisimler: "Kelebek Kümesi (M6) ve Batlamyus Kümesi (M7).",
    mitoloji: "Kibri yüzünden cezalandırılan Avcı Orion'u dize getiren yeryüzü muhafızı akrebi simgeler. Ölüm, dönüşüm ve kabilenin gizli savaşçılarının sembolüdür."
  },
  Yay: {
    baslik: "Yay Takımyıldızı (Sagittarius)",
    yildizlar: "Kaus Australis ve Nunki (Kozmik okçu yayının uçları).",
    cisimler: "Deniz Kulağı Bulutsusu (Lagoon - M8) ve Trifid Bulutsusu (M20).",
    mitoloji: "Bilge ve ölümsüz sentor Chiron'u simgeler. Okunu gökyüzünün merkezine (Samanyolu'nun kalbine) doğrultmuş olan ruhsal arayışın ve bilginin sembolüdür."
  },
  Oglak: {
    baslik: "Oğlak Takımyıldızı (Capricorn)",
    yildizlar: "Deneb Algedi ve Sadalmelik (Deniz keçisinin boynuzları).",
    cisimler: "M30 küresel yıldız kümesi.",
    mitoloji: "Deniz keçisi Pan'ı simgeler. En derin uçurumlardan göklerin en yüksek zirvesine tırmanabilen, zamanın ve kabile sabrının kadim muhafızıdır."
  },
  Kova: {
    baslik: "Kova Takımyıldızı (Aquarius)",
    yildizlar: "Sadalsuud (Göklerin en parlak şans yıldızı) ve Sadalmelik.",
    cisimler: "Helix Bulutsusu (Tanrı'nın Gözü - NGC 7293) ve Satürn Bulutsusu.",
    mitoloji: "İnsanlığa göksel bilgiyi (yaşam suyunu) akıtan kâse taşıyıcısı Ganymede'i simgeler. Kabilenin Gaia halkına sunduğu uyanış fısıltısının sembolüdür."
  },
  Balik: {
    baslik: "Balık Takımyıldızı (Pisces)",
    yildizlar: "Alpherg ve Alrescha (İki balığı birbirine bağlayan kadim düğüm yıldızı).",
    cisimler: "M74 sarmal galaksisi.",
    mitoloji: "Canavar Typhon'dan kaçmak için balığa dönüşen Afrodit ve Eros'u simgeler. İki farklı dünyanın (maddi ve ruhsal) birbirine bağlılığının sembolüdür."
  }
}

export default function Gozlemevi() {
  const [ayFazi, setAyFazi] = useState<AyFazi | null>(null)
  const [selectedYear, setSelectedYear] = useState(2026)
  const [selectedMonth, setSelectedMonth] = useState(7)
  const [selectedDay, setSelectedDay] = useState(29)
  const [selectedHour, setSelectedHour] = useState(12)
  const [isBC, setIsBC] = useState(false)
  const [sunSign, setSunSign] = useState(() => getSunZodiacSign(7, 29).isim)

  // Gerçekçi Yıldızıl Ay Konum Açısı (Zodyak Burcu için)
  const [moonZodiacAngle, setMoonZodiacAngle] = useState(0)

  // GÜNEŞ BURCU MOTORU (Tropikal - tarih bazlı)
  useEffect(() => {
    const gunesBurcu = getSunZodiacSign(selectedMonth, selectedDay)
    setSunSign(gunesBurcu.isim)
  }, [selectedMonth, selectedDay])

  // Seçilen Burcun Bilgi Kartı
  const [seciliBurcDetay, setSeciliBurcDetay] = useState<any | null>(null)

  const [gunlukNotlari, setGunlukNotlari] = useState<any[]>([])
  const [yeniNot, setYeniNot] = useState('')
  const [gonderiyor, setGonderiyor] = useState(false)
  const [profil, setProfil] = useState<any>(null)

  const supabase = createClient()

  // GÖKBİLİMSEL HESAPLAMA MOTORU (Sidereal Cycle - 27.3 Gün)
  useEffect(() => {
    const yiliHesapla = isBC ? -selectedYear : selectedYear
    const tarihObj = new Date(yiliHesapla, selectedMonth - 1, selectedDay, selectedHour)

    // Ay fazını hesapla (Sinodik döngü - Görüntü için)
    const fazData = ayFaziniHesapla(tarihObj)
    setAyFazi(fazData)

    // AY'IN GERÇEK ZODYAK KONUMU (Yıldızıl Döngü - 27.321661 Gün)
    // 29 Temmuz 2026 Dolunay referans alınmıştır.
    const refDate = new Date('2026-07-29T10:36:00Z')
    const siderealCycle = 27.321661
    const diffMs = tarihObj.getTime() - refDate.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    // Yıldızıl döngüye göre Ay'ın Zodyak üzerindeki mutlak açısı (0-360)
    const absAngle = (((diffDays % siderealCycle) + siderealCycle) % siderealCycle) / siderealCycle * 360
    setMoonZodiacAngle(absAngle)
  }, [selectedYear, selectedMonth, selectedDay, selectedHour, isBC])

  useEffect(() => {
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('rol, id, yildiz_tozu').eq('id', user.id).single()
        setProfil(p)
      }
      const { data: notlar } = await supabase.from('gozlem_gunlugu').select('*').order('created_at', { ascending: false }).limit(5)
      setGunlukNotlari(notlar ?? [])
    }
    yukle()
  }, [])

  async function notGonder() {
    if (!yeniNot.trim() || !profil || gonderiyor || !ayFazi) return
    setGonderiyor(true)

    const notData = {
      kullanici_id: profil.id,
      karakter_adi: "Kabile Katibi",
      not_icerik: yeniNot.trim(),
      yazildigi_ay_fazi: ayFazi.isim,
      ay_sembolu: ayFazi.sembol
    }

    const { data, error } = await supabase.from('gozlem_gunlugu').insert(notData).select().single()
    if (error) {
      alert("Hata: " + error.message)
    } else if (data) {
      setGunlukNotlari(prev => [data, ...prev])
      setYeniNot('')
    }
    setGonderiyor(false)
  }

  return (
    <main className={styles.wrapper}>
      {/* SAĞ ÜST KONTROL */}
      <div className="absolute top-6 right-6 z-20">
        <Link href="/arsiv" className="border border-white/10 text-white/30 hover:border-white/30 hover:text-white/60 px-4 py-2 text-xs tracking-widest uppercase transition-all bg-black/40">
          ← Arşiv
        </Link>
      </div>

      {/* 3D SİNEMATİK SAHNE */}
      <div className={styles.canvasContainer}>
        {(() => {
          const mevsimselKayma = 1.25 * Math.cos(((selectedMonth - 6) / 12) * Math.PI * 2);
          const gunDogumuSaati = 6 + mevsimselKayma;
          const eksenEgikligi = 1.2 * Math.sin(((selectedMonth - 3) / 12) * Math.PI * 2);
          const gunUzunluguMaksimum = 4.5 + eksenEgikligi;
          const sunAngle = ((selectedHour - gunDogumuSaati) / 24) * Math.PI * 2;

          const sunY = Math.sin(sunAngle) * gunUzunluguMaksimum;
          const sunX = Math.cos(sunAngle) * 8;
          const sunZ = -7;
          const isDay = sunY > 0;

          return (
            <Canvas camera={{ position: [0, 0, 0.1], fov: 60 }}>
              <color attach="background" args={[isDay ? '#0c1b30' : '#010003']} />
              {isDay && <fog attach="fog" args={['#0c1b30', 5, 20]} />}

              <Suspense fallback={null}>
                {/* Güneş Modeli */}
                {isDay && (
                  <mesh position={[sunX, sunY, sunZ]}>
                    <sphereGeometry args={[0.5, 32, 32]} />
                    <meshBasicMaterial color="#f59e0b" transparent opacity={0.9} />
                    <pointLight intensity={3} distance={20} color="#f59e0b" />
                  </mesh>
                )}

                {/* 3D Gök Kubbe ve Burçlar (Güneş Burcuna Göre Aktifleşir) */}
                {ayFazi && (
                  <Constellations
                    selectedYear={isBC ? -selectedYear : selectedYear}
                    selectedMonth={selectedMonth}
                    selectedDay={selectedDay}
                    selectedHour={selectedHour}
                    moonAngle={moonZodiacAngle}
                    sunSign={sunSign}
                    isDay={isDay}
                    onRuneClick={(burc) => setSeciliBurcDetay(burcLore[burc] ?? null)}
                  />
                )}

                {/* 3D Ay Küresi */}
                {ayFazi && <LunarGlobe phase={ayFazi.faz} isDay={isDay} />}

                {/* Antik Ege Denizi */}
                <mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <planeGeometry args={[500, 500, 64, 64]} />
                  <meshStandardMaterial
                    color={isDay ? '#0f172a' : '#03020a'}
                    roughness={0.12}
                    metalness={0.95}
                    flatShading
                  />
                </mesh>

                <directionalLight position={[0, -1, -5]} intensity={0.4} color={isDay ? '#f59e0b' : '#e879f9'} />
              </Suspense>

              <OrbitControls
                enableZoom={false}
                enablePan={false}
                reverseOrbit={true}
                minPolarAngle={Math.PI / 2 + 0.05}
                maxPolarAngle={Math.PI}
              />
            </Canvas>
          )
        })()}
      </div>

      {/* SOL: MİSTİK BURÇ BİLGİ KARTI */}
      {seciliBurcDetay && (
        <div className="absolute left-6 top-32 z-30 w-80 p-5 bg-black/75 border border-fuchsia-500/20 backdrop-blur-md rounded shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-sm tracking-widest uppercase font-bold">{seciliBurcDetay.baslik}</h2>
            <button onClick={() => setSeciliBurcDetay(null)} className="text-white/40 hover:text-white text-xl">×</button>
          </div>
          <div className="w-full h-px bg-white/10" />
          <div className="flex flex-col gap-3 text-[11px] leading-relaxed text-white/70">
            <div><span className="text-fuchsia-400 font-bold block mb-0.5">Parlak Yıldızları:</span>{seciliBurcDetay.yildizlar}</div>
            <div><span className="text-cyan-400 font-bold block mb-0.5">Derin Uzay Cisimleri:</span>{seciliBurcDetay.cisimler}</div>
            <div><span className="text-amber-400 font-bold block mb-0.5">Mitolojideki Yeri:</span>{seciliBurcDetay.mitoloji}</div>
          </div>
        </div>
      )}

      {/* AKTİF GÜNEŞ BURCU GÖSTERGESİ */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 md:top-24 z-10 text-[10px] tracking-[0.3em] uppercase text-fuchsia-300/70">
        Güneş Burcu: {burcLore[sunSign]?.baslik?.split(' ')[0] ?? sunSign}
      </div>

      {/* ÜST: YATAY METAL TEMPORAL KONSOL */}
      <div className={styles.cylinderContainer}>
        {/* Silindirler kodu aynı kalıyor... */}
        <div className={styles.cylinderColumn}>
          <span className={styles.cylinderLabel}>Çağ</span>
          <button onClick={() => setIsBC(!isBC)} className={`${styles.eraButton} ${isBC ? styles.eraButtonActive : ''}`}>
            {isBC ? "MÖ" : "MS"}
          </button>
        </div>

        <div className={styles.cylinderColumn}>
          <span className={styles.cylinderLabel}>Yıl</span>
          <div className={styles.scrollWheel}>
            <div className={styles.wheelItem}>
              <input type="number" min={1} max={9999} value={selectedYear} onChange={e => setSelectedYear(Math.max(1, parseInt(e.target.value) || 1))} className={styles.manualInput} />
            </div>
          </div>
        </div>

        <div className={styles.cylinderColumn}>
          <span className={styles.cylinderLabel}>Ay</span>
          <div className={styles.scrollWheel}>
            <div className={styles.wheelItem}>
              <input type="number" min={1} max={12} value={selectedMonth} onChange={e => setSelectedMonth(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))} className={styles.manualInput} />
            </div>
          </div>
        </div>

        <div className={styles.cylinderColumn}>
          <span className={styles.cylinderLabel}>Gün</span>
          <div className={styles.scrollWheel}>
            <div className={styles.wheelItem}>
              <input type="number" min={1} max={31} value={selectedDay} onChange={e => setSelectedDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))} className={styles.manualInput} />
            </div>
          </div>
        </div>

        <div className={styles.cylinderColumn}>
          <span className={styles.cylinderLabel}>Saat</span>
          <div className={styles.scrollWheel}>
            <div className={styles.wheelItem}>
              <input type="number" min={0} max={23} value={selectedHour} onChange={e => setSelectedHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))} className={styles.manualInput} />
            </div>
          </div>
        </div>
      </div>

      {/* ALT: ASTRAL DUVAR */}
      <div className={styles.diaryContainer}>
        {/* ... Günlük kodların aynı kalıyor ... */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {gunlukNotlari.map(not => (
            <div key={not.id} className="border border-white/5 bg-black/60 p-4 rounded shrink-0 w-60">
              <div className="flex items-center justify-between text-[9px] text-white/30 mb-2">
                <span>{not.karakter_adi}</span>
                <span>{not.ay_sembolu} {not.yazildigi_ay_fazi}</span>
              </div>
              <p className="text-white/60 text-xs leading-relaxed">{not.not_icerik}</p>
            </div>
          ))}
        </div>

        {profil && (
          <div className="flex gap-2">
            <input value={yeniNot} onChange={e => setYeniNot(e.target.value)} placeholder="Gökyüzündeki astral izlenimlerini günlüğe yaz..." className={styles.diaryInput} onKeyDown={e => e.key === 'Enter' && notGonder()} />
            <button onClick={notGonder} disabled={gonderiyor} className="border border-fuchsia-500/30 text-fuchsia-300 px-4 py-2 text-xs uppercase hover:bg-fuchsia-500/10 shrink-0">Yaz</button>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}} />
    </main>
  )
}