'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
  { border: 'border-violet-400/30', modalBorder: 'border-violet-500/30', modalShadow: 'shadow-violet-500/10' },
  { border: 'border-cyan-400/30', modalBorder: 'border-cyan-500/30', modalShadow: 'shadow-cyan-500/10' },
  { border: 'border-amber-400/30', modalBorder: 'border-amber-500/30', modalShadow: 'shadow-amber-500/10' },
  { border: 'border-rose-400/30', modalBorder: 'border-rose-500/30', modalShadow: 'shadow-rose-500/10' },
  { border: 'border-emerald-400/30', modalBorder: 'border-emerald-500/30', modalShadow: 'shadow-emerald-500/10' },
  { border: 'border-indigo-400/30', modalBorder: 'border-indigo-500/30', modalShadow: 'shadow-indigo-500/10' },
  { border: 'border-lime-400/30', modalBorder: 'border-lime-500/30', modalShadow: 'shadow-lime-500/10' },
  { border: 'border-pink-400/30', modalBorder: 'border-pink-500/30', modalShadow: 'shadow-pink-500/10' },
  { border: 'border-sky-400/30', modalBorder: 'border-sky-500/30', modalShadow: 'shadow-sky-500/10' },
  { border: 'border-teal-400/30', modalBorder: 'border-teal-500/30', modalShadow: 'shadow-teal-500/10' },
  { border: 'border-fuchsia-400/30', modalBorder: 'border-fuchsia-500/30', modalShadow: 'shadow-fuchsia-500/10' },
]

const borderRenkler = [
  '#a855f7',
  '#22d3ee',
  '#f59e0b',
  '#f43f5e',
  '#10b981',
  '#6366f1',
  '#84cc16',
  '#ec4899',
  '#0ea5e9',
  '#14b8a6',
  '#e879f9',
]

