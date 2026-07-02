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

type Profil = {
  is_admin: boolean
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
  const [profil, setProfil] = useState<Profil | null>(null)
  const [editingDuyuru, setEditingDuyuru] = useState<Partial<Duyuru> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        setProfil(p)
      }

      const { data, error } = await supabase.from('duyurular').select('*').order('yayin_tarihi', { ascending: false })
      if (error) console.error(JSON.stringify(error))
      else setDuyurular(data ?? [])
      setYukleniyor(false)
    }
    yukle()
  }, [])

  function handleEdit(duyuru: Duyuru) {
    setEditingDuyuru({ ...duyuru })
  }

  async function handleSave() {
    if (!editingDuyuru) return
    setIsSaving(true)
    const supabase = createClient()

    const duyuruData = {
      baslik: editingDuyuru.baslik,
      icerik: editingDuyuru.icerik,
      tur: editingDuyuru.tur,
      yayin_tarihi: editingDuyuru.yayin_tarihi ? new Date(editingDuyuru.yayin_tarihi).toISOString() : new Date().toISOString(),
      gorsel_url: editingDuyuru.gorsel_url,
    }

    const { data, error } = editingDuyuru.id
      ? await supabase.from('duyurular').update(duyuruData).eq('id', editingDuyuru.id).select().single()
      : await supabase.from('duyurular').insert(duyuruData).select().single()

    if (error) {
      alert('Hata: ' + error.message)
    } else if (data) {
      const newDuyuru = data as Duyuru
      if (editingDuyuru.id) {
        setDuyurular(prev => prev.map(d => d.id === newDuyuru.id ? newDuyuru : d))
      } else {
        setDuyurular(prev => [newDuyuru, ...prev]) // Yeni duyuruyu başa ekle
      }
      setEditingDuyuru(null)
    }
    setIsSaving(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) return
    const supabase = createClient()
    const { error } = await supabase.from('duyurular').delete().eq('id', id)

    if (error) {
      alert('Hata: ' + error.message)
    } else {
      setDuyurular(prev => prev.filter(d => d.id !== id))
      if (editingDuyuru?.id === id) {
        setEditingDuyuru(null)
      }
    }
  }

  const formatTarihForInput = (tarih: string | undefined) => {
    if (!tarih) return ''
    const d = new Date(tarih)
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  }

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
          {profil?.is_admin && !editingDuyuru && (
            <button
              onClick={() => setEditingDuyuru({ baslik: '', icerik: '', tur: 'duyuru', yayin_tarihi: new Date().toISOString() })}
              className="mt-4 border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 transition-all"
            >
              + Yeni Duyuru Ekle
            </button>
          )}
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

        {/* DÜZENLEME FORMU */}
        {editingDuyuru && (
          <div className="flex flex-col gap-4 border border-fuchsia-500/30 p-6 bg-black/40">
            <h2 className="text-white tracking-widest uppercase">{editingDuyuru.id ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Ekle'}</h2>
            <input value={editingDuyuru.baslik || ''} onChange={e => setEditingDuyuru({ ...editingDuyuru, baslik: e.target.value })} placeholder="Başlık" className="bg-black/30 border border-white/20 p-2 text-white" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={editingDuyuru.tur || 'duyuru'} onChange={e => setEditingDuyuru({ ...editingDuyuru, tur: e.target.value })} className="bg-black/30 border border-white/20 p-2 text-white">
                {Object.keys(turStilleri).map(tur => <option key={tur} value={tur}>{turStilleri[tur].etiket}</option>)}
              </select>
              <input type="datetime-local" value={formatTarihForInput(editingDuyuru.yayin_tarihi)} onChange={e => setEditingDuyuru({ ...editingDuyuru, yayin_tarihi: e.target.value })} placeholder="Yayın Tarihi" className="bg-black/30 border border-white/20 p-2 text-white" />
            </div>
            <input value={editingDuyuru.gorsel_url || ''} onChange={e => setEditingDuyuru({ ...editingDuyuru, gorsel_url: e.target.value })} placeholder="Görsel URL (isteğe bağlı)" className="bg-black/30 border border-white/20 p-2 text-white" />
            <textarea value={editingDuyuru.icerik || ''} onChange={e => setEditingDuyuru({ ...editingDuyuru, icerik: e.target.value })} placeholder="İçerik" rows={10} className="bg-black/30 border border-white/20 p-2 text-white w-full resize-y" />
            <div className="flex gap-2 justify-end">
              {editingDuyuru.id && (
                <button onClick={() => handleDelete(editingDuyuru.id!)} disabled={isSaving} className="border border-rose-500/50 text-rose-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-rose-500/10 disabled:opacity-50">Sil</button>
              )}
              <button onClick={() => setEditingDuyuru(null)} disabled={isSaving} className="border border-white/20 text-white/60 px-4 py-2 text-xs tracking-widest uppercase hover:bg-white/10">İptal</button>
              <button onClick={handleSave} disabled={isSaving} className="border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 disabled:opacity-50">
                {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        )}

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
                  <div className="flex items-center gap-4">
                    <span className="text-white/20 text-xs tracking-wider">
                      {new Date(duyuru.yayin_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {profil?.is_admin && !editingDuyuru && (
                      <button onClick={() => handleEdit(duyuru)} className="text-cyan-400/50 hover:text-cyan-400 text-xs uppercase tracking-widest">
                        Düzenle
                      </button>
                    )}
                  </div>
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