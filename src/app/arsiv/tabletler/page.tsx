'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

type Tablet = {
  id: string
  baslik: string
  icerik: string
  konu: string
  donem: string
  sira: number
}

type Profil = {
  is_admin: boolean
}

export default function Tabletler() {
  const [tabletler, setTabletler] = useState<Tablet[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktifKonu, setAktifKonu] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [editingTablet, setEditingTablet] = useState<Partial<Tablet> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        setProfil(p)
      }

      const { data, error } = await supabase.from('kadim_tabletler').select('*').order('sira')
      if (error) {
        console.error('Supabase hatası:', JSON.stringify(error))
      } else {
        setTabletler(data ?? [])
      }
      setYukleniyor(false)
    }
    yukle()
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

  function handleEdit(tablet: Tablet) {
    setEditingTablet({ ...tablet })
  }

  async function handleSave() {
    if (!editingTablet) return
    setIsSaving(true)
    const supabase = createClient()

    const tabletData = {
      baslik: editingTablet.baslik ?? '',
      icerik: editingTablet.icerik ?? '',
      konu: editingTablet.konu ?? 'Kozmoloji',
      donem: editingTablet.donem ?? 'Belirsiz',
      sira: editingTablet.sira ?? 1,
    }

    const { data, error } = editingTablet.id
      ? await supabase.from('kadim_tabletler').update(tabletData).eq('id', editingTablet.id).select().single()
      : await supabase.from('kadim_tabletler').insert(tabletData).select().single()

    if (error) {
      alert('Hata: ' + error.message)
    } else if (data) {
      if (editingTablet.id) {
        setTabletler(prev => prev.map(t => t.id === data.id ? data : t))
      } else {
        setTabletler(prev => [...prev, data].sort((a, b) => a.sira - b.sira))
      }
      setEditingTablet(null)
    }
    setIsSaving(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu tableti silmek istediğinizden emin misiniz?')) return
    const supabase = createClient()
    const { error } = await supabase.from('kadim_tabletler').delete().eq('id', id)
    if (error) {
      alert('Hata: ' + error.message)
    } else {
      setTabletler(prev => prev.filter(t => t.id !== id))
      if (editingTablet?.id === id) {
        setEditingTablet(null)
      }
    }
  }

  const filtrelenmis = aktifKonu
    ? tabletler.filter(t => t.konu === aktifKonu)
    : []

  return (
    <main
      className="h-screen w-full flex flex-col items-center justify-start p-4 md:p-8 overflow-hidden relative"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="fixed inset-0 bg-black/85" />

      {/* SAĞ ÜST KÖŞEDEKİ KONTROL ALANI */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20 flex items-center gap-3">
        {profil?.is_admin && !editingTablet && (
          <button
            onClick={() => setEditingTablet({ baslik: '', icerik: '', konu: 'Kozmoloji', donem: 'Belirsiz', sira: (tabletler.length > 0 ? Math.max(...tabletler.map(t => t.sira)) : 0) + 1 })}
            className="w-8 h-8 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold hover:bg-emerald-500/20 hover:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            title="Yeni Tablet Ekle"
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

      <div className="relative z-10 w-full max-w-3xl flex flex-col h-full gap-4 md:gap-6 pt-10 md:pt-14 pb-4">
        
        {/* Başlık Alanı */}
        <div className="flex flex-col items-center gap-1 text-center shrink-0">
          <p className="text-white/30 text-[9px] md:text-xs tracking-[0.4em] uppercase">Theia KABİLESİ</p>
          <h1 className="text-white text-xl md:text-3xl tracking-widest uppercase">KADİM Tabletler</h1>
          <div className="w-16 h-px bg-white/20 mt-1" />
        </div>

        {/* Konu Seçim Grid'i - Kompakt */}
        <div className="grid grid-cols-3 gap-2 shrink-0 w-full">
          {Object.keys(konuRenkleri).map(konu => (
            <button
              key={konu}
              onClick={() => konuSec(konu)}
              className={`
                border py-2.5 md:py-3.5 text-[9px] md:text-xs tracking-widest transition-all duration-300 cursor-pointer text-center truncate
                ${konuRenkleri[konu]}
${aktifKonu === konu ? `shadow-[0_0_15px_currentcolor] border-opacity-100 bg-opacity-20 scale-[1.02]` : 'opacity-50 hover:opacity-100 hover:scale-[1.02]'}
              `}
            >
              {konu.split(' ')[0]} {/* Mobilde taşmasın diye ilk kelimeler */}
            </button>
          ))}
        </div>

        {/* DÜZENLEME FORMU - MODAL OLARAK DEĞİŞTİRİLDİ (Ekranı işgal etmesin diye) */}
        {editingTablet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setEditingTablet(null)}>
            <div className="w-full max-w-lg bg-black border border-fuchsia-500/30 p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto rounded shadow-2xl shadow-fuchsia-500/10" onClick={e => e.stopPropagation()}>
              <h2 className="text-white text-sm tracking-widest">{editingTablet.id ? 'Tableti Düzenle' : 'Yeni Tablet Ekle'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={editingTablet.baslik || ''} onChange={e => setEditingTablet({ ...editingTablet, baslik: e.target.value })} placeholder="Başlık" className="bg-black/30 border border-white/20 p-2 text-white text-xs" />
                <input type="number" value={editingTablet.sira || 0} onChange={e => setEditingTablet({ ...editingTablet, sira: parseInt(e.target.value) || 0 })} placeholder="Sıra" className="bg-black/30 border border-white/20 p-2 text-white text-xs" />
                <select value={editingTablet.konu || 'Kozmoloji'} onChange={e => setEditingTablet({ ...editingTablet, konu: e.target.value })} className="bg-black/30 border border-white/20 p-2 text-white text-xs">
                  {Object.keys(konuRenkleri).map(konu => <option key={konu} value={konu}>{konu}</option>)}
                </select>
                <input value={editingTablet.donem || ''} onChange={e => setEditingTablet({ ...editingTablet, donem: e.target.value })} placeholder="Dönem" className="bg-black/30 border border-white/20 p-2 text-white text-xs" />
              </div>
              <textarea value={editingTablet.icerik || ''} onChange={e => setEditingTablet({ ...editingTablet, icerik: e.target.value })} placeholder="İçerik" rows={8} className="bg-black/30 border border-white/20 p-2 text-white w-full resize-none text-xs" />
              <div className="flex gap-2 justify-end">
                {editingTablet.id && (
                  <button onClick={() => handleDelete(editingTablet.id!)} disabled={isSaving} className="border border-rose-500/50 text-rose-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-rose-500/10">
                    Sil
                  </button>
                )}
                <button onClick={() => setEditingTablet(null)} disabled={isSaving} className="border border-white/20 text-white/60 px-4 py-2 text-xs tracking-widest uppercase hover:bg-white/10">
                  İptal
                </button>
                <button onClick={handleSave} disabled={isSaving} className="border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10">
                  {isSaving ? '...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* İÇERİK BÖLÜMÜ - SCROLLABLE (Kendi içinde kaydırılabilir) */}
        <div className="flex-1 overflow-y-auto no-scrollbar w-full min-h-0 flex flex-col gap-4">
          
          {yukleniyor && (
            <p className="text-white/20 text-center tracking-widest uppercase text-xs py-8">
              Tabletler okunuyor...
            </p>
          )}

          {!yukleniyor && aktifKonu && filtrelenmis.length === 0 && (
            <p className="text-white/20 text-center tracking-widest uppercase text-xs py-8">
              Bu konuda henüz tablet yazılmamış.
            </p>
          )}

          {!yukleniyor && aktifKonu && filtrelenmis.length > 0 && (
            <div className="flex flex-col gap-4 pb-8">
              {/* Konu Başlık Çizgisi */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-6 h-px bg-white/20" />
                <h2 className={`text-[10px] tracking-[0.4em] uppercase ${konuRenkleri[aktifKonu].split(' ')[0]}`}>
                  {aktifKonu}
                </h2>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Tablet Listesi */}
              {filtrelenmis.map(tablet => (
                <div
                  key={tablet.id}
                  className="border border-white/5 bg-black/45 p-5 md:p-6 flex flex-col gap-3 transition-all duration-300 hover:border-white/15"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white text-base tracking-wider truncate">{tablet.baslik}</h3>
                      <span className="text-white/20 text-[10px] tracking-widest uppercase">
                        {tablet.donem}
                      </span>
                    </div>
                    {profil?.is_admin && !editingTablet && (
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(tablet); }} 
                        className="text-cyan-400/50 hover:text-cyan-400 text-[10px] uppercase tracking-widest border border-cyan-400/10 px-2 py-0.5 transition-all">
                        Düzenle
                      </button>
                    )}
                  </div>
                  <div className="w-full h-px bg-white/5" />
                  <p className="text-white/50 text-xs md:text-sm leading-relaxed tracking-wide">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {tablet.icerik}
                    </ReactMarkdown>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Kaydırma Çubuğunu Gizleyen Global CSS */}
{/* Kaydırma Çubuğunu Gizleyen Güvenli CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}} />
    </main>
  )
}