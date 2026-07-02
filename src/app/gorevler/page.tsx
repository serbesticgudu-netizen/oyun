'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Gorev = {
  id: string
  isim: string
  mitolojik_gecmis: string
  fiziksel_gecmis: string
  durum: 'uyku' | 'aktif' | 'kapali'
  simge: string
}
type Kabul = {
  gorev_id: string
  durum: string
}

type GorevKatilimi = {
  gorev_id: string
  durum: string
  kullanici_id: string
  profiles: {
    email: string
  } | null
}

type Profil = {
  is_admin: boolean
}

function normalizeKatilim(katilim: any): GorevKatilimi {
  return {
    gorev_id: katilim.gorev_id,
    durum: katilim.durum,
    kullanici_id: katilim.kullanici_id,
    profiles: Array.isArray(katilim.profiles)
      ? katilim.profiles[0] ?? null
      : katilim.profiles ?? null,
  }
}

export default function Gorevler() {
  const [gorevler, setGorevler] = useState<Gorev[]>([])
  const [kabuller, setKabuller] = useState<Kabul[]>([])
  const [tumKabuller, setTumKabuller] = useState<GorevKatilimi[]>([])
  const [acik, setAcik] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islem, setIslem] = useState<string | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [editingGorev, setEditingGorev] = useState<Partial<Gorev> | null>(null)
  const [isFormSaving, setIsFormSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/giris'; return }

      const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      setProfil(p)

      const { data: g } = await supabase
        .from('gecit_noktalari')
        .select('*')
        .eq('tip', 'gorev')
        .order('isim')

      const { data: allK } = await supabase
        .from('gorev_kabulleri')
        .select('gorev_id, durum, kullanici_id, profiles(email)')

      const normalizedKabuller = (allK ?? []).map(normalizeKatilim)
      const myKabuller = normalizedKabuller.filter(k => k.kullanici_id === user.id).map(k => ({ gorev_id: k.gorev_id, durum: k.durum }))

      setGorevler(g ?? [])
      setTumKabuller(normalizedKabuller)
      setKabuller(myKabuller)
      setYukleniyor(false)
    }
    yukle()
  }, [])

  async function gorevKabul(gorevId: string) {
    setIslem(gorevId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: yeniKabul, error } = await supabase.from('gorev_kabulleri').upsert({
      kullanici_id: user.id,
      gorev_id: gorevId,
      durum: 'aktif'
    }).select('*, profiles(email)').single()

    if (error) {
      alert('Görev kabul edilirken bir hata oluştu: ' + error.message)
      setIslem(null)
      return
    }

    if (yeniKabul) {
      await supabase.from('kisisel_arsiv').insert({
        kullanici_id: user.id,
        tip: 'gorev',
        baslik: `Görev kabul edildi`,
        aciklama: gorevler.find(g => g.id === gorevId)?.isim ?? '',
        referans_id: gorevId,
      })

      setKabuller(prev => {
        if (prev.some(k => k.gorev_id === gorevId)) return prev
        return [...prev, { gorev_id: gorevId, durum: 'aktif' }]
      })

      const normalizedYeniKabul = normalizeKatilim(yeniKabul)
      setTumKabuller(prev => [...prev.filter(k => !(k.kullanici_id === user.id && k.gorev_id === gorevId)), normalizedYeniKabul])
    }
    setIslem(null)
  }

  function handleEdit(gorev: Gorev) {
    setEditingGorev({ ...gorev })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!editingGorev) return
    setIsFormSaving(true)
    const supabase = createClient()

    const gorevData = {
      isim: editingGorev.isim,
      mitolojik_gecmis: editingGorev.mitolojik_gecmis,
      fiziksel_gecmis: editingGorev.fiziksel_gecmis,
      durum: editingGorev.durum,
      simge: editingGorev.simge,
      tip: 'gorev',
      // Harita noktası için zorunlu alanlar, görevler için şimdilik varsayılan olabilir
      koordinat_lat: (editingGorev as any).koordinat_lat || 0,
      koordinat_lng: (editingGorev as any).koordinat_lng || 0,
    }

    const { data, error } = editingGorev.id
      ? await supabase.from('gecit_noktalari').update(gorevData).eq('id', editingGorev.id).select().single()
      : await supabase.from('gecit_noktalari').insert(gorevData).select().single()

    if (error) {
      alert('Hata: ' + error.message)
    } else if (data) {
      const newGorev = data as Gorev
      if (editingGorev.id) {
        setGorevler(prev => prev.map(g => g.id === newGorev.id ? newGorev : g))
      } else {
        setGorevler(prev => [...prev, newGorev].sort((a, b) => a.isim.localeCompare(b.isim)))
      }
      setEditingGorev(null)
    }
    setIsFormSaving(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return

    // İlgili kabulleri de silmek gerekebilir, RLS ile cascade delete ayarlanabilir.
    // Şimdilik sadece görevi siliyoruz.
    const supabase = createClient()
    const { error } = await supabase.from('gecit_noktalari').delete().eq('id', id)

    if (error) {
      alert('Hata: ' + error.message)
    } else {
      setGorevler(prev => prev.filter(g => g.id !== id))
      if (editingGorev?.id === id) {
        setEditingGorev(null)
      }
    }
  }

  const kabulEdildi = (id: string) => kabuller.some(k => k.gorev_id === id)

  const tamamlananGorevIds = new Set(tumKabuller.filter(k => k.durum === 'tamamlandi').map(k => k.gorev_id))

  const yapilacakGorevler = gorevler.filter(g => !tamamlananGorevIds.has(g.id))
  const tamamlananGorevler = gorevler.filter(g => tamamlananGorevIds.has(g.id))


  if (yukleniyor) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/20 text-xs tracking-widest uppercase">Görevler yükleniyor...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black relative overflow-x-hidden">
      <div className="fixed inset-0 opacity-20"
        style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="fixed inset-0 bg-black/80" />
      <div className="fixed top-0 left-0 right-0 h-px z-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-16 flex flex-col gap-12">

        {/* Başlık */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-cyan-400/30 text-xs tracking-[0.5em] uppercase">Theia Kabilesi</p>
            <h1 className="text-white text-4xl font-thin tracking-[0.3em] uppercase"
              style={{ textShadow: '0 0 30px rgba(34,211,238,0.3)' }}>
              Görevler
            </h1>
            <p className="text-white/20 text-sm tracking-wider">
              {kabuller.length > 0 ? `${kabuller.length} görev kabul edildi` : 'Bir görevi kabul etmek için tıkla'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {profil?.is_admin && !editingGorev && (
              <button
                onClick={() => setEditingGorev({ isim: '', mitolojik_gecmis: '', durum: 'uyku', simge: '⬡' })}
                className="border border-emerald-500/50 text-emerald-400/80 px-3 py-1.5 text-xs tracking-widest uppercase hover:bg-emerald-500/10 transition-all"
              >
                + Yeni Görev
              </button>
            )}
            <Link href="/portal" className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all">
              ← Portal
            </Link>
          </div>
        </div>

        {/* DÜZENLEME FORMU */}
        {editingGorev && (
          <div className="flex flex-col gap-4 border border-fuchsia-500/30 p-6 bg-black/40 rounded-lg">
            <h2 className="text-white tracking-widest uppercase">{editingGorev.id ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input value={editingGorev.isim} onChange={e => setEditingGorev({ ...editingGorev, isim: e.target.value })} placeholder="Görev Adı" className="bg-black/30 border border-white/20 p-2 text-white" />
              <input value={editingGorev.simge} onChange={e => setEditingGorev({ ...editingGorev, simge: e.target.value })} placeholder="Simge (Emoji)" className="bg-black/30 border border-white/20 p-2 text-white" />
              <select value={editingGorev.durum} onChange={e => setEditingGorev({ ...editingGorev, durum: e.target.value as Gorev['durum'] })} className="bg-black/30 border border-white/20 p-2 text-white">
                <option value="uyku">Uykuda</option>
                <option value="aktif">Aktif</option>
                <option value="kapali">Kapalı</option>
              </select>
            </div>
            <textarea value={editingGorev.mitolojik_gecmis} onChange={e => setEditingGorev({ ...editingGorev, mitolojik_gecmis: e.target.value })} placeholder="Görev Tanımı (Mitolojik Geçmiş)" rows={4} className="bg-black/30 border border-white/20 p-2 text-white w-full resize-y" />
            <textarea value={editingGorev.fiziksel_gecmis} onChange={e => setEditingGorev({ ...editingGorev, fiziksel_gecmis: e.target.value })} placeholder="Fiziksel Konum / İpucu" rows={2} className="bg-black/30 border border-white/20 p-2 text-white w-full resize-y" />
            <div className="flex gap-2 justify-end">
              {editingGorev.id && (
                <button onClick={() => handleDelete(editingGorev.id!)} disabled={isFormSaving} className="border border-rose-500/50 text-rose-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-rose-500/10 disabled:opacity-50">
                  Sil
                </button>
              )}
              <button onClick={() => setEditingGorev(null)} disabled={isFormSaving} className="border border-white/20 text-white/60 px-4 py-2 text-xs tracking-widest uppercase hover:bg-white/10">
                İptal
              </button>
              <button onClick={handleSave} disabled={isFormSaving} className="border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 disabled:opacity-50">
                {isFormSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        )}


        {/* Görev kartları */}
        {yapilacakGorevler.length === 0 && tamamlananGorevler.length === 0 ? (
          <p className="text-white/20 text-center tracking-widest uppercase text-sm py-20">
            Henüz görev eklenmemiş.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {yapilacakGorevler.map(gorev => {
              const kabul = kabulEdildi(gorev.id)
              const acikMi = acik === gorev.id
              const kabulEdenler = tumKabuller.filter(k => k.gorev_id === gorev.id && k.durum === 'aktif')

              return (
                <div key={gorev.id}
                  onClick={() => {
                    if (!kabul) {
                      if (gorev.durum === 'kapali') {
                        if (!window.confirm(`Bu görev ${kabulEdenler.length} kullanıcı tarafından seçilmiş durumda, siz de bu görevi kendiniz için aktifleştirmek istediğinize emin misiniz?`)) {
                          return
                        }
                      }
                      gorevKabul(gorev.id)
                    }
                    setAcik(acikMi ? null : gorev.id)
                  }}
                  className="relative cursor-pointer transition-all duration-500 group"
                  style={{ perspective: '1000px' }}>

                  <div className="relative transition-all duration-500"
                    style={{
                      transform: acikMi ? 'rotateY(0deg) scale(1.02)' : 'rotateY(0deg)',
                      transformStyle: 'preserve-3d',
                    }}>

                    {/* Kart */}
                    <div className="relative overflow-hidden"
                      style={{
                        background: acikMi
                          ? 'linear-gradient(135deg, rgba(34,211,238,0.08) 0%, rgba(0,0,0,0.9) 100%)'
                          : 'rgba(0,0,0,0.6)',
                        border: `1px solid ${acikMi ? 'rgba(34,211,238,0.4)' : kabul ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        boxShadow: acikMi
                          ? '0 0 40px rgba(34,211,238,0.2), 0 0 80px rgba(34,211,238,0.08), inset 0 0 30px rgba(34,211,238,0.05)'
                          : 'none',
                        transition: 'all 0.4s ease',
                        minHeight: acikMi ? '280px' : '180px',
                      }}>

                      {/* Hover glow efekti */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{ boxShadow: 'inset 0 0 40px rgba(34,211,238,0.08)' }} />

                      {/* Üst kenar ışığı */}
                      <div className="absolute top-0 left-0 right-0 h-px transition-all duration-300"
                        style={{
                          background: acikMi
                            ? 'linear-gradient(90deg, transparent, rgba(34,211,238,0.8), transparent)'
                            : kabul
                            ? 'linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)'
                            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                        }} />

                      <div className="p-6 flex flex-col gap-4">

                        {/* Kapalı görünüm — ters yüz efekti */}
                        {!acikMi && (
                          <div className="flex flex-col items-center justify-center py-6 gap-4">
                            <span className="text-4xl opacity-30 group-hover:opacity-60 transition-all duration-300"
                              style={{ filter: 'blur(0px)', transform: 'scaleX(-1)' }}>
                              {gorev.simge}
                            </span>
                            <div className="flex flex-col items-center gap-2">
                              <p className="text-white/20 text-xs tracking-[0.4em] uppercase group-hover:text-white/40 transition-all">
                                {kabul ? '⬡ Kabul Edildi' : '⬡ Görev'}
                              </p>
                              <p className="text-white/10 text-xs tracking-widest text-center group-hover:text-white/20 transition-all">
                                Açmak için tıkla
                              </p>
                              {kabulEdenler.length > 0 && (
                                <p className="text-cyan-400/30 text-xs mt-2">{kabulEdenler.length} kullanıcı için aktif</p>
                              )}
                            </div>

                            {profil?.is_admin && !editingGorev && (
                              <div className="absolute top-2 right-2 z-10 flex gap-1">
                                <button onClick={(e) => { e.stopPropagation(); handleEdit(gorev); }} className="text-cyan-400/60 hover:text-cyan-400 text-xs uppercase tracking-widest p-1 bg-black/50 rounded">
                                  Düzenle
                                </button>
                              </div>
                            )}
                            {/* Kabul rozeti */}
                            {kabul && (
                              <div className="absolute top-3 right-3">
                                <span className="text-cyan-400/60 text-xs tracking-widest px-2 py-0.5 border border-cyan-400/20">
                                  AKTİF
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Açık görünüm */}
                        {acikMi && (
                          <div className="flex flex-col gap-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-cyan-400/50 text-xs tracking-[0.4em] uppercase">⬡ Görev</span>
                                <h3 className="text-white text-lg tracking-wider">{gorev.isim}</h3>
                              </div>
                              <span className="text-3xl opacity-40 shrink-0">{gorev.simge}</span>
                            </div>

                            <div className="h-px"
                              style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.3), transparent)' }} />

                            <div className="flex flex-col gap-3">
                              <p className="text-cyan-400/30 text-xs tracking-[0.3em] uppercase">Görev Tanımı</p>
                              <p className="text-white/60 text-sm leading-relaxed">{gorev.mitolojik_gecmis}</p>
                            </div>

                            {gorev.fiziksel_gecmis && (
                              <div className="flex flex-col gap-2">
                                <p className="text-white/20 text-xs tracking-[0.3em] uppercase">Fiziksel Konum</p>
                                <p className="text-white/40 text-xs leading-relaxed">{gorev.fiziksel_gecmis}</p>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                                style={{ boxShadow: '0 0 6px rgba(34,211,238,0.8)' }} />
                              <span className="text-cyan-400/60 text-xs tracking-widest uppercase">
                                {islem === gorev.id ? 'Kaydediliyor...' : 'Görev Kabul Edildi'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAMAMLANMIŞ GÖREVLER */}
        {tamamlananGorevler.length > 0 && (
          <>
            <div className="flex items-center gap-4 mt-16">
              <h2 className="text-white/40 text-lg tracking-widest uppercase">Tamamlanmış Görevler</h2>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tamamlananGorevler.map(gorev => {
                const tamamlayanlar = tumKabuller.filter(k => k.gorev_id === gorev.id && k.durum === 'tamamlandi')
                return (
                  <div key={gorev.id} className="relative border border-emerald-500/20 bg-black/60 p-6 flex flex-col gap-4 opacity-70">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-emerald-400/50 text-xs tracking-[0.4em] uppercase">✓ Tamamlandı</span>
                        <h3 className="text-white/70 text-lg tracking-wider">{gorev.isim}</h3>
                      </div>
                      <span className="text-3xl opacity-20 shrink-0">{gorev.simge}</span>
                    </div>
                    <div className="h-px bg-emerald-500/20" />
                    <div className="flex flex-col gap-1">
                      <p className="text-white/30 text-xs tracking-widest uppercase">Tamamlayanlar</p>
                      <p className="text-white/50 text-sm">{tamamlayanlar.map(k => k.profiles?.email || 'Bilinmeyen').join(', ')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        .group:hover > div > div {
          transform: translateY(-4px) scale(1.02);
        }
      `}</style>
    </main>
  )
}