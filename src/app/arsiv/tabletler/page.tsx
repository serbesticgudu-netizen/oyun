'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const konuRenkleri: Record<string, string> = {
  'Kozmoloji': 'text-violet-400 border-violet-400/30 hover:border-violet-400 hover:bg-violet-400/10',
  'Geçitler': 'text-cyan-400 border-cyan-400/30 hover:border-cyan-400 hover:bg-cyan-400/10',
  'Kabileler': 'text-amber-400 border-amber-400/30 hover:border-amber-400 hover:bg-amber-400/10',
  'Oyun Yasaları': 'text-rose-400 border-rose-400/30 hover:border-rose-400 hover:bg-rose-400/10',
  'Theia Tarihi': 'text-indigo-400 border-indigo-400/30 hover:border-indigo-400 hover:bg-indigo-400/10',
  'Gaia Tarihi': 'text-emerald-400 border-emerald-400/30 hover:border-emerald-400 hover:bg-emerald-400/10',
}

const konuGlow: Record<string, string> = {
  'Kozmoloji': 'shadow-violet-500/50',
  'Geçitler': 'shadow-cyan-500/50',
  'Kabileler': 'shadow-amber-500/50',
  'Oyun Yasaları': 'shadow-rose-500/50',
  'Theia Tarihi': 'shadow-indigo-500/50',
  'Gaia Tarihi': 'shadow-emerald-500/50',
}

type Tablet = {
  id: string
  baslik: string
  icerik: string
  konu: string
  donem: string
  sira: number
}

export default function Tabletler() {
  const [tabletler, setTabletler] = useState<Tablet[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktifKonu, setAktifKonu] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })

    supabase
      .from('kadim_tabletler')
      .select('*')
      .eq('gizlilik_seviyesi', 'herkese_acik')
      .order('sira')
      .then(({ data, error }) => {
        if (error) console.error('Supabase hatası:', JSON.stringify(error))
        else setTabletler(data ?? [])
        setYukleniyor(false)
      })
  }, [])

  async function konuSec(konu: string) {
    const yeniKonu = aktifKonu === konu ? null : konu
    setAktifKonu(yeniKonu)

    if (yeniKonu && userId) {
      const supabase = createClient()
      await supabase.from('kisisel_arsiv').insert({
        kullanici_id: userId,
        tip: 'tablet',
        baslik: `${yeniKonu} tabletleri incelendi`,
        aciklama: `Kadim Tabletler arşivinde ${yeniKonu} kategorisi açıldı.`,
      })
    }
  }

  const filtrelenmis = aktifKonu
    ? tabletler.filter(t => t.konu === aktifKonu)
    : []

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="fixed inset-0 bg-black/80" />
      <div className="relative z-10 max-w-4xl mx-auto px-8 py-16 flex flex-col gap-16">

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-white/30 text-xs tracking-[0.4em] uppercase">Theia Kabilesi</p>
          <h1 className="text-white text-4xl tracking-widest uppercase">Kadim Tabletler</h1>
          <p className="text-white/30 text-sm tracking-wider max-w-lg">
            Bir konu seç. Yasalar açılsın.
          </p>
          <div className="w-24 h-px bg-white/20 mt-2" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.keys(konuRenkleri).map(konu => (
            <button
              key={konu}
              onClick={() => konuSec(konu)}
              className={`
                border px-4 py-5 text-sm tracking-widest uppercase transition-all duration-300 cursor-pointer
                ${konuRenkleri[konu]}
                ${aktifKonu === konu ? `shadow-lg ${konuGlow[konu]} border-opacity-100 bg-opacity-20 scale-105` : 'opacity-60 hover:opacity-100 hover:scale-105'}
              `}
            >
              {konu}
            </button>
          ))}
        </div>

        {yukleniyor && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">
            Tabletler okunuyor...
          </p>
        )}

        {!yukleniyor && !aktifKonu && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">
            Hangi yasayı okumak istiyorsun?
          </p>
        )}

        {!yukleniyor && aktifKonu && filtrelenmis.length === 0 && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">
            Bu konuda henüz tablet yazılmamış.
          </p>
        )}

        {aktifKonu && filtrelenmis.length > 0 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-px bg-white/20" />
              <h2 className={`text-xs tracking-[0.4em] uppercase ${konuRenkleri[aktifKonu].split(' ')[0]}`}>
                {aktifKonu}
              </h2>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {filtrelenmis.map(tablet => (
              <div
                key={tablet.id}
                className="border border-white/10 bg-black/40 p-8 flex flex-col gap-4 transition-all duration-300 hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-white text-lg tracking-wider">{tablet.baslik}</h3>
                  <span className="text-white/30 text-xs tracking-widest uppercase shrink-0">
                    {tablet.donem}
                  </span>
                </div>
                <div className="w-full h-px bg-white/10" />
                <p className="text-white/60 text-sm leading-relaxed tracking-wide">
                  {tablet.icerik}
                </p>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/arsiv"
          className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all text-center"
        >
          ← Arşive Dön
        </Link>
      </div>
    </main>
  )
}