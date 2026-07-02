'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Urun = {
  id: string
  isim: string
  aciklama: string
  fiyat: number
  para_birimi: string
  tip: 'fiziksel' | 'dijital'
  gorsel_url: string | null
  stok: number
}

type SepetItem = { urun: Urun; miktar: number }

const tipStil = {
  fiziksel: { renk: '#a855f7', etiket: 'Fiziksel', ikon: '◈' },
  dijital:  { renk: '#22d3ee', etiket: 'Dijital',  ikon: '✦' },
}

export default function Magaza() {
  const [urunler, setUrunler] = useState<Urun[]>([])
  const [sepet, setSepet] = useState<SepetItem[]>([])
  const [adim, setAdim] = useState<'magaza' | 'sepet' | 'form' | 'tamam'>('magaza')
  const [filtre, setFiltre] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [gonderiyor, setGonderiyor] = useState(false)
  const [form, setForm] = useState({ ad_soyad: '', email: '', telefon: '', adres: '', notlar: '' })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('magaza_urunleri').select('*').eq('aktif', true).order('sira')
      .then(({ data }) => { setUrunler(data ?? []); setYukleniyor(false) })
  }, [])

  function sepeteEkle(urun: Urun) {
    setSepet(prev => {
      const var_ = prev.find(s => s.urun.id === urun.id)
      if (var_) return prev.map(s => s.urun.id === urun.id ? { ...s, miktar: s.miktar + 1 } : s)
      return [...prev, { urun, miktar: 1 }]
    })
  }

  function sepettenCikar(id: string) {
    setSepet(prev => prev.filter(s => s.urun.id !== id))
  }

  function miktar(id: string, delta: number) {
    setSepet(prev => prev.map(s => s.urun.id === id
      ? { ...s, miktar: Math.max(1, s.miktar + delta) } : s))
  }

  const toplam = sepet.reduce((acc, s) => acc + s.urun.fiyat * s.miktar, 0)
  const sepetSayisi = sepet.reduce((acc, s) => acc + s.miktar, 0)
  const fizikselVarMi = sepet.some(s => s.urun.tip === 'fiziksel')

  async function siparisGonder() {
    if (!form.ad_soyad || !form.email) return
    setGonderiyor(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await Promise.all(sepet.map(s =>
      supabase.from('siparisler').insert({
        kullanici_id: user?.id ?? null,
        urun_id: s.urun.id,
        urun_isim: s.urun.isim,
        fiyat: s.urun.fiyat,
        miktar: s.miktar,
        ad_soyad: form.ad_soyad,
        email: form.email,
        telefon: form.telefon,
        adres: fizikselVarMi ? form.adres : null,
        notlar: form.notlar,
      })
    ))

    setGonderiyor(false)
    setAdim('tamam')
  }

  const filtrelenmis = filtre ? urunler.filter(u => u.tip === filtre) : urunler

  if (yukleniyor) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/20 text-xs tracking-widest uppercase">Mağaza yükleniyor...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black relative">
      <div className="fixed inset-0 opacity-15"
        style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover' }} />
      <div className="fixed inset-0 bg-black/85" />
      <div className="fixed top-0 left-0 right-0 h-px z-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12 flex flex-col gap-10">

        {/* Başlık */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-fuchsia-400/30 text-xs tracking-[0.5em] uppercase">Tiyatro Theia</p>
            <h1 className="text-white text-4xl font-thin tracking-[0.3em] uppercase"
              style={{ textShadow: '0 0 30px rgba(168,85,247,0.3)' }}>
              Kabile Mağazası
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {sepetSayisi > 0 && (
              <button onClick={() => setAdim('sepet')}
                className="flex items-center gap-3 border border-fuchsia-400/30 px-5 py-2.5 text-xs tracking-widest uppercase text-fuchsia-300/70 hover:border-fuchsia-400/60 hover:text-fuchsia-300 transition-all">
                <span>Sepet</span>
                <span className="bg-fuchsia-400/20 text-fuchsia-300 px-2 py-0.5 text-xs">{sepetSayisi}</span>
              </button>
            )}
            <Link href="/portal" className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all">← Portal</Link>
          </div>
        </div>

        {/* MAĞAZA */}
        {adim === 'magaza' && (
          <>
            {/* Filtre */}
            <div className="flex gap-3">
              {[null, 'fiziksel', 'dijital'].map(f => (
                <button key={String(f)} onClick={() => setFiltre(f)}
                  className={`px-5 py-2 text-xs tracking-widest uppercase border transition-all ${
                    filtre === f ? 'border-white/40 text-white bg-white/5' : 'border-white/10 text-white/30 hover:border-white/30'
                  }`}>
                  {f === null ? 'Tümü' : f === 'fiziksel' ? '◈ Fiziksel' : '✦ Dijital'}
                </button>
              ))}
            </div>

            {/* Ürün grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtrelenmis.map(urun => {
                const stil = tipStil[urun.tip]
                const sepette = sepet.find(s => s.urun.id === urun.id)

                return (
                  <div key={urun.id}
                    className="relative flex flex-col overflow-hidden group transition-all duration-300"
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      border: `1px solid rgba(255,255,255,0.06)`,
                    }}>

                    {/* Üst ışık çizgisi */}
                    <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-all duration-300"
                      style={{ background: `linear-gradient(90deg, transparent, ${stil.renk}60, transparent)` }} />

                    {/* Görsel veya placeholder */}
                    <div className="relative h-48 overflow-hidden flex items-center justify-center"
                      style={{ background: `radial-gradient(ellipse at center, ${stil.renk}08 0%, transparent 70%)` }}>
                      {urun.gorsel_url ? (
                        <img src={urun.gorsel_url} alt={urun.isim} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-all" />
                      ) : (
                        <span className="text-5xl opacity-10 group-hover:opacity-20 transition-all"
                          style={{ color: stil.renk }}>{stil.ikon}</span>
                      )}
                      <div className="absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />

                      {/* Tip etiketi */}
                      <div className="absolute top-3 left-3">
                        <span className="text-xs tracking-widest uppercase px-2 py-1 border"
                          style={{ color: stil.renk, borderColor: stil.renk + '40', background: 'rgba(0,0,0,0.7)' }}>
                          {stil.ikon} {stil.etiket}
                        </span>
                      </div>
                    </div>

                    {/* İçerik */}
                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <h3 className="text-white text-base tracking-wider">{urun.isim}</h3>
                      <p className="text-white/40 text-xs leading-relaxed flex-1">{urun.aciklama}</p>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <span className="text-white/70 text-sm tracking-wider">
                          {urun.fiyat.toLocaleString('tr-TR')} ₺
                        </span>
                        <button
                          onClick={() => sepeteEkle(urun)}
                          className="text-xs tracking-widest uppercase px-4 py-2 border transition-all"
                          style={{
                            borderColor: sepette ? stil.renk + '60' : 'rgba(255,255,255,0.15)',
                            color: sepette ? stil.renk : 'rgba(255,255,255,0.5)',
                            background: sepette ? stil.renk + '10' : 'transparent',
                          }}>
                          {sepette ? `Sepette (${sepette.miktar})` : 'Ekle'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* SEPET */}
        {adim === 'sepet' && (
          <div className="flex flex-col gap-6 max-w-2xl">
            <h2 className="text-white text-xl tracking-widest uppercase font-thin">Sepet</h2>

            {sepet.length === 0 ? (
              <p className="text-white/20 text-sm tracking-wider">Sepet boş.</p>
            ) : (
              <>
                {sepet.map(s => (
                  <div key={s.urun.id} className="flex items-center gap-5 border-b border-white/5 pb-5">
                    <div className="w-10 h-10 flex items-center justify-center border border-white/10"
                      style={{ color: tipStil[s.urun.tip].renk }}>
                      <span className="text-lg">{tipStil[s.urun.tip].ikon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white/80 text-sm tracking-wider">{s.urun.isim}</p>
                      <p className="text-white/30 text-xs">{s.urun.fiyat.toLocaleString('tr-TR')} ₺ / adet</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => miktar(s.urun.id, -1)} className="text-white/30 hover:text-white transition-all w-6 h-6 flex items-center justify-center border border-white/10">−</button>
                      <span className="text-white/60 text-sm w-4 text-center">{s.miktar}</span>
                      <button onClick={() => miktar(s.urun.id, 1)} className="text-white/30 hover:text-white transition-all w-6 h-6 flex items-center justify-center border border-white/10">+</button>
                    </div>
                    <span className="text-white/50 text-sm w-20 text-right">
                      {(s.urun.fiyat * s.miktar).toLocaleString('tr-TR')} ₺
                    </span>
                    <button onClick={() => sepettenCikar(s.urun.id)} className="text-white/20 hover:text-white/60 transition-all">×</button>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-white/30 text-xs tracking-widest uppercase">Toplam</span>
                  <span className="text-white text-xl tracking-wider">{toplam.toLocaleString('tr-TR')} ₺</span>
                </div>

                <div className="flex gap-4 mt-4">
                  <button onClick={() => setAdim('magaza')} className="border border-white/10 text-white/30 px-6 py-3 text-xs tracking-widest uppercase hover:border-white/30 transition-all">
                    ← Alışverişe Dön
                  </button>
                  <button onClick={() => setAdim('form')} className="flex-1 border border-fuchsia-400/40 text-fuchsia-300/80 px-6 py-3 text-xs tracking-widest uppercase hover:border-fuchsia-400/70 hover:bg-fuchsia-950/20 transition-all">
                    Siparişi Tamamla →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* SİPARİŞ FORMU */}
        {adim === 'form' && (
          <div className="flex flex-col gap-6 max-w-xl">
            <h2 className="text-white text-xl tracking-widest uppercase font-thin">Teslimat Bilgileri</h2>

            <div className="flex flex-col gap-4">
              {[
                { key: 'ad_soyad', label: 'Ad Soyad', zorunlu: true, placeholder: 'Gaia\'daki adın' },
                { key: 'email', label: 'E-posta', zorunlu: true, placeholder: 'Haberleşme adresi' },
                { key: 'telefon', label: 'Telefon', zorunlu: false, placeholder: 'İsteğe bağlı' },
              ].map(alan => (
                <div key={alan.key} className="flex flex-col gap-1.5">
                  <label className="text-white/30 text-xs tracking-widest uppercase">
                    {alan.label} {alan.zorunlu && <span className="text-fuchsia-400/50">*</span>}
                  </label>
                  <input
                    value={form[alan.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [alan.key]: e.target.value })}
                    placeholder={alan.placeholder}
                    className="bg-transparent border border-white/10 text-white/80 px-4 py-3 text-sm tracking-wider placeholder-white/15 focus:outline-none focus:border-white/30"
                  />
                </div>
              ))}

              {fizikselVarMi && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/30 text-xs tracking-widest uppercase">
                    Adres <span className="text-fuchsia-400/50">*</span>
                  </label>
                  <textarea rows={3}
                    value={form.adres}
                    onChange={e => setForm({ ...form, adres: e.target.value })}
                    placeholder="Teslimat adresi"
                    className="bg-transparent border border-white/10 text-white/80 px-4 py-3 text-sm tracking-wider placeholder-white/15 focus:outline-none focus:border-white/30 resize-none"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-white/30 text-xs tracking-widest uppercase">Notlar</label>
                <textarea rows={2}
                  value={form.notlar}
                  onChange={e => setForm({ ...form, notlar: e.target.value })}
                  placeholder="Kabile'ye iletmek istediğin not"
                  className="bg-transparent border border-white/10 text-white/80 px-4 py-3 text-sm tracking-wider placeholder-white/15 focus:outline-none focus:border-white/30 resize-none"
                />
              </div>
            </div>

            {/* Sipariş özeti */}
            <div className="border border-white/5 p-4 flex flex-col gap-2">
              <p className="text-white/20 text-xs tracking-widest uppercase mb-2">Sipariş Özeti</p>
              {sepet.map(s => (
                <div key={s.urun.id} className="flex justify-between text-xs">
                  <span className="text-white/40">{s.urun.isim} × {s.miktar}</span>
                  <span className="text-white/40">{(s.urun.fiyat * s.miktar).toLocaleString('tr-TR')} ₺</span>
                </div>
              ))}
              <div className="border-t border-white/5 pt-2 flex justify-between">
                <span className="text-white/30 text-xs tracking-widest uppercase">Toplam</span>
                <span className="text-white/70 text-sm">{toplam.toLocaleString('tr-TR')} ₺</span>
              </div>
              <p className="text-white/15 text-xs mt-1">Ödeme bilgileri Theia Kabilesi tarafından ayrıca iletilecektir.</p>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setAdim('sepet')} className="border border-white/10 text-white/30 px-6 py-3 text-xs tracking-widest uppercase hover:border-white/30 transition-all">
                ← Geri
              </button>
              <button onClick={siparisGonder} disabled={gonderiyor || !form.ad_soyad || !form.email}
                className="flex-1 border border-fuchsia-400/40 text-fuchsia-300/80 px-6 py-3 text-xs tracking-widest uppercase hover:border-fuchsia-400/70 hover:bg-fuchsia-950/20 transition-all disabled:opacity-30">
                {gonderiyor ? '...' : 'Siparişi Gönder ◈'}
              </button>
            </div>
          </div>
        )}

        {/* TAMAM */}
        {adim === 'tamam' && (
          <div className="flex flex-col items-center gap-8 text-center py-20">
            <div className="w-16 h-16 border border-fuchsia-400/20 flex items-center justify-center text-3xl text-fuchsia-400/40">
              ✦
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-white text-2xl tracking-widest uppercase font-thin">Sipariş Alındı</h2>
              <p className="text-white/40 text-sm tracking-wider leading-relaxed max-w-md">
                Theia Kabilesi siparişini aldı.<br />
                Ödeme ve teslimat bilgileri {form.email} adresine iletilecek.
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="/portal" className="border border-white/15 text-white/30 px-8 py-3 text-xs tracking-widest uppercase hover:border-white/30 transition-all">
                Portala Dön
              </Link>
              <button onClick={() => { setSepet([]); setAdim('magaza'); setForm({ ad_soyad: '', email: '', telefon: '', adres: '', notlar: '' }) }}
                className="border border-fuchsia-400/20 text-fuchsia-300/50 px-8 py-3 text-xs tracking-widest uppercase hover:border-fuchsia-400/40 transition-all">
                Alışverişe Devam
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}