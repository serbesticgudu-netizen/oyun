'use client'

import { ayFaziniHesapla, AyFazi } from '@/lib/ay'
import { useEffect, useState, use, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei' 
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import dynamic from 'next/dynamic'

// 3D Büst Bileşeni (SSR Engelleyici)
const CharacterBust = dynamic(() => import('@/components/CharacterBust'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/40">
      <span className="text-fuchsia-400/30 text-xs tracking-widest uppercase animate-pulse">3D Büst Yükleniyor...</span>
    </div>
  )
})

function ModelOlusturucu({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

type Profil = { rol: string; email: string; is_admin: boolean; yildiz_tozu: number }
type Karakter = {
  id: string; kullanici_id: string; karakter_adi: string; tur: string; koken: string
  koken_hikayesi: string; gucler: string; zayifliklar: string
  motivasyon: string; durum: string; gorsel_url: string
}

type Bag = {
  id: string
  bag_tipi: 'muttefik' | 'es' | 'ikiz_ruh' | 'koruyucu' | 'dusman'
  diger_karakter_adi: string
  diger_gorsel_url: string | null
  diger_kullanici_id: string
}

type EnvanterItem = {
  id: string
  isim: string
  tip: 'maske' | 'dekor' | 'aksesuar' | 'run'
  aciklama: string
  gorsel_url?: string | null
  is3D: boolean
  model_url?: string | null
}

const bagUnvanlari: Record<string, string> = {
  muttefik: "✦ Müttefik",
  es: "💍 Eş",
  ikiz_ruh: "🧬 İkiz Ruh",
  koruyucu: "🛡 Koruyucu",
  dusman: "💀 Düşman"
}

const bagRenkleri: Record<string, string> = {
  muttefik: 'text-cyan-400 border-cyan-400/20 bg-cyan-500/5',
  es: 'text-amber-400 border-amber-400/20 bg-amber-500/5',
  ikiz_ruh: 'text-fuchsia-400 border-fuchsia-400/20 bg-fuchsia-500/5',
  koruyucu: 'text-rose-400 border-rose-400/20 bg-rose-500/5',
  dusman: 'text-red-500 border-red-500/20 bg-red-500/5',
}

const MarkdownComponents = {
  p: ({ ...props }) => <p className="mb-3 last:mb-0 leading-relaxed text-sm md:text-base" {...props} />,
  strong: ({ ...props }) => <strong className="text-white font-bold tracking-wide" {...props} />,
  em: ({ ...props }) => <em className="italic text-white/90" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 ml-1 text-sm md:text-base" {...props} />,
  li: ({ ...props }) => <li className="text-white/70" {...props} />,
  a: ({ ...props }) => (
    <a 
      className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-4 transition-colors" 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props} 
    />
  ),
  h3: ({ ...props }) => <h3 className="text-base md:text-lg text-white mt-4 mb-1.5 tracking-widest uppercase" {...props} />,
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function KamuProfili({ params }: PageProps) {
  const resolvedParams = use(params)
  const hedefKullaniciId = resolvedParams.id

  const [profil, setProfil] = useState<Profil | null>(null)
  const [karakter, setKarakter] = useState<Karakter | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [ayFazi, setAyFazi] = useState<AyFazi | null>(null)
  const [aktifPanel, setAktifPanel] = useState<'hikaye' | 'gucler' | 'zayifliklar' | 'motivasyon'>('hikaye')
  
  const [mobilSekme, setMobilSekme] = useState<'portre' | 'hikaye' | 'bust'>('hikaye')

  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const guncelle = () => setIsDesktop(mq.matches)
    guncelle()
    mq.addEventListener('change', guncelle)
    return () => mq.removeEventListener('change', guncelle)
  }, [])

  const [muhurler, setMuhurler] = useState<Bag[]>([])
  const [takiliMaske, setTakiliMaske] = useState<EnvanterItem | null>(null)
  const [takiliAksesuar, setTakiliAksesuar] = useState<EnvanterItem | null>(null)
  const [seciliEsya, setSeciliEsya] = useState<EnvanterItem | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function yukle() {
      const { data: p } = await supabase.from('profiles').select('rol, email, is_admin, yildiz_tozu').eq('id', hedefKullaniciId).single()
      if (!p) { setYukleniyor(false); return }
      setProfil(p as Profil)

      const { data: k } = await supabase.from('karakterler').select('*').eq('kullanici_id', hedefKullaniciId).single()
      setKarakter(k)
      setAyFazi(ayFaziniHesapla())

      const { data: baglarData } = await supabase
        .from('karakter_baglari')
        .select('*')
        .eq('durum', 'onaylandi')
        .or(`gonderen_id.eq.${hedefKullaniciId},alici_id.eq.${hedefKullaniciId}`)

      if (baglarData) {
        const { data: tumKarakterler } = await supabase.from('karakterler').select('kullanici_id, karakter_adi, gorsel_url')
        const eslesmisBaglar = baglarData.map(bag => {
          const digerId = bag.gonderen_id === hedefKullaniciId ? bag.alici_id : bag.gonderen_id
          const digerKarakter = tumKarakterler?.find(c => c.kullanici_id === digerId)
          return {
            id: bag.id,
            bag_tipi: bag.bag_tipi,
            diger_karakter_adi: digerKarakter?.karakter_adi ?? "Kabile Dostu",
            diger_gorsel_url: digerKarakter?.gorsel_url ?? null,
            diger_kullanici_id: digerId
          }
        })
        setMuhurler(eslesmisBaglar as Bag[])
      }

      const { data: envanterData } = await supabase
        .from('karakter_envanteri')
        .select('id, takili_mi, urun_id, magaza_urunleri(id, isim, aciklama, esya_tipi, gorsel_url, model_url)')
        .eq('kullanici_id', hedefKullaniciId)
        .eq('takili_mi', true)

      if (envanterData) {
        const formatliEkipmanlar: EnvanterItem[] = envanterData
          .filter((e: any) => e.magaza_urunleri !== null)
          .map((e: any) => ({
            id: e.id,
            isim: e.magaza_urunleri.isim,
            tip: e.magaza_urunleri.esya_tipi,
            aciklama: e.magaza_urunleri.aciklama,
            gorsel_url: e.magaza_urunleri.gorsel_url,
            is3D: !!e.magaza_urunleri.model_url,
            model_url: e.magaza_urunleri.model_url
          }))

        const maskeObj = formatliEkipmanlar.find(e => e.tip === 'maske')
        const aksesuarObj = formatliEkipmanlar.find(e => e.tip === 'aksesuar')
        
        if (maskeObj) setTakiliMaske(maskeObj)
        if (aksesuarObj) setTakiliAksesuar(aksesuarObj)
      }

      setYukleniyor(false)
    }
    yukle()
  }, [hedefKullaniciId])

  if (yukleniyor) return (
    <main className="h-screen w-screen bg-black flex items-center justify-center">
      <p className="text-white/20 text-xs tracking-widest uppercase animate-pulse">Kozmik bağlar kuruluyor...</p>
    </main>
  )

  const showPortre = isDesktop || mobilSekme === 'portre'
  const showHikaye = isDesktop || mobilSekme === 'hikaye'
  const showBust = isDesktop || mobilSekme === 'bust'

  return (
    <div className="h-screen w-screen bg-black flex flex-col overflow-hidden relative">
      <div className="fixed inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="fixed inset-0 bg-black/85 pointer-events-none" />
      <div className="fixed top-0 left-0 right-0 h-px z-30 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)' }} />

      {/* HEADER */}
      <header className="relative z-10 shrink-0 flex items-center justify-between px-4 md:px-6 py-2 border-b border-white/5 bg-black/60 h-14">
        <div className="flex items-center gap-2">
          {ayFazi && (
            <div className={`flex items-center gap-2 px-3 py-1 border text-[10px] md:text-xs rounded ${
              ayFazi.dolunayMi ? 'border-yellow-400/30 text-yellow-300/70 bg-yellow-400/5' : 'border-fuchsia-500/10 text-fuchsia-300/40'
            }`}>
              <span className="text-sm">{ayFazi.sembol}</span>
              <span className="tracking-widest uppercase">{ayFazi.isim}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1 border border-amber-500/20 text-amber-400/80 bg-amber-500/5 rounded text-[10px] md:text-xs">
            <span className="animate-pulse">𐀏</span>
            <span className="font-mono font-bold">{profil?.yildiz_tozu ?? 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4 justify-end">
          <Link href="/oyun-arkadaslari" className="border border-white/10 text-white/30 hover:border-white/30 hover:text-white/60 px-3 py-1.5 text-[10px] md:text-xs tracking-widest uppercase transition-all bg-black/40">
            ← Arkadaşlar
          </Link>
          <Link href="/portal" className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all">Portalım</Link>
        </div>
      </header>

      {/* MOBİL SEKMELER */}
      {!isDesktop && (
        <div className="flex items-stretch border-b border-white/10 bg-black/90 z-20 shrink-0 h-11">
          <button
            onClick={() => setMobilSekme('portre')}
            className={`flex-1 flex items-center justify-center gap-1 text-[10px] tracking-widest uppercase transition-all border-b-2 ${
              mobilSekme === 'portre' ? 'text-fuchsia-400 font-bold border-fuchsia-400 bg-fuchsia-500/5' : 'text-white/40 border-transparent'
            }`}
          >
            🖼 2D Model
          </button>
          <button
            onClick={() => setMobilSekme('hikaye')}
            className={`flex-1 flex items-center justify-center gap-1 text-[10px] tracking-widest uppercase transition-all border-b-2 ${
              mobilSekme === 'hikaye' ? 'text-cyan-400 font-bold border-cyan-400 bg-cyan-500/5' : 'text-white/40 border-transparent'
            }`}
          >
            📜 Lore
          </button>
          <button
            onClick={() => setMobilSekme('bust')}
            className={`flex-1 flex items-center justify-center gap-1 text-[10px] tracking-widest uppercase transition-all border-b-2 ${
              mobilSekme === 'bust' ? 'text-amber-400 font-bold border-amber-400 bg-amber-500/5' : 'text-white/40 border-transparent'
            }`}
          >
            🎭 3D Büst
          </button>
        </div>
      )}

      {/* ANA DÜZEN — Masaüstü: Sol %35 / Orta %30 / Sağ %35 */}
      <div className={`relative z-10 flex flex-1 overflow-hidden h-[calc(100vh-3.5rem)] w-full ${isDesktop ? 'flex-row' : 'flex-col'}`}>

        {/* 1. SOL KOLON — %35 — 2D Görsel + Ad/Köken — MOR kenarlık */}
        {showPortre && (
          <div
            className={`${isDesktop ? 'pt-10 px-8' : 'w-full pt-6 px-6'} shrink-0 border-r-2 border-fuchsia-500/30 bg-black/35 flex flex-col gap-5 overflow-y-auto no-scrollbar justify-start`}
            style={isDesktop ? { width: '35%' } : undefined}
          >
            <div className="relative aspect-[3/4] w-full rounded-lg border border-fuchsia-500/20 overflow-hidden shadow-2xl shadow-fuchsia-500/10">
              {karakter?.gorsel_url ? (
                <img src={karakter.gorsel_url} alt={karakter.karakter_adi} className="absolute inset-0 w-full h-full object-cover object-top" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-fuchsia-400/10 text-6xl">✦</span></div>
              )}
            </div>

            {karakter && (
              <div className="flex flex-col gap-2 border-b border-fuchsia-500/10 pb-4 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-thin tracking-[0.15em] uppercase text-white">
                  {karakter.karakter_adi}
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                  {karakter.tur && <span className="text-white/20 text-xs tracking-widest uppercase">{karakter.tur}</span>}
                  {karakter.koken && <span className="text-cyan-400/40 text-xs tracking-widest uppercase border border-cyan-400/10 px-2 py-0.5 rounded">{karakter.koken}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. ORTA KOLON — %30 — Mühürlü Bağlar & Lore — CYAN kenarlık */}
        {showHikaye && (
          <div
            className={`${isDesktop ? '' : 'w-full'} flex flex-col p-6 md:px-6 md:py-10 gap-6 min-w-0 overflow-y-auto no-scrollbar`}
            style={isDesktop ? { width: '30%' } : undefined}
          >
            {karakter ? (
              <>
                {muhurler.length > 0 && (
                  <div className="flex flex-col gap-4 border border-cyan-500/15 bg-black/40 p-6 rounded-md">
                    <span className="text-white/20 text-[10px] tracking-widest uppercase">Mühürlü Kozmik Bağları</span>
                    <div className="flex flex-wrap gap-7 mt-1">
                      {muhurler.map(bag => {
                        const stil = bagRenkleri[bag.bag_tipi] ?? 'text-white'
                        return (
                          <Link 
                            key={bag.id} 
                            href={`/portal/${bag.diger_kullanici_id}`}
                            className="flex flex-col items-center text-center gap-2 group cursor-pointer"
                          >
                            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-2 ${stil.split(' ')[1]} overflow-hidden bg-black/30 shadow-lg group-hover:scale-105 group-hover:border-white/40 transition-all duration-300 relative`}>
                              {bag.diger_gorsel_url ? (
                                <img src={bag.diger_gorsel_url} alt={bag.diger_karakter_adi} className="w-full h-full object-cover object-top" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20 text-base font-bold bg-black/40">
                                  {bag.diger_karakter_adi[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-white text-sm font-bold leading-tight group-hover:text-fuchsia-300 transition-colors">{bag.diger_karakter_adi}</span>
                              <span className={`text-[9px] font-bold tracking-wider uppercase ${stil.split(' ')[0]}`}>
                                {bagUnvanlari[bag.bag_tipi]}
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

{/* TAB SEÇİCİ */}
<div className="flex gap-0 border-b border-cyan-500/15 overflow-x-auto shrink-0">
  {([
    { key: 'hikaye', label: 'Köken', renk: 'fuchsia' },
    { key: 'gucler', label: 'Güçler', renk: 'cyan' },
    { key: 'zayifliklar', label: 'Zayıflıklar', renk: 'rose' },
    { key: 'motivasyon', label: 'Motivasyon', renk: 'amber' },
  ] as const).map(t => (
    <button key={t.key} onClick={() => setAktifPanel(t.key)}
      className={`px-5 py-3 text-sm tracking-widest uppercase transition-all border-b-2 whitespace-nowrap ${
        aktifPanel === t.key
          ? t.renk === 'fuchsia' ? 'text-fuchsia-400/80 border-fuchsia-400/50'
          : t.renk === 'cyan' ? 'text-cyan-400/80 border-cyan-400/50'
          : t.renk === 'rose' ? 'text-rose-400/80 border-rose-400/50'
          : 'text-amber-400/80 border-amber-400/50'
          : 'text-white/20 border-transparent hover:text-white/40'
      }`}>
      {t.label}
    </button>
  ))}
</div>

{/* TAB İÇERİKLERİ */}
<div className="flex-1 min-h-0 bg-black/30 border border-cyan-500/10 p-8 rounded-md overflow-y-auto no-scrollbar shadow-inner">
  {aktifPanel === 'hikaye' && (
    karakter.koken_hikayesi && (
      <div className="text-white/50 text-base leading-relaxed max-w-3xl">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
          {karakter.koken_hikayesi}
        </ReactMarkdown>
      </div>
    )
  )}

  {aktifPanel === 'gucler' && (
    karakter.gucler && (
      <div className="text-white/50 text-sm leading-relaxed max-w-3xl">
        <p className="text-cyan-400/40 text-xs tracking-[0.4em] uppercase mb-3">Güçler & Yetenekler</p>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
          {karakter.gucler}
        </ReactMarkdown>
      </div>
    )
  )}

  {aktifPanel === 'zayifliklar' && (
    karakter.zayifliklar && (
      <div className="text-white/50 text-sm leading-relaxed max-w-3xl">
        <p className="text-rose-400/40 text-xs tracking-[0.4em] uppercase mb-3">Zayıflıklar & Zaaflar</p>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
          {karakter.zayifliklar}
        </ReactMarkdown>
      </div>
    )
  )}

  {aktifPanel === 'motivasyon' && (
    karakter.motivasyon && (
      <div className="text-white/50 text-base leading-relaxed italic max-w-3xl">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
          {karakter.motivasyon}
        </ReactMarkdown>
      </div>
    )
  )}
</div>
              </>
            ) : (
              <p className="text-white/20 text-xs tracking-widest uppercase">Karakter kaydı bulunamadı.</p>
            )}
          </div>
        )}

        {/* 3. SAĞ KOLON — %35 — 3D Büst + Sahne Ekipmanları — AMBER kenarlık */}
        {showBust && (
          <div
            className={`${isDesktop ? 'pt-10 px-8' : 'w-full pt-6 px-6'} shrink-0 border-l-2 border-amber-500/30 bg-black/35 flex flex-col gap-5 overflow-y-auto no-scrollbar justify-start`}
            style={isDesktop ? { width: '35%' } : undefined}
          >
            <div className="relative aspect-[3/4] w-full rounded-lg border border-amber-500/20 overflow-hidden shadow-2xl shadow-amber-500/10 bg-black/50">
              <CharacterBust 
                bodyUrl={null}
                maskeUrl={takiliMaske?.model_url}
                aksesuarUrl={takiliAksesuar?.model_url}
              />
            </div>

            <div className="flex flex-col gap-3 border border-amber-500/15 bg-black/50 p-4 rounded-md">
              <span className="text-white/20 text-[9px] tracking-widest uppercase text-center">Sahne Ekipmanları</span>
              <div className="flex justify-center gap-6 py-2">
                <div 
                  onClick={() => takiliMaske && setSeciliEsya(takiliMaske)} 
                  className={`w-16 h-16 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 relative group ${
                    takiliMaske ? 'border-fuchsia-500/40 bg-fuchsia-500/5 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:scale-105' : 'border-white/5 bg-black/30 opacity-40'
                  }`}
                  title={takiliMaske?.isim ?? "Maske Yuvası Boş"}
                >
                  <span className="text-2xl">🎭</span>
                  {takiliMaske && (
                    <span className="absolute -bottom-5 text-[8px] tracking-wider text-white/50 truncate max-w-[70px]">{takiliMaske.isim.split(' ')[0]}</span>
                  )}
                </div>

                <div 
                  onClick={() => takiliAksesuar && setSeciliEsya(takiliAksesuar)} 
                  className={`w-16 h-16 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 relative group ${
                    takiliAksesuar ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:scale-105' : 'border-white/5 bg-black/30 opacity-40'
                  }`}
                  title={takiliAksesuar?.isim ?? "Aksesuar Yuvası Boş"}
                >
                  <span className="text-2xl">🔮</span>
                  {takiliAksesuar && (
                    <span className="absolute -bottom-5 text-[8px] tracking-wider text-white/50 truncate max-w-[70px]">{takiliAksesuar.isim.split(' ')[0]}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 3D ÖNİZLEME MODAL */}
      {seciliEsya && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSeciliEsya(null)}>
          <div className="relative z-10 w-full max-w-xl bg-black border border-fuchsia-500/20 p-6 flex flex-col gap-5 rounded shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-white tracking-widest uppercase text-sm">{seciliEsya.isim}</h3>
              <span onClick={() => setSeciliEsya(null)} className="text-white/40 hover:text-white text-2xl cursor-pointer">×</span>
            </div>

            <div className="w-full h-64 border border-white/5 rounded relative overflow-hidden bg-gradient-to-b from-black to-fuchsia-500/5">
              <Canvas camera={{ position: [0, 0, 5] }}>
                <ambientLight intensity={0.4} />
                <pointLight position={[5, 5, 5]} intensity={1.5} color="#e879f9" />
                <Suspense fallback={null}>
                  <Stage environment="city" intensity={0.5}>
                    {seciliEsya.model_url ? (
                      <ModelOlusturucu url={seciliEsya.model_url} />
                    ) : (
                      <mesh>
                        <sphereGeometry args={[1, 16, 16]} />
                        <meshStandardMaterial color="#ff2daf" />
                      </mesh>
                    )}
                  </Stage>
                </Suspense>
                <OrbitControls enableZoom={false} enablePan={false} />
              </Canvas>
              <p className="absolute bottom-2 left-2 text-[9px] text-white/20 tracking-wider">3D Önizleme — Çevirmek için sürükleyin</p>
            </div>

            <p className="text-white/60 text-xs md:text-sm leading-relaxed">{seciliEsya.aciklama}</p>
          </div>
        </div>
      )}

    </div>
  )
}