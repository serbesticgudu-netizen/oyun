'use client'

import { ayFaziniHesapla, AyFazi } from '@/lib/ay'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Profil = { rol: string; email: string; is_admin: boolean }
type Karakter = {
  id: string; karakter_adi: string; tur: string; koken: string
  koken_hikayesi: string; gucler: string; zayifliklar: string
  motivasyon: string; durum: string; gorsel_url: string
}

export default function Portal() {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [karakter, setKarakter] = useState<Karakter | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [ayFazi, setAyFazi] = useState<AyFazi | null>(null)
  const [aktifPanel, setAktifPanel] = useState<'hikaye' | 'gucler' | 'motivasyon'>('hikaye')
  const [isEditing, setIsEditing] = useState(false)
  const [editedKarakter, setEditedKarakter] = useState<Partial<Karakter> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [okunmamis, setOkunmamis] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/giris'; return }
      const { data: p } = await supabase.from('profiles').select('rol, email, is_admin').eq('id', user.id).single()
      if (!p) { setYukleniyor(false); return }
      if (p.rol === 'aday') { window.location.href = '/karakter'; return }
      setProfil(p)
      const { data: k } = await supabase.from('karakterler').select('*').eq('kullanici_id', user.id).single()
      setKarakter(k)
      setAyFazi(ayFaziniHesapla())
      setYukleniyor(false)
      const { count } = await supabase
  .from('private_mesajlar')
  .select('*', { count: 'exact', head: true })
  .eq('alici_id', user.id)
  .eq('okundu', false)
setOkunmamis(count ?? 0)
    }
    yukle()
  }, [])

  async function cikisYap() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function handleEditToggle() {
    if (!isEditing) {
      setEditedKarakter(karakter)
    } else {
      setEditedKarakter(null)
    }
    setIsEditing(!isEditing)
  }

  async function handleSave() {
    if (!editedKarakter || !karakter) return
    setIsSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('karakterler')
      .update({
        tur: editedKarakter.tur,
        koken: editedKarakter.koken,
        koken_hikayesi: editedKarakter.koken_hikayesi,
        gucler: editedKarakter.gucler,
        zayifliklar: editedKarakter.zayifliklar,
        motivasyon: editedKarakter.motivasyon,
      })
      .eq('id', karakter.id)
      .select()
      .single()

    if (error) {
      alert('Kaydederken bir hata oluştu: ' + error.message)
    } else if (data) {
      setKarakter(data as Karakter)
      setIsEditing(false)
    }
    setIsSaving(false)
  }

  if (yukleniyor) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/20 text-xs tracking-widest uppercase">Geçit açılıyor...</p>
    </main>
  )

  if (profil?.rol === 'ziyaretci') return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover' }}>
      <div className="fixed inset-0 bg-black/80" />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-lg px-8">
        <p className="text-white/50 text-sm tracking-wider leading-relaxed">
          Henüz Theia Kabilesi Oyun Arkadaşı Adaylığınızı Gözden Geçirmemiştir.<br />
          Bu Süreçte Theia Arşivlerini İnceleyebilirsiniz.
        </p>
        <Link href="/arsiv" className="border border-white/20 text-white/60 px-8 py-3 text-xs tracking-widest uppercase hover:border-white/40 transition-all">Arşive Git</Link>
        <button onClick={cikisYap} className="text-white/20 text-xs tracking-widest uppercase hover:text-white/40 transition-all">Çıkış Yap</button>
      </div>
    </main>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col">

      {/* Arka plan */}
      <div className="fixed inset-0 opacity-15"
        style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="fixed inset-0 bg-black/82" />
      <div className="fixed top-0 left-0 right-0 h-px z-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)' }} />

      {/* HEADER */}
      <header className="relative z-10 shrink-0 flex flex-wrap items-center gap-3 px-4 md:px-6 py-3 border-b border-white/5">

        {ayFazi && (
          <div className={`flex items-center gap-2 px-3 py-1.5 border text-xs ${
            ayFazi.dolunayMi ? 'border-yellow-400/30 text-yellow-300/70'
            : ayFazi.yeniAyMi ? 'border-white/5 text-white/20'
            : 'border-fuchsia-500/10 text-fuchsia-300/40'
          }`}>
            <span className="text-base">{ayFazi.sembol}</span>
            <span className="tracking-widest uppercase text-xs">{ayFazi.isim}</span>
            {ayFazi.dolunayMi && <span className="text-yellow-400/60 animate-pulse ml-1 hidden sm:inline">◈ Geçitler Açık</span>}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 md:gap-4 flex-wrap justify-end">
          <Link href="/gorevler"
            className="flex items-center gap-1.5 text-cyan-400/40 text-xs tracking-widest uppercase hover:text-cyan-400 transition-all group">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 group-hover:bg-cyan-400 transition-all" />
            <span>Görevler</span>
          </Link>
          <Link href="/arsiv/kisisel"
            className="flex items-center gap-1.5 text-violet-400/40 text-xs tracking-widest uppercase hover:text-violet-400 transition-all group">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400/30 group-hover:bg-violet-400 transition-all" />
            <span>Hafıza</span>
          </Link>
          <Link href="/harita"
            className="flex items-center gap-1.5 text-green-400/40 text-xs tracking-widest uppercase hover:text-green-400 transition-all group">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400/40 group-hover:bg-green-400 transition-all" />
            <span>Harita</span>
          </Link>
          {(profil?.rol === 'kabileli' || profil?.is_admin) && (
            <Link href="/oyun-arkadaslari" className="flex items-center gap-1.5 text-indigo-400/40 text-xs tracking-widest uppercase hover:text-indigo-400 transition-all group">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/30 group-hover:bg-indigo-400 transition-all" />
              <span>Arkadaşlar</span>
            </Link>
          )}
          <Link href="/arsiv"
            className="flex items-center gap-2 text-fuchsia-400/50 text-xs tracking-widest uppercase hover:text-fuchsia-400 transition-all border border-fuchsia-400/20 hover:border-fuchsia-400/50 px-3 py-1.5">
            <span>✦</span>
            <span className="hidden sm:inline">Kadim </span>Arşiv
          </Link>
<Link href="/chat"
  className="relative flex items-center gap-2 text-rose-400/40 text-xs tracking-widest uppercase hover:text-rose-400 transition-all border border-rose-400/15 hover:border-rose-400/40 px-3 py-1.5">
  <span>◈</span>
  <span className="hidden sm:inline">Sesler</span>
  {okunmamis > 0 && (
    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ background: '#e879f9', color: '#000', fontSize: '9px', boxShadow: '0 0 8px rgba(232,121,249,0.8)' }}>
      {okunmamis > 9 ? '9+' : okunmamis}
    </span>
  )}