const MarkdownComponents = {
  p: ({ ...props }) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
  strong: ({ ...props }) => <strong className="text-white font-bold tracking-wide" {...props} />,
  em: ({ ...props }) => <em className="italic text-white/90" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc list-inside mb-4 space-y-2 ml-2" {...props} />,
  li: ({ ...props }) => <li className="text-white/70" {...props} />,
  a: ({ ...props }) => (
    <a 
      className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-4 transition-colors" 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props} 
    />
  ),
  h3: ({ ...props }) => <h3 className="text-lg text-white mt-6 mb-2 tracking-widest uppercase" {...props} />,
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

  function handleEdit(e: React.MouseEvent, bolum: RehberBolumu) {
    e.stopPropagation()
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

  const gridBolumleri = bolumler.length > 10 ? bolumler.slice(0, 10) : bolumler
  const sonBolum = bolumler.length > 10 ? bolumler[10] : null

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
              onClick={() => setEditingBolum({
                baslik: '',
                icerik: '',
                sira: bolumler.length > 0 ? Math.max(...bolumler.map(b => b.sira)) + 1 : 1
              })}
              className="mt-4 border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 transition-all"
            >
              + Yeni Bölüm Ekle
            </button>
          )}
        </div>

        {yukleniyor && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">Rehber okunuyor...</p>
        )}
        {!yukleniyor && bolumler.length === 0 && (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm">Rehber henüz yazılmamış.</p>
        )}

        <div className="flex-1 min-h-0 flex flex-col gap-2 md:gap-4">

          {/* Grid — ilk 10 bölüm */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 flex-grow">
            {gridBolumleri.map((bolum, index) => {
              const stil = renkStilleri[index % renkStilleri.length]
              const renk = borderRenkler[index % borderRenkler.length]
              return (
                <div
                  key={bolum.id}
                  onClick={() => setSeciliBolum(bolum)}
                  className={`relative group border ${stil.border} p-4 flex flex-col items-center justify-center text-center gap-2 transition-all overflow-hidden rounded-md cursor-pointer`}
                  style={{ boxShadow: `inset 0 0 30px ${renk}15` }}
                >
                  {bolum.gorsel_url && (
                    <img
                      src={bolum.gorsel_url}
                      alt={bolum.baslik}
                      className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  <div
                    className="absolute inset-0 transition-all duration-300"
                    style={{
                      background: bolum.gorsel_url
                        ? `linear-gradient(135deg, ${renk}90 0%, #00000099 100%)`
                        : `linear-gradient(135deg, ${renk}90 0%, rgba(0,0,0,0.85) 100%)`,
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `radial-gradient(ellipse at center, ${renk}25 0%, transparent 70%)` }}
                  />
                  <h2
                    className="relative z-10 text-black font-bold tracking-widest uppercase text-lg md:text-xl lg:text-2xl transition-all"
                    style={{ textShadow: `0 0 10px ${renk}` }}
                  >
                    {bolum.baslik}
                  </h2>
                  {profil?.is_admin && (
                    <span
                      onClick={(e) => handleEdit(e, bolum)}
                      className="absolute top-2 right-2 z-20 text-white/30 hover:text-white text-xs cursor-pointer"
                    >
                      ✎
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 11. bölüm — tam genişlik */}
          {sonBolum && (
            <div className="shrink-0">
              {/* Mobil */}
              <div
                onClick={() => setSeciliBolum(sonBolum)}
                className={`relative md:hidden group border ${renkStilleri[10].border} p-6 flex flex-col items-center justify-center text-center gap-2 w-full transition-all overflow-hidden rounded-md cursor-pointer`}
                style={{ boxShadow: `inset 0 0 30px ${borderRenkler[10]}15` }}
              >
                {sonBolum.gorsel_url && (
                  <img src={sonBolum.gorsel_url} alt={sonBolum.baslik}
                    className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${borderRenkler[10]}90 0%, rgba(0,0,0,0.85) 100%)` }} />
                <h2
                  className="relative z-10 text-black font-bold tracking-widest uppercase text-xl transition-all"
                  style={{ textShadow: `0 0 10px ${borderRenkler[10]}` }}
                >
                  {sonBolum.baslik}
                </h2>
                {profil?.is_admin && (
                  <span onClick={(e) => handleEdit(e, sonBolum)}
                    className="absolute top-2 right-2 z-20 text-white/30 hover:text-white text-xs cursor-pointer">✎</span>
                )}
              </div>

              {/* Desktop */}
              <div
                className={`hidden md:flex flex-col gap-4 relative border ${renkStilleri[10].border} p-6 overflow-hidden rounded-md cursor-pointer group`}
                onClick={() => setSeciliBolum(sonBolum)}
                style={{ boxShadow: `inset 0 0 40px ${borderRenkler[10]}15` }}
              >
                {sonBolum.gorsel_url && (
                  <img src={sonBolum.gorsel_url} alt={sonBolum.baslik}
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                )}
                <div className="absolute inset-0 transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${borderRenkler[10]}40 0%, rgba(0,0,0,0.85) 100%)` }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(ellipse at left, ${borderRenkler[10]}20 0%, transparent 60%)` }} />
                <div className="relative z-10">
                  <h2 className="text-white tracking-widest uppercase text-2xl">{sonBolum.baslik}</h2>
                  <div className="w-full h-px my-4"
                    style={{ background: `linear-gradient(90deg, ${borderRenkler[10]}60, transparent)` }} />
{/* Eski hali: <p className="text-white/60 text-sm leading-relaxed tracking-wide whitespace-pre-line">{sonBolum.icerik}</p> */}

<div className="text-white/60 text-sm leading-relaxed tracking-wide">
  <ReactMarkdown 
    remarkPlugins={[remarkGfm]} 
    components={MarkdownComponents}
  >
    {sonBolum.icerik}
  </ReactMarkdown>
</div>                </div>
                {profil?.is_admin && (
                  <span onClick={(e) => handleEdit(e, sonBolum)}
                    className="absolute top-4 right-4 z-20 text-white/30 hover:text-white text-xs cursor-pointer">✎</span>
                )}
              </div>
            </div>
          )}

          <Link href="/arsiv" className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all text-center shrink-0">
            ← Arşive Dön
          </Link>
        </div>

        {/* Okuma Modalı */}
        {seciliBolum && (() => {
          const seciliIndex = bolumler.findIndex(b => b.id === seciliBolum.id)
          const stil = renkStilleri[seciliIndex % renkStilleri.length]
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSeciliBolum(null)}>
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
              <div
                className={`relative z-10 w-full max-w-2xl max-h-[90vh] bg-black border ${stil.modalBorder} rounded-lg shadow-2xl ${stil.modalShadow} flex flex-col`}
                onClick={e => e.stopPropagation()}
              >
                <div className={`flex items-center justify-between p-6 border-b ${stil.modalBorder}`}>
                  <h2 className="text-white text-xl tracking-widest uppercase">{seciliBolum.baslik}</h2>
                  <span onClick={() => setSeciliBolum(null)} className="text-white/40 hover:text-white text-2xl cursor-pointer">×</span>
                </div>
                <div className="p-8 flex-1 overflow-y-auto">
{/* Eski hali: <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{seciliBolum.icerik}</p> */}

<div className="text-white/70 text-sm leading-relaxed">
  <ReactMarkdown 
    remarkPlugins={[remarkGfm]} 
    components={MarkdownComponents}
  >
    {seciliBolum.icerik}
  </ReactMarkdown>
</div>                </div>
              </div>
            </div>
          )
        })()}

        {/* Admin Düzenleme Modalı */}
        {editingBolum && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditingBolum(null)}>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            <div
              className="relative z-10 w-full max-w-2xl bg-black border border-fuchsia-500/30 rounded-lg shadow-2xl shadow-fuchsia-500/10 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10">
                <h2 className="text-white tracking-widest uppercase">
                  {editingBolum.id ? 'Bölümü Düzenle' : 'Yeni Bölüm Ekle'}
                </h2>
              </div>
              <div className="p-6 flex flex-col gap-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={editingBolum.baslik || ''}
                    onChange={e => setEditingBolum({ ...editingBolum, baslik: e.target.value })}
                    placeholder="Başlık"
                    className="bg-black/30 border border-white/20 p-2 text-white"
                  />
                  <input
                    type="number"
                    value={editingBolum.sira || 0}
                    onChange={e => setEditingBolum({ ...editingBolum, sira: parseInt(e.target.value) || 0 })}
                    placeholder="Sıra"
                    className="bg-black/30 border border-white/20 p-2 text-white"
                  />
                  <input
                    value={editingBolum.gorsel_url || ''}
                    onChange={e => setEditingBolum({ ...editingBolum, gorsel_url: e.target.value })}
                    placeholder="Görsel URL (Supabase Storage linki)"
                    className="md:col-span-2 bg-black/30 border border-white/20 p-2 text-white"
                  />
                </div>
                <textarea
                  value={editingBolum.icerik || ''}
                  onChange={e => setEditingBolum({ ...editingBolum, icerik: e.target.value })}
                  placeholder="İçerik"
                  rows={12}
                  className="bg-black/30 border border-white/20 p-2 text-white w-full resize-y"
                />
              </div>
              <div className="p-6 border-t border-white/10 flex gap-2 justify-end">
                {editingBolum.id && (
                  <span
                    onClick={() => handleDelete(editingBolum.id!)}
                    className="border border-rose-500/50 text-rose-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-rose-500/10 cursor-pointer"
                  >
                    Sil
                  </span>
                )}
                <span
                  onClick={() => setEditingBolum(null)}
                  className="border border-white/20 text-white/60 px-4 py-2 text-xs tracking-widest uppercase hover:bg-white/10 cursor-pointer"
                >
                  İptal
                </span>
                <span
                  onClick={handleSave}
                  className={`border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 cursor-pointer ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}