'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type RehberBolumu = {
  id: string
  baslik: string
  icerik: string
  sira: number
  gorsel_url: string | null
}

type Profil = {
  is_admin: boolean
}

const renkStilleri = [
  { border: 'border-violet-400/30', hoverBorder: 'hover:border-violet-400', bg: 'hover:bg-violet-900/40', modalBorder: 'border-violet-500/30', modalShadow: 'shadow-violet-500/10' },
  { border: 'border-cyan-400/30', hoverBorder: 'hover:border-cyan-400', bg: 'hover:bg-cyan-900/40', modalBorder: 'border-cyan-500/30', modalShadow: 'shadow-cyan-500/10' },
  { border: 'border-amber-400/30', hoverBorder: 'hover:border-amber-400', bg: 'hover:bg-amber-900/40', modalBorder: 'border-amber-500/30', modalShadow: 'shadow-amber-500/10' },
  { border: 'border-rose-400/30', hoverBorder: 'hover:border-rose-400', bg: 'hover:bg-rose-900/40', modalBorder: 'border-rose-500/30', modalShadow: 'shadow-rose-500/10' },
  { border: 'border-emerald-400/30', hoverBorder: 'hover:border-emerald-400', bg: 'hover:bg-emerald-900/40', modalBorder: 'border-emerald-500/30', modalShadow: 'shadow-emerald-500/10' },
  { border: 'border-indigo-400/30', hoverBorder: 'hover:border-indigo-400', bg: 'hover:bg-indigo-900/40', modalBorder: 'border-indigo-500/30', modalShadow: 'shadow-indigo-500/10' },
  { border: 'border-lime-400/30', hoverBorder: 'hover:border-lime-400', bg: 'hover:bg-lime-900/40', modalBorder: 'border-lime-500/30', modalShadow: 'shadow-lime-500/10' },
  { border: 'border-pink-400/30', hoverBorder: 'hover:border-pink-400', bg: 'hover:bg-pink-900/40', modalBorder: 'border-pink-500/30', modalShadow: 'shadow-pink-500/10' },
  { border: 'border-sky-400/30', hoverBorder: 'hover:border-sky-400', bg: 'hover:bg-sky-900/40', modalBorder: 'border-sky-500/30', modalShadow: 'shadow-sky-500/10' },
  { border: 'border-teal-400/30', hoverBorder: 'hover:border-teal-400', bg: 'hover:bg-teal-900/40', modalBorder: 'border-teal-500/30', modalShadow: 'shadow-teal-500/10' },
];

