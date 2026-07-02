'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Gorev = {
  id: string
  isim: string
  mitolojik_gecmis: string
  fiziksel_gecmis: string
  durum: 'uyku' | 'aktif' | 'kapali'
  simge: string
}

type Kabul = {
  gorev_id: string
  durum: string
}

export default function Gorevler() {
  const [gorevler, setGorevler] = useState<Gorev[]>([])
  const [kabuller, setKabuller] = useState<Kabul[]>([])
  const [acik, setAcik] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islem, setIslem] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/giris'; return }

      const { data: g } = await supabase
        .from('gecit_noktalari')
        .select('*')
        .eq('tip', 'gorev')
        .order('isim')

      const { data: k } = await supabase
        .from('gorev_kabulleri')
        .select('gorev_id, durum')
        .eq('kullanici_id', user.id)

      setGorevler(g ?? [])
      setKabuller(k ?? [])
      setYukleniyor(false)
    }
    yukle()
  }, [])

  async function gorevKabul(gorevId: string) {
    setIslem(gorevId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('gorev_kabulleri').upsert({
      kullanici_id: user.id,
      gorev_id: gorevId,
      durum: 'aktif'
    })
    await supabase.from('kisisel_arsiv').insert({
  kullanici_id: user.id,
  tip: 'gorev',
  baslik: `Görev kabul edildi`,
  aciklama: gorevler.find(g => g.id === gorevId)?.isim ?? '',
  referans_id: gorevId,
})

    setKabuller(prev => {
      const var_ = prev.find(k => k.gorev_id === gorevId)
      if (var_) return prev
      return [...prev, { gorev_id: gorevId, durum: 'aktif' }]
    })
    setIslem(null)
  }

  const kabulEdildi = (id: string) => kabuller.some(k => k.gorev_id === id)

  if (yukleniyor) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/20 text-xs tracking-widest uppercase">Görevler yükleniyor...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black relative overflow-x-hidden">
      <div className="fixed inset-0 opacity-20"
        style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="fixed inset-0 bg-black/80" />
      <div className="fixed top-0 left-0 right-0 h-px z-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-16 flex flex-col gap-12">

        {/* Başlık */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-cyan-400/30 text-xs tracking-[0.5em] uppercase">Theia Kabilesi</p>
            <h1 className="text-white text-4xl font-thin tracking-[0.3em] uppercase"
              style={{ textShadow: '0 0 30px rgba(34,211,238,0.3)' }}>
              Görevler
            </h1>
            <p className="text-white/20 text-sm tracking-wider">
              {kabuller.length > 0 ? `${kabuller.length} görev kabul edildi` : 'Bir görevi kabul etmek için tıkla'}
            </p>
          </div>
          <Link href="/portal" className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all">
            ← Portal
          </Link>
        </div>

        {/* Görev kartları */}
        {gorevler.length === 0 ? (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm py-20">
            Henüz görev eklenmemiş.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gorevler.map(gorev => {
              const kabul = kabulEdildi(gorev.id)
              const acikMi = acik === gorev.id

              return (
                <div key={gorev.id}
                  onClick={() => {
                    setAcik(acikMi ? null : gorev.id)
                    if (!kabul) gorevKabul(gorev.id)
                  }}
                  className="relative cursor-pointer transition-all duration-500 group"
                  style={{ perspective: '1000px' }}>

                  <div className="relative transition-all duration-500"
                    style={{
                      transform: acikMi ? 'rotateY(0deg) scale(1.02)' : 'rotateY(0deg)',
                      transformStyle: 'preserve-3d',
                    }}>

                    {/* Kart */}
                    <div className="relative overflow-hidden"
                      style={{
                        background: acikMi
                          ? 'linear-gradient(135deg, rgba(34,211,238,0.08) 0%, rgba(0,0,0,0.9) 100%)'
                          : 'rgba(0,0,0,0.6)',
                        border: `1px solid ${acikMi ? 'rgba(34,211,238,0.4)' : kabul ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        boxShadow: acikMi
                          ? '0 0 40px rgba(34,211,238,0.2), 0 0 80px rgba(34,211,238,0.08), inset 0 0 30px rgba(34,211,238,0.05)'
                          : 'none',
                        transition: 'all 0.4s ease',
                        minHeight: acikMi ? '280px' : '180px',
                      }}>

                      {/* Hover glow efekti */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{ boxShadow: 'inset 0 0 40px rgba(34,211,238,0.08)' }} />

                      {/* Üst kenar ışığı */}
                      <div className="absolute top-0 left-0 right-0 h-px transition-all duration-300"
                        style={{
                          background: acikMi
                            ? 'linear-gradient(90deg, transparent, rgba(34,211,238,0.8), transparent)'
                            : kabul
                            ? 'linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)'
                            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                        }} />

                      <div className="p-6 flex flex-col gap-4">

                        {/* Kapalı görünüm — ters yüz efekti */}
                        {!acikMi && (
                          <div className="flex flex-col items-center justify-center py-6 gap-4">
                            <span className="text-4xl opacity-30 group-hover:opacity-60 transition-all duration-300"
                              style={{ filter: 'blur(0px)', transform: 'scaleX(-1)' }}>
                              {gorev.simge}
                            </span>
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-white/20 text-xs tracking-[0.4em] uppercase group-hover:text-white/40 transition-all">
                                {kabul ? '⬡ Kabul Edildi' : '⬡ Görev'}
                              </p>
                              <p className="text-white/10 text-xs tracking-widest text-center group-hover:text-white/20 transition-all">
                                Açmak için tıkla
                              </p>
                            </div>

                            {/* Kabul rozeti */}
                            {kabul && (
                              <div className="absolute top-3 right-3">
                                <span className="text-cyan-400/60 text-xs tracking-widest px-2 py-0.5 border border-cyan-400/20">
                                  AKTİF
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Açık görünüm */}
                        {acikMi && (
                          <div className="flex flex-col gap-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-cyan-400/50 text-xs tracking-[0.4em] uppercase">⬡ Görev</span>
                                <h3 className="text-white text-lg tracking-wider">{gorev.isim}</h3>
                              </div>
                              <span className="text-3xl opacity-40 shrink-0">{gorev.simge}</span>
                            </div>

                            <div className="h-px"
                              style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.3), transparent)' }} />

                            <div className="flex flex-col gap-3">
                              <p className="text-cyan-400/30 text-xs tracking-[0.3em] uppercase">Görev Tanımı</p>
                              <p className="text-white/60 text-sm leading-relaxed">{gorev.mitolojik_gecmis}</p>
                            </div>

                            {gorev.fiziksel_gecmis && (
                              <div className="flex flex-col gap-2">
                                <p className="text-white/20 text-xs tracking-[0.3em] uppercase">Fiziksel Konum</p>
                                <p className="text-white/40 text-xs leading-relaxed">{gorev.fiziksel_gecmis}</p>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                                style={{ boxShadow: '0 0 6px rgba(34,211,238,0.8)' }} />
                              <span className="text-cyan-400/60 text-xs tracking-widest uppercase">
                                {islem === gorev.id ? 'Kaydediliyor...' : 'Görev Kabul Edildi'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        .group:hover > div > div {
          transform: translateY(-4px) scale(1.02);
        }
      `}</style>
    </main>
  )
}