</Link>
          <Link href="/magaza"
            className="flex items-center gap-2 text-amber-400/40 text-xs tracking-widest uppercase hover:text-amber-400 transition-all border border-amber-400/15 hover:border-amber-400/40 px-3 py-1.5">
            <span>◈</span>
            <span className="hidden sm:inline">Mağaza</span>
          </Link>
          {profil?.is_admin && (
            <Link href="/admin" className="text-violet-400/40 text-xs tracking-widest uppercase hover:text-violet-400 transition-all">Yönetim</Link>
          )}
          <button onClick={cikisYap} className="text-white/15 text-xs tracking-widest uppercase hover:text-white/40 transition-all">Çıkış</button>
        </div>
      </header>

      {/* ANA ALAN */}
      <div className="relative z-10 flex flex-col md:flex-row flex-1">

        {/* SOL — Görsel */}
        <div className="relative shrink-0 w-full md:w-64 xl:w-80 h-[45vw] md:h-auto md:min-h-screen">
          {karakter?.gorsel_url ? (
            <>
              <img src={karakter.gorsel_url} alt={karakter.karakter_adi}
                className="absolute inset-0 w-full h-full object-cover object-top md:object-contain md:object-bottom" />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to right, transparent 40%, rgba(0,0,0,0.98) 100%)' }} />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 30%)' }} />
              {/* Mobilde alt fade */}
              <div className="absolute inset-0 md:hidden"
                style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.95) 100%)' }} />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-fuchsia-400/10 text-6xl">✦</span>
            </div>
          )}
        </div>

        {/* SAĞ — İçerik */}
        <div className="flex-1 flex flex-col px-5 md:px-8 py-6 gap-4 min-w-0">

          {/* Karakter başlık */}
          {karakter ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <h1 className="text-3xl md:text-4xl font-thin tracking-[0.2em] uppercase text-white flex-1"
                  style={{ textShadow: ayFazi?.dolunayMi ? '0 0 30px rgba(250,204,21,0.5)' : '0 0 30px rgba(168,85,247,0.4)' }}>
                  {karakter.karakter_adi}
                </h1>
                <div className="flex items-center gap-4 flex-wrap">
                  {isEditing && editedKarakter ? (
                    <>
                      <input value={editedKarakter.tur || ''} onChange={e => setEditedKarakter({ ...editedKarakter, tur: e.target.value })} placeholder="Tür" className="bg-black/30 border border-white/20 px-2 py-1 text-white/60 text-xs tracking-widest" />
                      <input value={editedKarakter.koken || ''} onChange={e => setEditedKarakter({ ...editedKarakter, koken: e.target.value })} placeholder="Köken" className="bg-black/30 border border-white/20 px-2 py-1 text-white/60 text-xs tracking-widest" />
                    </>
                  ) : (
                    <>
                      {karakter.tur && <span className="text-white/20 text-xs tracking-widest">{karakter.tur}</span>}
                      {karakter.koken && <span className="text-cyan-400/30 text-xs tracking-widest">{karakter.koken}</span>}
                    </>
                  )}
                  <span className={`flex items-center gap-1.5 text-xs tracking-widest uppercase ${
                    karakter.durum === 'tamamlandi' ? 'text-emerald-400/60' : 'text-amber-400/50'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${karakter.durum === 'tamamlandi' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    {karakter.durum === 'tamamlandi' ? 'Hazır' : 'Beklemede'}
                  </span>
                </div>
                {profil?.is_admin && (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={handleSave} disabled={isSaving} className="border border-emerald-500/50 text-emerald-400/80 px-3 py-1 text-xs tracking-widest uppercase hover:bg-emerald-500/10 disabled:opacity-50 transition-all">
                          {isSaving ? '...' : 'Kaydet'}
                        </button>
                        <button onClick={handleEditToggle} className="border border-rose-500/50 text-rose-400/80 px-3 py-1 text-xs tracking-widest uppercase hover:bg-rose-500/10 transition-all">
                          İptal
                        </button>
                      </>
                    ) : (
                      <button onClick={handleEditToggle} className="border border-white/20 text-white/60 px-3 py-1 text-xs tracking-widest uppercase hover:border-white/40 hover:text-white transition-all">Düzenle</button>
                    )}
                  </div>
                )}
              </div>

              {/* Tab seçici */}
              <div className="flex gap-0 border-b border-white/5 overflow-x-auto">
                {([
                  { key: 'hikaye', label: 'Köken', renk: 'fuchsia' },
                  { key: 'gucler', label: 'Güçler', renk: 'cyan' },
                  { key: 'motivasyon', label: 'Motivasyon', renk: 'amber' },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setAktifPanel(t.key)}
                    className={`px-4 py-2 text-xs tracking-widest uppercase transition-all border-b-2 whitespace-nowrap ${
                      aktifPanel === t.key
                        ? t.renk === 'fuchsia' ? 'text-fuchsia-400/80 border-fuchsia-400/50'
                        : t.renk === 'cyan' ? 'text-cyan-400/80 border-cyan-400/50'
                        : 'text-amber-400/80 border-amber-400/50'
                        : 'text-white/20 border-transparent hover:text-white/40'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab içerik */}
              <div className="flex-1 py-2 overflow-y-auto">
                {aktifPanel === 'hikaye' && (
                  isEditing && editedKarakter ? (
                    <textarea
                      value={editedKarakter.koken_hikayesi || ''}
                      onChange={e => setEditedKarakter({ ...editedKarakter, koken_hikayesi: e.target.value })}
                      className="w-full max-w-2xl h-48 bg-black/30 border border-fuchsia-500/30 p-3 text-white/60 text-sm leading-relaxed focus:outline-none focus:border-fuchsia-500/60 transition-all"
                      placeholder="Köken hikayesi..."
                    />
                  ) : (
                    karakter.koken_hikayesi && <p className="text-white/40 text-sm leading-relaxed max-w-2xl whitespace-pre-line">{karakter.koken_hikayesi}</p>
                  )
                )}
                {aktifPanel === 'gucler' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 max-w-2xl">
                    {isEditing && editedKarakter ? (
                      <>
                        <div>
                          <p className="text-cyan-400/30 text-xs tracking-[0.4em] uppercase mb-3">Güçler</p>
                          <textarea value={editedKarakter.gucler || ''} onChange={e => setEditedKarakter({ ...editedKarakter, gucler: e.target.value })} className="w-full h-32 bg-black/30 border border-cyan-500/30 p-3 text-white/60 text-xs leading-relaxed focus:outline-none focus:border-cyan-500/60 transition-all" placeholder="Güçler..." />
                        </div>
                        <div>
                          <p className="text-rose-400/30 text-xs tracking-[0.4em] uppercase mb-3">Zayıflıklar</p>
                          <textarea value={editedKarakter.zayifliklar || ''} onChange={e => setEditedKarakter({ ...editedKarakter, zayifliklar: e.target.value })} className="w-full h-32 bg-black/30 border border-rose-500/30 p-3 text-white/60 text-xs leading-relaxed focus:outline-none focus:border-rose-500/60 transition-all" placeholder="Zayıflıklar..." />
                        </div>
                      </>
                    ) : (
                      <>
                        {karakter.gucler && (
                          <div>
                            <p className="text-cyan-400/30 text-xs tracking-[0.4em] uppercase mb-3">Güçler</p>
                            <p className="text-white/40 text-xs leading-relaxed whitespace-pre-line">{karakter.gucler}</p>
                          </div>
                        )}
                        {karakter.zayifliklar && (
                          <div>
                            <p className="text-rose-400/30 text-xs tracking-[0.4em] uppercase mb-3">Zayıflıklar</p>
                            <p className="text-white/40 text-xs leading-relaxed whitespace-pre-line">{karakter.zayifliklar}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {aktifPanel === 'motivasyon' && (
                  isEditing && editedKarakter ? (
                    <textarea value={editedKarakter.motivasyon || ''} onChange={e => setEditedKarakter({ ...editedKarakter, motivasyon: e.target.value })} className="w-full max-w-2xl h-32 bg-black/30 border border-amber-500/30 p-3 text-white/60 text-sm leading-relaxed italic focus:outline-none focus:border-amber-500/60 transition-all" placeholder="Motivasyon..." />
                  ) : (
                    karakter.motivasyon && <p className="text-white/40 text-sm leading-relaxed italic max-w-2xl whitespace-pre-line">{karakter.motivasyon}</p>
                  )
                )}
              </div>

              {/* Alt bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-white/5">
                <div className="flex flex-col gap-1">
                  <p className="text-violet-400/25 text-xs tracking-[0.4em] uppercase">Oyun Anıları</p>
                  <p className="text-white/15 text-xs tracking-wider">Henüz Oyun oynamamışsın.</p>
                </div>
                {ayFazi?.dolunayMi && (
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <span className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />
                    <p className="text-yellow-400/50 text-xs tracking-wider italic">
                      Theia tam uyanık — Geçitler açık
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center">
              <Link href="/karakter" className="text-fuchsia-400/40 text-xs tracking-widest uppercase hover:text-fuchsia-400 transition-all">
                Karakterini Oluştur →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}