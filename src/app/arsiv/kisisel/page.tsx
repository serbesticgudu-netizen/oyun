'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage } from '@react-three/drei'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useGLTF } from '@react-three/drei'

// Gelen .glb dosyasını Three.js belleğine yükleyip ekrana basan yardımcı bileşen
function ModelOlusturucu({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

type ArsivKaydi = {
  id: string
  tip: string
  baslik: string
  aciklama: string
  created_at: string
}

type Gorev = {
  id: string
  isim: string
  mitolojik_gecmis: string
  simge: string
}

type Siparis = {
  id: string
  urun_isim: string
  fiyat: number
  miktar: number
  durum: string
  created_at: string
}

type Profil = {
  id: string
  rol: string
  yildiz_tozu: number
  email: string
}

type Bag = {
  id: string
  gonderen_id: string
  alici_id: string
  bag_tipi: 'muttefik' | 'ikiz_ruh' | 'koruyucu' | 'es' | 'dusman'
  durum: 'beklemede' | 'onaylandi' | 'reddedildi'
  diger_karakter_adi?: string      
  diger_gorsel_url?: string | null 
}

type EnvanterItem = {
  id: string
  isim: string
  tip: 'maske' | 'dekor' | 'aksesuar' | 'run'
  aciklama: string
  gorsel_url?: string | null
  is3D: boolean
  modelType?: 'mask' | 'ring' | 'scroll'
  model_url?: string | null // Veritabanındaki .glb dosya yolunu tutar
}

const tipStil: Record<string, { renk: string; ikon: string; etiket: string }> = {
  tablet:  { renk: '#a855f7', ikon: '𐀏', etiket: 'Tablet' },
  gorev:   { renk: '#22d3ee', ikon: '⬡', etiket: 'Görev' },
  gecit:   { renk: '#f0c040', ikon: '◉', etiket: 'Geçit' },
  siparis: { renk: '#34d399', ikon: '◈', etiket: 'Sipariş' },
  kayit:   { renk: '#f472b6', ikon: '✦', etiket: 'Kayıt' },
}

const bagStilleri: Record<string, string> = {
  muttefik: 'text-cyan-400 border-cyan-400/20',
  ikiz_ruh: 'text-fuchsia-400 border-fuchsia-400/20',
  koruyucu: 'text-rose-400 border-rose-400/20', 
  es: 'text-amber-400 border-amber-400/20',             
  dusman: 'text-red-500 border-red-500/20',             
}

const MarkdownComponents = {
  p: ({ ...props }) => <p className="mb-3 last:mb-0 leading-relaxed text-xs md:text-sm" {...props} />,
  strong: ({ ...props }) => <strong className="text-white font-bold tracking-wide" {...props} />,
  em: ({ ...props }) => <em className="italic text-white/90" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 ml-1 text-xs md:text-sm" {...props} />,
  li: ({ ...props }) => <li className="text-white/70" {...props} />,
  a: ({ ...props }) => (
    <a 
      className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-4 transition-colors" 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props} 
    />
  ),
  h3: ({ ...props }) => <h3 className="text-sm md:text-base text-white mt-4 mb-1.5 tracking-widest uppercase" {...props} />,
}

type Tab = 'sandik' | 'gorevler' | 'baglar' | 'hafiza'
type EnvanterSlot = 
  | { type: 'empty'; data: null }
  | { type: 'item'; data: EnvanterItem }

export default function KisiselArsiv() {
  const [aktifTab, setAktifTab] = useState<Tab>('sandik')
  const [kayitlar, setKayitlar] = useState<ArsivKaydi[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktifGorevler, setAktifGorevler] = useState<Gorev[]>([])
  const [tamamlananGorevler, setTamamlananGorevler] = useState<Gorev[]>([])
  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [profil, setProfil] = useState<Profil | null>(null)
  const [filtre, setFiltre] = useState<string | null>(null)
  const [aktifKabileUyeleri, setAktifKabileUyeleri] = useState<{ kullanici_id: string; karakter_adi: string }[]>([])
  const [envanterEsyalari, setEnvanterEsyalari] = useState<EnvanterItem[]>([])
  
  // Bağ Durumları
  const [baglar, setBaglar] = useState<Bag[]>([])
  const [hedefKarakterAdi, setYeniKarakterAdi] = useState('')
  const [yeniBagTipi, setYeniBagTipi] = useState<'muttefik' | 'ikiz_ruh' | 'koruyucu' | 'es' | 'dusman'>('muttefik')
  const [bagGonderiliyor, setBagGonderiyor] = useState(false)
  
  const [acikGorevId, setAcikGorevId] = useState<string | null>(null)
  const [seciliEsya, setSeciliEsya] = useState<EnvanterItem | null>(null)
  const [takiliMaske, setTakiliMaske] = useState<EnvanterItem | null>(null)
  const [takiliDekor, setTakiliDekor] = useState<EnvanterItem | null>(null)
  const [takiliAksesuar, setTakiliAksesuar] = useState<EnvanterItem | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/giris'; return }

      // 1. Profil ve Yıldız Tozu
      const { data: p } = await supabase.from('profiles').select('rol, yildiz_tozu, email, id').eq('id', user.id).single()
      setProfil(p as Profil)

      // 2. Kişisel hafıza akışını çek
      const { data: arsivData } = await supabase.from('kisisel_arsiv').select('*').eq('kullanici_id', user.id).order('created_at', { ascending: false })
      setKayitlar(arsivData ?? [])

      // 3. MÜHÜRLÜ BAĞLARI VE DİĞER ÜYELERİN BİLGİLERİNİ ÇEK
      const { data: baglarData } = await supabase
        .from('karakter_baglari')
        .select('*')
        .or(`gonderen_id.eq.${user.id},alici_id.eq.${user.id}`)

      if (baglarData) {
        const { data: tumKarakterler } = await supabase
          .from('karakterler')
          .select('kullanici_id, karakter_adi, gorsel_url')

        const zenginlestirilmisBaglar = baglarData.map(bag => {
          const digerId = bag.gonderen_id === user.id ? bag.alici_id : bag.gonderen_id
          const digerKarakter = tumKarakterler?.find(c => c.kullanici_id === digerId)
          
          return {
            ...bag,
            diger_karakter_adi: digerKarakter?.karakter_adi ?? "Bilinmeyen Varlık",
            diger_gorsel_url: digerKarakter?.gorsel_url ?? null
          }
        })
        setBaglar(zenginlestirilmisBaglar as Bag[])
      }

      // YENİ SORGULAMA ( Left Join )
      const { data: envData, error: envHata } = await supabase
        .from('karakter_envanteri')
        .select('id, takili_mi, urun_id, magaza_urunleri(id, isim, aciklama, esya_tipi, gorsel_url, model_url)')
        .eq('kullanici_id', user.id)

      if (envHata) {
        console.error("Envanter çekilirken hata oluştu:", JSON.stringify(envHata))
      }

      if (envData) {
        const formatliEsyalar: EnvanterItem[] = envData
          .filter((e: any) => e.magaza_urunleri !== null)
          .map((e: any) => ({
            id: e.id, 
            isim: e.magaza_urunleri.isim,
            tip: e.magaza_urunleri.esya_tipi, 
            aciklama: e.magaza_urunleri.aciklama,
            gorsel_url: e.magaza_urunleri.gorsel_url,
            is3D: !!e.magaza_urunleri.model_url, 
            modelType: e.magaza_urunleri.esya_tipi === 'maske' ? 'mask' : 'ring',
            model_url: e.magaza_urunleri.model_url // DÜZELTİLDİ: Eksik model_url bağlantısı eklendi!
          }))
        
        setEnvanterEsyalari(formatliEsyalar)

        const takiliMaskeObj = formatliEsyalar.find(item => item.tip === 'maske' && envData.find((e: any) => e.id === item.id)?.takili_mi)
        const takiliDekorObj = formatliEsyalar.find(item => item.tip === 'dekor' && envData.find((e: any) => e.id === item.id)?.takili_mi)
        const takiliAksesuarObj = formatliEsyalar.find(item => item.tip === 'aksesuar' && envData.find((e: any) => e.id === item.id)?.takili_mi)

        if (takiliMaskeObj) setTakiliMaske(takiliMaskeObj)
        if (takiliDekorObj) setTakiliDekor(takiliDekorObj)
        if (takiliAksesuarObj) setTakiliAksesuar(takiliAksesuarObj)
      }

      // 4. BAĞ KURMA LİSTESİ İÇİN AKTİF ÜYELERİ ÇEK
      const { data: uyeler } = await supabase
        .from('karakterler')
        .select('kullanici_id, karakter_adi')
        .eq('durum', 'tamamlandi')
        .neq('kullanici_id', user.id) 
      setAktifKabileUyeleri(uyeler ?? [])

      // 5. Görevleri çek
      const { data: gorevlerData } = await supabase.from('gecit_noktalari').select('id, isim, mitolojik_gecmis, simge').eq('tip', 'gorev')
      const { data: kabullerData } = await supabase.from('gorev_kabulleri').select('gorev_id, durum').eq('kullanici_id', user.id)

      if (gorevlerData && kabullerData) {
        const aktif = kabullerData.filter(k => k.durum === 'aktif').map(k => gorevlerData.find(g => g.id === k.gorev_id)).filter(Boolean) as Gorev[]
        const tamamlanan = kabullerData.filter(k => k.durum === 'tamamlandi').map(k => gorevlerData.find(g => g.id === k.gorev_id)).filter(Boolean) as Gorev[]
        setAktifGorevler(aktif)
        setTamamlananGorevler(tamamlanan)
      }

      setYukleniyor(false)
    }
    yukle()
  }, [])

  async function bagTalebiGonder() {
    if (!hedefKarakterAdi.trim() || !profil || bagGonderiliyor) return
    setBagGonderiyor(true)

    const { data: hedefKarakter, error: kHata } = await supabase
      .from('karakterler')
      .select('kullanici_id, karakter_adi')
      .eq('karakter_adi', hedefKarakterAdi.trim())
      .single()

    if (kHata || !hedefKarakter) {
      alert("Hata: Bu isimde bir karakter bulunamadı. Lütfen tam adı yazın.")
      setBagGonderiyor(false)
      return
    }

    if (hedefKarakter.kullanici_id === profil.id) {
      alert("Kozmik kurallar gereği kendi varlığınızla bağ kuramazsınız.")
      setBagGonderiyor(false)
      return
    }

    const { data, error } = await supabase.from('karakter_baglari').insert({
      gonderen_id: profil.id,
      alici_id: hedefKarakter.kullanici_id,
      bag_tipi: yeniBagTipi,
      durum: 'beklemede',
      gonderen_karakter: hedefKarakter.karakter_adi
    }).select().single()

    if (error) {
      alert("Hata: Bağ talebi gönderilemedi: " + error.message)
    } else if (data) {
      setBaglar(prev => [...prev, data as Bag])
      setYeniKarakterAdi('')
      alert("✦ Bağ talebi başarıyla iletildi. Karşı taraf onayladığında mühürlenecektir.")
    }
    setBagGonderiyor(false)
  }

  async function bagDurumuGuncelle(bagId: string, yeniDurum: 'onaylandi' | 'reddedildi') {
    const { data, error } = await supabase.from('karakter_baglari').update({ durum: yeniDurum }).eq('id', bagId).select().single()
    if (error) alert("Kozmik bağ mühürlenirken hata oluştu: " + error.message)
    else if (data) setBaglar(prev => prev.map(b => b.id === bagId ? { ...b, durum: yeniDurum } : b))
  }

  const envanterSlotlari = useMemo(() => {
    const slots: EnvanterSlot[] = Array.from({ length: 12 }).map(() => ({ type: 'empty', data: null }))
    envanterEsyalari.forEach((item, index) => {
      if (index < 12) {
        slots[index] = { type: 'item', data: item }
      }
    })
    return slots
  }, [envanterEsyalari])

  const filtrelenmis = filtre ? kayitlar.filter(k => k.tip === filtre) : kayitlar
  const gruplar: Record<string, ArsivKaydi[]> = {}
  filtrelenmis.forEach(k => {
    const tarih = new Date(k.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!gruplar[tarih]) gruplar[tarih] = []
    gruplar[tarih].push(k)
  })

  return (
    <main className="h-screen w-full flex flex-col overflow-hidden relative p-4 md:p-8 justify-center">
      <div className="fixed inset-0 opacity-15" style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover' }} />
      <div className="fixed inset-0 bg-black/88" />
      <div className="fixed top-0 left-0 right-0 h-px z-30" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)' }} />

      {/* SAĞ ÜST KÖŞEDEKİ PORTAL LİNKİ */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20">
        <Link href="/portal" className="border border-white/10 text-white/30 hover:border-white/30 hover:text-white/60 px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs tracking-widest uppercase transition-all bg-black/40">
          ← Portal
        </Link>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto w-full h-full flex flex-col justify-start gap-3 md:gap-5 pt-10 md:pt-14 pb-4 min-h-0">

        {/* Başlık */}
        <div className="flex flex-col items-center gap-1 text-center shrink-0">
          <p className="text-fuchsia-400/40 text-[9px] md:text-xs tracking-[0.4em] uppercase">Kişisel Kayıtlar</p>
          <h1 className="text-white text-xl md:text-3xl tracking-widest uppercase font-thin">Varlık Hafızası</h1>
          <div className="w-16 h-px bg-white/20 mt-1" />
        </div>

        {/* YILDIZ TOZU GÖSTERGESİ */}
        <div className="flex items-center justify-center gap-2 text-center shrink-0">
          <span className="text-amber-400 text-base animate-pulse shadow-[0_0_10px_#f59e0b]">𐀏</span>
          <span className="text-white/40 text-[9px] uppercase tracking-widest">Yıldız Tozu Rezervi:</span>
          <span className="text-amber-400 text-sm font-mono font-bold tracking-wider" style={{ textShadow: '0 0 10px rgba(245,158,11,0.5)' }}>
            {profil?.yildiz_tozu ?? 0}
          </span>
        </div>

        {/* SEKMELER */}
        <div className="grid grid-cols-4 gap-1 w-full shrink-0 border-b border-white/5 pb-2">
          {([
            { key: 'sandik', label: 'Sandık', renk: 'text-fuchsia-400 border-fuchsia-500' },
            { key: 'gorevler', label: 'Görevler', renk: 'text-cyan-400 border-cyan-500' },
            { key: 'baglar', label: 'Baglar', renk: 'text-violet-400 border-violet-500' },
            { key: 'hafiza', label: 'Hafıza', renk: 'text-rose-400 border-rose-500' }
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setAktifTab(tab.key)}
              className={`py-2 text-[9px] md:text-xs tracking-widest uppercase transition-all border-b-2 text-center truncate ${
                aktifTab === tab.key ? `${tab.renk} font-bold` : 'text-white/20 border-transparent hover:text-white/45'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* İÇERİK ALANI */}
        <div className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar">
          {yukleniyor && <p className="text-white/20 text-center tracking-widest uppercase text-xs py-8">Veriler eşitleniyor...</p>}

          {!yukleniyor && (
            <>
              {/* 1. SEKME: MİSTİK SANDIK */}
              {aktifTab === 'sandik' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-8 animate-fade-in">
                  
                  {/* Ekipman Yuvaları */}
                  <div className="flex flex-col gap-3 border border-white/5 bg-black/40 p-4 rounded-md">
                    <span className="text-white/30 text-[9px] tracking-widest uppercase mb-1 block">Kuşanılan Teatral Dekorlar</span>
                    
                    <div onClick={() => takiliMaske && setSeciliEsya(takiliMaske)} className="border border-dashed border-fuchsia-500/20 bg-fuchsia-500/5 h-16 rounded flex items-center gap-3 px-3 cursor-pointer hover:border-fuchsia-500/50 transition-all">
                      <span className="text-lg">🎭</span>
                      <div className="flex flex-col">
                        <span className="text-white/40 text-[8px] uppercase tracking-widest">Aktif Maske</span>
                        <span className="text-white text-xs font-bold truncate max-w-[120px]">{takiliMaske?.isim ?? 'Boş'}</span>
                      </div>
                    </div>

                    <div onClick={() => takiliDekor && setSeciliEsya(takiliDekor)} className="border border-dashed border-cyan-500/20 bg-cyan-500/5 h-16 rounded flex items-center gap-3 px-3 cursor-pointer hover:border-cyan-500/50 transition-all">
                      <span className="text-lg">🖼</span>
                      <div className="flex flex-col">
                        <span className="text-white/40 text-[8px] uppercase tracking-widest">Sahne Dekoru</span>
                        <span className="text-white text-xs font-bold truncate max-w-[120px]">{takiliDekor?.isim ?? 'Boş'}</span>
                      </div>
                    </div>

                    <div onClick={() => takiliAksesuar && setSeciliEsya(takiliAksesuar)} className="border border-dashed border-amber-500/20 bg-amber-500/5 h-16 rounded flex items-center gap-3 px-3 cursor-pointer hover:border-amber-500/50 transition-all">
                      <span className="text-lg">🔮</span>
                      <div className="flex flex-col">
                        <span className="text-white/40 text-[8px] uppercase tracking-widest">Prop (Aksesuar)</span>
                        <span className="text-white text-xs font-bold truncate max-w-[120px]">{takiliAksesuar?.isim ?? 'Boş'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 12'li Envanter Grid'i */}
                  <div className="md:col-span-2 flex flex-col gap-3">
                    <span className="text-white/30 text-[9px] tracking-widest uppercase">Mistik Sandık</span>
                    <div className="grid grid-cols-4 gap-2.5">
                      {envanterSlotlari.map((slot, index) => (
                        <div 
                          key={index}
                          className="aspect-square border border-white/5 bg-black/60 rounded-md flex flex-col items-center justify-center relative hover:border-fuchsia-500/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all group cursor-pointer"
                        >
                          {slot.type === 'item' && slot.data && (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2" onClick={() => setSeciliEsya(slot.data as EnvanterItem)}>
                              <span className="text-xl">
                                {slot.data.tip === 'maske' ? '🎭' : slot.data.tip === 'dekor' ? '🖼' : '🔮'}
                              </span>
                              <span className="text-[8px] text-white/60 mt-1 truncate max-w-full text-center px-1">{slot.data.isim}</span>
                            </div>
                          )}
                          {slot.type === 'empty' && <span className="text-white/5 text-[10px]">🔒</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* 2. SEKME: GÖREV GÜNLÜĞÜ */}
              {aktifTab === 'gorevler' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8 animate-fade-in">
                  <div className="flex flex-col gap-2">
                    <span className="text-cyan-400/40 text-[10px] tracking-widest uppercase">Aktif Görevler</span>
                    {aktifGorevler.length > 0 ? (
                      aktifGorevler.map(g => {
                        const isOpen = acikGorevId === g.id
                        return (
                          <div key={g.id} className="border border-cyan-500/10 bg-cyan-500/5 rounded overflow-hidden">
                            <div 
                              onClick={() => setAcikGorevId(isOpen ? null : g.id)}
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-cyan-500/10 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl text-cyan-400">{g.simge}</span>
                                <span className="text-white text-xs md:text-sm font-medium">{g.isim}</span>
                              </div>
                              <span className="text-white/20 text-xs">{isOpen ? '▲' : '▼'}</span>
                            </div>
                            {isOpen && (
                              <div className="p-4 border-t border-white/5 bg-black/40 text-[11px] text-white/50 leading-relaxed max-h-40 overflow-y-auto no-scrollbar">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
                                  {g.mitolojik_gecmis || 'Bu göreve dair antik bir kalıntı kaydı bulunmuyor.'}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="border border-dashed border-white/5 p-4 rounded text-center text-white/20 text-xs">Aktif görevin yok.</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-emerald-400/40 text-[10px] tracking-widest uppercase">Tamamlanmış Görevler</span>
                    {tamamlananGorevler.length > 0 ? (
                      tamamlananGorevler.map(g => {
                        const isOpen = acikGorevId === g.id
                        return (
                          <div key={g.id} className="border border-emerald-500/10 bg-emerald-500/5 rounded overflow-hidden opacity-80">
                            <div 
                              onClick={() => setAcikGorevId(isOpen ? null : g.id)}
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-500/10 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl text-emerald-400">{g.simge}</span>
                                <span className="text-white text-xs md:text-sm font-medium">{g.isim}</span>
                              </div>
                              <span className="text-white/20 text-xs">{isOpen ? '▲' : '▼'}</span>
                            </div>
                            {isOpen && (
                              <div className="p-4 border-t border-white/5 bg-black/40 text-[11px] text-white/50 leading-relaxed max-h-40 overflow-y-auto no-scrollbar">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents as any}>
                                  {g.mitolojik_gecmis || 'Bu göreve dair antik bir kalıntı kaydı bulunmuyor.'}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="border border-dashed border-white/5 p-4 rounded text-center text-white/20 text-xs">Tamamlanmış görev yok.</p>
                    )}
                  </div>
                </div>
              )}

              {/* 3. SEKME: KOZMİK BAĞLAR */}
              {aktifTab === 'baglar' && (
                <div className="flex flex-col gap-5 pb-8 animate-fade-in">
                  <div className="border border-violet-500/15 bg-violet-500/5 p-4 rounded-md flex flex-col gap-3">
                    <span className="text-violet-400/50 text-[9px] tracking-widest uppercase">Mistik Bağ Ayini Başlat</span>
                    <div className="flex flex-col md:flex-row gap-2">
                      <select
                        value={hedefKarakterAdi}
                        onChange={e => setYeniKarakterAdi(e.target.value)}
                        className="flex-1 bg-black/50 border border-white/10 px-3 py-2 text-white/70 text-xs rounded focus:outline-none focus:border-violet-500/40"
                      >
                        <option value="">Bağ kurmak istediğin karakteri seç...</option>
                        {aktifKabileUyeleri.map(uye => (
                          <option key={uye.kullanici_id} value={uye.karakter_adi} className="bg-black text-white">
                            {uye.karakter_adi}
                          </option>
                        ))}
                      </select>

                      <select 
                        value={yeniBagTipi} 
                        onChange={e => setYeniBagTipi(e.target.value as any)}
                        className="bg-black/80 border border-white/10 px-3 py-2 text-white/70 text-xs rounded focus:outline-none focus:border-violet-500/40 shrink-0"
                      >
                        <option value="muttefik">Müttefik</option>
                        <option value="es">Eş</option>
                        <option value="ikiz_ruh">İkiz Ruh</option>
                        <option value="koruyucu">Koruyucu</option>
                        <option value="dusman">Düşman</option>
                      </select>

                      <button 
                        onClick={bagTalebiGonder}
                        disabled={bagGonderiliyor}
                        className="border border-violet-500/30 text-violet-300 px-5 py-2 text-xs uppercase hover:bg-violet-500/10 rounded transition-all shrink-0"
                      >
                        {bagGonderiliyor ? "..." : "Bağ Kur"}
                      </button>
                    </div>
                  </div>

                  <span className="text-violet-400/40 text-[9px] tracking-widest uppercase">Mühürlenmiş Bağların</span>
                  {baglar.length === 0 && <p className="border border-dashed border-white/5 p-8 rounded text-center text-white/20 text-xs">Henüz kurulmuş bir kozmik bağ yok.</p>}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {baglar.map(bag => {
                      const benimleMiKuruldu = bag.alici_id === profil?.id
                      const durum = bag.durum
                      const stil = bagStilleri[bag.bag_tipi]
                      const digerIsim = bag.diger_karakter_adi ?? "Kabile Dostu"
                      
                      const bagUnvanlari: Record<string, string> = {
                        muttefik: "✦ MÜTTEFİK BAĞI ✦",
                        es: "💍 KUTSAL EŞ BAĞI 💍",
                        ikiz_ruh: "🧬 İKİZ RUH BAĞI 🧬",
                        koruyucu: "🛡 KORUYUCU BAĞI 🛡",
                        dusman: "💀 EZELİ DÜŞMAN BAĞI 💀"
                      }

                      return (
                        <div 
                          key={bag.id} 
                          className={`border ${stil} bg-black/55 p-4 rounded-md flex items-center justify-between gap-4 transition-all hover:border-white/10`}
                          style={{ boxShadow: durum === 'onaylandi' ? `inset 0 0 15px rgba(255,255,255,0.02)` : 'none' }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-black/20 shrink-0">
                              {bag.diger_gorsel_url ? (
                                <img src={bag.diger_gorsel_url} alt={digerIsim} className="w-full h-full object-cover object-top" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/10 text-xs font-bold">
                                  {digerIsim[0].toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-white text-xs md:text-sm font-bold truncate">
                                {digerIsim}
                              </span>
                              <span className="text-[9px] font-bold tracking-[0.15em] uppercase" style={{ textShadow: '0 0 8px currentColor' }}>
                                {bagUnvanlari[bag.bag_tipi]}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {durum === 'beklemede' && benimleMiKuruldu ? (
                              <div className="flex gap-1.5">
                                <button onClick={() => bagDurumuGuncelle(bag.id, 'onaylandi')} className="border border-emerald-500/40 text-emerald-400 px-2.5 py-1 text-[9px] uppercase hover:bg-emerald-500/10 transition-colors">Onayla</button>
                                <button onClick={() => bagDurumuGuncelle(bag.id, 'reddedildi')} className="border border-rose-500/40 text-rose-400 px-2.5 py-1 text-[9px] uppercase hover:bg-rose-500/10 transition-colors">Reddet</button>
                              </div>
                            ) : (
                              <span className="text-white/20 text-[8px] tracking-widest uppercase border border-white/5 px-2 py-1 rounded bg-black/20">
                                {durum === 'onaylandi' ? 'MÜHÜRLENDİ ✓' : 'BEKLEYEN TALEP'}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 4. SEKME: HAFIZA AKIŞI */}
              {aktifTab === 'hafiza' && (
                <div className="flex flex-col gap-4 pb-8 animate-fade-in">
                  {Object.entries(gruplar).map(([tarih, liste]) => (
                    <div key={tarih} className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-5 h-px bg-white/10" />
                        <span className="text-white/20 text-[9px] tracking-widest uppercase">{tarih}</span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                      {liste.map(k => {
                        const stil = tipStil[k.tip] ?? tipStil.tablet
                        return (
                          <div key={k.id} className="flex gap-4 group">
                            <div className="flex flex-col items-center gap-0">
                              <div className="w-7 h-7 flex items-center justify-center border shrink-0" style={{ borderColor: stil.renk + '30', color: stil.renk + '80' }}>
                                <span className="text-[10px]">{stil.ikon}</span>
                              </div>
                              <div className="flex-1 w-px mt-1" style={{ background: stil.renk + '12' }} />
                            </div>
                            <div className="flex-1 pb-3">
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="text-[9px] tracking-widest uppercase" style={{ color: stil.renk + '60' }}>{stil.etiket}</span>
                                <span className="text-white/15 text-[9px]">{new Date(k.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-white/70 text-xs tracking-wide">{k.baslik}</p>
                              {k.aciklama && <p className="text-white/30 text-[10px] leading-relaxed mt-0.5">{k.aciklama}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 3D / 2D DETAY OKUMA VE KUŞANMA MODAL */}
        {seciliEsya && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSeciliEsya(null)}>
            <div className="relative z-10 w-full max-w-xl bg-black border border-fuchsia-500/20 p-6 flex flex-col gap-5 rounded shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-white tracking-widest uppercase text-sm">{seciliEsya.isim}</h3>
                <span onClick={() => setSeciliEsya(null)} className="text-white/40 hover:text-white text-2xl cursor-pointer">×</span>
              </div>

              {seciliEsya.is3D ? (
                <div className="w-full h-48 border border-white/5 rounded relative overflow-hidden bg-gradient-to-b from-black to-fuchsia-500/5">
                  <Canvas camera={{ position: [0, 0, 5] }}>
                    <ambientLight intensity={0.4} />
                    <pointLight position={[5, 5, 5]} intensity={1.5} color="#e879f9" />
                    <Suspense fallback={null}>
                      <Stage environment="city" intensity={0.5}>
                        {/* Eğer veritabanından gelen model_url varsa, gerçek .glb dosyasını yükler. 
                            Eğer yoksa, hata vermemesi için basit bir küre çizer. */}
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
              ) : (
                seciliEsya.gorsel_url && (
                  <img src={seciliEsya.gorsel_url} alt={seciliEsya.isim} className="w-full max-h-48 object-cover rounded border border-white/5" />
                )
              )}

              <p className="text-white/60 text-xs md:text-sm leading-relaxed">{seciliEsya.aciklama}</p>

              <div className="flex gap-2 justify-end border-t border-white/10 pt-4">
                <button 
                  onClick={async () => {
                    const supabase = createClient()
                    
                    const { error } = await supabase
                      .from('karakter_envanteri')
                      .update({ takili_mi: true })
                      .eq('id', seciliEsya.id)

                    if (error) {
                      alert("Eşya kuşanılırken kozmik bir hata oluştu: " + error.message)
                    } else {
                      if (seciliEsya.tip === 'maske') setTakiliMaske(seciliEsya)
                      if (seciliEsya.tip === 'dekor') setTakiliDekor(seciliEsya)
                      if (seciliEsya.tip === 'aksesuar') setTakiliAksesuar(seciliEsya)
                      alert(`✦ ${seciliEsya.isim} başarıyla kuşanıldı ve sahneye işlendi!`)
                    }
                    setSeciliEsya(null)
                  }}
                  className="border border-fuchsia-500/50 text-fuchsia-300 px-6 py-2 text-xs tracking-widest uppercase hover:bg-fuchsia-500/10"
                >
                  🎭 Sahneye Kuşan
                </button>
              </div>
            </div>
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
