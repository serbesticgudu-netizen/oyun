'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Profil = {
  id: string
  email: string
  rol: string
  is_admin: boolean
}

type Karakter = {
  id: string
  kullanici_id: string
  karakter_adi: string
  tur: string
  koken: string
  koken_hikayesi: string
  gucler: string
  zayifliklar: string
  motivasyon: string
  olusturma_yontemi: string
  test_cevaplari: Record<number, string>
  durum: string
  iletisim_tercihi: string
  telefon: string
  created_at: string
  gorsel_url: string | null
}

const durumStilleri: Record<string, { renk: string; etiket: string; bg: string }> = {
  beklemede: { renk: 'text-amber-400/70', etiket: 'Beklemede', bg: 'bg-amber-400' },
  hazirlaniyor: { renk: 'text-cyan-400/70', etiket: 'Hazırlanıyor', bg: 'bg-cyan-400' },
  tamamlandi: { renk: 'text-emerald-400/70', etiket: 'Hazır', bg: 'bg-emerald-400' },
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

export default function OyunArkadaslari() {
  const [karakterler, setKarakterler] = useState<Karakter[]>([])
  const [profiller, setProfiller] = useState<Profil[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [seciliKarakter, setSeciliKarakter] = useState<Karakter | null>(null)
  const [aramaMetni, setAramaMetni] = useState('')
  const [filtreliKoken, setFiltreliKoken] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/giris')
        return
      }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || (p.rol !== 'kabileli' && !p.is_admin)) {
        router.push('/portal')
        return
      }

      const { data: tumKarakterler } = await supabase.from('karakterler').select('*').order('karakter_adi')
      const { data: tumProfiller } = await supabase.from('profiles').select('*')

      setKarakterler(tumKarakterler ?? [])
      setProfiller(tumProfiller ?? [])
      setYukleniyor(false)
    }
    yukle()
  }, [router])

  if (yukleniyor) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/20 text-xs tracking-widest uppercase">Oyun arkadaşları aranıyor...</p>
      </main>
    )
  }

  const getSahip = (kullanici_id: string) => profiller.find(p => p.id === kullanici_id)

  const tumKokenler = [...new Set(karakterler.map(k => k.koken).filter(Boolean))]

  const filtrelenmisKarakterler = karakterler.filter(k => {
    const aramaEslesmesi = aramaMetni.trim() === '' || k.karakter_adi.toLowerCase().includes(aramaMetni.toLowerCase())
    const kokenEslesmesi = !filtreliKoken || k.koken === filtreliKoken

    return aramaEslesmesi && kokenEslesmesi
  })

  return (
    <main className="min-h-screen bg-black relative">
      <div className="fixed inset-0 opacity-15" style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="fixed inset-0 bg-black/88" />
      <div className="fixed top-0 left-0 right-0 h-px z-30" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-14 flex flex-col gap-10">
        {/* Başlık */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-fuchsia-400/30 text-xs tracking-[0.5em] uppercase">Theia Kabilesi</p>
            <h1 className="text-white text-4xl font-thin tracking-[0.3em] uppercase" style={{ textShadow: '0 0 30px rgba(168,85,247,0.3)' }}>
              Oyun Arkadaşları
            </h1>
            <p className="text-white/20 text-xs tracking-wider">{filtrelenmisKarakterler.length} varlık bulundu.</p>
          </div>
          <Link href="/portal" className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all">← Portal</Link>
        </div>

        {/* Arama ve Filtreleme */}
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Karakter adı ara..."
            value={aramaMetni}
            onChange={e => setAramaMetni(e.target.value)}
            className="flex-1 bg-black/30 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-fuchsia-500/50"
          />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFiltreliKoken(null)} className={`px-3 py-1.5 text-xs tracking-widest uppercase border transition-all ${!filtreliKoken ? 'border-white/40 text-white bg-white/10' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
              Tümü
            </button>
            {tumKokenler.map(koken => (
              <button key={koken} onClick={() => setFiltreliKoken(filtreliKoken === koken ? null : koken)}
                className={`px-3 py-1.5 text-xs tracking-widest uppercase border transition-all ${filtreliKoken === koken ? 'border-cyan-400/60 text-cyan-300 bg-cyan-500/10' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
                {koken}
              </button>
            ))}
          </div>
        </div>

        {/* Karakter Grid */}
        {filtrelenmisKarakterler.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filtrelenmisKarakterler.map(karakter => (
              <button key={karakter.id} onClick={() => setSeciliKarakter(karakter)} className="group flex flex-col gap-3 text-left">
                <div className="relative aspect-square w-full bg-black/20 border border-white/10 rounded-md overflow-hidden group-hover:border-fuchsia-400/50 transition-all">
                  {karakter.gorsel_url ? (
                    <img src={karakter.gorsel_url} alt={karakter.karakter_adi} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-fuchsia-400/20 text-4xl">✦</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-white/80 tracking-wider group-hover:text-white transition-colors">{karakter.karakter_adi}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-cyan-400/40 text-xs tracking-widest">{karakter.koken}</span>
                    {durumStilleri[karakter.durum] && (
                      <div className={`flex items-center gap-1.5 ${durumStilleri[karakter.durum].renk}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${durumStilleri[karakter.durum].bg}`} />
                        <span className="text-xs tracking-widest uppercase">{durumStilleri[karakter.durum].etiket}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-white/40">Aramanızla eşleşen bir karakter bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {seciliKarakter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSeciliKarakter(null)}>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-black border border-fuchsia-500/30 rounded-lg shadow-2xl shadow-fuchsia-500/10 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-white text-xl tracking-widest uppercase">{seciliKarakter.karakter_adi}</h2>
              <button onClick={() => setSeciliKarakter(null)} className="text-white/40 hover:text-white transition-colors text-2xl">×</button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  {seciliKarakter.gorsel_url && (
                    <div className="relative w-full aspect-[4/5] bg-black/20 border border-white/10 rounded-md overflow-hidden">
                      <img src={seciliKarakter.gorsel_url} alt={seciliKarakter.karakter_adi} className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 flex flex-col gap-4">
                  <div><p className="text-white/30 text-xs tracking-widest uppercase">Sahibi</p><p className="text-white/70">{getSahip(seciliKarakter.kullanici_id)?.email || 'Bilinmiyor'}</p></div>
                  <div><p className="text-white/30 text-xs tracking-widest uppercase">Tür / Köken</p><p className="text-white/70">{seciliKarakter.tur} / {seciliKarakter.koken}</p></div>
                  <div><p className="text-white/30 text-xs tracking-widest uppercase">Durum</p><p className="text-white/70 capitalize">{seciliKarakter.durum}</p></div>
                </div>
              </div>
              <div className="w-full h-px bg-white/10" />
              {([['Köken Hikayesi', seciliKarakter.koken_hikayesi], ['Güçler', seciliKarakter.gucler], ['Zayıflıklar', seciliKarakter.zayifliklar], ['Motivasyon', seciliKarakter.motivasyon],
              ] as const).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-fuchsia-400/50 text-sm tracking-widest uppercase">{label}</span>
                  <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}