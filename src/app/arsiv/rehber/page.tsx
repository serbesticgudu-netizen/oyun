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

type Profil = {
  is_admin: boolean
}

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
      className="h-screen overflow-hidden"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="fixed inset-0 bg-black/80" />
      <div className="relative z-10 max-w-5xl mx-auto px-8 h-full flex flex-col justify-center gap-8">

        {/* Başlık */}
        <div className="flex flex-col items-center gap-3 text-center">
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

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {bolumler.slice(0, -1).map((bolum) => (
            <button key={bolum.id} onClick={() => setSeciliBolum(bolum)} className="relative group border border-white/10 bg-black/40 p-6 flex flex-col items-center justify-center text-center gap-2 aspect-square hover:border-white/30 hover:bg-black/60 transition-all">
              <h2 className="text-white/70 tracking-widest uppercase text-sm group-hover:text-white transition-all">{bolum.baslik}</h2>
              {profil?.is_admin && <button onClick={(e) => { e.stopPropagation(); handleEdit(bolum); }} className="absolute top-2 right-2 text-cyan-400/50 hover:text-cyan-400 text-xs uppercase tracking-widest">Düzenle</button>}
            </button>
          ))}
        </div>

        {bolumler.length > 0 && (() => {
          const sonBolum = bolumler[bolumler.length - 1];
          return (
            <div className="mt-4">
              {/* Mobile */}
              <button onClick={() => setSeciliBolum(sonBolum)} className="relative md:hidden group border border-white/10 bg-black/40 p-6 flex flex-col items-center justify-center text-center gap-2 w-full hover:border-white/30 hover:bg-black/60 transition-all">
                <h2 className="text-white/70 tracking-widest uppercase text-sm group-hover:text-white transition-all">{sonBolum.baslik}</h2>
                {profil?.is_admin && <button onClick={(e) => { e.stopPropagation(); handleEdit(sonBolum); }} className="absolute top-2 right-2 text-cyan-400/50 hover:text-cyan-400 text-xs uppercase tracking-widest">Düzenle</button>}
              </button>
              {/* Desktop */}
              <div className="hidden md:flex flex-col gap-4 relative border border-white/10 bg-black/40 p-8">
                <h2 className="text-white tracking-widest uppercase text-lg">{sonBolum.baslik}</h2>
                <div className="w-full h-px bg-white/10" />
                <p className="text-white/60 text-sm leading-relaxed tracking-wide whitespace-pre-line">{sonBolum.icerik}</p>
                {profil?.is_admin && <button onClick={(e) => { e.stopPropagation(); handleEdit(sonBolum); }} className="absolute top-4 right-4 text-cyan-400/50 hover:text-cyan-400 text-xs uppercase tracking-widest">Düzenle</button>}
              </div>
            </div>
          )
        })()}

        <Link
          href="/arsiv"
          className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all text-center"
        >
          ← Arşive Dön
        </Link>
      </div>

      {/* Modal */}
      {seciliBolum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSeciliBolum(null)}>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] bg-black border border-fuchsia-500/30 rounded-lg shadow-2xl shadow-fuchsia-500/10 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-white text-xl tracking-widest uppercase">{seciliBolum.baslik}</h2>
              <button onClick={() => setSeciliBolum(null)} className="text-white/40 hover:text-white transition-colors text-2xl">×</button>
            </div>
            <div className="p-8 flex-1 overflow-y-auto">
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{seciliBolum.icerik}</p>
            </div>
          </div>
        </div>
      )}

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
    </main>
  )
}