'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

const turStilleri: Record<string, { renk: string; etiket: string; ikon: string; border: string; glow: string; text: string }> = {
  duyuru: { renk: 'border-cyan-400/30 text-cyan-400', etiket: 'Duyuru', ikon: '◈', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/10', text: 'text-cyan-400' },
  etkinlik: { renk: 'border-amber-400/30 text-amber-400', etiket: 'Etkinlik', ikon: '◉', border: 'border-amber-500/20', glow: 'shadow-amber-500/10', text: 'text-amber-400' },
  hikaye: { renk: 'border-violet-400/30 text-violet-400', etiket: 'Hikaye', ikon: '✦', border: 'border-violet-500/20', glow: 'shadow-violet-500/10', text: 'text-violet-400' },
  gorsel: { renk: 'border-rose-400/30 text-rose-400', etiket: 'Görsel', ikon: '▣', border: 'border-rose-500/20', glow: 'shadow-rose-500/10', text: 'text-rose-400' },
}

// Eksik olan renk eşleştirmesi eklendi (Glow efekti için)
const borderRenkler: Record<string, string> = {
  duyuru: '#22d3ee',
  etkinlik: '#fbbf24',
  hikaye: '#c084fc',
  gorsel: '#f43f5e'
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

export default function Duyurular() {
  const [duyurular, setDuyurular] = useState<Duyuru[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [filtre, setFiltre] = useState<string | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [editingDuyuru, setEditingDuyuru] = useState<Partial<Duyuru> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [seciliDuyuru, setSeciliDuyuru] = useState<Duyuru | null>(null)
  
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setMounted(true)
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    
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

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function handleEdit(e: React.MouseEvent, d: Duyuru) {
    e.stopPropagation()
    setEditingDuyuru({ ...d })
    setSeciliDuyuru(null)
  }

  async function handleSave() {
    if (!editingDuyuru) return
    setIsSaving(true)
    const supabase = createClient()

    const duyuruData = {
      baslik: editingDuyuru.baslik ?? '',
      icerik: editingDuyuru.icerik ?? '',
      tur: editingDuyuru.tur ?? 'duyuru',
      yayin_tarihi: editingDuyuru.yayin_tarihi ? new Date(editingDuyuru.yayin_tarihi).toISOString() : new Date().toISOString(),
      gorsel_url: editingDuyuru.gorsel_url ?? null,
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
        setDuyurular(prev => [newDuyuru, ...prev])
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
      setEditingDuyuru(null)
    }
  }

  const formatTarihForInput = (tarih: string | undefined) => {
    if (!tarih) return ''
    const d = new Date(tarih)
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
  }

  const getFirstSentence = (text: string) => {
    const first = text.split(/[.!?]/)[0]
    return first ? first + '.' : ''
  }

  const filtrelenmis = filtre ? duyurular.filter(d => d.tur === filtre) : duyurular

  // 3 sütunlu düzene geçtiğimiz için limitleri 3'ün katı yaptık (Masaüstü: 6, Mobil: 4 kart)
  const limit = isMobile ? 4 : 6;
  const totalPages = Math.ceil(filtrelenmis.length / limit)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * limit
    return filtrelenmis.slice(start, start + limit)
  }, [filtrelenmis, currentPage, limit])

  useEffect(() => {
    setCurrentPage(1)
  }, [filtre])

  if (!mounted) return null;

  return (
    <main
      className="min-h-screen w-full flex flex-col relative p-4 md:p-8 justify-start overflow-y-auto"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="fixed inset-0 bg-black/85 pointer-events-none" />

      {/* SAĞ ÜST KONTROL ALANI */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20 flex items-center gap-3">
        {profil?.is_admin && !editingDuyuru && (
          <button
            onClick={() => setEditingDuyuru({ baslik: '', icerik: '', tur: 'duyuru', yayin_tarihi: new Date().toISOString() })}
            className="w-8 h-8 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold hover:bg-emerald-500/20 hover:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            title="Yeni Duyuru Ekle"
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

      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col justify-start gap-6 pt-10 md:pt-14 pb-8">

        {/* Başlık */}
        <div className="flex flex-col items-center gap-1 text-center shrink-0">
          <p className="text-fuchsia-400/40 text-[9px] md:text-xs tracking-[0.4em] uppercase">TİYATRO THEİA</p>
          <h1 className="text-white text-xl md:text-3xl tracking-widest uppercase">KABİLENİN SESİ</h1>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent mt-1" />
        </div>

        {/* Tür filtreleri */}
        <div className="flex flex-wrap gap-1.5 justify-center shrink-0">
          <button
            onClick={() => setFiltre(null)}
            className={`text-[9px] md:text-xs tracking-widest uppercase px-3 py-1.5 border transition-all ${!filtre ? 'border-white/50 text-white bg-white/10' : 'border-white/10 text-white/40 hover:border-white/30'}`}
          >
            Tümü
          </button>
          {Object.entries(turStilleri).map(([tur, stil]) => (
            <button
              key={tur}
              onClick={() => setFiltre(tur)}
              className={`text-[9px] md:text-xs tracking-widest px-3 py-1.5 border transition-all ${filtre === tur ? `${stil.renk} bg-white/5` : 'border-white/10 text-white/40 hover:border-white/30'}`}
            >
              {stil.ikon} {stil.etiket}
            </button>
          ))}
        </div>

        {/* DÜZENLEME MODAL */}
        {editingDuyuru && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setEditingDuyuru(null)}>
            <div className="w-full max-w-lg bg-black border border-fuchsia-500/30 p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto rounded shadow-2xl shadow-fuchsia-500/10" onClick={e => e.stopPropagation()}>
              <h3 className="text-white text-sm tracking-widest uppercase">{editingDuyuru.id ? 'Duyuruyu Düzenle' : 'Yeni Duyuru'}</h3>
              <input value={editingDuyuru.baslik || ''} onChange={e => setEditingDuyuru({ ...editingDuyuru, baslik: e.target.value })} placeholder="Başlık" className="bg-black/30 border border-white/20 p-2 text-white text-xs focus:outline-none" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={editingDuyuru.tur || 'duyuru'} onChange={e => setEditingDuyuru({ ...editingDuyuru, tur: e.target.value })} className="bg-black/30 border border-white/20 p-2 text-white text-xs focus:outline-none">
                  {Object.keys(turStilleri).map(tur => <option key={tur} value={tur}>{turStilleri[tur].etiket}</option>)}
                </select>
                <input type="datetime-local" value={formatTarihForInput(editingDuyuru.yayin_tarihi)} onChange={e => setEditingDuyuru({ ...editingDuyuru, yayin_tarihi: e.target.value })} className="bg-black/30 border border-white/20 p-2 text-white text-xs focus:outline-none" />
              </div>
              <input value={editingDuyuru.gorsel_url || ''} onChange={e => setEditingDuyuru({ ...editingDuyuru, gorsel_url: e.target.value })} placeholder="Görsel URL" className="bg-black/30 border border-white/20 p-2 text-white text-xs focus:outline-none" />
              <textarea value={editingDuyuru.icerik || ''} onChange={e => setEditingDuyuru({ ...editingDuyuru, icerik: e.target.value })} placeholder="İçerik" rows={8} className="bg-black/30 border border-white/20 p-2 text-white w-full resize-none text-xs focus:outline-none" />
              <div className="flex gap-2 justify-end">
                {editingDuyuru.id && (
                  <button onClick={() => handleDelete(editingDuyuru.id!)} className="border border-rose-500/50 text-rose-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-rose-500/10">Sil</button>
                )}
                <button onClick={() => setEditingDuyuru(null)} className="border border-white/20 text-white/50 px-4 py-2 text-xs tracking-widest uppercase hover:bg-white/10">İptal</button>
                <button onClick={handleSave} disabled={isSaving} className="border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10">
                  {isSaving ? '...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Yükleniyor / Boş Durumları */}
        {yukleniyor && <p className="text-white/20 text-center tracking-widest uppercase text-xs py-8 shrink-0">Kayıtlar okunuyor...</p>}
        {!yukleniyor && filtrelenmis.length === 0 && <p className="text-white/20 text-center tracking-widest uppercase text-xs py-8 shrink-0">Henüz kayıt yapılmamış.</p>}

        {/* ENİNE GENİŞ / İÇERİĞE GÖRE BOYUTLANAN GRID SİSTEMİ */}
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {paginatedData.map(duyuru => {
              const stil = turStilleri[duyuru.tur] ?? turStilleri.duyuru
              return (
                <div
                  key={duyuru.id}
                  onClick={() => setSeciliDuyuru(duyuru)}
                  className={`border ${stil.border} bg-black/40 hover:bg-black/70 hover:border-white/25 rounded-md p-4 flex flex-col justify-start gap-3 cursor-pointer transition-all relative overflow-hidden group`}
                  style={{ boxShadow: `inset 0 0 15px ${borderRenkler[duyuru.tur] || '#22d3ee'}05` }}
                >
                  {/* Sol Kenardaki Renkli Vurgu Çizgisi */}
                  <div className={`absolute top-0 left-0 w-0.5 h-full ${stil.text} opacity-50`} style={{ backgroundColor: 'currentColor' }} />

                  {/* Görsel Alanı - Gerçek Enine Geniş Sinematik Oran (16:9) */}
                  {duyuru.gorsel_url && (
                    <div className="relative aspect-video w-full rounded overflow-hidden border border-white/5 bg-black/20 shrink-0">
                      <img src={duyuru.gorsel_url} alt={duyuru.baslik} className="w-full h-full object-cover opacity-75 group-hover:scale-102 transition-transform duration-500" />
                    </div>
                  )}

                  {/* Metin İçeriği */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`text-[8px] md:text-[9px] tracking-widest uppercase font-medium ${stil.text}`}>{stil.etiket}</span>
                      <span className="text-white/25 text-[8px]">{new Date(duyuru.yayin_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                    </div>

                    {/* Başlıklar artık tam görünüyor (truncate kaldırıldı, line-clamp-2 veya normal sarma eklendi) */}
                    <h3 className="text-white/90 group-hover:text-white text-sm font-medium tracking-wide leading-snug break-words">
                      {duyuru.baslik}
                    </h3>
                    
                    {/* Sadece Masaüstünde ilk cümle */}
                    {!isMobile && (
                      <p className="text-white/35 text-[10px] leading-relaxed line-clamp-2 mt-0.5">
                        {getFirstSentence(duyuru.icerik)}
                      </p>
                    )}
                  </div>

                  {/* Yönetici Düzenleme Simgesi */}
                  {profil?.is_admin && !editingDuyuru && (
                    <span onClick={(e) => handleEdit(e, duyuru)} 
                      className="absolute bottom-2 right-2 text-white/20 hover:text-cyan-400 text-[10px] transition-colors z-10 cursor-pointer">
                      ✎
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-2 shrink-0">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="text-white/20 hover:text-white text-xs transition-colors">←</button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${currentPage === i + 1 ? 'bg-fuchsia-500 scale-125 shadow-[0_0_8px_#d946ef]' : 'bg-white/10 hover:bg-white/30'}`}
                />
              ))}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="text-white/20 hover:text-white text-xs transition-colors">→</button>
          </div>
        )}

        {/* DETAY OKUMA MODALI */}
        {seciliDuyuru && (() => {
          const stil = turStilleri[seciliDuyuru.tur] ?? turStilleri.duyuru
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSeciliDuyuru(null)}>
              <div
                className={`relative z-10 w-full max-w-2xl max-h-[85vh] bg-black border ${stil.border} rounded-lg shadow-2xl ${stil.glow} flex flex-col`}
                onClick={e => e.stopPropagation()}
              >
                <div className={`flex items-center justify-between p-5 border-b ${stil.border}`}>
                  <div className="flex flex-col gap-1">
                    <span className={`text-[10px] tracking-widest uppercase font-medium ${stil.text}`}>{stil.etiket}</span>
                    <h2 className="text-white text-base md:text-lg tracking-wider font-light leading-snug">{seciliDuyuru.baslik}</h2>
                  </div>
                  <span onClick={() => setSeciliDuyuru(null)} className="text-white/40 hover:text-white text-2xl cursor-pointer ml-4">×</span>
                </div>

                <div className="p-6 md:p-8 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-4">
                  {seciliDuyuru.gorsel_url && (
                    <img
                      src={seciliDuyuru.gorsel_url}
                      alt={seciliDuyuru.baslik}
                      className="w-full max-h-72 object-cover rounded border border-white/5"
                    />
                  )}
                  <div className="w-full h-px bg-white/5" />
                  <p className="text-white/70 text-xs md:text-sm leading-relaxed tracking-wide">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {seciliDuyuru.icerik}
          </ReactMarkdown>
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}} />
    </main>
  )
}