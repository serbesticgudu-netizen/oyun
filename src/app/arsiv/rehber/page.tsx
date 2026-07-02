'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type RehberBolumu = {
  id: string
  baslik: string
  icerik: string
  sira: number
}

export default function Rehber() {
  const [bolumler, setBolumler] = useState<RehberBolumu[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktif, setAktif] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('rehber')
      .select('*')
      .eq('gizlilik_seviyesi', 'herkese_acik')
      .order('sira')
      .then(({ data, error }) => {
        if (error) console.error(JSON.stringify(error))
        else setBolumler(data ?? [])
        setYukleniyor(false)
      })
  }, [])

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

        {/* Başlık */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-white/30 text-xs tracking-[0.4em] uppercase">Tiyatro Theia</p>
          <h1 className="text-white text-4xl tracking-widest uppercase">Theia'nın Oyunu</h1>
          <p className="text-white/30 text-sm tracking-wider max-w-lg">
            Oyunun kuralları. Ritüeller. Gaia Halkı'na kılavuz.
          </p>
          <div className="w-24 h-px bg-white/20 mt-2" />
        </div>

        {/* Bölümler */}
        {yukleniyor && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">
            Rehber okunuyor...
          </p>
        )}

        {!yukleniyor && bolumler.length === 0 && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">
            Rehber henüz yazılmamış.
          </p>
        )}

        {bolumler.map((bolum, index) => (
          <div key={bolum.id} className="flex flex-col gap-4">
            <button
              onClick={() => setAktif(aktif === bolum.id ? null : bolum.id)}
              className="flex items-center gap-6 text-left group w-full"
            >
              <span className="text-white/20 text-xs tracking-widest shrink-0">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 flex items-center gap-4">
                <h2 className="text-white tracking-widest uppercase text-lg group-hover:text-white/80 transition-all">
                  {bolum.baslik}
                </h2>
                <div className="flex-1 h-px bg-white/10 group-hover:bg-white/20 transition-all" />
              </div>
              <span className="text-white/30 group-hover:text-white/60 transition-all text-lg">
                {aktif === bolum.id ? '−' : '+'}
              </span>
            </button>

            {aktif === bolum.id && (
              <div className="ml-10 border-l border-white/10 pl-8 py-4">
                <p className="text-white/60 text-sm leading-relaxed tracking-wide whitespace-pre-line">
                  {bolum.icerik}
                </p>
              </div>
            )}

            <div className="w-full h-px bg-white/5" />
          </div>
        ))}

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