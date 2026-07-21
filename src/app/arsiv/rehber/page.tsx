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
      baslik: editingBolum.baslik ?? '',
      icerik: editingBolum.icerik ?? '',
      sira: editingBolum.sira ?? 1,
      gorsel_url: editingBolum.gorsel_url ?? null,
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
      className="h-screen w-full flex flex-col overflow-hidden relative p-4 md:p-8 justify-center"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="fixed inset-0 bg-black/85" />

      {/* SAĞ ÜST KÖŞEDEKİ KONTROLLER */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20 flex items-center gap-3">
        {profil?.is_admin && !editingBolum && (
          <button
            onClick={() => setEditingBolum({
              baslik: '',
              icerik: '',
              sira: bolumler.length > 0 ? Math.max(...bolumler.map(b => b.sira)) + 1 : 1
            })}
            className="w-8 h-8 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold hover:bg-emerald-500/20 hover:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            title="Yeni Bölüm Ekle"
          >
            +
          </button>
        )}
        <Link
          href="/arsiv"
          className="border border-white/10 text-white/30 hover:border-white/30 hover:text-white/60 px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs tracking-widest uppercase transition-all bg-black/40"
        >
          ← Arşiv
        </Link>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full h-full flex flex-col justify-start gap-4 pt-10 md:pt-14 pb-4 min-h-0">

        {/* Başlık Alanı - Daha Kompakt */}
        <div className="flex flex-col items-center gap-1 text-center shrink-0">
          <p className="text-white/30 text-[9px] md:text-xs tracking-[0.4em] uppercase">Tİyatro Theia</p>
          <h1 className="text-white text-xl md:text-3xl tracking-widest uppercase font-thin">Theia'nın Oyunu</h1>
          <div className="w-16 h-px bg-white/20 mt-1" />
        </div>

        {yukleniyor && (
          <p className="text-white/20 text-center tracking-widest uppercase text-xs py-8 shrink-0">Rehber okunuyor...</p>
        )}
        {!yukleniyor && bolumler.length === 0 && (
          <p className="text-white/20 text-center tracking-widest uppercase text-xs py-8 shrink-0">Rehber henüz yazılmamış.</p>
        )}

        <div className="flex-1 min-h-0 flex flex-col gap-3 justify-center w-full">

          {/* Grid — ilk 10 bölüm (Mobil ve Desktopta sığması için esnek flex/grid yapısı) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 flex-1 min-h-0 max-h-[60vh] md:max-h-[50vh]">
            {gridBolumleri.map((bolum, index) => {
              const stil = renkStilleri[index % renkStilleri.length]
              const renk = borderRenkler[index % borderRenkler.length]
              return (
                <div
                  key={bolum.id}
                  onClick={() => setSeciliBolum(bolum)}
                  className={`relative group border ${stil.border} p-3 flex flex-col items-center justify-center text-center gap-1 transition-all overflow-hidden rounded-md cursor-pointer`}
                  style={{ boxShadow: `inset 0 0 25px ${renk}12` }}
                >
                  {bolum.gorsel_url && (
                    <img
                      src={bolum.gorsel_url}
                      alt={bolum.baslik}
                      className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-500"
                    />
                  )}
                  <div
                    className="absolute inset-0 transition-all duration-300"
                    style={{
                      background: bolum.gorsel_url
                        ? `linear-gradient(135deg, ${renk}77 0%, #00000088 100%)`
                        : `linear-gradient(135deg, ${renk}77 0%, rgba(0,0,0,0.8) 100%)`,
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `radial-gradient(ellipse at center, ${renk}20 0%, transparent 70%)` }}
                  />
                  <h2
                    className="relative z-10 font-bold tracking-widest uppercase text-xs md:text-sm lg:text-base transition-all"
  style={{
    color: '#ffffff', // Yazı rengi bembeyaz
    // CSS gölge katmanlama sırasıyla: Önce keskin siyah kontür, sonra arkasındaki pembe parıltı
    textShadow: `
      -1.5px -1.5px 0 #000,  
       1.5px -1.5px 0 #000,  
      -1.5px  1.5px 0 #000,  
       1.5px  1.5px 0 #000,  
       0px    0px   8px #e879f9,  
       0px    0px  16px #e879f9
    `
  }}
                  >
                    {bolum.baslik}
                  </h2>
                  {profil?.is_admin && (
                    <span
                      onClick={(e) => handleEdit(e, bolum)}
                      className="absolute top-1.5 right-1.5 z-20 text-white/40 hover:text-white text-[10px] cursor-pointer"
                    >
                      ✎
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 11. bölüm — Kompakt Alt Bar Düzeni */}
          {sonBolum && (
            <div className="shrink-0 max-h-[15vh]">
              {/* Mobil ve Masaüstü birleşik esnek alt alan */}
              <div
                onClick={() => setSeciliBolum(sonBolum)}
                className={`relative group border ${renkStilleri[10].border} py-2.5 px-4 flex items-center justify-center text-center gap-2 w-full transition-all overflow-hidden rounded-md cursor-pointer`}
                style={{ boxShadow: `inset 0 0 25px ${borderRenkler[10]}12` }}
              >
                {sonBolum.gorsel_url && (
                  <img src={sonBolum.gorsel_url} alt={sonBolum.baslik}
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-30 group-hover:scale-102 transition-all duration-500" />
                )}
                <div className="absolute inset-0 transition-all duration-300 bg-black/60" />
                <h2
                  className="relative z-10 text-white font-medium tracking-widest uppercase text-xs md:text-sm transition-all"
                  style={{ textShadow: `0 0 8px ${borderRenkler[10]}` }}
                >
                  {sonBolum.baslik} 
                </h2>
                {profil?.is_admin && (
                  <span onClick={(e) => handleEdit(e, sonBolum)}
                    className="absolute top-2.5 right-4 z-20 text-white/40 hover:text-white text-[10px] cursor-pointer">✎</span>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Okuma Modalı */}
        {seciliBolum && (() => {
          const seciliIndex = bolumler.findIndex(b => b.id === seciliBolum.id)
          const stil = renkStilleri[seciliIndex % renkStilleri.length]
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSeciliBolum(null)}>
              <div
                className={`relative z-10 w-full max-w-2xl max-h-[85vh] bg-black border ${stil.modalBorder} rounded-lg shadow-2xl ${stil.modalShadow} flex flex-col`}
                onClick={e => e.stopPropagation()}
              >
                <div className={`flex items-center justify-between p-5 border-b ${stil.modalBorder}`}>
                  <h2 className="text-white text-base md:text-lg tracking-widest uppercase">{seciliBolum.baslik}</h2>
                  <span onClick={() => setSeciliBolum(null)} className="text-white/40 hover:text-white text-2xl cursor-pointer">×</span>
                </div>
                <div className="p-6 md:p-8 flex-1 overflow-y-auto no-scrollbar">
                  <div className="text-white/70 text-sm leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      components={MarkdownComponents}
                    >
                      {seciliBolum.icerik}
                    </ReactMarkdown>
                  </div>                
                </div>
              </div>
            </div>
          )
        })()}

        {/* Admin Düzenleme Modalı */}
        {editingBolum && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setEditingBolum(null)}>
            <div
              className="relative z-10 w-full max-w-lg bg-black border border-fuchsia-500/30 rounded-lg shadow-2xl shadow-fuchsia-500/10 flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/10">
                <h2 className="text-white text-xs md:text-sm tracking-widest uppercase">
                  {editingBolum.id ? 'Bölümü Düzenle' : 'Yeni Bölüm Ekle'}
                </h2>
              </div>
              <div className="p-5 flex flex-col gap-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={editingBolum.baslik || ''}
                    onChange={e => setEditingBolum({ ...editingBolum, baslik: e.target.value })}
                    placeholder="Başlık"
                    className="bg-black/30 border border-white/20 p-2 text-white text-xs focus:outline-none"
                  />
                  <input
                    type="number"
                    value={editingBolum.sira || 0}
                    onChange={e => setEditingBolum({ ...editingBolum, sira: parseInt(e.target.value) || 0 })}
                    placeholder="Sıra"
                    className="bg-black/30 border border-white/20 p-2 text-white text-xs focus:outline-none"
                  />
                  <input
                    value={editingBolum.gorsel_url || ''}
                    onChange={e => setEditingBolum({ ...editingBolum, gorsel_url: e.target.value })}
                    placeholder="Görsel URL"
                    className="md:col-span-2 bg-black/30 border border-white/20 p-2 text-white text-xs focus:outline-none"
                  />
                </div>
                <textarea
                  value={editingBolum.icerik || ''}
                  onChange={e => setEditingBolum({ ...editingBolum, icerik: e.target.value })}
                  placeholder="İçerik"
                  rows={8}
                  className="bg-black/30 border border-white/20 p-2 text-white w-full resize-none text-xs focus:outline-none"
                />
              </div>
              <div className="p-5 border-t border-white/10 flex gap-2 justify-end">
                {editingBolum.id && (
                  <button
                    onClick={() => handleDelete(editingBolum.id!)}
                    className="border border-rose-500/50 text-rose-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-rose-500/10 cursor-pointer"
                  >
                    Sil
                  </button>
                )}
                <button
                  onClick={() => setEditingBolum(null)}
                  className="border border-white/20 text-white/50 px-4 py-2 text-xs tracking-widest uppercase hover:bg-white/10"
                >
                  İptal
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10"
                >
                  {isSaving ? '...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}} />
    </main>
  )
}