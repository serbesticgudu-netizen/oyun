'use client'

import { ayFaziniHesapla, AyFazi } from '@/lib/ay'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import dynamic from 'next/dynamic'

// 3D Büst Bileşeni (SSR Engelleyici) — bu sefer eksiksiz eklendi
const CharacterBust = dynamic(() => import('@/components/CharacterBust'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/40">
      <span className="text-fuchsia-400/30 text-xs tracking-widest uppercase animate-pulse">3D Büst Yükleniyor...</span>
    </div>
  )
})

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
  p: ({ ...props }) => <p className="mb-3 last:mb-0 leading-relaxed text-sm" {...props} />,
  strong: ({ ...props }) => <strong className="text-white font-bold tracking-wide" {...props} />,
  em: ({ ...props }) => <em className="italic text-white/90" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 ml-1 text-sm" {...props} />,
  li: ({ ...props }) => <li className="text-white/70" {...props} />,
  a: ({ ...props }) => (
    <a 
      className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-4 transition-colors" 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props} 
    />
  ),
  h3: ({ ...props }) => <h3 className="text-base text-white mt-4 mb-1.5 tracking-widest uppercase" {...props} />,
}

// 3D .glb model yükleyici bileşeni
function ModelOlusturucu({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

export default function Portal() {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [karakter, setKarakter] = useState<Karakter | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [ayFazi, setAyFazi] = useState<AyFazi | null>(null)
  const [aktifPanel, setAktifPanel] = useState<'hikaye' | 'gucler' | 'zayifliklar' | 'motivasyon'>('hikaye')
  const [isEditing, setIsEditing] = useState(false)
  const [editedKarakter, setEditedKarakter] = useState<Partial<Karakter> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [okunmamis, setOkunmamis] = useState(0)

  // Mobil sekme: portre / hikaye / bust — masaüstü 3 kolonun mobil karşılığı
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/giris'; return }

      const { data: p } = await supabase.from('profiles').select('rol, email, is_admin, yildiz_tozu').eq('id', user.id).single()
      if (!p) { setYukleniyor(false); return }
      if (p.rol === 'aday') { window.location.href = '/karakter'; return }
      setProfil(p as Profil)

      const { data: k } = await supabase.from('karakterler').select('*').eq('kullanici_id', user.id).single()
      setKarakter(k)
      setAyFazi(ayFaziniHesapla())

      const { data: baglarData } = await supabase
        .from('karakter_baglari')
        .select('*')
        .eq('durum', 'onaylandi')
        .or(`gonderen_id.eq.${user.id},alici_id.eq.${user.id}`)

      if (baglarData) {
        const { data: tumKarakterler } = await supabase.from('karakterler').select('kullanici_id, karakter_adi, gorsel_url')
        const eslesmisBaglar = baglarData.map(bag => {
          const digerId = bag.gonderen_id === user.id ? bag.alici_id : bag.gonderen_id
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
        .eq('kullanici_id', user.id)
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

      const { count } = await supabase.from('private_mesajlar').select('*', { count: 'exact', head: true }).eq('alici_id', user.id).eq('okundu', false)
      setOkunmamis(count ?? 0)
      
      setYukleniyor(false)
    }
    yukle()
  }, [])

  async function cikisYap() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function handleEditToggle() {
    if (!isEditing) setEditedKarakter(karakter)
    else setEditedKarakter(null)
    setIsEditing(!isEditing)
  }

  async function handleSave() {
    if (!editedKarakter || !karakter) return
    setIsSaving(true)
    const { data, error } = await supabase
      .from('karakterler')
      .update({
        tur: editedKarakter.tur,
        koken: editedKarakter.koken,
        koken_hikayesi: editedKarakter.koken_hikayesi,
        gucler: editedKarakter.gucler,
        zayifliklar: editedKarakter.zayifliklar,
        motivasyon: editedKarakter.motivasyon,
      })
      .eq('id', karakter.id)
      .select()
      .single()

    if (error) {
      alert('Kaydederken bir hata oluştu: ' + error.message)
    } else if (data) {
      setKarakter(data as Karakter)
      setIsEditing(false)
    }
    setIsSaving(false)
  }

  if (yukleniyor) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/20 text-xs tracking-widest uppercase animate-pulse">Geçit açılıyor...</p>
    </main>
  )

  if (profil?.rol === 'ziyaretci') return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover' }}>
      <div className="fixed inset-0 bg-black/80" />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-lg px-8">
        <p className="text-white/50 text-sm tracking-wider leading-relaxed">
          Henüz Theia Kabilesi Oyun Arkadaşı Adaylığınızı Gözden Geçirmemiştir.<br />
          Bu Süreçte Theia Arşivlerini İnceleyebilirsiniz.
        </p>
        <Link href="/arsiv" className="border border-white/20 text-white/60 px-8 py-3 text-xs tracking-widest uppercase hover:border-white/40 transition-all">Arşive Git</Link>
        <button onClick={cikisYap} className="text-white/20 text-xs tracking-widest uppercase hover:text-white/40 transition-all">Çıkış Yap</button>
      </div>
    </main>
  )

  const showPortre = isDesktop || mobilSekme === 'portre'
  const showHikaye = isDesktop || mobilSekme === 'hikaye'
  const showBust = isDesktop || mobilSekme === 'bust'

  // Nav linkleri — grup grup, hem mobil hem masaüstü render'ında ortak kullanılıyor
  const navGrup1 = (
    <>
      <Link href="/gorevler" className="flex items-center gap-1.5 text-cyan-400/40 text-xs tracking-widest uppercase hover:text-cyan-400 transition-all group">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 group-hover:bg-cyan-400 transition-all" />
        <span>Görevler</span>
      </Link>
      <Link href="/arsiv/kisisel" className="flex items-center gap-1.5 text-violet-400/40 text-xs tracking-widest uppercase hover:text-violet-400 transition-all group">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400/30 group-hover:bg-violet-400 transition-all" />
        <span>Hafıza</span>
      </Link>
      <Link href="/harita" className="flex items-center gap-1.5 text-green-400/40 text-xs tracking-widest uppercase hover:text-green-400 transition-all group">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400/40 group-hover:bg-green-400 transition-all" />
        <span>Harita</span>
      </Link>
      <Link href="/oyun-arkadaslari" className="flex items-center gap-1.5 text-indigo-400/40 text-xs tracking-widest uppercase hover:text-indigo-400 transition-all group">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/30 group-hover:bg-indigo-400 transition-all" />
        <span>Arkadaşlar</span>
      </Link>
    </>
  )

  const navGrup2 = (
    <>
      <Link href="/arsiv" className="flex items-center gap-2 text-fuchsia-400/50 text-xs tracking-widest uppercase hover:text-fuchsia-400 transition-all border border-fuchsia-400/20 hover:border-fuchsia-400/50 px-3 py-1.5 bg-black/20">
        <span>✦</span>
        <span className="hidden sm:inline">Kadim </span>Arşiv
      </Link>
      <Link href="/chat" className="relative flex items-center gap-2 text-rose-400/40 text-xs tracking-widest uppercase hover:text-rose-400 transition-all border border-rose-400/15 hover:border-rose-400/40 px-3 py-1.5 bg-black/20" title="Sesler">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 8.4c.5.3.8.8.8 1.3v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V9.7c0-.5.3-1 .8-1.3L12 3l9.2 5.4Z"/><path d="m22 10-10 7L2 10"/></svg>
        <span className="hidden sm:inline">Sesler</span>
        {okunmamis > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold bg-fuchsia-500 text-black shadow-[0_0_8px_#d946ef]" style={{ fontSize: '9px' }}>{okunmamis}</span>}
      </Link>
      <Link href="/magaza" className="flex items-center gap-2 text-amber-400/40 text-xs tracking-widest uppercase hover:text-amber-400 transition-all border border-amber-400/15 hover:border-amber-400/40 px-3 py-1.5 bg-black/20" title="Mağaza">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><line x1="12" y1="8" x2="12" y2="16"/><path d="M16 12H8"/><circle cx="12" cy="12" r="10" strokeOpacity="0.3" strokeDasharray="2 2"/></svg>
        <span className="hidden sm:inline">Mağaza</span>
      </Link>
    </>
  )

  return (
    <div className="h-screen overflow-hidden bg-black flex flex-col relative">

      {/* Arka plan */}
      <div className="fixed inset-0 opacity-15" style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="fixed inset-0 bg-black/85" />
      <div className="fixed top-0 left-0 right-0 h-px z-30" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)' }} />

      {/* HEADER — akıllıca gruplanmış: rozet+çıkış üstte, nav ortada/sağda dengeli dağılım */}
{/* MASAÜSTÜ HEADER (hidden md:flex) */}
{/* MASAÜSTÜ HEADER */}
{isDesktop && (
  <header className="relative z-30 shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/60 h-16 w-full">
    
    {/* SOL GRUP: Ay Fazı + Kadim Arşiv */}
    <div className="flex items-center gap-4">
      {ayFazi && (
        <div className={`flex items-center gap-2 px-3 py-1.5 border text-xs rounded ${
          ayFazi.dolunayMi ? 'border-yellow-400/30 text-yellow-300/70 bg-yellow-400/5' : 'border-fuchsia-500/10 text-fuchsia-300/40'
        }`}>
          <span className="text-sm">{ayFazi.sembol}</span>
          <span className="tracking-widest uppercase">{ayFazi.isim}</span>
        </div>
      )}

      <Link href="/arsiv" className="flex items-center gap-1.5 text-fuchsia-400/80 text-xs tracking-widest uppercase hover:text-fuchsia-300 transition-all border border-fuchsia-400/20 hover:border-fuchsia-400/50 px-3 py-1.5 bg-black/30 rounded">
        <span>✦ Kadim Arşiv</span>
      </Link>
    </div>

    {/* ORTA GRUP: Hafıza | Harita | Görevler | Arkadaşlar (Noktasız) */}
    <div className="flex items-center gap-8">
      <Link href="/arsiv/kisisel" className="text-violet-400/80 hover:text-violet-300 text-xs tracking-widest uppercase transition-all font-medium">
        Hafıza
      </Link>
      <Link href="/harita" className="text-green-400/80 hover:text-green-300 text-xs tracking-widest uppercase transition-all font-medium">
        Harita
      </Link>
      <Link href="/gorevler" className="text-cyan-400/80 hover:text-cyan-300 text-xs tracking-widest uppercase transition-all font-medium">
        Görevler
      </Link>
      <Link href="/oyun-arkadaslari" className="text-indigo-400/80 hover:text-indigo-300 text-xs tracking-widest uppercase transition-all font-medium">
        Arkadaşlar
      </Link>
    </div>

    {/* SAĞ GRUP: Yönetim | Sohbet | Pazar | Yıldız Tozu | Çıkış */}
    <div className="flex items-center gap-3">
      {profil?.is_admin && (
        <Link href="/admin" className="text-violet-400/80 hover:text-violet-300 text-xs tracking-widest uppercase transition-all border border-violet-500/20 px-3 py-1.5 bg-black/30 rounded">
          Yönetim
        </Link>
      )}

      <Link href="/chat" className="relative flex items-center gap-1.5 text-rose-400/80 hover:text-rose-300 text-xs tracking-widest uppercase transition-all border border-rose-400/20 px-3 py-1.5 bg-black/30 rounded" title="Sohbet">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 8.4c.5.3.8.8.8 1.3v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V9.7c0-.5.3-1 .8-1.3L12 3l9.2 5.4Z"/><path d="m22 10-10 7L2 10"/></svg>
        <span>Sohbet</span>
        {okunmamis > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-fuchsia-500 text-black shadow-[0_0_8px_#d946ef]">
            {okunmamis}
          </span>
        )}
      </Link>

      <Link href="/magaza" className="flex items-center gap-1.5 text-amber-400/80 hover:text-amber-300 text-xs tracking-widest uppercase transition-all border border-amber-400/20 px-3 py-1.5 bg-black/30 rounded" title="Pazar">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><line x1="12" y1="8" x2="12" y2="16"/><path d="M16 12H8"/><circle cx="12" cy="12" r="10" strokeOpacity="0.3" strokeDasharray="2 2"/></svg>
        <span>Pazar</span>
      </Link>

      <div className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/20 text-amber-400 bg-amber-500/5 rounded text-xs">
        <span className="animate-pulse">𐀏</span>
        <span className="font-mono font-bold">{profil?.yildiz_tozu ?? 0}</span>
      </div>

      <button onClick={cikisYap} className="text-white/30 hover:text-white/70 text-xs tracking-widest uppercase transition-all ml-2">
        Çıkış
      </button>
    </div>

  </header>
)}

{/* MOBİL HEADER */}
{!isDesktop && (
  <header className="relative z-30 shrink-0 flex flex-col gap-2 px-3 py-2 border-b border-white/5 bg-black/80 w-full">
    
    {/* MOBİL SATIR 1 */}
    <div className="flex items-center justify-between gap-1 w-full text-[10px]">
      <div className="flex items-center gap-1.5">
        {ayFazi && (
          <span className="px-1.5 py-0.5 border border-fuchsia-500/20 text-fuchsia-300 rounded text-[10px]">
            {ayFazi.sembol}
          </span>
        )}
        <div className="flex items-center gap-1 px-1.5 py-0.5 border border-amber-500/20 text-amber-400 bg-amber-500/5 rounded font-mono font-bold text-[10px]">
          <span>𐀏</span>
          <span>{profil?.yildiz_tozu ?? 0}</span>
        </div>
        <Link href="/arsiv" className="text-fuchsia-400 border border-fuchsia-400/20 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-black/40">
          Arşiv
        </Link>
      </div>

      <div className="flex items-center gap-1.5">
        <Link href="/magaza" className="border border-amber-400/20 text-amber-400 p-1.5 bg-black/40 rounded flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><line x1="12" y1="8" x2="12" y2="16"/><path d="M16 12H8"/></svg>
        </Link>
        <Link href="/chat" className="relative border border-rose-400/20 text-rose-400 p-1.5 bg-black/40 rounded flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 8.4c.5.3.8.8.8 1.3v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V9.7c0-.5.3-1 .8-1.3L12 3l9.2 5.4Z"/><path d="m22 10-10 7L2 10"/></svg>
          {okunmamis > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold bg-fuchsia-500 text-black">
              {okunmamis}
            </span>
          )}
        </Link>
      </div>

      <div className="flex items-center gap-1.5">
        {profil?.is_admin && (
          <Link href="/admin" className="text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-black/40">
            Yönetim
          </Link>
        )}
        <button onClick={cikisYap} className="text-white/40 hover:text-white text-[10px] uppercase tracking-wider px-1">
          Çıkış
        </button>
      </div>
    </div>

    {/* MOBİL SATIR 2 */}
    <div className="flex items-center justify-between w-full pt-1 border-t border-white/5 text-[10px] tracking-widest uppercase font-medium">
      <Link href="/arsiv/kisisel" className="text-violet-400 hover:text-violet-300">
        Hafıza
      </Link>
      <Link href="/harita" className="text-green-400 hover:text-green-300">
        Harita
      </Link>
      <Link href="/gorevler" className="text-cyan-400 hover:text-cyan-300">
        Görevler
      </Link>
      <Link href="/oyun-arkadaslari" className="text-indigo-400 hover:text-indigo-300">
        Arkadaşlar
      </Link>
    </div>

  </header>
)}

      {/* MOBİL SEKMELER */}
      {!isDesktop && (
        <div className="flex items-stretch border-b border-white/10 bg-black/90 z-20 shrink-0 h-11 mt-2">
          <button
            onClick={() => setMobilSekme('portre')}
            className={`flex-1 flex items-center justify-center gap-1 text-[10px] tracking-widest uppercase transition-all border-b-2 ${
              mobilSekme === 'portre' ? 'text-fuchsia-400 font-bold border-fuchsia-400 bg-fuchsia-500/5' : 'text-white/40 border-transparent'
            }`}
          >
            🖼 Karakter
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
            🎭 Büst
          </button>
        </div>
      )}

      {/* ANA ALAN — Masaüstü: %30 / %40 / %30, sayfa scroll gerektirmeyecek şekilde h-full */}
      <div className={`relative z-10 flex flex-1 min-h-0 overflow-hidden ${isDesktop ? 'flex-row' : 'flex-col'}`}>

        {/* SOL KOLON — %30 — Karakter Görseli (flex-1, taşmaz) + Ad/Köken/Durum + Düzenle — MOR kenarlık */}
        {showPortre && (
          <div
            className={`${isDesktop ? 'pt-6 px-6 pb-6' : 'w-full flex-1 min-h-0 pt-4 px-5 pb-4'} shrink-0 border-r-2 border-fuchsia-500/30 bg-black/35 flex flex-col gap-4 overflow-hidden`}
            style={isDesktop ? { width: '30%' } : undefined}
          >
            <div className="relative flex-1 min-h-0 w-full rounded-lg border border-fuchsia-500/20 overflow-hidden shadow-2xl shadow-fuchsia-500/10">
              {karakter?.gorsel_url ? (
                <>
                  <img src={karakter.gorsel_url} alt={karakter.karakter_adi} className="absolute inset-0 w-full h-full object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-fuchsia-400/10 text-6xl">✦</span></div>
              )}
            </div>

            {karakter && (
              <div className="shrink-0 flex flex-col gap-2.5 border-t border-fuchsia-500/10 pt-3">
                <h1 className="text-xl md:text-2xl font-thin tracking-[0.15em] uppercase text-white"
                  style={{ textShadow: ayFazi?.dolunayMi ? '0 0 30px rgba(250,204,21,0.4)' : '0 0 30px rgba(168,85,247,0.3)' }}>
                  {karakter.karakter_adi}
                </h1>

                <div className="flex items-center gap-3 flex-wrap">
                  {isEditing && editedKarakter ? (
                    <>
                      <input value={editedKarakter.tur || ''} onChange={e => setEditedKarakter({ ...editedKarakter, tur: e.target.value })} placeholder="Tür" className="bg-black/30 border border-white/20 px-2 py-1 text-white/60 text-xs tracking-widest" />
                      <input value={editedKarakter.koken || ''} onChange={e => setEditedKarakter({ ...editedKarakter, koken: e.target.value })} placeholder="Köken" className="bg-black/30 border border-white/20 px-2 py-1 text-white/60 text-xs tracking-widest" />
                    </>
                  ) : (
                    <>
                      {karakter.tur && <span className="text-white/20 text-xs tracking-widest uppercase">{karakter.tur}</span>}
                      {karakter.koken && <span className="text-cyan-400/40 text-xs tracking-widest uppercase border border-cyan-400/10 px-2 py-0.5 rounded">{karakter.koken}</span>}
                    </>
                  )}
                </div>

                <span className={`flex items-center gap-1.5 text-xs tracking-widest uppercase px-2.5 py-1 border w-fit ${
                  karakter.durum === 'tamamlandi' ? 'text-emerald-400/60 border-emerald-400/10 bg-emerald-500/5' : 'text-amber-400/50 border-amber-400/10 bg-amber-500/5'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${karakter.durum === 'tamamlandi' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {karakter.durum === 'tamamlandi' ? 'Hazır' : 'Beklemede'}
                </span>

                {profil?.is_admin && (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={handleSave} disabled={isSaving} className="border border-emerald-500/50 text-emerald-400/80 px-4 py-1.5 text-xs uppercase hover:bg-emerald-500/10">
                          {isSaving ? '...' : 'Kaydet'}
                        </button>
                        <button onClick={handleEditToggle} className="border border-rose-500/50 text-rose-400/80 px-4 py-1.5 text-xs uppercase hover:bg-rose-500/10">
                          İptal
                        </button>
                      </>
                    ) : (
                      <button onClick={handleEditToggle} className="border border-white/10 text-white/50 px-4 py-1.5 text-xs uppercase hover:border-white/25 hover:text-white">Düzenle</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ORTA KOLON — %40 — Mühürlü Bağlar & Lore — CYAN kenarlık — kendi içinde scroll edebilir (sayfa değil) */}
        {showHikaye && (
          <div
            className={`${isDesktop ? '' : 'w-full flex-1 min-h-0'} flex flex-col p-5 md:p-6 gap-4 min-w-0 overflow-hidden`}
            style={isDesktop ? { width: '40%' } : undefined}
          >
            {karakter ? (
              <>
                {muhurler.length > 0 && (
                  <div className="shrink-0 flex flex-col gap-3 border border-cyan-500/15 bg-black/40 p-4 rounded-md">
                    <span className="text-white/20 text-[10px] tracking-widest uppercase">Mühürlü Kozmik Bağların</span>
                    <div className="flex flex-wrap gap-5">
                      {muhurler.map(bag => {
                        const stil = bagRenkleri[bag.bag_tipi] ?? 'text-white'
                        return (
                          <Link 
                            key={bag.id} 
                            href={`/portal/${bag.diger_kullanici_id}`}
                            className="flex flex-col items-center text-center gap-1.5 group cursor-pointer"
                          >
                            <div className={`w-14 h-14 rounded-full border-2 ${stil.split(' ')[1]} overflow-hidden bg-black/30 shadow-lg group-hover:scale-105 group-hover:border-white/40 transition-all duration-300 relative`}>
                              {bag.diger_gorsel_url ? (
                                <img src={bag.diger_gorsel_url} alt={bag.diger_karakter_adi} className="w-full h-full object-cover object-top" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20 text-sm font-bold bg-black/40">
                                  {bag.diger_karakter_adi[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-white text-xs font-bold leading-tight group-hover:text-fuchsia-300 transition-colors">{bag.diger_karakter_adi}</span>
                              <span className={`text-[8px] font-bold tracking-wider uppercase ${stil.split(' ')[0]}`}>
                                {bagUnvanlari[bag.bag_tipi]}
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

{/* TAB SEÇİCİ (Mobilde Taşmayan Esnek Tasarım) */}
<div className="flex justify-between md:justify-start gap-1 md:gap-0 border-b border-cyan-500/15 overflow-x-auto shrink-0 no-scrollbar">
  {([
    { key: 'hikaye', label: 'Köken', renk: 'fuchsia' },
    { key: 'gucler', label: 'Güçler', renk: 'cyan' },
    { key: 'zayifliklar', label: 'Zayıflıklar', renk: 'rose' },
    { key: 'motivasyon', label: 'Motivasyon', renk: 'amber' },
  ] as const).map(t => (
    <button key={t.key} onClick={() => setAktifPanel(t.key)}
      className={`px-2.5 sm:px-4 md:px-5 py-2 md:py-3 text-[10px] sm:text-xs md:text-sm tracking-widest uppercase transition-all border-b-2 whitespace-nowrap flex-1 md:flex-initial text-center ${
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
              <div className="flex-1 flex items-center">
                <Link href="/karakter" className="text-fuchsia-400/40 text-xs tracking-widest uppercase hover:text-fuchsia-400 transition-all">
                  Karakterini Oluştur →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* SAĞ KOLON — %30 — 3D Büst (flex-1, taşmaz) + Kuşanılan Dekorlar — AMBER kenarlık */}
        {showBust && (
          <div
            className={`${isDesktop ? 'pt-6 px-6 pb-6' : 'w-full flex-1 min-h-0 pt-4 px-5 pb-4'} shrink-0 border-l-2 border-amber-500/30 bg-black/35 flex flex-col gap-4 overflow-hidden`}
            style={isDesktop ? { width: '30%' } : undefined}
          >
            <div className="relative flex-1 min-h-0 w-full rounded-lg border border-amber-500/20 overflow-hidden shadow-2xl shadow-amber-500/10 bg-black/50">
              <CharacterBust 
                bodyUrl={null}
                maskeUrl={takiliMaske?.model_url}
                aksesuarUrl={takiliAksesuar?.model_url}
              />
            </div>

            <div className="shrink-0 flex flex-col gap-3 border border-amber-500/15 bg-black/50 p-4 rounded-md">
              <span className="text-white/20 text-[9px] tracking-widest uppercase text-center">Kuşanılan Teatral Dekorlar</span>
              <div className="flex justify-center gap-6 py-1">
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

      {/* 3D ÖNİZLEME MODALI */}
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