export default function Rehber() {
  const [bolumler, setBolumler] = useState<RehberBolumu[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [seciliBolum, setSeciliBolum] = useState<RehberBolumu | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [editingBolum, setEditingBolum] = useState<Partial<RehberBolumu> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        setProfil(p)
      }

      const { data, error } = await supabase.from('rehber').select('*').order('sira')
      if (error) console.error(JSON.stringify(error))
      else setBolumler(data ?? [])
      setYukleniyor(false)
    }
    yukle()
  }, [])

  function handleEdit(bolum: RehberBolumu) {
    setEditingBolum({ ...bolum })
    setSeciliBolum(null)
  }

  async function handleSave() {
    if (!editingBolum) return
    setIsSaving(true)
    const supabase = createClient()

    const bolumData = {
      baslik: editingBolum.baslik,
      icerik: editingBolum.icerik,
      sira: editingBolum.sira,
      gorsel_url: editingBolum.gorsel_url,
    }

    const { data, error } = editingBolum.id
      ? await supabase.from('rehber').update(bolumData).eq('id', editingBolum.id).select().single()
      : await supabase.from('rehber').insert(bolumData).select().single()

    if (error) {
      alert('Hata: ' + error.message)
    } else if (data) {
      if (editingBolum.id) {
        setBolumler(prev => prev.map(b => b.id === data.id ? data : b))
      } else {
        setBolumler(prev => [...prev, data].sort((a, b) => a.sira - b.sira))
      }
      setEditingBolum(null)
    }
    setIsSaving(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu bölümü silmek istediğinizden emin misiniz?')) return
    const supabase = createClient()
    const { error } = await supabase.from('rehber').delete().eq('id', id)
    if (error) {
      alert('Hata: ' + error.message)
    } else {
      setBolumler(prev => prev.filter(b => b.id !== id))
      setEditingBolum(null)
    }
  }

  return (
    <main
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="fixed inset-0 bg-black/80" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 w-full h-full flex flex-col justify-center gap-4 py-4 md:py-8">

        {/* Başlık */}
        <div className="flex flex-col items-center gap-3 text-center shrink-0">
          <p className="text-white/30 text-xs tracking-[0.4em] uppercase">Tiyatro Theia</p>
          <h1 className="text-white text-4xl tracking-widest uppercase">Theia'nın Oyunu</h1>
          <p className="text-white/30 text-sm tracking-wider max-w-lg">
            Oyunun kuralları. Ritüeller. Gaia Halkı'na kılavuz.
          </p>
          <div className="w-24 h-px bg-white/20 mt-2" />
          {profil?.is_admin && !editingBolum && (
            <button
              onClick={() => setEditingBolum({ baslik: '', icerik: '', sira: (bolumler.length > 0 ? Math.max(...bolumler.map(b => b.sira)) : 0) + 1 })}
              className="mt-4 border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 transition-all"
            >
              + Yeni Bölüm Ekle
            </button>
          )}
        </div>

        {/* Bölümler */}
        {yukleniyor && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">Rehber okunuyor...</p>
        )}

        {!yukleniyor && bolumler.length === 0 && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">Rehber henüz yazılmamış.</p>
        )}

        <div className="flex-1 min-h-0 flex flex-col gap-2 md:gap-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 flex-grow">
            {bolumler.slice(0, 10).map((bolum, index) => {
              const stil = renkStilleri[index % renkStilleri.length];
              return (
                <button key={bolum.id} onClick={() => setSeciliBolum(bolum)} className={`relative group ${stil.border} ${stil.hoverBorder} ${stil.bg} p-4 flex flex-col items-center justify-center text-center gap-2 transition-all overflow-hidden rounded-md`}>
                  {bolum.gorsel_url && <img src={bolum.gorsel_url} alt={bolum.baslik} className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />}
                  <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-all" />
                  <h2 className="relative z-10 text-white/80 tracking-widest uppercase text-xs md:text-sm group-hover:text-white transition-all">{bolum.baslik}</h2>
                  {profil?.is_admin && <button onClick={(e) => { e.stopPropagation(); handleEdit(bolum); }} className="absolute top-2 right-2 z-20 text-cyan-400/50 hover:text-cyan-400 text-xs uppercase tracking-widest">Düzenle</button>}
                </button>
              )
            })}
          </div>

          {bolumler.length > 10 && (() => {
            const sonBolum = bolumler[10];
            const stil = renkStilleri[10 % renkStilleri.length];
            return (
              <div className="shrink-0 mt-2 md:mt-4">
                {/* Mobile */}
                <button onClick={() => setSeciliBolum(sonBolum)} className="relative md:hidden group border border-white/10 bg-black/40 p-6 flex flex-col items-center justify-center text-center gap-2 w-full hover:border-white/30 hover:bg-black/60 transition-all">
                  <h2 className="text-white/70 tracking-widest uppercase text-sm group-hover:text-white transition-all">{sonBolum.baslik}</h2>
                  {profil?.is_admin && (
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(sonBolum); }} className="absolute top-2 right-2 text-cyan-400/50 hover:text-cyan-400 text-xs uppercase tracking-widest">
                      Düzenle
                    </button>
                  )}
                </button>
                <button onClick={() => setSeciliBolum(sonBolum)} className={`relative md:hidden group border ${stil.border} ${stil.hoverBorder} ${stil.bg} p-6 flex flex-col items-center justify-center text-center gap-2 w-full transition-all overflow-hidden rounded-md`}>
                  {sonBolum.gorsel_url && <img src={sonBolum.gorsel_url} alt={sonBolum.baslik} className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />}
                  <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-all" />
                  <h2 className="relative z-10 text-white/80 tracking-widest uppercase text-sm group-hover:text-white transition-all">{sonBolum.baslik}</h2>
                  {profil?.is_admin && (
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(sonBolum); }} className="absolute top-2 right-2 z-20 text-cyan-400/50 hover:text-cyan-400 text-xs uppercase tracking-widest">
                      Düzenle
                    </button>
                  )}
                </button>
                {/* Desktop */}
                <div className="hidden md:flex flex-col gap-4 relative border border-white/10 bg-black/40 p-6">
                  <h2 className="text-white tracking-widest uppercase text-lg">{sonBolum.baslik}</h2>
                  <div className="w-full h-px bg-white/10" />
                  <p className="text-white/60 text-sm leading-relaxed tracking-wide whitespace-pre-line">{sonBolum.icerik}</p>
                  {profil?.is_admin && (
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(sonBolum); }} className="absolute top-4 right-4 text-cyan-400/50 hover:text-cyan-400 text-xs uppercase tracking-widest">
                      Düzenle
                    </button>
                  )}
                </div>
                <div className={`hidden md:flex flex-col gap-4 relative border ${stil.border} p-6 overflow-hidden rounded-md`}>
                  {sonBolum.gorsel_url && <img src={sonBolum.gorsel_url} alt={sonBolum.baslik} className="absolute inset-0 w-full h-full object-cover object-center" />}
                  <div className="absolute inset-0 bg-black/70" />
                  <div className="relative z-10">
                    <h2 className="text-white tracking-widest uppercase text-lg">{sonBolum.baslik}</h2>
                    <div className="w-full h-px bg-white/10 my-4" />
                    <p className="text-white/60 text-sm leading-relaxed tracking-wide whitespace-pre-line">{sonBolum.icerik}</p>
                  </div>
                  {profil?.is_admin && (
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(sonBolum); }} className="absolute top-4 right-4 z-20 text-cyan-400/50 hover:text-cyan-400 text-xs uppercase tracking-widest">
                      Düzenle
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          <Link href="/arsiv" className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all text-center shrink-0">
            ← Arşive Dön
          </Link>
        </div>

        {/* Modal */}
        {seciliBolum && (() => {
          const seciliIndex = bolumler.findIndex(b => b.id === seciliBolum.id);
          const stil = renkStilleri[seciliIndex % renkStilleri.length];
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSeciliBolum(null)}>
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
              <div className={`relative z-10 w-full max-w-2xl max-h-[90vh] bg-black border ${stil.modalBorder} rounded-lg shadow-2xl ${stil.modalShadow} flex flex-col`} onClick={e => e.stopPropagation()}>
                <div className={`flex items-center justify-between p-6 border-b ${stil.modalBorder}`}>
                  <h2 className="text-white text-xl tracking-widest uppercase">{seciliBolum.baslik}</h2>
                  <button onClick={() => setSeciliBolum(null)} className="text-white/40 hover:text-white transition-colors text-2xl">×</button>
                </div>
                <div className="p-8 flex-1 overflow-y-auto">
                  <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{seciliBolum.icerik}</p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Admin Edit Modal */}
        {editingBolum && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditingBolum(null)}>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-2xl bg-black border border-fuchsia-500/30 rounded-lg shadow-2xl shadow-fuchsia-500/10 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/10">
                <h2 className="text-white tracking-widest uppercase">{editingBolum.id ? 'Bölümü Düzenle' : 'Yeni Bölüm Ekle'}</h2>
              </div>
              <div className="p-6 flex flex-col gap-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input value={editingBolum.baslik || ''} onChange={e => setEditingBolum({ ...editingBolum, baslik: e.target.value })} placeholder="Başlık" className="bg-black/30 border border-white/20 p-2 text-white" />
                  <input type="number" value={editingBolum.sira || 0} onChange={e => setEditingBolum({ ...editingBolum, sira: parseInt(e.target.value) || 0 })} placeholder="Sıra" className="bg-black/30 border border-white/20 p-2 text-white" />
                  <input value={editingBolum.gorsel_url || ''} onChange={e => setEditingBolum({ ...editingBolum, gorsel_url: e.target.value })} placeholder="Görsel URL" className="md:col-span-2 bg-black/30 border border-white/20 p-2 text-white" />
                </div>
                <textarea value={editingBolum.icerik || ''} onChange={e => setEditingBolum({ ...editingBolum, icerik: e.target.value })} placeholder="İçerik" rows={12} className="bg-black/30 border border-white/20 p-2 text-white w-full resize-y" />
              </div>
              <div className="p-6 border-t border-white/10 flex gap-2 justify-end">
                {editingBolum.id && (
                  <button onClick={() => handleDelete(editingBolum.id!)} disabled={isSaving} className="border border-rose-500/50 text-rose-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-rose-500/10 disabled:opacity-50">Sil</button>
                )}
                <button onClick={() => setEditingBolum(null)} disabled={isSaving} className="border border-white/20 text-white/60 px-4 py-2 text-xs tracking-widest uppercase hover:bg-white/10">İptal</button>
                <button onClick={handleSave} disabled={isSaving} className="border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 disabled:opacity-50">{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    )
}

