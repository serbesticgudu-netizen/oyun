'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Duyuru = {
  id: string
  baslik: string
  icerik: string
  tur: string
  yayin_tarihi: string
  gorsel_url: string | null
}

const turStilleri: Record<string, { renk: string; etiket: string; ikon: string }> = {
  duyuru: { renk: 'border-cyan-400/30 text-cyan-400', etiket: 'Duyuru', ikon: '◈' },
  etkinlik: { renk: 'border-amber-400/30 text-amber-400', etiket: 'Etkinlik', ikon: '◉' },
  hikaye: { renk: 'border-violet-400/30 text-violet-400', etiket: 'Hikaye', ikon: '✦' },
  gorsel: { renk: 'border-rose-400/30 text-rose-400', etiket: 'Görsel', ikon: '▣' },
}

export default function Duyurular() {
  const [duyurular, setDuyurular] = useState<Duyuru[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [filtre, setFiltre] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('duyurular')
      .select('*')
      .order('yayin_tarihi', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(JSON.stringify(error))
        else setDuyurular(data ?? [])
        setYukleniyor(false)
      })
  }, [])

  const filtrelenmis = filtre ? duyurular.filter(d => d.tur === filtre) : duyurular

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
      <div className="fixed inset-0 bg-black/85" />
      <div className="relative z-10 max-w-3xl mx-auto px-8 py-16 flex flex-col gap-12">

        {/* Başlık */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-fuchsia-400/40 text-xs tracking-[0.4em] uppercase">Tiyatro Theia</p>
          <h1 className="text-white text-4xl tracking-widest uppercase">Kabilenin Sesi</h1>
          <p className="text-white/30 text-sm tracking-wider max-w-lg">
            Duyurular. Etkinlikler. Hikayeler.
          </p>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent mt-2" />
        </div>

        {/* Tür filtreleri */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => setFiltre(null)}
            className={`text-xs tracking-widest uppercase px-4 py-2 border transition-all ${!filtre ? 'border-white/50 text-white bg-white/10' : 'border-white/20 text-white/40 hover:border-white/40'}`}
          >
            Tümü
          </button>
          {Object.entries(turStilleri).map(([tur, stil]) => (
            <button
              key={tur}
              onClick={() => setFiltre(tur)}
              className={`text-xs tracking-widest uppercase px-4 py-2 border transition-all ${filtre === tur ? `${stil.renk} bg-white/5` : 'border-white/20 text-white/40 hover:border-white/40'}`}
            >
              {stil.ikon} {stil.etiket}
            </button>
          ))}
        </div>

        {/* Liste */}
        {yukleniyor && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">
            Kayıtlar okunuyor...
          </p>
        )}

        {!yukleniyor && filtrelenmis.length === 0 && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">
            Henüz duyuru yapılmamış.
          </p>
        )}

        <div className="flex flex-col gap-6">
          {filtrelenmis.map(duyuru => {
            const stil = turStilleri[duyuru.tur] ?? turStilleri.duyuru
            return (
              <div
                key={duyuru.id}
                className="relative border border-white/10 bg-black/50 p-7 flex flex-col gap-4 overflow-hidden hover:border-white/20 transition-all"
              >
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stil.renk.split(' ')[1]} via-transparent to-transparent opacity-60`} />
                
                <div className="flex items-center justify-between gap-4">
                  <span className={`text-xs tracking-widest uppercase px-2 py-1 border flex items-center gap-2 ${stil.renk}`}>
                    {stil.ikon} {stil.etiket}
                  </span>
                  <span className="text-white/20 text-xs tracking-wider">
                    {new Date(duyuru.yayin_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

<h2 className="text-white text-lg tracking-wider">{duyuru.baslik}</h2>

{duyuru.gorsel_url && (
  <img
    src={duyuru.gorsel_url}
    alt={duyuru.baslik}
    className="w-full max-h-96 object-cover border border-white/10"
  />
)}

<div className="w-full h-px bg-white/10" />
<p className="text-white/60 text-sm leading-relaxed tracking-wide whitespace-pre-line">
  {duyuru.icerik}
</p>
              </div>
            )
          })}
        </div>

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