'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type ArsivKaydi = {
  id: string
  tip: string
  baslik: string
  aciklama: string
  created_at: string
}

const tipStil: Record<string, { renk: string; ikon: string; etiket: string }> = {
  tablet:  { renk: '#a855f7', ikon: '𐀏', etiket: 'Tablet' },
  gorev:   { renk: '#22d3ee', ikon: '⬡', etiket: 'Görev' },
  gecit:   { renk: '#f0c040', ikon: '◉', etiket: 'Geçit' },
  siparis: { renk: '#34d399', ikon: '◈', etiket: 'Sipariş' },
  kayit:   { renk: '#f472b6', ikon: '✦', etiket: 'Kayıt' },
}

export default function KisiselArsiv() {
  const [kayitlar, setKayitlar] = useState<ArsivKaydi[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [filtre, setFiltre] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/giris'; return }
      const { data } = await supabase
        .from('kisisel_arsiv')
        .select('*')
        .eq('kullanici_id', user.id)
        .order('created_at', { ascending: false })
      setKayitlar(data ?? [])
      setYukleniyor(false)
    }
    yukle()
  }, [])

  const filtrelenmis = filtre ? kayitlar.filter(k => k.tip === filtre) : kayitlar

  // Tarihe göre grupla
  const gruplar: Record<string, ArsivKaydi[]> = {}
  filtrelenmis.forEach(k => {
    const tarih = new Date(k.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!gruplar[tarih]) gruplar[tarih] = []
    gruplar[tarih].push(k)
  })

  return (
    <main className="min-h-screen bg-black relative">
      <div className="fixed inset-0 opacity-15"
        style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover' }} />
      <div className="fixed inset-0 bg-black/88" />
      <div className="fixed top-0 left-0 right-0 h-px z-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-8 py-14 flex flex-col gap-10">

        {/* Başlık */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-fuchsia-400/30 text-xs tracking-[0.5em] uppercase">Kişisel Kayıtlar</p>
            <h1 className="text-white text-4xl font-thin tracking-[0.3em] uppercase"
              style={{ textShadow: '0 0 30px rgba(168,85,247,0.3)' }}>
              Varlık Hafızası
            </h1>
            <p className="text-white/20 text-xs tracking-wider">{kayitlar.length} kayıt</p>
          </div>
          <Link href="/portal" className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all">← Portal</Link>
        </div>

        {/* Filtreler */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFiltre(null)}
            className={`px-4 py-1.5 text-xs tracking-widest uppercase border transition-all ${!filtre ? 'border-white/30 text-white' : 'border-white/10 text-white/25 hover:border-white/20'}`}>
            Tümü ({kayitlar.length})
          </button>
          {Object.entries(tipStil).map(([tip, stil]) => {
            const sayi = kayitlar.filter(k => k.tip === tip).length
            if (sayi === 0) return null
            return (
              <button key={tip} onClick={() => setFiltre(filtre === tip ? null : tip)}
                className="px-4 py-1.5 text-xs tracking-widest uppercase border transition-all"
                style={{
                  borderColor: filtre === tip ? stil.renk + '60' : 'rgba(255,255,255,0.08)',
                  color: filtre === tip ? stil.renk : 'rgba(255,255,255,0.25)',
                  background: filtre === tip ? stil.renk + '10' : 'transparent',
                }}>
                {stil.ikon} {stil.etiket} ({sayi})
              </button>
            )
          })}
        </div>

        {/* Zaman çizelgesi */}
        {yukleniyor && <p className="text-white/20 text-xs tracking-widest uppercase text-center py-10">Yükleniyor...</p>}

        {!yukleniyor && filtrelenmis.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20">
            <span className="text-white/10 text-5xl">◈</span>
            <p className="text-white/20 text-xs tracking-widest uppercase">Henüz kayıt yok.</p>
            <p className="text-white/10 text-xs tracking-wider">Tabletleri oku, görevleri kabul et — hafızan burada biriksin.</p>
          </div>
        )}

        {Object.entries(gruplar).map(([tarih, liste]) => (
          <div key={tarih} className="flex flex-col gap-4">

            {/* Tarih başlığı */}
            <div className="flex items-center gap-4">
              <div className="w-6 h-px bg-white/10" />
              <span className="text-white/20 text-xs tracking-[0.3em] uppercase">{tarih}</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Kayıtlar */}
            {liste.map(k => {
              const stil = tipStil[k.tip] ?? tipStil.tablet
              return (
                <div key={k.id} className="flex gap-5 group">

                  {/* Sol — ikon + çizgi */}
                  <div className="flex flex-col items-center gap-0">
                    <div className="w-8 h-8 flex items-center justify-center border shrink-0"
                      style={{ borderColor: stil.renk + '30', color: stil.renk + '80' }}>
                      <span className="text-xs">{stil.ikon}</span>
                    </div>
                    <div className="flex-1 w-px mt-1" style={{ background: stil.renk + '15' }} />
                  </div>

                  {/* Sağ — içerik */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-xs tracking-widest uppercase" style={{ color: stil.renk + '60' }}>
                        {stil.etiket}
                      </span>
                      <span className="text-white/15 text-xs">
                        {new Date(k.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm tracking-wider mb-1">{k.baslik}</p>
                    {k.aciklama && (
                      <p className="text-white/25 text-xs leading-relaxed">{k.aciklama}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

      </div>
    </main>
  )
}